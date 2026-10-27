// Práctica oral.
// 1) Transcripción del navegador (SpeechRecognition): dice QUÉ entendió el reconocedor; NO mide fonética.
//    En iPhone funciona en Safari, pero no en la app instalada en la pantalla de inicio (WebKit bug 225298).
// 2) Grabación propia (MediaRecorder): te escuchas y te comparas con el modelo. Funciona sin conexión.

type Recognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function RecognitionCtor(): (new () => Recognition) | null {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => Recognition) | null;
}

export function isStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

export function isIOS(): boolean {
  return /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/** La transcripción está disponible (y se espera que funcione) en este contexto. */
export function canTranscribe(): boolean {
  if (!RecognitionCtor()) return false;
  if (isIOS() && isStandalone()) return false;
  return true;
}

export interface Transcript {
  text: string;
  alternatives: string[];
  confidence: number;
}

export function transcribe(lang = 'fr-FR', timeoutMs = 8000): Promise<Transcript> {
  const Ctor = RecognitionCtor();
  if (!Ctor) return Promise.reject(new Error('no-soportado'));
  return new Promise((resolve, reject) => {
    const r = new Ctor();
    r.lang = lang;
    r.interimResults = false;
    r.maxAlternatives = 3;
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) r.stop();
    }, timeoutMs);
    r.onresult = (e) => {
      settled = true;
      clearTimeout(timer);
      const res = e.results[0];
      const alts = Array.from({ length: res.length }, (_, i) => res[i].transcript);
      resolve({ text: alts[0] ?? '', alternatives: alts, confidence: res[0]?.confidence ?? 0 });
    };
    r.onerror = (e) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(e.error));
    };
    r.onend = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(new Error('sin-voz'));
      }
    };
    r.start();
  });
}

export function canRecord(): boolean {
  return typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

export interface Recording {
  stop(): Promise<Blob>;
}

export async function startRecording(): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((t) => MediaRecorder.isTypeSupported?.(t));
  const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.start();
  return {
    stop: () =>
      new Promise((resolve) => {
        rec.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          resolve(new Blob(chunks, { type: rec.mimeType || 'audio/mp4' }));
        };
        rec.stop();
      })
  };
}
