import { useEffect, useMemo, useRef, useState } from 'react';
import type { EffItem } from '../../state';
import { useData } from '../../state';
import { rng, shuffle } from '../../engine/session';
import { checkPhrase, normalize, stripAccents, tokenize } from '../../engine/text';
import { DIALOGUES } from '../../content/dialogues';
import { speak } from '../../services/speech';
import { canRecord, canTranscribe, startRecording, transcribe, type Recording } from '../../services/voice';
import { askTutor, type TutorReply } from '../../services/tutor';
import { FrWord, Icon, Scene, SpeakButtons, displayFr } from '../common';
import { useDragDrop, wasDragged } from '../drag';

type Log = (p: { itemId: string; exercise: string; skill: 'lectura' | 'auditiva' | 'escritura' | 'oral'; correct: boolean; answer?: string; latencyMs?: number; hints?: number }) => Promise<void>;

// ── Arrastrar imágenes hacia palabras ───────────────────────────────────────
export function Match({ items, onLog, onNext }: { items: EffItem[]; onLog: Log; onNext: (correct: boolean) => void }) {
  const order = useMemo(() => shuffle(items.map((i) => i.id), rng(items.length * 7919)), [items]);
  const [placed, setPlaced] = useState<Record<string, string>>({}); // slot(itemId palabra) → itemId imagen
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const byId = new Map(items.map((i) => [i.id, i]));
  const place = (img: string, slot: string) => {
    if (checked) return;
    setPlaced((p) => {
      const n = { ...p };
      for (const k of Object.keys(n)) if (n[k] === img) delete n[k];
      n[slot] = img;
      return n;
    });
    setSelected(null);
  };
  const { bind, ghost, over } = useDragDrop((payload, target) => place(payload, target));
  const free = order.filter((id) => !Object.values(placed).includes(id));
  const allPlaced = Object.keys(placed).length === items.length;

  const check = async () => {
    setChecked(true);
    for (const it of items) await onLog({ itemId: it.id, exercise: 'relacionar', skill: 'lectura', correct: placed[it.id] === it.id });
  };
  const allOk = items.every((it) => placed[it.id] === it.id);

  return (
    <div className="fade-in">
      <div className="card">
        <div className="eyebrow">Arrastra cada imagen hacia su palabra</div>
        <p className="tiny">También puedes tocar una imagen y luego la palabra.</p>
        <div className="tiles" aria-label="Imágenes disponibles">
          {free.map((id) => (
            <button
              key={id}
              className={`tile ${selected === id ? 'selected' : ''}`}
              aria-pressed={selected === id}
              aria-label={`Imagen ${byId.get(id)!.assoc.scene.main}`}
              {...bind(id, <Scene item={byId.get(id)!} size="tiny" muted />)}
              onClick={(e) => !wasDragged(e.currentTarget) && setSelected(selected === id ? null : id)}
              style={{ padding: 4, borderRadius: '50%' }}
            >
              <Scene item={byId.get(id)!} size="tiny" muted />
            </button>
          ))}
          {!free.length && <span className="tiny">Todas colocadas.</span>}
        </div>
        <div className="stack" style={{ marginTop: 10 }}>
          {items.map((it) => {
            const img = placed[it.id];
            const state = checked ? (img === it.id ? 'ok' : 'bad') : '';
            return (
              <button
                key={it.id}
                data-drop={it.id}
                className={`drop-slot ${img ? 'filled' : ''} ${over === it.id ? 'over' : ''} ${state}`}
                onClick={() => {
                  if (selected) place(selected, it.id);
                  else if (img && !checked) setPlaced((p) => { const n = { ...p }; delete n[it.id]; return n; });
                }}
                aria-label={`Palabra ${displayFr(it)}${img ? ', con imagen colocada' : ''}`}
              >
                {img ? <Scene item={byId.get(img)!} size="tiny" muted /> : <span className="scene tiny" aria-hidden="true" />}
                <FrWord item={it} big={false} />
                {checked && img !== it.id && <span className="small muted">→ {it.assoc.scene.main} {it.es}</span>}
              </button>
            );
          })}
        </div>
      </div>
      {ghost}
      {!checked ? (
        <button className="btn primary big block" disabled={!allPlaced} onClick={check}>Comprobar</button>
      ) : (
        <>
          <div className={`feedback ${allOk ? 'ok' : 'bad'}`} role="status">{allOk ? '¡Todas correctas!' : 'Revisa las marcadas en rojo.'}</div>
          <button className="btn dark big block" onClick={() => onNext(allOk)}>Continuar</button>
        </>
      )}
    </div>
  );
}

// ── Ordenar palabras para construir la frase ────────────────────────────────
const tileClass = (t: string, item: EffItem) => {
  const w = stripAccents(normalize(t));
  if (['le', 'un', 'du', 'au'].includes(w)) return 'm';
  if (['la', 'une'].includes(w)) return 'f';
  if (item.pos === 'verbo' && w.startsWith(stripAccents(normalize(item.fr)).slice(0, 3))) return 'v';
  return '';
};

export function Order({ item, tokens, onLog, onNext }: { item: EffItem; tokens: string[]; onLog: Log; onNext: (correct: boolean) => void }) {
  const pool = useMemo(() => tokens.map((t, i) => ({ id: `${i}`, t })), [tokens]);
  const [answer, setAnswer] = useState<string[]>([]);
  const [checked, setChecked] = useState<boolean | null>(null);
  const start = useRef(performance.now());
  const target = tokenize(item.example.fr).join(' ');
  const add = (id: string) => !checked && setAnswer((a) => (a.includes(id) ? a : [...a, id]));
  const { bind, ghost, over } = useDragDrop((payload) => add(payload));
  const text = (ids: string[]) => ids.map((id) => pool.find((p) => p.id === id)!.t).join(' ');

  const check = async () => {
    const ok = stripAccents(normalize(text(answer))) === stripAccents(normalize(target));
    setChecked(ok);
    await onLog({ itemId: item.id, exercise: 'ordenar', skill: 'escritura', correct: ok, answer: text(answer), latencyMs: performance.now() - start.current });
    speak(item.example.fr).catch(() => undefined);
  };

  return (
    <div className="fade-in">
      <div className="card">
        <div className="eyebrow">Construye la frase en francés</div>
        <p style={{ fontSize: '1.15rem' }}>{item.example.es}</p>
        <div data-drop="answer" className={`tiles target ${over === 'answer' ? 'over' : ''}`} aria-label="Tu frase">
          {answer.map((id) => {
            const t = pool.find((p) => p.id === id)!.t;
            return (
              <button key={id} className={`tile ${tileClass(t, item)}`} onClick={() => !checked && setAnswer((a) => a.filter((x) => x !== id))} lang="fr" aria-label={`Quitar ${t}`}>
                {t}
              </button>
            );
          })}
          {!answer.length && <span className="tiny" style={{ alignSelf: 'center' }}>Toca o arrastra las fichas aquí</span>}
        </div>
        <div className="tiles" style={{ marginTop: 10 }}>
          {pool.filter((p) => !answer.includes(p.id)).map((p) => (
            <button key={p.id} className={`tile ${tileClass(p.t, item)}`} lang="fr" {...bind(p.id, <span className="tile">{p.t}</span>)} onClick={(e) => !wasDragged(e.currentTarget) && add(p.id)}>
              {p.t}
            </button>
          ))}
        </div>
        <p className="tiny">Ámbar: masculino · verde-azulado: femenino · rojo: verbo.</p>
      </div>
      {ghost}
      {checked === null ? (
        <div className="row">
          <button className="btn ghost" onClick={() => setAnswer([])}>Borrar</button>
          <button className="btn primary big spacer" disabled={answer.length !== pool.length} onClick={check}>Comprobar</button>
        </div>
      ) : (
        <>
          <div className={`feedback ${checked ? 'ok' : 'bad'}`} role="status">
            <h3>{checked ? '¡Correcto!' : 'Casi'}</h3>
            <p lang="fr" style={{ fontFamily: 'var(--display)', fontSize: '1.15rem' }}>{item.example.fr}</p>
            <SpeakButtons text={item.example.fr} compact />
          </div>
          <button className="btn dark big block" onClick={() => onNext(checked)}>Continuar</button>
        </>
      )}
    </div>
  );
}

// ── Escuchar y reconocer el significado ──────────────────────────────────────
export function Listen({ item, options, onLog, onNext }: { item: EffItem; options: EffItem[]; onLog: Log; onNext: (correct: boolean) => void }) {
  const [choice, setChoice] = useState<string | null>(null);
  const [audioErr, setAudioErr] = useState(false);
  const start = useRef(performance.now());
  useEffect(() => {
    speak(displayFr(item)).catch(() => setAudioErr(true)).finally(() => (start.current = performance.now()));
  }, [item]);
  const pick = async (id: string) => {
    if (choice) return;
    setChoice(id);
    await onLog({ itemId: item.id, exercise: 'escuchar', skill: 'auditiva', correct: id === item.id, latencyMs: performance.now() - start.current });
  };
  return (
    <div className="fade-in">
      <div className="card prompt-card">
        <div className="eyebrow">Escucha y elige el significado</div>
        <button className="btn big" onClick={() => speak(displayFr(item)).catch(() => setAudioErr(true))}><Icon name="audio" size={28} /> Escuchar</button>
        {audioErr && <p className="tiny" style={{ marginTop: 8 }}>No hay voz francesa disponible; se muestra la palabra escrita: <b lang="fr">{displayFr(item)}</b></p>}
      </div>
      <div className="stack">
        {options.map((o) => (
          <button key={o.id} className={`btn option ${choice ? (o.id === item.id ? 'correct' : o.id === choice ? 'wrong' : '') : ''}`} onClick={() => pick(o.id)} disabled={!!choice && o.id !== choice && o.id !== item.id}>
            {o.es}
          </button>
        ))}
      </div>
      {choice && (
        <>
          <div className={`feedback ${choice === item.id ? 'ok' : 'bad'}`}><FrWord item={item} big={false} /> — {item.es}</div>
          <button className="btn dark big block" onClick={() => onNext(choice === item.id)}>Continuar</button>
        </>
      )}
    </div>
  );
}

// ── Práctica oral: escucha, repite y compárate ──────────────────────────────
export function Speak({ item, onLog, onNext }: { item: EffItem; onLog: Log; onNext: (correct: boolean) => void }) {
  const text = displayFr(item);
  const [mode] = useState<'transcribe' | 'record' | 'none'>(canTranscribe() ? 'transcribe' : canRecord() ? 'record' : 'none');
  const [status, setStatus] = useState<string>('');
  const [heard, setHeard] = useState<string | null>(null);
  const [match, setMatch] = useState<boolean | null>(null);
  const [rec, setRec] = useState<Recording | null>(null);
  const [mine, setMine] = useState<string | null>(null);

  const doTranscribe = async () => {
    setStatus('Escuchando… habla ahora.');
    try {
      const t = await transcribe('fr-FR');
      const ok = t.alternatives.some((a) => checkPhrase(a, [text, item.fr, ...(item.frAccept ?? [])]));
      setHeard(t.text);
      setMatch(ok);
      setStatus('');
      await onLog({ itemId: item.id, exercise: 'hablar-transcripcion', skill: 'oral', correct: ok, answer: t.text });
    } catch (e) {
      // Un fallo del micrófono o del reconocedor NO cuenta como fallo de memoria.
      setStatus((e as Error).message === 'not-allowed' ? 'Permiso de micrófono denegado.' : 'No se pudo reconocer la voz. Inténtalo de nuevo o continúa.');
    }
  };

  const toggleRecord = async () => {
    if (rec) {
      const blob = await rec.stop();
      setRec(null);
      setMine(URL.createObjectURL(blob));
      return;
    }
    try {
      setMine(null);
      setRec(await startRecording());
    } catch {
      setStatus('No se pudo usar el micrófono (revisa el permiso).');
    }
  };

  return (
    <div className="fade-in">
      <div className="card prompt-card">
        <div className="eyebrow">Escucha y repite en voz alta</div>
        <FrWord item={item} />
        <p className="muted">{item.es}</p>
        <SpeakButtons text={text} autoPlay />
        {item.phon && <p className="small" style={{ marginTop: 8 }}>🗣️ {item.phon}</p>}
      </div>
      <div className="card">
        {mode === 'transcribe' && (
          <>
            <button className="btn primary big block" onClick={doTranscribe}><Icon name="mic" /> Decirla</button>
            {heard !== null && (
              <div className={`feedback ${match ? 'ok' : 'bad'}`} role="status">
                El reconocedor entendió: <b lang="fr">«{heard || '…'}»</b>
                <p className="small">{match ? 'Coincide con la palabra esperada.' : 'No coincide. Escucha el modelo y vuelve a intentarlo.'}</p>
              </div>
            )}
            <p className="tiny" style={{ marginTop: 8 }}>
              Importante: esto compara lo que el reconocedor de voz <b>entendió</b>; no es una evaluación fonética. Una coincidencia no garantiza una pronunciación correcta.
            </p>
          </>
        )}
        {mode === 'record' && (
          <>
            <button className={`btn big block ${rec ? 'dark' : 'primary'}`} onClick={toggleRecord}><Icon name="mic" /> {rec ? 'Detener' : 'Grabarme'}</button>
            {mine && (
              <div className="stack" style={{ marginTop: 10 }}>
                <p className="small">Escucha tu voz y luego el modelo. ¿Suenan parecido? Fíjate en las vocales nasales y en la «r».</p>
                <audio controls src={mine} />
                <SpeakButtons text={text} compact />
              </div>
            )}
            <p className="tiny" style={{ marginTop: 8 }}>
              En esta modalidad te comparas tú mismo (la app instalada en iPhone no permite transcripción de voz). No se califica tu pronunciación.
            </p>
          </>
        )}
        {mode === 'none' && <p className="small">Tu navegador no permite usar el micrófono aquí. Repite en voz alta imitando el audio.</p>}
        {status && <p className="small" role="status">{status}</p>}
      </div>
      <button
        className="btn dark big block"
        onClick={async () => {
          if (mode !== 'transcribe' || heard === null) await onLog({ itemId: item.id, exercise: 'hablar-autoevaluado', skill: 'oral', correct: true });
          onNext(match ?? true);
        }}
      >
        Continuar
      </button>
    </div>
  );
}

// ── Diálogo guiado ───────────────────────────────────────────────────────────
export function Dialogue({ dialogueId, onLog, onNext }: { dialogueId: string; onLog: Log; onNext: (correct: boolean) => void }) {
  const d = DIALOGUES.find((x) => x.id === dialogueId)!;
  const [idx, setIdx] = useState(0);
  const [value, setValue] = useState('');
  const [tries, setTries] = useState(0);
  const [showChoices, setShowChoices] = useState(false);
  const [showTr, setShowTr] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [score, setScore] = useState({ ok: 0, total: 0 });
  const listRef = useRef<HTMLDivElement>(null);
  const line = d.lines[idx];
  const done = idx >= d.lines.length;
  const choices = useMemo(() => (line?.choices ? shuffle(line.choices, rng(idx + 3)) : []), [line, idx]);

  useEffect(() => {
    if (line?.speaker === 'otro') {
      speak(line.fr).catch(() => undefined);
      const t = setTimeout(() => setIdx((i) => i + 1), Math.max(1800, line.fr.length * 70));
      return () => clearTimeout(t);
    }
  }, [idx, line]);
  useEffect(() => {
    listRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [idx, feedback]);

  const answer = async (text: string, assisted: boolean, spoken = false) => {
    const ok = checkPhrase(text, line.accept ?? [line.fr]);
    if (ok) {
      await onLog({ itemId: d.items[0], exercise: 'dialogo-turno', skill: spoken ? 'oral' : 'escritura', correct: !assisted, answer: text, hints: assisted ? 1 : 0 });
      setScore((s) => ({ ok: s.ok + (assisted ? 0 : 1), total: s.total + 1 }));
      speak(line.fr).catch(() => undefined);
      setFeedback(null);
      setValue('');
      setTries(0);
      setShowChoices(false);
      setIdx((i) => i + 1);
    } else {
      const t = tries + 1;
      setTries(t);
      setFeedback(t >= 2 ? `Una respuesta posible: «${line.fr}»` : `No encaja. Pista: ${line.hint ?? line.es}`);
      if (t >= 2) setShowChoices(true);
    }
  };

  const finish = async () => {
    const ok = score.total > 0 && score.ok / score.total >= 0.5;
    await onLog({ itemId: d.items[0], exercise: 'dialogue', skill: 'escritura', correct: ok, answer: `dialogo:${d.id}` });
    onNext(ok);
  };

  return (
    <div className="fade-in">
      <div className="card">
        <div className="eyebrow">Diálogo · {d.title}</div>
        <p className="small muted">{d.situation}</p>
        <label className="row small"><input type="checkbox" checked={showTr} onChange={(e) => setShowTr(e.target.checked)} /> Mostrar traducción</label>
      </div>
      <div>
        {d.lines.slice(0, idx).map((l, i) => (
          <div key={i} className={`bubble ${l.speaker}`}>
            <div lang="fr">{l.fr}</div>
            {(showTr || l.speaker === 'otro') && showTr && <div className="tr">{l.es}</div>}
            {l.speaker === 'otro' && <button className="btn sm ghost" style={{ padding: 0, minHeight: 0 }} onClick={() => speak(l.fr).catch(() => undefined)} aria-label="Escuchar"><Icon name="audio" size={18} /></button>}
          </div>
        ))}
        {line?.speaker === 'otro' && <div className="bubble otro" lang="fr"><span className="muted">…</span></div>}
        <div ref={listRef} />
      </div>
      {!done && line.speaker === 'tu' && (
        <div className="card">
          <div className="eyebrow">Tu turno</div>
          <p>{line.es}</p>
          <form onSubmit={(e) => { e.preventDefault(); answer(value, tries >= 2); }} className="stack">
            <input className="answer-input" lang="fr" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Responde en francés…" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} />
            <div className="row">
              {canTranscribe() && (
                <button type="button" className="btn" onClick={async () => { try { const t = await transcribe(); setValue(t.text); answer(t.text, tries >= 2, true); } catch { setFeedback('No se pudo reconocer la voz; escribe la respuesta.'); } }}>
                  <Icon name="mic" /> Hablar
                </button>
              )}
              <button className="btn primary spacer" type="submit" disabled={!value.trim()}>Responder</button>
            </div>
          </form>
          {feedback && <p className="small" role="status" style={{ marginTop: 8 }}>{feedback}</p>}
          {!showChoices && <button className="btn ghost sm" onClick={() => setShowChoices(true)}>Ver opciones (cuenta como ayuda)</button>}
          {showChoices && (
            <div className="stack" style={{ marginTop: 8 }}>
              {choices.map((c) => <button key={c} className="btn option" lang="fr" onClick={() => answer(c, true)}>{c}</button>)}
            </div>
          )}
        </div>
      )}
      {done && (
        <div className="card center">
          <h3>Conversación completada</h3>
          <p className="muted">{score.ok} de {score.total} respuestas sin ayuda.</p>
          <button className="btn dark big block" onClick={finish}>Continuar</button>
        </div>
      )}
    </div>
  );
}

// ── Escribir frases propias ──────────────────────────────────────────────────
export function Write({ items, onLog, onNext }: { items: EffItem[]; onLog: Log; onNext: (correct: boolean) => void }) {
  const { settings, cards, itemById } = useData();
  const [value, setValue] = useState('');
  const [result, setResult] = useState<{ used: EffItem[] } | null>(null);
  const [tutor, setTutor] = useState<TutorReply | null>(null);
  const [tutorErr, setTutorErr] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  const check = async () => {
    const txt = stripAccents(normalize(value));
    const used = items.filter((it) => txt.includes(stripAccents(normalize(it.fr.replace(/ \?$/, '')))));
    setResult({ used });
    await onLog({ itemId: items[0].id, exercise: 'escribir-frase', skill: 'escritura', correct: used.length > 0, answer: value });
  };

  const ask = async () => {
    setAsking(true);
    setTutorErr(null);
    try {
      const known = [...new Set(cards.map((c) => itemById.get(c.itemId)?.fr).filter(Boolean) as string[])];
      setTutor(await askTutor([{ role: 'user', content: `Corrige mi frase y dame una versión mejor si hace falta: «${value}»` }], { level: settings.level, knownWords: known, targetWords: items.map((i) => i.fr) }));
    } catch (e) {
      setTutorErr((e as Error).message);
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="card">
        <div className="eyebrow">Escribe una frase tuya</div>
        <p>Usa al menos una de estas palabras en una frase sobre tu vida:</p>
        <div className="row">{items.map((i) => <span key={i.id} className="pill accent" lang="fr">{displayFr(i)}</span>)}</div>
        <textarea className="answer-input" style={{ marginTop: 10, minHeight: 90 }} lang="fr" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Ej.: J'aime le café." disabled={!!result} />
        <p className="tiny">Ejemplos: {items.map((i) => i.example.fr).join(' · ')}</p>
      </div>
      {!result ? (
        <button className="btn primary big block" disabled={value.trim().length < 3} onClick={check}>Comprobar</button>
      ) : (
        <>
          <div className={`feedback ${result.used.length ? 'ok' : 'bad'}`}>
            {result.used.length ? <>Usaste: <b>{result.used.map((u) => u.fr).join(', ')}</b>. ¡Buen trabajo de producción!</> : 'No encontré ninguna de las palabras objetivo. Inténtalo en la próxima.'}
            <p className="tiny">La app comprueba el uso de las palabras, no la gramática completa. {settings.proxyUrl ? 'Puedes pedir la corrección al tutor de IA.' : 'Con el tutor de IA configurado podrías recibir corrección detallada.'}</p>
          </div>
          {settings.proxyUrl && !tutor && <button className="btn block" disabled={asking} onClick={ask}>{asking ? 'Consultando…' : 'Pedir corrección al tutor'}</button>}
          {tutorErr && <p className="small" role="alert">{tutorErr}</p>}
          {tutor && (
            <div className="card">
              <p lang="fr">{tutor.french}</p>
              {tutor.correction && <p className="bubble correction">✍️ {tutor.correction}</p>}
              {tutor.help && <p className="small muted">{tutor.help}</p>}
            </div>
          )}
          <button className="btn dark big block" style={{ marginTop: 10 }} onClick={() => onNext(result.used.length > 0)}>Continuar</button>
        </>
      )}
    </div>
  );
}
