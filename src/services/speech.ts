// Audio de pronunciación. Proveedor por defecto: voz francesa del dispositivo (Web Speech API, gratis).
// Proveedor opcional: voz neural servida por tu proxy (Azure TTS), cacheada en el dispositivo.
import { db, getSettings } from '../db/db';

export type AudioStatus = 'ok' | 'sin-voz-francesa' | 'no-soportado';

let voicesReady: Promise<SpeechSynthesisVoice[]> | null = null;

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return Promise.resolve([]);
  if (!voicesReady) {
    voicesReady = new Promise((resolve) => {
      const now = speechSynthesis.getVoices();
      if (now.length) return resolve(now);
      const done = () => resolve(speechSynthesis.getVoices());
      speechSynthesis.addEventListener('voiceschanged', done, { once: true });
      setTimeout(done, 1500); // iOS a veces no dispara el evento
    });
  }
  return voicesReady;
}

export async function frenchVoices(): Promise<SpeechSynthesisVoice[]> {
  const voices = await loadVoices();
  return voices.filter((v) => v.lang.toLowerCase().startsWith('fr'));
}

/** Prefiere voces de Francia de mejor calidad (Premium/Enhanced en iOS). */
export async function pickVoice(preferredURI?: string): Promise<SpeechSynthesisVoice | null> {
  const fr = await frenchVoices();
  if (!fr.length) return null;
  const chosen = preferredURI && fr.find((v) => v.voiceURI === preferredURI);
  if (chosen) return chosen;
  const score = (v: SpeechSynthesisVoice) =>
    (v.lang.replace('_', '-').toLowerCase() === 'fr-fr' ? 10 : 0) +
    (/premium|enhanced|améliorée|natural|neural/i.test(v.name) ? 5 : 0) +
    (/google|amélie|thomas|audrey|aurélie|marie/i.test(v.name) ? 2 : 0) +
    (v.localService ? 1 : 0);
  return [...fr].sort((a, b) => score(b) - score(a))[0];
}

export async function audioStatus(): Promise<AudioStatus> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return 'no-soportado';
  return (await frenchVoices()).length ? 'ok' : 'sin-voz-francesa';
}

async function speakDevice(text: string, rate: number, voiceURI?: string): Promise<void> {
  if (!('speechSynthesis' in window)) throw new Error('no-soportado');
  const voice = await pickVoice(voiceURI);
  if (!voice) throw new Error('sin-voz-francesa');
  speechSynthesis.cancel();
  return new Promise((resolve, reject) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = voice.lang;
    u.voice = voice;
    u.rate = rate;
    u.onend = () => resolve();
    u.onerror = (e) => (e.error === 'interrupted' || e.error === 'canceled' ? resolve() : reject(new Error(e.error)));
    speechSynthesis.speak(u);
  });
}

let currentAudio: HTMLAudioElement | null = null;

async function speakProxy(text: string, rate: number, url: string, token?: string): Promise<void> {
  const key = `${rate}|${text}`;
  let cached = await db.audio.get(key);
  if (!cached) {
    const res = await fetch(`${url.replace(/\/$/, '')}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { 'X-App-Token': token } : {}) },
      body: JSON.stringify({ text, rate })
    });
    if (!res.ok) throw new Error(`proxy ${res.status}`);
    cached = { key, blob: await res.blob() };
    await db.audio.put(cached);
  }
  currentAudio?.pause();
  const audio = new Audio(URL.createObjectURL(cached.blob));
  currentAudio = audio;
  await audio.play();
  await new Promise<void>((r) => (audio.onended = () => r()));
}

/**
 * Reproduce un texto en francés. Devuelve el proveedor usado o lanza un error con el motivo.
 * `slow` = velocidad analítica 0.75x (informe: escuchar a 1.0x y a 0.8x).
 */
export async function speak(text: string, opts: { slow?: boolean } = {}): Promise<'dispositivo' | 'proxy'> {
  const s = await getSettings();
  const rate = opts.slow ? Math.min(0.75, s.rate) : s.rate;
  if (s.ttsProvider === 'proxy' && s.proxyUrl) {
    try {
      await speakProxy(text, rate, s.proxyUrl, s.proxyToken);
      return 'proxy';
    } catch {
      // Si el proxy falla, recurre a la voz del dispositivo.
    }
  }
  await speakDevice(text, rate, s.voiceURI);
  return 'dispositivo';
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) speechSynthesis.cancel();
  currentAudio?.pause();
}
