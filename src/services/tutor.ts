// Cliente del tutor de IA. Solo funciona si configuraste tu servidor intermedio (server/README.md);
// la app nunca contiene ni guarda claves de API.
import { getSettings } from '../db/db';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface TutorReply {
  french: string;
  correction?: string;
  help?: string;
  raw: string;
}

export function parseReply(text: string): TutorReply {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const correction = lines.find((l) => /^corrección\s*:/i.test(l))?.replace(/^corrección\s*:\s*/i, '');
  const help = lines.find((l) => /^ayuda\s*:/i.test(l))?.replace(/^ayuda\s*:\s*/i, '');
  const french = lines.filter((l) => !/^(corrección|ayuda)\s*:/i.test(l)).join(' ');
  return { french, correction, help, raw: text };
}

export async function tutorConfigured(): Promise<boolean> {
  const s = await getSettings();
  return !!s.proxyUrl;
}

export async function proxyHealth(): Promise<{ tutor: boolean; tts: boolean } | null> {
  const s = await getSettings();
  if (!s.proxyUrl) return null;
  try {
    const res = await fetch(`${s.proxyUrl.replace(/\/$/, '')}/health`);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export async function askTutor(messages: ChatMessage[], ctx: { level?: string; knownWords: string[]; targetWords: string[]; situation?: string }): Promise<TutorReply> {
  const s = await getSettings();
  if (!s.proxyUrl) throw new Error('El tutor de IA no está configurado. Ve a Ajustes → Servicios externos.');
  const res = await fetch(`${s.proxyUrl.replace(/\/$/, '')}/tutor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(s.proxyToken ? { 'X-App-Token': s.proxyToken } : {}) },
    body: JSON.stringify({ messages, ...ctx })
  });
  const data = await res.json().catch(() => ({ error: 'Respuesta inválida del servidor.' }));
  if (!res.ok || data.error) throw new Error(data.error ?? `Error ${res.status}`);
  return parseReply(data.text);
}
