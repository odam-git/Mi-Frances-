// Métricas de aprendizaje real (informe §11) y elementos de motivación no punitivos.
import type { Item } from '../content/types';
import type { ReviewLogRecord, Skill } from '../db/db';
import type { SessionRecord } from './session';
import { isDue, retrievability, State, Rating, type CardRecord } from './srs';
import { MASTERY_RULE } from '../content/curriculum';

const DAY = 86_400_000;

export interface Overview {
  unseen: number;
  learning: number;
  /** Aprendidas: tarjeta productiva en repaso con estabilidad ≥ 7 días. */
  learned: number;
  due: number;
  /** Olvidadas: último intento fallido o recuperabilidad estimada < 70 %. */
  forgotten: number;
  leeches: number;
  /** Almacenamiento profundo: productivas con S ≥ 21 días. */
  deep: number;
  /** Acceso léxico directo: productivas con S > 14 d, última respuesta < 2 s y sin pistas. */
  direct: number;
}

export function overview(items: Item[], cards: CardRecord[], now: Date, retention = 0.9): Overview {
  const byItem = new Map<string, { rec?: CardRecord; prod?: CardRecord }>();
  for (const c of cards) {
    const e = byItem.get(c.itemId) ?? {};
    e[c.dir] = c;
    byItem.set(c.itemId, e);
  }
  let unseen = 0, learning = 0, learned = 0, forgotten = 0, deep = 0, direct = 0, leeches = 0;
  for (const it of items) {
    const e = byItem.get(it.id);
    if (!e?.prod && !e?.rec) { unseen++; continue; }
    const p = e.prod;
    const anyForgot = [e.rec, e.prod].some((c) => c && c.fsrs.state !== State.New && (c.lastRating === Rating.Again || retrievability(c.fsrs, now, retention) < 0.7));
    if (anyForgot) forgotten++;
    else if (p && p.fsrs.state === State.Review && p.fsrs.stability >= 7) learned++;
    else learning++;
    if (p && p.fsrs.stability >= 21) deep++;
    if (p && p.fsrs.stability > 14 && (p.lastLatencyMs ?? 99999) < 2000 && !p.lastHints) direct++;
    if (e.rec?.leech || e.prod?.leech) leeches++;
  }
  const due = cards.filter((c) => isDue(c, now)).length;
  return { unseen, learning, learned, due, forgotten, leeches, deep, direct };
}

/** Retención diferida empírica: aciertos al primer intento en repasos con > 14 días de intervalo. */
export function delayedRetention(reviews: ReviewLogRecord[]): { rate: number | null; n: number } {
  const r = reviews.filter((x) => x.recall && (x.elapsedDays ?? 0) > 14);
  if (!r.length) return { rate: null, n: 0 };
  return { rate: r.filter((x) => x.correct && !x.hints).length / r.length, n: r.length };
}

export interface SkillStat {
  skill: Skill;
  label: string;
  accuracy: number | null;
  n: number;
}

const SKILL_LABEL: Record<Skill, string> = {
  lectura: 'Comprensión lectora',
  auditiva: 'Comprensión auditiva',
  escritura: 'Escritura',
  oral: 'Expresión oral'
};

export function skillStats(reviews: ReviewLogRecord[], now: Date, days = 30): SkillStat[] {
  const since = now.getTime() - days * DAY;
  return (Object.keys(SKILL_LABEL) as Skill[]).map((skill) => {
    const r = reviews.filter((x) => x.skill === skill && x.ts.getTime() >= since);
    return { skill, label: SKILL_LABEL[skill], n: r.length, accuracy: r.length ? r.filter((x) => x.correct).length / r.length : null };
  });
}

export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Días con práctica (≥ 1 sesión terminada o ≥ 8 respuestas). */
export function activeDays(sessions: SessionRecord[], reviews: ReviewLogRecord[]): Set<string> {
  const days = new Set<string>();
  for (const s of sessions) if (s.status === 'terminada') days.add(dayKey(s.startedAt));
  const counts = new Map<string, number>();
  for (const r of reviews) counts.set(dayKey(r.ts), (counts.get(dayKey(r.ts)) ?? 0) + 1);
  for (const [k, n] of counts) if (n >= 8) days.add(k);
  return days;
}

/**
 * Racha sin castigo excesivo: un día de descanso por cada 7 días no rompe la racha,
 * y el día de hoy no cuenta en contra hasta que termina.
 */
export function streak(days: Set<string>, now: Date): { current: number; restUsed: boolean; practicedToday: boolean } {
  const practicedToday = days.has(dayKey(now));
  let current = 0;
  let restUsed = false;
  let lastRestAt = -Infinity;
  const cursor = new Date(now);
  if (!practicedToday) cursor.setDate(cursor.getDate() - 1);
  for (let i = 0; i < 3650; i++) {
    if (days.has(dayKey(cursor))) current++;
    else if (i - lastRestAt >= 7 && current > 0 && days.has(dayKey(new Date(cursor.getTime() - DAY)))) {
      lastRestAt = i;
      restUsed = restUsed || i < 7;
    } else break;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { current, restUsed, practicedToday };
}

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  done: boolean;
}

export function achievements(o: Overview, reviews: ReviewLogRecord[], sessions: SessionRecord[], days: Set<string>, placedCount: number): Achievement[] {
  const rescues = reviews.filter((r) => r.recall && r.correct && r.hints > 0).length;
  const dialogues = reviews.filter((r) => r.exercise === 'dialogue' && r.correct).length;
  const finished = sessions.filter((s) => s.status === 'terminada').length;
  return [
    { id: 'primera', title: 'Primer paso', desc: 'Termina tu primera sesión.', done: finished >= 1 },
    { id: 'rescate', title: 'Rescate', desc: 'Recupera una palabra con ayuda de las pistas.', done: rescues >= 1 },
    { id: 'diez', title: 'Diez que se quedan', desc: '10 palabras con estabilidad ≥ 7 días.', done: o.learned + o.deep >= 10 },
    { id: 'treinta', title: 'Unidad en la memoria', desc: '30 palabras aprendidas.', done: o.learned >= 30 },
    { id: 'profundo', title: 'Memoria profunda', desc: '10 palabras con estabilidad ≥ 21 días.', done: o.deep >= 10 },
    { id: 'directo', title: 'Sin muletas', desc: '5 palabras recuperadas en < 2 s sin la escena (acceso directo).', done: o.direct >= 5 },
    { id: 'dialogo', title: 'Primera conversación', desc: 'Completa un diálogo guiado.', done: dialogues >= 1 },
    { id: 'palacio', title: 'Arquitecto', desc: 'Coloca 10 palabras en tus casilleros mentales.', done: placedCount >= 10 },
    { id: 'constancia', title: 'Constancia', desc: 'Practica 7 días (no hace falta que sean seguidos).', done: days.size >= 7 },
    { id: 'mes', title: 'Hábito', desc: 'Practica 20 días.', done: days.size >= 20 }
  ];
}

export interface Mastery {
  share: number;
  eligibleForExam: boolean;
  totalItems: number;
  strongItems: number;
}

/** Dominio de una unidad: proporción de tarjetas productivas estables. No depende de puntos ni rachas. */
export function unitMastery(unitItems: Item[], cards: CardRecord[], now: Date): Mastery {
  const prod = new Map(cards.filter((c) => c.dir === 'prod').map((c) => [c.itemId, c]));
  const strong = unitItems.filter((i) => (prod.get(i.id)?.fsrs.stability ?? 0) >= MASTERY_RULE.minStabilityDays).length;
  const old = unitItems.filter((i) => {
    const c = prod.get(i.id);
    return c && now.getTime() - c.introducedAt.getTime() >= MASTERY_RULE.minDelayDays * DAY;
  }).length;
  const share = unitItems.length ? strong / unitItems.length : 0;
  return { share, totalItems: unitItems.length, strongItems: strong, eligibleForExam: share >= MASTERY_RULE.minShare && old >= MASTERY_RULE.examSize };
}

/** Próxima acción clara al abrir la app. */
export function nextAction(hasActive: boolean, diagnosticDone: boolean, o: Overview, practicedToday: boolean): { label: string; detail: string; kind: 'resume' | 'diagnostic' | 'session' | 'free' } {
  if (!diagnosticDone) return { kind: 'diagnostic', label: 'Haz tu diagnóstico', detail: 'Unos 5 minutos para saber desde dónde empezar.' };
  if (hasActive) return { kind: 'resume', label: 'Continuar donde te quedaste', detail: 'Tu sesión de hoy está a medias.' };
  if (o.due > 0 || o.unseen > 0) return { kind: 'session', label: practicedToday ? 'Otra sesión' : 'Sesión de hoy', detail: `${o.due} repasos pendientes · ${Math.min(o.unseen, 6)} palabras nuevas posibles` };
  return { kind: 'free', label: 'Estás al día', detail: 'Practica un diálogo o recorre tu palacio de memoria.' };
}
