// Respaldo: exportar e importar todo el progreso como un archivo JSON.
import { db, getSettings, saveSettings, type ReviewLogRecord } from './db';
import { reviveCard, type CardRecord } from '../engine/srs';
import type { SessionRecord } from '../engine/session';

export const BACKUP_FORMAT = 'mi-frances-respaldo';
export const BACKUP_VERSION = 1;

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  settings: unknown;
  cards: CardRecord[];
  reviews: ReviewLogRecord[];
  sessions: SessionRecord[];
  custom: unknown[];
  userItems: unknown[];
  palaces: unknown[];
}

export async function exportBackup(): Promise<Backup> {
  const [settings, cards, reviews, sessions, custom, userItems, palaces] = await Promise.all([
    getSettings(), db.cards.toArray(), db.reviews.toArray(), db.sessions.toArray(), db.custom.toArray(), db.userItems.toArray(), db.palaces.toArray()
  ]);
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), settings, cards, reviews, sessions, custom, userItems, palaces };
}

export async function downloadBackup(): Promise<string> {
  const data = await exportBackup();
  const name = `mi-frances-respaldo-${data.exportedAt.slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });
  // En iPhone, compartir permite «Guardar en Archivos» o enviarlo por correo.
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Respaldo de MI FRANCÉS' });
      await saveSettings({ lastBackupAt: data.exportedAt });
      return name;
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e;
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  await saveSettings({ lastBackupAt: data.exportedAt });
  return name;
}

const reviveDates = <T extends Record<string, unknown>>(o: T, keys: string[]): T => {
  const c: Record<string, unknown> = { ...o };
  for (const k of keys) if (c[k]) c[k] = new Date(c[k] as string);
  return c as T;
};

/** Valida y restaura un respaldo. Reemplaza los datos actuales (se pide confirmación en la interfaz). */
export async function importBackup(json: string): Promise<{ cards: number; reviews: number }> {
  let data: Backup;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }
  if (data?.format !== BACKUP_FORMAT || !Array.isArray(data.cards) || !Array.isArray(data.reviews)) {
    throw new Error('El archivo no es un respaldo de MI FRANCÉS.');
  }
  if (data.version > BACKUP_VERSION) throw new Error('El respaldo es de una versión más nueva de la app. Actualiza la app primero.');
  const cards = data.cards.map(reviveCard);
  const reviews = data.reviews.map((r) => reviveDates(r as unknown as Record<string, unknown>, ['ts']) as unknown as ReviewLogRecord);
  const sessions = (data.sessions ?? []).map((s) => reviveDates(s as unknown as Record<string, unknown>, ['startedAt', 'endedAt']) as unknown as SessionRecord);
  const custom = (data.custom ?? []).map((c) => reviveDates(c as Record<string, unknown>, ['updatedAt']));
  await db.transaction('rw', [db.cards, db.reviews, db.sessions, db.custom, db.userItems, db.palaces, db.kv], async () => {
    await Promise.all([db.cards.clear(), db.reviews.clear(), db.sessions.clear(), db.custom.clear(), db.userItems.clear(), db.palaces.clear()]);
    await db.cards.bulkPut(cards);
    await db.reviews.bulkPut(reviews);
    await db.sessions.bulkPut(sessions);
    await db.custom.bulkPut(custom as never[]);
    await db.userItems.bulkPut((data.userItems ?? []) as never[]);
    await db.palaces.bulkPut((data.palaces ?? []) as never[]);
    if (data.settings) await db.kv.put({ key: 'settings', value: data.settings });
  });
  return { cards: cards.length, reviews: reviews.length };
}

export async function resetAll(): Promise<void> {
  await db.transaction('rw', [db.cards, db.reviews, db.sessions, db.custom, db.userItems, db.palaces, db.kv, db.audio], async () => {
    await Promise.all([db.cards.clear(), db.reviews.clear(), db.sessions.clear(), db.custom.clear(), db.userItems.clear(), db.palaces.clear(), db.kv.clear(), db.audio.clear()]);
  });
}
