// Motor de repetición espaciada: FSRS-6 mediante ts-fsrs 5.4.2 (pesos por defecto).
// Documentación del algoritmo: https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm
import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card, type Grade } from 'ts-fsrs';
import type { Verdict } from './text';

export { Rating, State };
export type { Card };

export type Direction = 'rec' | 'prod';

/** Tarjeta de memoria: cada ítem tiene dos (reconocer FR→ES y producir ES→FR). */
export interface CardRecord {
  id: string;
  itemId: string;
  dir: Direction;
  fsrs: Card;
  introducedAt: Date;
  leech: boolean;
  /** Sembrada por el diagnóstico (ya conocida): no cuenta como palabra nueva del día. */
  seeded?: boolean;
  lastRating?: number;
  lastLatencyMs?: number;
  lastHints?: number;
}

export const cardId = (itemId: string, dir: Direction) => `${itemId}|${dir}`;

let cached: { retention: number; f: ReturnType<typeof fsrs> } | null = null;

export function scheduler(retention = 0.9) {
  if (!cached || cached.retention !== retention) {
    cached = {
      retention,
      f: fsrs(generatorParameters({ request_retention: retention, enable_fuzz: true, enable_short_term: true, maximum_interval: 3650 }))
    };
  }
  return cached.f;
}

export function newCardRecord(itemId: string, dir: Direction, now: Date): CardRecord {
  return { id: cardId(itemId, dir), itemId, dir, fsrs: createEmptyCard(now), introducedAt: now, leech: false };
}

export function retrievability(card: Card, now: Date, retention = 0.9): number {
  if (card.state === State.New) return 0;
  return scheduler(retention).get_retrievability(card, now, false);
}

export function isDue(rec: CardRecord, now: Date): boolean {
  return rec.fsrs.state !== State.New && rec.fsrs.due.getTime() <= now.getTime();
}

export interface Attempt {
  verdict: Verdict;
  correct: boolean;
  /** Escalones de rescate usados (0–4). */
  hints: number;
  /** Latencia hasta la primera respuesta (primera tecla o toque), en ms. */
  latencyMs: number;
  mode: 'escrita' | 'opcion' | 'oral';
}

/**
 * Umbrales de latencia (informe §7.2: < 2 s Easy, 2–5 s Good, > 5 s Hard).
 * Al escribir en el teléfono se mide hasta la primera tecla y se añade margen por la interfaz táctil.
 */
export const LATENCY = {
  escrita: { easy: 2500, hard: 6000 },
  opcion: { easy: 2000, hard: 5000 },
  oral: { easy: 2500, hard: 6000 }
};

/** Calificación automática: nunca es el usuario quien decide (evita la ilusión de competencia). */
export function autoRating(a: Attempt): Grade {
  if (!a.correct || a.hints >= 3) return Rating.Again;
  if (a.hints >= 1) return Rating.Hard;
  if (a.verdict === 'casi' || a.verdict === 'sin-articulo') return Rating.Hard;
  const t = LATENCY[a.mode];
  if (a.latencyMs > t.hard) return Rating.Hard;
  if (a.latencyMs < t.easy && a.verdict === 'exacta') return Rating.Easy;
  return Rating.Good;
}

export interface ReviewOutcome {
  record: CardRecord;
  rating: Grade;
  stabilityBefore: number;
  retrievabilityBefore: number;
  elapsedDays: number;
  becameLeech: boolean;
}

/** Aplica un intento a la tarjeta y devuelve la nueva programación. */
export function applyAttempt(rec: CardRecord, attempt: Attempt, now: Date, retention = 0.9): ReviewOutcome {
  const f = scheduler(retention);
  const rating = autoRating(attempt);
  const before = rec.fsrs;
  const retrievabilityBefore = retrievability(before, now, retention);
  const elapsedDays = before.last_review ? (now.getTime() - before.last_review.getTime()) / 86_400_000 : 0;
  const { card } = f.next(before, now, rating);
  // Sanguijuela (leech): dos o más lapsos y vuelve a fallar → recodificar la asociación.
  const becameLeech = rating === Rating.Again && card.lapses >= 2 && !rec.leech;
  return {
    record: { ...rec, fsrs: card, leech: rec.leech || becameLeech, lastRating: rating, lastLatencyMs: attempt.latencyMs, lastHints: attempt.hints },
    rating,
    stabilityBefore: before.stability,
    retrievabilityBefore,
    elapsedDays,
    becameLeech
  };
}

/** Siembra una tarjeta como ya conocida (diagnóstico): un primer repaso «Easy» la pasa a Review. */
export function seedKnown(rec: CardRecord, now: Date, retention = 0.9): CardRecord {
  const { card } = scheduler(retention).next(rec.fsrs, now, Rating.Easy);
  return { ...rec, fsrs: card, seeded: true };
}

/** Desvanecimiento del mediador (informe §4.2): a partir de 14 días de estabilidad no se muestra la escena. */
export const MEDIATOR_FADE_DAYS = 14;
export const showMediator = (rec?: CardRecord) => !rec || rec.fsrs.stability < MEDIATOR_FADE_DAYS;

/** Rehidrata fechas tras importar un respaldo JSON. */
export function reviveCard(rec: CardRecord): CardRecord {
  const c = rec.fsrs as Card & Record<string, unknown>;
  return {
    ...rec,
    introducedAt: new Date(rec.introducedAt),
    fsrs: { ...c, due: new Date(c.due), last_review: c.last_review ? new Date(c.last_review) : undefined }
  };
}
