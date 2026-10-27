// Recuperación activa: nunca se muestra la respuesta primero (efecto del test).
// Protocolo de rescate en 4 escalones (informe §6.3) y calificación automática (informe §7.2).
import { useEffect, useMemo, useRef, useState } from 'react';
import type { EffItem } from '../../state';
import type { Step } from '../../engine/session';
import { checkFrench, checkSpanish, makeCloze, skeleton, stripAccents, normalize, type Check } from '../../engine/text';
import { showMediator, type Attempt, type CardRecord, type ReviewOutcome, Rating } from '../../engine/srs';
import { findPlacement, type Palace } from '../../engine/palace';
import { speak } from '../../services/speech';
import { FrWord, Ipa, Scene, SpeakButtons, relDays, displayFr, Icon } from '../common';
import type { Skill } from '../../db/db';

type ReviewStep = Extract<Step, { kind: 'review' }>;

export interface ReviewProps {
  step: ReviewStep;
  item: EffItem;
  card?: CardRecord;
  palaces: Palace[];
  showIpa: boolean;
  onAnswer(p: { attempt: Attempt; answer: string; skill: Skill }): Promise<ReviewOutcome>;
  onNext(p: { correct: boolean; rating: number; retry: boolean }): void;
  onEditAssoc(itemId: string): void;
}

const RATING_LABEL: Record<number, string> = { 1: 'Otra vez', 2: 'Difícil', 3: 'Bien', 4: 'Fácil' };

export function Review({ step, item, card, palaces, showIpa, onAnswer, onNext, onEditAssoc }: ReviewProps) {
  const ex = step.exercise;
  const productive = ex === 'es-fr' || ex === 'cloze';
  const cloze = useMemo(() => (ex === 'cloze' ? makeCloze(item) : null), [ex, item]);
  const [value, setValue] = useState('');
  const [hints, setHints] = useState(0);
  const [check, setCheck] = useState<Check | null>(null);
  const [outcome, setOutcome] = useState<ReviewOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(ex !== 'audio-es');
  const startRef = useRef(performance.now());
  const firstKeyRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const placement = findPlacement(palaces, item.id);

  useEffect(() => {
    if (ex === 'audio-es') {
      speak(item.article ? displayFr(item) : item.fr)
        .catch(() => undefined)
        .finally(() => {
          setReady(true);
          startRef.current = performance.now();
        });
    } else startRef.current = performance.now();
    inputRef.current?.focus({ preventScroll: true });
  }, [ex, item]);

  const skill: Skill = ex === 'audio-es' ? 'auditiva' : productive ? 'escritura' : 'lectura';

  const submit = async (forceReveal = false) => {
    if (check || busy) return;
    setBusy(true);
    let c: Check;
    if (forceReveal) c = { verdict: 'incorrecta', correct: false, expected: productive ? displayFr(item) : item.es };
    else if (ex === 'cloze' && cloze) {
      const ok = stripAccents(normalize(value)) === stripAccents(normalize(cloze.answer));
      const exact = normalize(value) === normalize(cloze.answer);
      c = { verdict: exact ? 'exacta' : ok ? 'acentos' : 'incorrecta', correct: ok, expected: cloze.answer, note: ok && !exact ? `Cuida los acentos: ${cloze.answer}` : undefined };
    } else c = productive ? checkFrench(value, item) : checkSpanish(value, item);
    const latency = (firstKeyRef.current ?? performance.now()) - startRef.current;
    const attempt: Attempt = { verdict: c.verdict, correct: c.correct, hints: forceReveal ? 4 : hints, latencyMs: latency, mode: 'escrita' };
    setCheck(c);
    try {
      const out = await onAnswer({ attempt, answer: value, skill });
      setOutcome(out);
    } finally {
      setBusy(false);
    }
    if (productive || c.correct) speak(displayFr(item)).catch(() => undefined);
  };

  const next = () => {
    if (!check || !outcome) return;
    onNext({ correct: check.correct, rating: outcome.rating, retry: outcome.rating === Rating.Again });
  };

  // Enter = comprobar / continuar
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && check && outcome) {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  const maxHints = step.noHints ? 0 : 3;
  const gender = item.gender === 'f' ? 'femenino (la / une)' : item.gender === 'm' ? 'masculino (le / un)' : null;

  const hintContent = (level: number) => {
    if (productive) {
      if (level === 1)
        return placement ? (
          <p>📍 Está en <b>{placement.room.name}</b> → {placement.position.emoji} {placement.position.label}{gender ? <> · es <b>{gender}</b></> : null}</p>
        ) : (
          <p>{gender ? <>Es un sustantivo <b>{gender}</b>.</> : <>Categoría: <b>{item.pos}</b>.</>} Empieza por «{displayFr(item)[0]}».</p>
        );
      if (level === 2) return <Scene item={item} size="small" />;
      if (level === 3)
        return (
          <div>
            {item.assoc.type === 'palabra-clave' && item.assoc.keyword && <p>Palabra clave: <b>{item.assoc.keyword}</b></p>}
            <p className="skeleton" aria-label="esqueleto de la palabra">{skeleton(ex === 'cloze' && cloze ? cloze.answer : displayFr(item))}</p>
          </div>
        );
    } else {
      if (level === 1) return <Scene item={item} size="small" />;
      if (level === 2) return <p lang="fr" className="example"><span className="fr">{item.example.fr}</span></p>;
      if (level === 3) return <p className="skeleton">{skeleton(item.es.split('/')[0].trim())}</p>;
    }
    return null;
  };

  return (
    <div className="fade-in">
      <div className="card prompt-card">
        <div className="eyebrow">
          {ex === 'fr-es' && '¿Qué significa?'}
          {ex === 'audio-es' && 'Escucha: ¿qué significa?'}
          {ex === 'es-fr' && 'Dilo en francés'}
          {ex === 'cloze' && 'Completa la frase'}
          {step.retry && ' · otra oportunidad'}
        </div>
        {ex === 'fr-es' && (
          <>
            <FrWord item={item} />
            <div style={{ marginTop: 8 }}><SpeakButtons text={displayFr(item)} compact /></div>
          </>
        )}
        {ex === 'audio-es' && (
          <button className="btn big" onClick={() => speak(displayFr(item)).catch(() => undefined)} aria-label="Volver a escuchar">
            <Icon name="audio" size={28} /> {ready ? 'Escuchar otra vez' : 'Escuchando…'}
          </button>
        )}
        {ex === 'es-fr' && <div className="es-meaning" style={{ fontSize: '1.6rem', color: 'var(--ink)', fontFamily: 'var(--display)' }}>{item.es}</div>}
        {ex === 'cloze' && cloze && (
          <>
            <p lang="fr" style={{ fontFamily: 'var(--display)', fontSize: '1.4rem' }}>
              {cloze.before}<span style={{ borderBottom: '3px solid var(--accent)', padding: '0 24px' }}>{check ? cloze.answer : ' '}</span>{cloze.after}
            </p>
            <p className="muted">{item.example.es}</p>
          </>
        )}
      </div>

      {!check && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="stack"
        >
          <label className="sr-only" htmlFor="answer">Tu respuesta</label>
          <input
            id="answer"
            ref={inputRef}
            className="answer-input"
            lang={productive ? 'fr' : 'es'}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder={productive ? 'Escribe en francés…' : 'Escribe el significado…'}
            value={value}
            onChange={(e) => {
              if (firstKeyRef.current === null) firstKeyRef.current = performance.now();
              setValue(e.target.value);
            }}
          />
          {hints > 0 && (
            <div className="hint-box fade-in" aria-live="polite">
              <div className="tiny">Pista {hints} de 3</div>
              {Array.from({ length: hints }, (_, i) => <div key={i}>{hintContent(i + 1)}</div>)}
            </div>
          )}
          <button className="btn primary big block" type="submit" disabled={!value.trim() || busy}>Comprobar</button>
          <div className="row" style={{ justifyContent: 'center' }}>
            {hints < maxHints && (
              <button type="button" className="btn ghost sm" onClick={() => setHints((h) => h + 1)}>
                {hints === 0 ? 'No me acuerdo: dame una pista' : 'Otra pista'}
              </button>
            )}
            <button type="button" className="btn ghost sm" onClick={() => submit(true)}>Ver la respuesta</button>
          </div>
          {step.noHints && <p className="tiny center">Examen de dominio: sin pistas.</p>}
        </form>
      )}

      {check && (
        <div className={`feedback pop ${check.correct ? 'ok' : 'bad'}`} role="status" aria-live="polite">
          <h3>{check.correct ? (check.verdict === 'exacta' ? '¡Correcto!' : 'Correcto, con un detalle') : value ? 'No es así' : 'Esta es la respuesta'}</h3>
          {value && !check.correct && <p className="small">Escribiste: «{value}»</p>}
          {check.note && <p className="small">{check.note}</p>}
          <div style={{ margin: '8px 0' }}>
            <FrWord item={item} big={false} /> <span className="muted">— {item.es}</span>
            {showIpa && <div><Ipa ipa={item.ipa} /></div>}
          </div>
          <SpeakButtons text={displayFr(item)} compact />
          {item.phon && <p className="small" style={{ marginTop: 8 }}>🗣️ {item.phon}</p>}
          {showMediator(outcome?.record ?? card) ? (
            <div className="row" style={{ marginTop: 8, alignItems: 'flex-start', flexWrap: 'nowrap' }}>
              <Scene item={item} size="small" />
              <p className="small" style={{ margin: 0 }}>{item.assoc.story}</p>
            </div>
          ) : (
            <p className="tiny" style={{ marginTop: 8 }}>Escena oculta: tu memoria ya es estable (más de 14 días). Recuperación directa.</p>
          )}
          <p className="example small" lang="fr"><span className="fr">{item.example.fr}</span><br /><span className="muted">{item.example.es}</span></p>
          {outcome && (
            <p className="tiny">
              Calificación automática: <b>{RATING_LABEL[outcome.rating]}</b>
              {hints > 0 && ` (usaste ${hints} pista${hints > 1 ? 's' : ''})`} · próximo repaso {relDays(outcome.record.fsrs.due)}
            </p>
          )}
          {outcome?.record.leech && !check.correct && (
            <div className="notice warn" style={{ marginTop: 10 }}>
              <b>Esta palabra se resiste.</b> La asociación actual no te está funcionando: crea una nueva, más personal.
              <div style={{ marginTop: 8 }}>
                <button className="btn sm" onClick={() => onEditAssoc(item.id)}>Crear nueva asociación</button>
              </div>
            </div>
          )}
          <button className="btn dark big block" style={{ marginTop: 12 }} onClick={next} disabled={!outcome} autoFocus>
            Continuar
          </button>
        </div>
      )}
    </div>
  );
}
