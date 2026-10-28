// Audio de pronunciación. Proveedor por defecto: voz francesa del dispositivo (Web Speech API, gratis).
// Proveedor opcional: voz neural servida por tu proxy (Azure TTS), cacheada en el dispositivo.
//
// IMPORTANTE (iPhone/Safari): speechSynthesis.speak() solo suena si se llama dentro del mismo
// gesto del usuario (el toque). Cualquier espera previa (leer IndexedDB, esperar voces) rompe
// ese vínculo y Safari descarta el audio sin avisar. Por eso la configuración y las voces se
// mantienen en memoria y la ruta del dispositivo llama a speak() de forma síncrona.
import { db, type Settings } from '../db/db';

export type AudioStatus = 'ok' | 'sin-voz-francesa' | 'no-soportado';

interface SpeechConfig {
  rate: number;
  voiceURI?: string;
  provider: Settings['ttsProvider'];
  proxyUrl?: string;
  proxyToken?: string;
}

let config: SpeechConfig = { rate: 0.9, provider: 'dispositivo' };

/** El estado global llama a esta función cada vez que cambian los ajustes. */
export function configureSpeech(s: Pick<Settings, 'rate' | 'voiceURI' | 'ttsProvider' | 'proxyUrl' | 'proxyToken'>) {
  config = { rate: s.rate, voiceURI: s.voiceURI, provider: s.ttsProvider, proxyUrl: s.proxyUrl, proxyToken: s.proxyToken };
}

const supported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

let cachedVoices: SpeechSynthesisVoice[] = [];
let voicesLoaded = false;
let voicesReady: Promise<SpeechSynthesisVoice[]> | null = null;

function refreshVoices() {
  if (!supported()) return;
  const v = speechSynthesis.getVoices();
  if (v.length) {
    cachedVoices = v;
    voicesLoaded = true;
  }
}

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!supported()) return Promise.resolve([]);
  if (!voicesReady) {
    voicesReady = new Promise((resolve) => {
      refreshVoices();
      if (cachedVoices.length) return resolve(cachedVoices);
      const done = () => {
        refreshVoices();
        voicesLoaded = true;
        resolve(cachedVoices);
      };
      speechSynthesis.addEventListener('voiceschanged', done, { once: true });
      setTimeout(done, 1500); // iOS a veces no dispara el evento
    });
  }
  return voicesReady;
}

// Carga las voces en cuanto arranca la app, para tenerlas listas antes del primer toque.
if (supported()) {
  loadVoices();
  speechSynthesis.addEventListener?.('voiceschanged', refreshVoices);
  // Safari exige que la PRIMERA síntesis nazca de un toque. Con el primer toque en cualquier parte
  // se emite una frase muda: después, los audios automáticos (dictados, diálogos) ya pueden sonar.
  const unlock = () => {
    try {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      u.lang = 'fr-FR';
      speechSynthesis.speak(u);
    } catch {
      /* sin síntesis: no pasa nada */
    }
  };
  document.addEventListener('touchend', unlock, { once: true, capture: true });
  document.addEventListener('click', unlock, { once: true, capture: true });
}

const isFrench = (v: SpeechSynthesisVoice) => v.lang.replace('_', '-').toLowerCase().startsWith('fr');

export async function frenchVoices(): Promise<SpeechSynthesisVoice[]> {
  return (await loadVoices()).filter(isFrench);
}

/** Elige (sin esperas) la mejor voz francesa disponible; prefiere Francia y voces «mejoradas». */
function pickVoiceSync(preferredURI?: string): SpeechSynthesisVoice | null {
  refreshVoices();
  const fr = cachedVoices.filter(isFrench);
  if (!fr.length) return null;
  const chosen = preferredURI && fr.find((v) => v.voiceURI === preferredURI);
  if (chosen) return chosen;
  const score = (v: SpeechSynthesisVoice) =>
    (v.lang.replace('_', '-').toLowerCase() === 'fr-fr' ? 10 : 0) +
    (/premium|enhanced|améliorée|mejorada|natural|neural/i.test(v.name) ? 5 : 0) +
    (/google|amélie|thomas|audrey|aurélie|marie/i.test(v.name) ? 2 : 0) +
    (v.localService ? 1 : 0);
  return [...fr].sort((a, b) => score(b) - score(a))[0];
}

export async function audioStatus(): Promise<AudioStatus> {
  if (!supported()) return 'no-soportado';
  return (await frenchVoices()).length ? 'ok' : 'sin-voz-francesa';
}

/** Habla con la voz del dispositivo. Debe llamarse de forma síncrona desde el toque del usuario. */
function speakDevice(text: string, rate: number): Promise<void> {
  if (!supported()) return Promise.reject(new Error('no-soportado'));
  const voice = pickVoiceSync(config.voiceURI);
  // Si las voces ya cargaron y no hay ninguna francesa, avisa. Si aún no cargaron (iOS tarda),
  // se habla igualmente con lang=fr-FR: el sistema elige su voz francesa por defecto.
  if (!voice && voicesLoaded && cachedVoices.length) return Promise.reject(new Error('sin-voz-francesa'));
  // cancel() justo antes de speak() puede descartar el nuevo audio en Safari: solo si hace falta.
  if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel();
  return new Promise((resolve, reject) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = voice?.lang ?? 'fr-FR';
    if (voice) u.voice = voice;
    u.rate = rate;
    u.onend = () => resolve();
    u.onerror = (e) => (e.error === 'interrupted' || e.error === 'canceled' ? resolve() : reject(new Error(e.error)));
    speechSynthesis.speak(u);
    // Safari a veces deja la síntesis en pausa tras volver de segundo plano.
    if (speechSynthesis.paused) speechSynthesis.resume();
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
 * La ruta del dispositivo llama a speechSynthesis.speak() antes de cualquier espera.
 */
export function speak(text: string, opts: { slow?: boolean } = {}): Promise<'dispositivo' | 'proxy'> {
  const rate = opts.slow ? Math.min(0.75, config.rate) : config.rate;
  if (config.provider === 'proxy' && config.proxyUrl) {
    return speakProxy(text, rate, config.proxyUrl, config.proxyToken)
      .then(() => 'proxy' as const)
      .catch(() => speakDevice(text, rate).then(() => 'dispositivo' as const));
  }
  return speakDevice(text, rate).then(() => 'dispositivo' as const);
}

export function stopSpeaking() {
  if (supported()) speechSynthesis.cancel();
  currentAudio?.pause();
}
