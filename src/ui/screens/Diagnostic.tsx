// Diagnóstico inicial (informe §8.1): producción escrita por bandas de frecuencia
// + discriminación auditiva de pares mínimos + disponibilidad diaria.
import { useMemo, useRef, useState } from 'react';
import { useData } from '../../state';
import { DIAG_WORDS, MINIMAL_PAIRS } from '../../content/diagnostic';
import { checkPhrase } from '../../engine/text';
import { rng } from '../../engine/session';
import { speak } from '../../services/speech';
import { Icon } from '../common';

type Stage = 'intro' | 'previo' | 'vocab' | 'oido' | 'tiempo' | 'resultado';

export function Diagnostic({ onDone }: { onDone: () => void }) {
  const { completeDiagnostic } = useData();
  const [stage, setStage] = useState<Stage>('intro');
  const [prior, setPrior] = useState<string>('nunca');
  const [wi, setWi] = useState(0);
  const [value, setValue] = useState('');
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [pi, setPi] = useState(0);
  const [pairOk, setPairOk] = useState<boolean[]>([]);
  const [audioFail, setAudioFail] = useState(false);
  const [minutes, setMinutes] = useState(15);
  const [name, setName] = useState('');
  const rand = useRef(rng(Date.now()));
  const pairTargets = useMemo(() => MINIMAL_PAIRS.map(() => (rand.current() < 0.5 ? 'a' : 'b')), []);

  const answerWord = (known: boolean) => {
    const next = [...answers, known];
    setAnswers(next);
    setValue('');
    // Corte adaptativo: si falla las 4 primeras de la banda 1, no tiene sentido seguir.
    const band1Fails = next.slice(0, 6).filter((x) => !x).length;
    if (wi + 1 >= DIAG_WORDS.length || (wi + 1 === 4 && band1Fails === 4)) setStage('oido');
    else setWi(wi + 1);
  };

  const playPair = async () => {
    const p = MINIMAL_PAIRS[pi];
    try {
      await speak(pairTargets[pi] === 'a' ? p.a : p.b);
    } catch {
      setAudioFail(true);
    }
  };

  const band = (b: number) => {
    const idx = DIAG_WORDS.map((w, i) => (w.band === b ? i : -1)).filter((i) => i >= 0 && i < answers.length);
    return { ok: idx.filter((i) => answers[i]).length, n: DIAG_WORDS.filter((w) => w.band === b).length };
  };
  const b1 = band(1), b2 = band(2), b3 = band(3);
  const level =
    b1.ok >= 5 && b2.ok >= 3 && b3.ok >= 1 ? 'A2 o superior (estimado)'
      : b1.ok >= 5 && b2.ok >= 2 ? 'A1 avanzado (estimado)'
        : b1.ok >= 2 || prior !== 'nunca' ? 'A1 inicial (estimado)'
          : 'A0: desde cero';
  const weak = MINIMAL_PAIRS.filter((_, i) => pairOk[i] === false).map((p) => p.contrast);
  const known = DIAG_WORDS.filter((w, i) => answers[i] && w.itemId).map((w) => w.itemId!);

  const finish = async () => {
    const newPerDay = minutes <= 5 ? 3 : minutes <= 10 ? 4 : minutes <= 15 ? 6 : 7;
    await completeDiagnostic({ knownItemIds: known, settings: { minutes, newPerDay, level, phonWeak: weak, userName: name.trim() || undefined } });
    onDone();
  };

  return (
    <div className="app" style={{ paddingBottom: 40 }}>
      <div className="session-top">
        <button className="icon-btn" onClick={onDone} aria-label="Salir del diagnóstico"><Icon name="cerrar" /></button>
        <div className="phase-label">Diagnóstico inicial</div>
      </div>

      {stage === 'intro' && (
        <div className="fade-in">
          <h1>Antes de empezar</h1>
          <p>Unos 5 minutos para saber qué ya sabes y ajustar tu ruta. No es un examen: si no sabes algo, dilo y seguimos.</p>
          <div className="card">
            <h3>Cómo funciona esta app</h3>
            <ul className="small" style={{ paddingLeft: 18, margin: 0 }}>
              <li>Cada palabra se aprende con <b>sonido, imagen y una escena memorable</b>.</li>
              <li>Luego la <b>recuperas sin ver la respuesta</b>: es lo que más fija la memoria.</li>
              <li>Un algoritmo (FSRS) decide <b>cuándo repasar</b> cada palabra, justo antes de olvidarla.</li>
              <li>Nadie aprende un idioma en 7 días. Con 15 minutos diarios, en un mes puedes manejar unas 200 palabras activas y diálogos sencillos.</li>
            </ul>
          </div>
          <div className="field">
            <label htmlFor="name">¿Cómo te llamas? (opcional)</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />
          </div>
          <button className="btn primary big block" onClick={() => setStage('previo')}>Empezar</button>
        </div>
      )}

      {stage === 'previo' && (
        <div className="fade-in">
          <h2>¿Has estudiado francés antes?</h2>
          <div className="stack">
            {[
              ['nunca', 'Nunca, empiezo de cero'],
              ['poco', 'Un poco (algunas palabras, saludos)'],
              ['basico', 'Lo básico (presente, frases simples)'],
              ['intermedio', 'Intermedio (converso con dificultad)']
            ].map(([k, l]) => (
              <button key={k} className={`btn option ${prior === k ? 'correct' : ''}`} aria-pressed={prior === k} onClick={() => setPrior(k)}>{l}</button>
            ))}
          </div>
          <button className="btn primary big block" style={{ marginTop: 14 }} onClick={() => setStage('vocab')}>Siguiente</button>
        </div>
      )}

      {stage === 'vocab' && (
        <div className="fade-in">
          <p className="phase-label">Vocabulario · {wi + 1} de {DIAG_WORDS.length}</p>
          <div className="card prompt-card">
            <div className="eyebrow">¿Cómo se dice en francés?</div>
            <div style={{ fontFamily: 'var(--display)', fontSize: '1.8rem' }}>{DIAG_WORDS[wi].es}</div>
          </div>
          <form className="stack" onSubmit={(e) => { e.preventDefault(); answerWord(checkPhrase(value, DIAG_WORDS[wi].accept)); }}>
            <input className="answer-input" lang="fr" value={value} onChange={(e) => setValue(e.target.value)} autoFocus autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="Escribe en francés…" />
            <button className="btn primary big" disabled={!value.trim()} type="submit">Responder</button>
            <button className="btn ghost" type="button" onClick={() => answerWord(false)}>No la sé</button>
          </form>
          <p className="tiny center">Las respuestas no se corrigen aquí para no influir en las siguientes.</p>
        </div>
      )}

      {stage === 'oido' && (
        <div className="fade-in">
          <p className="phase-label">Oído · {pi + 1} de {MINIMAL_PAIRS.length}</p>
          <div className="card prompt-card">
            <div className="eyebrow">¿Cuál escuchaste?</div>
            <button className="btn big" onClick={playPair}><Icon name="audio" size={28} /> Escuchar</button>
            {audioFail && <p className="small" style={{ marginTop: 8 }}>No hay voz francesa en este dispositivo; puedes saltar esta parte.</p>}
          </div>
          <div className="grid2">
            {(['a', 'b'] as const).map((k) => (
              <button key={k} className="btn big" lang="fr" style={{ fontFamily: 'var(--display)', fontSize: '1.4rem' }} onClick={() => {
                const next = [...pairOk, pairTargets[pi] === k];
                setPairOk(next);
                if (pi + 1 >= MINIMAL_PAIRS.length) setStage('tiempo');
                else setPi(pi + 1);
              }}>
                {MINIMAL_PAIRS[pi][k]}
              </button>
            ))}
          </div>
          <p className="tiny center" style={{ marginTop: 8 }}>Contraste: {MINIMAL_PAIRS[pi].contrast}. Puedes escuchar las veces que quieras.</p>
          <button className="btn ghost block" onClick={() => setStage('tiempo')}>Saltar esta parte</button>
        </div>
      )}

      {stage === 'tiempo' && (
        <div className="fade-in">
          <h2>¿Cuánto tiempo al día?</h2>
          <p className="muted">Esto fija cuántas palabras nuevas verás para que los repasos nunca se acumulen más de lo que puedes hacer.</p>
          <div className="grid2">
            {[5, 10, 15, 20].map((m) => (
              <button key={m} className={`btn big ${minutes === m ? 'dark' : ''}`} aria-pressed={minutes === m} onClick={() => setMinutes(m)}>{m} min</button>
            ))}
          </div>
          <button className="btn primary big block" style={{ marginTop: 14 }} onClick={() => setStage('resultado')}>Ver resultado</button>
        </div>
      )}

      {stage === 'resultado' && (
        <div className="fade-in">
          <div className="card hero">
            <div className="eyebrow">Tu punto de partida</div>
            <h1>{level}</h1>
            <p className="muted">Vocabulario: {b1.ok}/{b1.n} frecuentes · {b2.ok}/{b2.n} intermedias · {b3.ok}/{b3.n} avanzadas.</p>
          </div>
          <div className="card">
            <p>Empezarás por la <b>Unidad 1</b>{known.length ? <>; las {known.length} palabras que ya conoces irán directo a repaso.</> : '.'}</p>
            {weak.length > 0 && <p>Contrastes a vigilar: <b>{weak.join(' · ')}</b>. Las notas de pronunciación te ayudarán.</p>}
            {pairOk.length === 0 && <p className="small muted">No se evaluó el oído (sin audio).</p>}
            {level.startsWith('A2') && <p className="small">Por ahora la app tiene contenido A1: úsala como repaso rápido; la ruta A2–B2 se irá ampliando.</p>}
            <p className="tiny">Estimación orientativa alineada con el MCER; no es una certificación.</p>
          </div>
          <button className="btn primary big block" onClick={finish}>Guardar y empezar</button>
        </div>
      )}
    </div>
  );
}
