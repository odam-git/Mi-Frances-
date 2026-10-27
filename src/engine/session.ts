// Constructor de la sesión diaria (informe §5): rescate y repaso → codificación de nuevos
// → práctica manipulativa intercalada → escucha y diálogo → cierre.
import type { Item } from '../content/types';
import type { Dialogue } from '../content/dialogues';
import { makeCloze, tokenize } from './text';
import { cardId, isDue, retrievability, type CardRecord } from './srs';

export type Phase = 'repaso' | 'nuevo' | 'practica' | 'oral' | 'cierre';

export type Exercise =
  | 'fr-es' // leer en francés → escribir significado (recuperación receptiva)
  | 'audio-es' // escuchar → escribir significado (recuperación receptiva auditiva)
  | 'es-fr' // ver significado → escribir en francés (recuperación productiva)
  | 'cloze'; // completar la frase (recuperación productiva en contexto)

export type Step =
  | { kind: 'review'; phase: Phase; cardId: string; itemId: string; exercise: Exercise; retry?: boolean; noHints?: boolean }
  | { kind: 'encode'; phase: Phase; itemId: string }
  | { kind: 'match'; phase: Phase; itemIds: string[] }
  | { kind: 'order'; phase: Phase; itemId: string; tokens: string[] }
  | { kind: 'listen'; phase: Phase; itemId: string; options: string[] }
  | { kind: 'speak'; phase: Phase; itemId: string }
  | { kind: 'dialogue'; phase: Phase; dialogueId: string }
  | { kind: 'write'; phase: Phase; itemIds: string[] }
  | { kind: 'summary'; phase: Phase };

export interface StepResult {
  index: number;
  kind: Step['kind'];
  itemId?: string;
  correct: boolean;
  rating?: number;
}

export interface SessionRecord {
  id: string;
  startedAt: Date;
  endedAt?: Date;
  minutes: number;
  status: 'activa' | 'terminada' | 'abandonada';
  mode: 'diaria' | 'examen' | 'libre';
  steps: Step[];
  cursor: number;
  results: StepResult[];
  newItemIds: string[];
}

/** Segundos estimados por paso, para ajustar la sesión al tiempo disponible. */
export const STEP_SECONDS: Record<Step['kind'], number> = {
  review: 20, encode: 55, match: 40, order: 35, listen: 15, speak: 30, dialogue: 150, write: 60, summary: 20
};

export function estimateMinutes(steps: Step[]): number {
  return Math.round(steps.reduce((s, st) => s + STEP_SECONDS[st.kind], 0) / 60);
}

/** Generador pseudoaleatorio reproducible (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface BuildInput {
  now: Date;
  minutes: number;
  newPerDay: number;
  /** Ítems nuevos ya introducidos hoy (para respetar el tope diario). */
  introducedToday: number;
  items: Item[];
  cards: CardRecord[];
  dialogues: Dialogue[];
  sound: boolean;
  retention: number;
  seed?: number;
  /** Diálogo usado más recientemente (para rotar). */
  lastDialogueId?: string;
}

/** Elige la variante de ejercicio para una tarjeta, alternando modalidades. */
export function exerciseFor(rec: CardRecord, item: Item, sound: boolean, rand: () => number): Exercise {
  if (rec.dir === 'rec') return sound && rand() < 0.5 ? 'audio-es' : 'fr-es';
  if (rec.fsrs.stability >= 3 && makeCloze(item) && rand() < 0.5) return 'cloze';
  return 'es-fr';
}

function canOrder(item: Item): boolean {
  const n = tokenize(item.example.fr).length;
  return n >= 3 && n <= 8;
}

export function buildDailySession(input: BuildInput): Step[] {
  const { now, minutes, items, cards, retention } = input;
  const rand = rng(input.seed ?? now.getTime());
  const byId = new Map(items.map((i) => [i.id, i]));
  const budget = minutes * 60;
  const steps: Step[] = [];

  // ── 1. Rescate y repaso acumulativo: lo más olvidado primero ──
  const due = cards
    .filter((c) => byId.has(c.itemId) && isDue(c, now))
    .sort((a, b) => retrievability(a.fsrs, now, retention) - retrievability(b.fsrs, now, retention));
  const reviewShare = minutes <= 5 ? 0.75 : 0.3;
  let reviewCount = Math.min(due.length, Math.max(4, Math.floor((budget * reviewShare) / STEP_SECONDS.review)));
  // Si hay pocas palabras nuevas posibles, el repaso puede usar más tiempo.
  const introduced = new Set(cards.map((c) => c.itemId));
  const unseen = items.filter((i) => !introduced.has(i.id));
  if (!unseen.length) reviewCount = Math.min(due.length, Math.floor((budget * 0.7) / STEP_SECONDS.review));
  const reviewCards = due.slice(0, reviewCount);
  for (const c of reviewCards) {
    steps.push({ kind: 'review', phase: 'repaso', cardId: c.id, itemId: c.itemId, exercise: exerciseFor(c, byId.get(c.itemId)!, input.sound, rand) });
  }

  // ── 2. Ítems nuevos (máx. 5–7; contrato de disponibilidad: no si hay demasiados repasos pendientes) ──
  const byDuration = minutes <= 5 ? 1 : minutes <= 10 ? 3 : minutes <= 15 ? 5 : 6;
  const backlog = due.length - reviewCards.length;
  const allowed = backlog > 25 ? 0 : Math.max(0, Math.min(byDuration, input.newPerDay - input.introducedToday));
  const newItems = unseen.slice(0, allowed);
  for (const it of newItems) steps.push({ kind: 'encode', phase: 'nuevo', itemId: it.id });

  // ── 3. Práctica manipulativa intercalada ──
  const practice: Step[] = [];
  if (newItems.length >= 2) practice.push({ kind: 'match', phase: 'practica', itemIds: newItems.map((i) => i.id).slice(0, 5) });
  const oldItems = shuffle(
    reviewCards.map((c) => byId.get(c.itemId)!).filter((it, i, arr) => arr.indexOf(it) === i),
    rand
  );
  const orderPool = [...newItems, ...oldItems.slice(0, 2)].filter(canOrder);
  for (const it of orderPool.slice(0, minutes <= 5 ? 1 : 3)) {
    practice.push({ kind: 'order', phase: 'practica', itemId: it.id, tokens: shuffle(tokenize(it.example.fr), rand) });
  }
  if (input.sound && newItems.length) {
    const target = newItems[Math.floor(rand() * newItems.length)];
    const distractors = shuffle(items.filter((i) => i.id !== target.id), rand).slice(0, 3);
    practice.push({ kind: 'listen', phase: 'practica', itemId: target.id, options: shuffle([target, ...distractors].map((i) => i.id), rand) });
  }
  // Recuerdo libre de los nuevos, sin opciones: primero reconocer, después producir (con pausa entre medio).
  const recRecalls: Step[] = newItems.map((it) => ({ kind: 'review', phase: 'practica', cardId: cardId(it.id, 'rec'), itemId: it.id, exercise: 'fr-es' }));
  const prodRecalls: Step[] = newItems.map((it) => ({ kind: 'review', phase: 'practica', cardId: cardId(it.id, 'prod'), itemId: it.id, exercise: 'es-fr' }));
  // Intercala: práctica manipulativa entre los dos bloques de recuperación (espaciado dentro de la sesión).
  const half = Math.ceil(practice.length / 2);
  steps.push(...practice.slice(0, half), ...shuffle(recRecalls, rand), ...practice.slice(half), ...shuffle(prodRecalls, rand));

  // ── 4. Escucha, oral y diálogo ──
  if (minutes >= 10) {
    const speakPool = newItems.length ? newItems : oldItems;
    for (const it of speakPool.slice(0, minutes >= 15 ? 2 : 1)) steps.push({ kind: 'speak', phase: 'oral', itemId: it.id });
    const knownIds = new Set([...introduced, ...newItems.map((i) => i.id)]);
    const ranked = [...input.dialogues]
      .map((d) => ({ d, score: d.items.filter((id) => knownIds.has(id)).length / d.items.length - (d.id === input.lastDialogueId ? 0.5 : 0) }))
      .sort((a, b) => b.score - a.score);
    if (ranked.length && ranked[0].score >= 0.3) steps.push({ kind: 'dialogue', phase: 'oral', dialogueId: ranked[0].d.id });
  }
  if (minutes >= 15 && (newItems.length || oldItems.length)) {
    steps.push({ kind: 'write', phase: 'oral', itemIds: (newItems.length ? newItems : oldItems).slice(0, 3).map((i) => i.id) });
  }

  if (steps.length) steps.push({ kind: 'summary', phase: 'cierre' });
  return steps;
}

/** Inserta un reintento unos pasos después de un fallo (pausa antes de volver a mostrar). */
export function withRetry(steps: Step[], cursor: number, step: Extract<Step, { kind: 'review' }>, gap = 3): Step[] {
  const retries = steps.filter((s) => s.kind === 'review' && s.cardId === step.cardId && s.retry).length;
  if (retries >= 2) return steps;
  const end = steps.findIndex((s) => s.kind === 'summary');
  const limit = end < 0 ? steps.length : end;
  const at = Math.min(cursor + 1 + gap, limit);
  const copy = [...steps];
  copy.splice(at, 0, { ...step, retry: true, exercise: step.exercise === 'cloze' ? 'es-fr' : step.exercise });
  return copy;
}

/** Examen de dominio de una unidad: recuperación productiva diferida, sin pistas. */
export function buildMasteryExam(cards: CardRecord[], items: Item[], now: Date, size: number, minDelayDays: number, seed = now.getTime()): Step[] {
  const rand = rng(seed);
  const ids = new Set(items.map((i) => i.id));
  const eligible = cards.filter((c) => c.dir === 'prod' && ids.has(c.itemId) && now.getTime() - c.introducedAt.getTime() >= minDelayDays * 86_400_000);
  const chosen = shuffle(eligible, rand).slice(0, size);
  const steps: Step[] = chosen.map((c) => ({ kind: 'review', phase: 'repaso', cardId: c.id, itemId: c.itemId, exercise: 'es-fr', noHints: true }));
  if (steps.length) steps.push({ kind: 'summary', phase: 'cierre' });
  return steps;
}

export const PHASE_LABEL: Record<Phase, string> = {
  repaso: 'Rescate y repaso',
  nuevo: 'Palabras nuevas',
  practica: 'Práctica',
  oral: 'Escucha y conversación',
  cierre: 'Cierre'
};
