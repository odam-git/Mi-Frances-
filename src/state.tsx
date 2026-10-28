// Estado global: carga la base local en memoria y expone acciones que escriben primero en IndexedDB.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ALL_ITEMS } from './content/curriculum';
import { DIALOGUES } from './content/dialogues';
import type { Item } from './content/types';
import { db, getSettings, saveSettings, type CustomAssoc, type ReviewLogRecord, type Settings, type Skill } from './db/db';
import { defaultPalace, type Palace } from './engine/palace';
import { buildDailySession, buildMasteryExam, withRetry, type SessionRecord, type Step, type StepResult } from './engine/session';
import { applyAttempt, cardId, newCardRecord, seedKnown, type Attempt, type CardRecord, type Direction, type ReviewOutcome } from './engine/srs';
import { dayKey } from './engine/stats';
import { configureSpeech } from './services/speech';
import { MASTERY_RULE } from './content/curriculum';

/** Ítem efectivo: contenido base + personalización del usuario. */
export type EffItem = Item & { photo?: string; customized?: boolean; own?: boolean };

export interface Data {
  ready: boolean;
  settings: Settings;
  items: EffItem[];
  itemById: Map<string, EffItem>;
  cards: CardRecord[];
  cardById: Map<string, CardRecord>;
  reviews: ReviewLogRecord[];
  sessions: SessionRecord[];
  palaces: Palace[];
  active: SessionRecord | null;
}

function mergeItem(base: Item, c?: CustomAssoc, own = false): EffItem {
  if (!c) return { ...base, own };
  return {
    ...base,
    own,
    customized: true,
    photo: c.photo,
    assoc: {
      ...base.assoc,
      // Una palabra clave propia convierte la asociación en palabra clave salvo que el ítem esté protegido.
      type: c.keyword && base.assoc.type !== 'protegida' ? 'palabra-clave' : base.assoc.type,
      keyword: c.keyword ?? base.assoc.keyword,
      story: c.story ?? base.assoc.story,
      scene: { ...base.assoc.scene, main: c.main || base.assoc.scene.main, prop: c.prop ?? base.assoc.scene.prop }
    }
  };
}

interface Actions {
  reload(): Promise<void>;
  updateSettings(patch: Partial<Settings>): Promise<void>;
  introduce(itemId: string): Promise<void>;
  recordRecall(p: { itemId: string; dir: Direction; attempt: Attempt; exercise: string; skill: Skill; answer?: string; sessionId?: string }): Promise<ReviewOutcome>;
  logPractice(p: Omit<ReviewLogRecord, 'id' | 'ts' | 'recall'>): Promise<void>;
  startSession(mode: SessionRecord['mode'], minutes?: number): Promise<SessionRecord | null>;
  saveSession(s: SessionRecord): Promise<void>;
  advance(s: SessionRecord, result: StepResult, retryStep?: Extract<Step, { kind: 'review' }>): Promise<SessionRecord>;
  finishSession(s: SessionRecord, status?: SessionRecord['status']): Promise<void>;
  saveCustom(c: Omit<CustomAssoc, 'updatedAt'>): Promise<void>;
  resetCustom(itemId: string): Promise<void>;
  savePalace(p: Palace): Promise<void>;
  deletePalace(id: string): Promise<void>;
  saveUserItem(it: Item): Promise<void>;
  deleteUserItem(id: string): Promise<void>;
  completeDiagnostic(p: { knownItemIds: string[]; settings: Partial<Settings> }): Promise<void>;
}

const Ctx = createContext<(Data & Actions) | null>(null);

const EMPTY: Data = {
  ready: false,
  settings: {} as Settings,
  items: [],
  itemById: new Map(),
  cards: [],
  cardById: new Map(),
  reviews: [],
  sessions: [],
  palaces: [],
  active: null
};

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(EMPTY);

  const reload = useCallback(async () => {
    let [settings, cards, reviews, sessions, custom, userItems, palaces] = await Promise.all([
      getSettings(), db.cards.toArray(), db.reviews.orderBy('ts').toArray(), db.sessions.orderBy('startedAt').toArray(), db.custom.toArray(), db.userItems.toArray(), db.palaces.toArray()
    ]);
    if (!palaces.length) {
      const p = defaultPalace();
      await db.palaces.put(p);
      palaces = [p];
    }
    configureSpeech(settings);
    const customBy = new Map(custom.map((c) => [c.itemId, c]));
    const items: EffItem[] = [...userItems.map((i) => mergeItem(i, customBy.get(i.id), true)), ...ALL_ITEMS.map((i) => mergeItem(i, customBy.get(i.id)))];
    const active = [...sessions].reverse().find((s) => s.status === 'activa') ?? null;
    setData({
      ready: true,
      settings,
      items,
      itemById: new Map(items.map((i) => [i.id, i])),
      cards,
      cardById: new Map(cards.map((c) => [c.id, c])),
      reviews,
      sessions,
      palaces,
      active
    });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const actions = useMemo<Actions>(() => {
    const ensureCards = async (itemId: string, now = new Date()) => {
      const existing = await db.cards.where('itemId').equals(itemId).toArray();
      const have = new Set(existing.map((c) => c.dir));
      const fresh = (['rec', 'prod'] as Direction[]).filter((d) => !have.has(d)).map((d) => newCardRecord(itemId, d, now));
      if (fresh.length) await db.cards.bulkPut(fresh);
    };

    return {
      reload,
      async updateSettings(patch) {
        await saveSettings(patch);
        await reload();
      },
      async introduce(itemId) {
        await ensureCards(itemId);
        await reload();
      },
      async recordRecall({ itemId, dir, attempt, exercise, skill, answer, sessionId }) {
        const now = new Date();
        const settings = await getSettings();
        const id = cardId(itemId, dir);
        let rec = await db.cards.get(id);
        if (!rec) {
          await ensureCards(itemId, now);
          rec = (await db.cards.get(id))!;
        }
        const out = applyAttempt(rec, attempt, now, settings.retention);
        await db.transaction('rw', db.cards, db.reviews, async () => {
          await db.cards.put(out.record);
          await db.reviews.add({
            ts: now, sessionId, itemId, cardId: id, exercise, recall: true, skill,
            correct: attempt.correct, verdict: attempt.verdict, latencyMs: Math.round(attempt.latencyMs), hints: attempt.hints,
            rating: out.rating, answer: answer?.slice(0, 200), stabilityBefore: out.stabilityBefore, stabilityAfter: out.record.fsrs.stability,
            retrievabilityBefore: out.retrievabilityBefore, elapsedDays: out.elapsedDays
          });
        });
        await reload();
        return out;
      },
      async logPractice(p) {
        await db.reviews.add({ ...p, ts: new Date(), recall: false, answer: p.answer?.slice(0, 200) });
        await reload();
      },
      async startSession(mode, minutes) {
        const now = new Date();
        const settings = await getSettings();
        const cards = await db.cards.toArray();
        const userItems = await db.userItems.toArray();
        const items = [...userItems, ...ALL_ITEMS];
        // Abandona una sesión activa anterior (sus respuestas ya están registradas).
        const prev = await db.sessions.where('status').equals('activa').toArray();
        for (const s of prev) await db.sessions.put({ ...s, status: 'abandonada', endedAt: now });
        const today = dayKey(now);
        const introducedToday = new Set(cards.filter((c) => !c.seeded && dayKey(c.introducedAt) === today).map((c) => c.itemId)).size;
        const lastDialogue = (await db.reviews.filter((r) => r.exercise === 'dialogue').toArray()).pop();
        const lastDialogueId = lastDialogue?.answer?.startsWith('dialogo:') ? lastDialogue.answer.slice(8) : undefined;
        let steps: Step[];
        if (mode === 'examen') {
          steps = buildMasteryExam(cards, ALL_ITEMS.filter((i) => i.unit === 1), now, MASTERY_RULE.examSize, MASTERY_RULE.minDelayDays);
        } else {
          steps = buildDailySession({
            now, minutes: minutes ?? settings.minutes, newPerDay: settings.newPerDay, introducedToday, items, cards,
            dialogues: DIALOGUES, sound: settings.sound, retention: settings.retention, lastDialogueId
          });
        }
        if (!steps.length) return null;
        const s: SessionRecord = {
          id: `s-${now.getTime()}`, startedAt: now, minutes: minutes ?? settings.minutes, status: 'activa', mode, steps, cursor: 0, results: [],
          newItemIds: steps.filter((x) => x.kind === 'encode').map((x) => (x as { itemId: string }).itemId)
        };
        await db.sessions.put(s);
        await reload();
        return s;
      },
      async saveSession(s) {
        await db.sessions.put(s);
      },
      async advance(s, result, retryStep) {
        let steps = s.steps;
        if (retryStep) steps = withRetry(steps, s.cursor, retryStep);
        const next: SessionRecord = { ...s, steps, cursor: s.cursor + 1, results: [...s.results, result] };
        await db.sessions.put(next);
        return next;
      },
      async finishSession(s, status = 'terminada') {
        await db.sessions.put({ ...s, status, endedAt: new Date(), cursor: s.steps.length });
        await reload();
      },
      async saveCustom(c) {
        await db.custom.put({ ...c, updatedAt: new Date() });
        await reload();
      },
      async resetCustom(itemId) {
        await db.custom.delete(itemId);
        await reload();
      },
      async savePalace(p) {
        await db.palaces.put(p);
        await reload();
      },
      async deletePalace(id) {
        await db.palaces.delete(id);
        await reload();
      },
      async saveUserItem(it) {
        await db.userItems.put(it);
        await reload();
      },
      async deleteUserItem(id) {
        await db.transaction('rw', db.userItems, db.cards, db.custom, async () => {
          await db.userItems.delete(id);
          await db.cards.where('itemId').equals(id).delete();
          await db.custom.delete(id);
        });
        await reload();
      },
      async completeDiagnostic({ knownItemIds, settings }) {
        const now = new Date();
        const s = await saveSettings({ ...settings, diagnosticDone: true });
        for (const id of knownItemIds) {
          const recs = (['rec', 'prod'] as Direction[]).map((d) => seedKnown(newCardRecord(id, d, now), now, s.retention));
          await db.cards.bulkPut(recs);
        }
        await reload();
      }
    };
  }, [reload]);

  const value = useMemo(() => ({ ...data, ...actions }), [data, actions]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useData fuera de DataProvider');
  return v;
}
