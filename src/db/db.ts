// Persistencia local (IndexedDB vía Dexie). Todo el progreso vive en el dispositivo;
// se puede exportar e importar como archivo JSON (ver backup.ts).
import Dexie, { type Table } from 'dexie';
import type { CardRecord } from '../engine/srs';
import type { Item } from '../content/types';
import type { SessionRecord } from '../engine/session';
import type { Palace } from '../engine/palace';

export type Skill = 'lectura' | 'auditiva' | 'escritura' | 'oral';

export interface ReviewLogRecord {
  id?: number;
  ts: Date;
  sessionId?: string;
  itemId: string;
  cardId?: string;
  /** Tipo de ejercicio que generó el registro. */
  exercise: string;
  /** true = recuperación (actualiza FSRS); false = reconocimiento o práctica (solo se registra). */
  recall: boolean;
  skill: Skill;
  correct: boolean;
  verdict?: string;
  latencyMs: number;
  hints: number;
  rating?: number;
  answer?: string;
  stabilityBefore?: number;
  stabilityAfter?: number;
  retrievabilityBefore?: number;
  elapsedDays?: number;
}

/** Personalización de la asociación de un ítem por el usuario. */
export interface CustomAssoc {
  itemId: string;
  keyword?: string;
  story?: string;
  main?: string;
  prop?: string;
  /** Foto propia reducida (data URL JPEG). */
  photo?: string;
  updatedAt: Date;
}

export interface Settings {
  minutes: number;
  newPerDay: number;
  sound: boolean;
  rate: number;
  voiceURI?: string;
  retention: number;
  showIpa: boolean;
  theme: 'auto' | 'claro' | 'oscuro';
  diagnosticDone: boolean;
  level?: string;
  phonWeak: string[];
  userName?: string;
  proxyUrl?: string;
  proxyToken?: string;
  ttsProvider: 'dispositivo' | 'proxy';
  lastBackupAt?: string;
  createdAt: string;
}

export const DEFAULT_SETTINGS: Settings = {
  minutes: 15,
  newPerDay: 6,
  sound: true,
  rate: 0.9,
  retention: 0.9,
  showIpa: true,
  theme: 'auto',
  diagnosticDone: false,
  phonWeak: [],
  ttsProvider: 'dispositivo',
  createdAt: new Date().toISOString()
};

interface KV {
  key: string;
  value: unknown;
}

export interface AudioCache {
  key: string;
  blob: Blob;
}

export class MiFrancesDB extends Dexie {
  cards!: Table<CardRecord, string>;
  reviews!: Table<ReviewLogRecord, number>;
  sessions!: Table<SessionRecord, string>;
  custom!: Table<CustomAssoc, string>;
  userItems!: Table<Item, string>;
  palaces!: Table<Palace, string>;
  kv!: Table<KV, string>;
  audio!: Table<AudioCache, string>;

  constructor(name = 'mi-frances') {
    super(name);
    this.version(1).stores({
      cards: 'id, itemId, dir',
      reviews: '++id, ts, itemId, cardId, sessionId',
      sessions: 'id, startedAt, status',
      custom: 'itemId',
      userItems: 'id',
      palaces: 'id',
      kv: 'key',
      audio: 'key'
    });
  }
}

export let db = new MiFrancesDB();

/** Solo para pruebas: usa otra base de datos. */
export function useDatabase(instance: MiFrancesDB) {
  db = instance;
}

export async function getSettings(): Promise<Settings> {
  const row = await db.kv.get('settings');
  return { ...DEFAULT_SETTINGS, ...((row?.value as Partial<Settings>) ?? {}) };
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings()), ...patch };
  await db.kv.put({ key: 'settings', value: next });
  return next;
}

/** Pide al navegador que no borre los datos (iOS 17+, Chrome, Firefox). */
export async function requestPersistence(): Promise<boolean | null> {
  try {
    if (!navigator.storage?.persist) return null;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return null;
  }
}
