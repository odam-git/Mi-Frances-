import { useEffect, useMemo, useState } from 'react';
import { useData } from '../../state';
import { activeDays, nextAction, overview, streak } from '../../engine/stats';
import { estimateMinutes, PHASE_LABEL } from '../../engine/session';
import { requestPersistence } from '../../db/db';
import { isIOS, isStandalone } from '../../services/voice';
import { audioStatus } from '../../services/speech';
import { DIALOGUES } from '../../content/dialogues';

export function Home({ onStart, onResume, onDiagnostic, onGo }: { onStart: (minutes: number) => void; onResume: () => void; onDiagnostic: () => void; onGo: (tab: string, sub?: string) => void }) {
  const { items, cards, reviews, sessions, settings, active } = useData();
  const now = new Date();
  const o = useMemo(() => overview(items, cards, now, settings.retention), [items, cards, settings.retention]); // eslint-disable-line react-hooks/exhaustive-deps
  const days = useMemo(() => activeDays(sessions, reviews), [sessions, reviews]);
  const st = streak(days, now);
  const action = nextAction(!!active, settings.diagnosticDone, o, st.practicedToday);
  const [minutes, setMinutes] = useState(settings.minutes);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [audio, setAudio] = useState<string>('ok');
  useEffect(() => {
    setMinutes(settings.minutes);
  }, [settings.minutes]);
  useEffect(() => {
    requestPersistence().then(setPersisted);
    audioStatus().then(setAudio);
  }, []);

  const hour = now.getHours();
  const greet = hour < 12 ? 'Bonjour' : hour < 19 ? 'Bon après-midi' : 'Bonsoir';
  const backupDays = settings.lastBackupAt ? (now.getTime() - new Date(settings.lastBackupAt).getTime()) / 86_400_000 : Infinity;
  const remaining = active ? active.steps.length - active.cursor : 0;

  return (
    <div className="fade-in">
      <p className="eyebrow">{now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      <h1 lang="fr">{greet}{settings.userName ? `, ${settings.userName}` : ''}.</h1>

      <div className="card hero" style={{ marginTop: 14 }}>
        <div className="eyebrow">Tu siguiente paso</div>
        <h2 style={{ marginTop: 0 }}>{action.label}</h2>
        <p className="muted">
          {action.kind === 'resume' && active ? `Vas en «${PHASE_LABEL[active.steps[active.cursor]?.phase ?? 'cierre']}» · quedan ${remaining} pasos (~${estimateMinutes(active.steps.slice(active.cursor))} min).` : action.detail}
        </p>
        {action.kind === 'diagnostic' && <button className="btn light big block" onClick={onDiagnostic}>Empezar diagnóstico</button>}
        {action.kind === 'resume' && (
          <div className="stack">
            <button className="btn light big block" onClick={onResume}>Continuar</button>
            <button className="btn ghost sm" onClick={() => onStart(minutes)}>Empezar una sesión nueva</button>
          </div>
        )}
        {action.kind === 'session' && (
          <>
            <div className="row" role="group" aria-label="Duración de la sesión" style={{ marginBottom: 12 }}>
              {[5, 10, 15, 20].map((m) => (
                <button key={m} className="chip" aria-pressed={minutes === m} onClick={() => setMinutes(m)}>
                  {m} min
                </button>
              ))}
            </div>
            <button className="btn light big block" onClick={() => onStart(minutes)}>{minutes <= 5 ? 'Sesión breve' : 'Empezar'}</button>
          </>
        )}
        {action.kind === 'free' && (
          <div className="stack">
            <button className="btn light big block" onClick={() => onGo('memoria', 'practicar')}>Practicar un diálogo</button>
            <button className="btn ghost" onClick={() => onStart(minutes)}>Sesión de repaso de todos modos</button>
          </div>
        )}
      </div>

      <div className="grid3">
        <div className="stat"><b>{o.due}</b><span>repasos pendientes</span></div>
        <div className="stat"><b>{o.learned}</b><span>aprendidas (≥ 7 días)</span></div>
        <div className="stat"><b>{st.current}</b><span>{st.current === 1 ? 'día' : 'días'} de racha{st.practicedToday ? ' ✓' : ''}</span></div>
      </div>
      <p className="tiny" style={{ marginTop: 6 }}>La racha tolera un día de descanso por semana: perder un día no borra tu esfuerzo.</p>

      {o.forgotten > 0 && (
        <div className="notice warn">Hay <b>{o.forgotten}</b> palabra{o.forgotten > 1 ? 's' : ''} que empieza{o.forgotten > 1 ? 'n' : ''} a olvidarse: la sesión de hoy las rescata primero.</div>
      )}
      {audio !== 'ok' && (
        <div className="notice warn small">
          {audio === 'sin-voz-francesa'
            ? <>Tu dispositivo no tiene una voz francesa. En iPhone: <b>Ajustes → Accesibilidad → Contenido leído → Voces → Francés</b> (elige una voz «mejorada»).</>
            : 'Este navegador no permite reproducir voz sintética. Los ejercicios mostrarán el texto en su lugar.'}
        </div>
      )}
      {isIOS() && !isStandalone() && (
        <div className="notice info small">
          <b>Instala la app en tu iPhone</b> para que tus datos estén mejor protegidos: botón <b>Compartir</b> → <b>Agregar a pantalla de inicio</b>. Ojo: el progreso de Safari y el de la app instalada se guardan por separado; si ya avanzaste aquí, exporta un respaldo e impórtalo en la app.
        </div>
      )}
      {reviews.length > 20 && backupDays > 7 && (
        <div className="notice small">
          {settings.lastBackupAt ? `Tu último respaldo fue hace ${Math.floor(backupDays)} días.` : 'Aún no has hecho un respaldo.'} Tus avances viven solo en este dispositivo.{' '}
          <button className="btn sm" onClick={() => onGo('ajustes')}>Hacer respaldo</button>
        </div>
      )}
      {persisted === false && <p className="tiny">El navegador no garantizó almacenamiento persistente; haz respaldos con regularidad.</p>}

      <h2>Practicar</h2>
      <div className="grid2">
        <button className="card flat" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => onGo('memoria', 'practicar')}>
          <div style={{ fontSize: '1.6rem' }}>💬</div>
          <b>Diálogos</b>
          <div className="tiny">{DIALOGUES.length} situaciones guiadas</div>
        </button>
        <button className="card flat" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => onGo('memoria', 'tutor')}>
          <div style={{ fontSize: '1.6rem' }}>🎓</div>
          <b>Tutor IA</b>
          <div className="tiny">{settings.proxyUrl ? 'Conversación libre' : 'Requiere configuración'}</div>
        </button>
        <button className="card flat" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => onGo('memoria', 'recorrido')}>
          <div style={{ fontSize: '1.6rem' }}>🏛️</div>
          <b>Recorrido mental</b>
          <div className="tiny">Recupera palabras por lugar</div>
        </button>
        <button className="card flat" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => onGo('palabras')}>
          <div style={{ fontSize: '1.6rem' }}>🖼️</div>
          <b>Mis asociaciones</b>
          <div className="tiny">{o.unseen} por descubrir</div>
        </button>
      </div>
    </div>
  );
}
