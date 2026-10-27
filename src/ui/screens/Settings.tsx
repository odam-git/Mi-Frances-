import { useEffect, useRef, useState } from 'react';
import { useData } from '../../state';
import { downloadBackup, importBackup, resetAll } from '../../db/backup';
import { requestPersistence } from '../../db/db';
import { frenchVoices, speak } from '../../services/speech';
import { proxyHealth } from '../../services/tutor';
import { canTranscribe, isIOS, isStandalone } from '../../services/voice';

export function Settings({ onRedoDiagnostic }: { onRedoDiagnostic: () => void }) {
  const { settings, updateSettings, reload, reviews, cards } = useData();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [persist, setPersist] = useState<boolean | null>(null);
  const [health, setHealth] = useState<string | null>(null);
  const [proxyUrl, setProxyUrl] = useState(settings.proxyUrl ?? '');
  const [proxyToken, setProxyToken] = useState(settings.proxyToken ?? '');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    frenchVoices().then(setVoices);
    requestPersistence().then(setPersist);
  }, []);

  const set = (patch: Parameters<typeof updateSettings>[0]) => updateSettings(patch);

  return (
    <div className="fade-in">
      <p className="eyebrow">Ajustes</p>
      <h1>Configuración</h1>

      <h2>Estudio</h2>
      <div className="card">
        <div className="field">
          <label htmlFor="min">Duración de la sesión diaria</label>
          <select id="min" value={settings.minutes} onChange={(e) => set({ minutes: Number(e.target.value) })}>
            {[5, 10, 15, 20].map((m) => <option key={m} value={m}>{m} minutos</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="npd">Máximo de palabras nuevas al día</label>
          <select id="npd" value={settings.newPerDay} onChange={(e) => set({ newPerDay: Number(e.target.value) })}>
            {[2, 3, 4, 5, 6, 7, 8, 10].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <span className="tiny">El informe recomienda 5–7 para 15–20 min. Más palabras = más repasos futuros.</span>
        </div>
        <div className="field">
          <label htmlFor="ret">Exigencia de memoria (retención objetivo)</label>
          <select id="ret" value={settings.retention} onChange={(e) => set({ retention: Number(e.target.value) })}>
            <option value={0.85}>85 % — menos repasos</option>
            <option value={0.9}>90 % — recomendado</option>
            <option value={0.95}>95 % — más repasos</option>
          </select>
        </div>
        <div className="toggle"><span>Mostrar transcripción fonética (IPA)</span><input type="checkbox" checked={settings.showIpa} onChange={(e) => set({ showIpa: e.target.checked })} aria-label="Mostrar IPA" /></div>
        <div className="field" style={{ marginTop: 10 }}>
          <label htmlFor="name">Tu nombre</label>
          <input id="name" defaultValue={settings.userName ?? ''} onBlur={(e) => set({ userName: e.target.value.trim() || undefined })} />
        </div>
        <button className="btn sm" onClick={onRedoDiagnostic}>Repetir diagnóstico</button>
        {settings.level && <span className="tiny" style={{ marginLeft: 8 }}>Nivel estimado: {settings.level}</span>}
      </div>

      <h2>Audio</h2>
      <div className="card">
        <div className="toggle"><span>Ejercicios con audio</span><input type="checkbox" checked={settings.sound} onChange={(e) => set({ sound: e.target.checked })} aria-label="Ejercicios con audio" /></div>
        <div className="field" style={{ marginTop: 10 }}>
          <label htmlFor="voice">Voz francesa</label>
          <select id="voice" value={settings.voiceURI ?? ''} onChange={(e) => set({ voiceURI: e.target.value || undefined })}>
            <option value="">Automática (la mejor disponible)</option>
            {voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
          </select>
          {!voices.length && <span className="tiny">No se detectan voces francesas. En iPhone: Ajustes → Accesibilidad → Contenido leído → Voces → Francés (descarga una voz «mejorada»).</span>}
        </div>
        <div className="field">
          <label htmlFor="rate">Velocidad normal: {settings.rate.toFixed(2)}×</label>
          <input id="rate" type="range" min={0.6} max={1.1} step={0.05} value={settings.rate} onChange={(e) => set({ rate: Number(e.target.value) })} />
        </div>
        <button className="btn sm" onClick={() => speak("Bonjour ! Je m'appelle Marie. Enchantée.").catch((e) => setMsg(`Audio: ${(e as Error).message}`))}>Probar voz</button>
        <p className="tiny" style={{ marginTop: 8 }}>
          La voz es la síntesis de tu dispositivo (gratis, funciona sin conexión si la voz está descargada). No es una grabación de un hablante nativo.
          Reconocimiento de voz: {canTranscribe() ? 'disponible en este navegador (transcripción, no evaluación fonética).' : isIOS() && isStandalone() ? 'no disponible en la app instalada de iPhone; se usa grabación y autocomparación.' : 'no disponible; se usa grabación y autocomparación.'}
        </p>
      </div>

      <h2>Apariencia</h2>
      <div className="card">
        <div className="row" role="group" aria-label="Tema">
          {(['auto', 'claro', 'oscuro'] as const).map((t) => <button key={t} className="chip" aria-pressed={settings.theme === t} onClick={() => set({ theme: t })}>{t === 'auto' ? 'Automático' : t === 'claro' ? 'Claro' : 'Oscuro'}</button>)}
        </div>
      </div>

      <h2>Tus datos</h2>
      <div className="card">
        <p className="small">Tu progreso se guarda <b>solo en este dispositivo</b> ({cards.length} tarjetas, {reviews.length} respuestas). No se sincroniza entre iPhone y computadora: usa el respaldo para llevarlo de uno a otro.</p>
        <p className="tiny">Almacenamiento persistente: {persist === true ? 'concedido ✓' : persist === false ? 'no concedido (haz respaldos frecuentes)' : 'no disponible en este navegador'}.
          {settings.lastBackupAt && <> Último respaldo: {new Date(settings.lastBackupAt).toLocaleString('es-MX')}.</>}</p>
        <div className="stack">
          <button className="btn primary" onClick={async () => { try { const n = await downloadBackup(); setMsg(`Respaldo creado: ${n}. En iPhone, elige «Guardar en Archivos».`); await reload(); } catch (e) { if ((e as Error).name !== 'AbortError') setMsg(`No se pudo exportar: ${(e as Error).message}`); } }}>Exportar respaldo (archivo .json)</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Importar respaldo…</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            if (!confirm('Importar reemplazará TODO el progreso actual de este dispositivo por el del archivo. ¿Continuar?')) return;
            try {
              const r = await importBackup(await f.text());
              await reload();
              setMsg(`Respaldo importado: ${r.cards} tarjetas y ${r.reviews} respuestas.`);
            } catch (err) {
              setMsg((err as Error).message);
            }
          }} />
          <button className="btn danger ghost" onClick={async () => {
            if (prompt('Esto borra todo tu progreso de este dispositivo. Escribe BORRAR para confirmar.') !== 'BORRAR') return;
            await resetAll();
            await reload();
            setMsg('Datos borrados.');
          }}>Borrar todos mis datos</button>
        </div>
        {msg && <div className="notice info small" role="status" style={{ marginTop: 10 }}>{msg}</div>}
      </div>

      <h2>Servicios externos (opcional)</h2>
      <div className="card">
        <p className="small">Para el <b>tutor de IA</b> y la <b>voz neural</b> necesitas tu propio servidor intermedio (gratuito en Cloudflare) con tus claves guardadas allí. La app nunca guarda claves de API. Guía: <code>server/README.md</code>.</p>
        <div className="field"><label htmlFor="purl">Dirección del servidor</label><input id="purl" inputMode="url" placeholder="https://mi-frances-proxy.tu-usuario.workers.dev" value={proxyUrl} onChange={(e) => setProxyUrl(e.target.value)} /></div>
        <div className="field"><label htmlFor="ptok">Contraseña de la app (APP_TOKEN, no es la clave de API)</label><input id="ptok" type="password" value={proxyToken} onChange={(e) => setProxyToken(e.target.value)} autoComplete="off" /></div>
        <div className="row">
          <button className="btn sm primary" onClick={async () => { await set({ proxyUrl: proxyUrl.trim() || undefined, proxyToken: proxyToken || undefined }); setHealth(null); }}>Guardar</button>
          <button className="btn sm" disabled={!settings.proxyUrl} onClick={async () => { const h = await proxyHealth(); setHealth(h ? `Conectado. Tutor: ${h.tutor ? 'sí' : 'no'} · Voz neural: ${h.tts ? 'sí' : 'no'}` : 'No se pudo conectar.'); }}>Probar conexión</button>
        </div>
        {health && <p className="small" role="status" style={{ marginTop: 8 }}>{health}</p>}
        <div className="field" style={{ marginTop: 10 }}>
          <label htmlFor="tts">Fuente de audio</label>
          <select id="tts" value={settings.ttsProvider} onChange={(e) => set({ ttsProvider: e.target.value as 'dispositivo' | 'proxy' })} disabled={!settings.proxyUrl}>
            <option value="dispositivo">Voz del dispositivo (gratis)</option>
            <option value="proxy">Voz neural de Azure vía mi servidor (se guarda en caché)</option>
          </select>
        </div>
      </div>
      <p className="tiny center">MI FRANCÉS v1.0 · contenido A1 revisado · algoritmo FSRS-6 (ts-fsrs 5.4.2)</p>
    </div>
  );
}
