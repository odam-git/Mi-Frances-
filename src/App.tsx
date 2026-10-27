import { useEffect, useState } from 'react';
import { useData } from './state';
import { Home } from './ui/screens/Home';
import { Route } from './ui/screens/Route';
import { Memory } from './ui/screens/Memory';
import { Library } from './ui/screens/Library';
import { Progress } from './ui/screens/Progress';
import { Settings } from './ui/screens/Settings';
import { SessionRunner } from './ui/screens/SessionRunner';
import { Diagnostic } from './ui/screens/Diagnostic';
import { Icon } from './ui/common';
import type { SessionRecord } from './engine/session';

const TABS: [string, string][] = [['hoy', 'Hoy'], ['ruta', 'Ruta'], ['memoria', 'Memoria'], ['palabras', 'Palabras'], ['progreso', 'Progreso']];

function readTab(): string {
  try {
    return localStorage.getItem('mf-tab') ?? 'hoy';
  } catch {
    return 'hoy';
  }
}

export default function App() {
  const data = useData();
  const [tab, setTab] = useState(readTab);
  const [sub, setSub] = useState('palacio');
  const [overlay, setOverlay] = useState<'session' | 'diagnostic' | null>(null);
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('mf-tab', tab);
    } catch {
      /* almacenamiento no disponible: no pasa nada */
    }
    window.scrollTo({ top: 0 });
  }, [tab]);

  useEffect(() => {
    const t = data.settings.theme;
    if (!t || t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
  }, [data.settings.theme]);

  if (!data.ready) return <div className="app center" style={{ paddingTop: 80 }}><p className="muted">Cargando…</p></div>;

  const start = async (mode: SessionRecord['mode'], minutes?: number) => {
    const s = await data.startSession(mode, minutes);
    if (!s) {
      setNotice('No hay nada pendiente ahora mismo: ya repasaste todo y alcanzaste el tope de palabras nuevas de hoy. ¡Vuelve mañana!');
      return;
    }
    setSession(s);
    setOverlay('session');
  };

  if (overlay === 'session' && session) {
    return <SessionRunner key={session.id} session={session} onExit={() => { setOverlay(null); setSession(null); data.reload(); }} />;
  }
  if (overlay === 'diagnostic') return <Diagnostic onDone={() => setOverlay(null)} />;

  const go = (t: string, s?: string) => {
    setTab(t);
    if (s) setSub(s);
  };

  return (
    <>
      <div className="app">
        <header className="topbar">
          <div className="brand"><span className="brand-mark" aria-hidden="true">Fr</span> MI FRANCÉS</div>
          <button className="icon-btn" aria-label="Ajustes" onClick={() => setTab('ajustes')}><Icon name="ajustes" /></button>
        </header>
        {notice && (
          <div className="notice info" role="status">
            {notice} <button className="btn sm ghost" onClick={() => setNotice(null)}>Cerrar</button>
          </div>
        )}
        <main>
          {tab === 'hoy' && (
            <Home
              onStart={(m) => start('diaria', m)}
              onResume={() => { if (data.active) { setSession(data.active); setOverlay('session'); } }}
              onDiagnostic={() => setOverlay('diagnostic')}
              onGo={go}
            />
          )}
          {tab === 'ruta' && <Route onExam={() => start('examen')} />}
          {tab === 'memoria' && <Memory sub={sub} setSub={setSub} />}
          {tab === 'palabras' && <Library />}
          {tab === 'progreso' && <Progress />}
          {tab === 'ajustes' && <Settings onRedoDiagnostic={() => setOverlay('diagnostic')} />}
        </main>
      </div>
      <nav className="tabbar" aria-label="Navegación principal">
        <div className="tabbar-inner">
          {TABS.map(([k, l]) => (
            <button key={k} className="tab" aria-current={tab === k ? 'page' : undefined} onClick={() => setTab(k)}>
              <Icon name={k} />
              {l}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
