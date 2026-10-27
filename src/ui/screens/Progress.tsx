import { useMemo } from 'react';
import { useData } from '../../state';
import { achievements, activeDays, dayKey, delayedRetention, overview, skillStats, streak } from '../../engine/stats';
import { State } from '../../engine/srs';

export function Progress() {
  const { items, cards, reviews, sessions, palaces, settings } = useData();
  const now = new Date();
  const o = useMemo(() => overview(items, cards, now, settings.retention), [items, cards, settings.retention]); // eslint-disable-line react-hooks/exhaustive-deps
  const days = useMemo(() => activeDays(sessions, reviews), [sessions, reviews]);
  const st = streak(days, now);
  const skills = skillStats(reviews.filter((r) => r.exercise !== 'hablar-autoevaluado'), now);
  const ret = delayedRetention(reviews);
  const placed = palaces.reduce((n, p) => n + p.rooms.reduce((m, r) => m + r.positions.filter((x) => x.itemId).length, 0), 0);
  const ach = achievements(o, reviews, sessions, days, placed);
  const done = sessions.filter((s) => s.status !== 'activa').slice(-12).reverse();

  // Calendario de 12 semanas (columnas = semanas, filas = días).
  const weeks = 12;
  const start = new Date(now);
  start.setDate(start.getDate() - (weeks * 7 - 1));
  const cells = Array.from({ length: weeks * 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  // Pronóstico de repasos para los próximos 7 días.
  const forecast = Array.from({ length: 7 }, (_, i) => {
    const end = new Date(now);
    end.setDate(end.getDate() + i);
    end.setHours(23, 59, 59);
    const begin = new Date(end);
    begin.setHours(0, 0, 0);
    const n = cards.filter((c) => c.fsrs.state !== State.New && c.fsrs.due <= end && (i === 0 || c.fsrs.due >= begin)).length;
    return { label: i === 0 ? 'hoy' : end.toLocaleDateString('es-MX', { weekday: 'short' }).slice(0, 3), n };
  });
  const maxF = Math.max(1, ...forecast.map((f) => f.n));

  return (
    <div className="fade-in">
      <p className="eyebrow">Progreso</p>
      <h1>Lo que de verdad sabes</h1>
      <p className="small muted">Medimos memoria real (estabilidad y recuerdo diferido), no puntos.</p>

      <div className="grid3" style={{ marginTop: 12 }}>
        <div className="stat"><b>{o.learned}</b><span>aprendidas</span></div>
        <div className="stat"><b>{o.learning}</b><span>aprendiendo</span></div>
        <div className="stat"><b>{o.due}</b><span>repasos pendientes</span></div>
        <div className="stat"><b>{o.forgotten}</b><span>olvidándose</span></div>
        <div className="stat"><b>{o.unseen}</b><span>por descubrir</span></div>
        <div className="stat"><b>{st.current}</b><span>días de racha</span></div>
      </div>

      <h2>Memoria profunda</h2>
      <div className="card">
        <div className="row between"><span>Almacenamiento profundo (producción, estabilidad ≥ 21 días)</span><b>{o.deep}</b></div>
        <div className="row between"><span>Acceso directo (&lt; 2 s, sin pistas, estabilidad &gt; 14 días)</span><b>{o.direct}</b></div>
        <div className="row between"><span>Retención diferida real (intervalos &gt; 14 días)</span><b>{ret.rate === null ? '—' : `${Math.round(ret.rate * 100)}% (${ret.n})`}</b></div>
        <div className="row between"><span>Palabras «sanguijuela» (necesitan nueva asociación)</span><b>{o.leeches}</b></div>
        <p className="tiny" style={{ marginTop: 6 }}>La retención diferida aparecerá cuando tengas repasos con más de dos semanas de intervalo. Objetivo: 88–92%.</p>
      </div>

      <h2>Destrezas (últimos 30 días)</h2>
      <div className="card">
        {skills.map((s) => (
          <div key={s.skill} style={{ marginBottom: 10 }}>
            <div className="row between small"><span>{s.label}</span><span className="muted">{s.accuracy === null ? 'sin datos' : `${Math.round(s.accuracy * 100)}% · ${s.n} respuestas`}</span></div>
            <div className="bar ok"><i style={{ width: `${(s.accuracy ?? 0) * 100}%` }} /></div>
          </div>
        ))}
        <p className="tiny">Expresión oral: solo cuenta la transcripción del navegador (no es evaluación fonética). Las autoevaluaciones de grabación no se incluyen.</p>
      </div>

      <h2>Próximos 7 días</h2>
      <div className="card">
        <div className="forecast" role="img" aria-label={`Repasos previstos: ${forecast.map((f) => `${f.label} ${f.n}`).join(', ')}`}>
          {forecast.map((f) => (
            <div key={f.label}><span>{f.n}</span><i style={{ height: `${(f.n / maxF) * 60}px` }} /><span>{f.label}</span></div>
          ))}
        </div>
      </div>

      <h2>Constancia</h2>
      <div className="card">
        <div className="heat" role="img" aria-label={`${days.size} días con práctica en total`}>
          {Array.from({ length: weeks }, (_, w) => (
            <div key={w} className="heat-col">
              {cells.slice(w * 7, w * 7 + 7).map((d) => (
                <i key={d.toISOString()} className={`${days.has(dayKey(d)) ? 'on' : ''} ${dayKey(d) === dayKey(now) ? 'today' : ''}`} title={d.toLocaleDateString('es-MX')} />
              ))}
            </div>
          ))}
        </div>
        <p className="tiny" style={{ marginTop: 8 }}>{days.size} días de práctica en total.</p>
      </div>

      <h2>Logros</h2>
      <div className="grid2">
        {ach.map((a) => (
          <div key={a.id} className={`ach ${a.done ? 'done' : ''}`}>
            <span className="medal" aria-hidden="true">🏅</span>
            <div><b className="small">{a.title}</b><div className="tiny">{a.desc}</div></div>
            <span className="sr-only">{a.done ? 'conseguido' : 'pendiente'}</span>
          </div>
        ))}
      </div>

      <h2>Historial de sesiones</h2>
      <div className="card" style={{ padding: 8 }}>
        {done.length === 0 && <p className="muted center" style={{ padding: 12 }}>Aún no hay sesiones.</p>}
        {done.map((s) => {
          const rec = s.results.filter((r) => r.kind === 'review');
          const ok = rec.filter((r) => r.correct).length;
          const mins = s.endedAt ? Math.max(1, Math.round((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 60000)) : null;
          return (
            <div key={s.id} className="row between" style={{ padding: '8px 6px', borderBottom: '1px solid var(--line)' }}>
              <span className="small">
                {new Date(s.startedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} · {s.mode === 'examen' ? 'Examen' : 'Sesión'}{mins ? ` · ${mins} min` : ''}
                {s.status === 'abandonada' && <span className="tiny"> (sin terminar)</span>}
              </span>
              <span className="small muted">{s.newItemIds.length} nuevas · {rec.length ? `${Math.round((ok / rec.length) * 100)}%` : '—'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
