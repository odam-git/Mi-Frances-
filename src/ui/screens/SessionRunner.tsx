import { useEffect, useMemo, useState } from 'react';
import { useData } from '../../state';
import { PHASE_LABEL, type SessionRecord, type StepResult } from '../../engine/session';
import { cardId, isDue } from '../../engine/srs';
import { Review } from '../exercises/Review';
import { Encode } from '../exercises/Encode';
import { Dialogue, Listen, Match, Order, Speak, Write } from '../exercises/Practice';
import { AssocEditor } from '../AssocEditor';
import { FrWord, Icon, Sheet, relDays } from '../common';
import type { Skill } from '../../db/db';

export function SessionRunner({ session: initial, onExit }: { session: SessionRecord; onExit: () => void }) {
  const data = useData();
  const { itemById, cardById, palaces, settings, recordRecall, logPractice, advance, finishSession, saveSession } = data;
  const [s, setS] = useState(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const step = s.steps[s.cursor];
  const total = s.steps.length;

  useEffect(() => {
    saveSession(s);
    window.scrollTo({ top: 0 });
  }, [s, saveSession]);

  const go = async (result: Omit<StepResult, 'index' | 'kind'>, retry = false) => {
    const r: StepResult = { index: s.cursor, kind: step.kind, ...result };
    const next = await advance(s, r, retry && step.kind === 'review' ? step : undefined);
    setS(next);
  };

  const logFor = (exercise?: string) => async (p: { itemId: string; exercise: string; skill: Skill; correct: boolean; answer?: string; latencyMs?: number; hints?: number }) => {
    await logPractice({ ...p, exercise: exercise ?? p.exercise, sessionId: s.id, latencyMs: Math.round(p.latencyMs ?? 0), hints: p.hints ?? 0 });
  };

  if (!step) return null;
  const pct = Math.round((s.cursor / Math.max(1, total - 1)) * 100);

  return (
    <div className="app" style={{ paddingBottom: 40 }}>
      <div className="session-top">
        <button className="icon-btn" onClick={onExit} aria-label="Salir de la sesión (se guarda el progreso)"><Icon name="cerrar" /></button>
        <div style={{ flex: 1 }}>
          <div className="phase-label">{PHASE_LABEL[step.phase]}{s.mode === 'examen' ? ' · Examen de dominio' : ''}</div>
          <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>
        </div>
        <span className="tiny">{Math.min(s.cursor + 1, total)}/{total}</span>
      </div>

      {step.kind === 'review' && itemById.get(step.itemId) && (
        <Review
          key={`${s.cursor}-${step.cardId}`}
          step={step}
          item={itemById.get(step.itemId)!}
          card={cardById.get(step.cardId)}
          palaces={palaces}
          showIpa={settings.showIpa}
          onAnswer={({ attempt, answer, skill }) =>
            recordRecall({ itemId: step.itemId, dir: step.cardId.endsWith('|prod') ? 'prod' : 'rec', attempt, exercise: step.exercise, skill, answer, sessionId: s.id })
          }
          onNext={({ correct, rating, retry }) => go({ itemId: step.itemId, correct, rating }, retry && s.mode !== 'examen')}
          onEditAssoc={(id) => setEditing(id)}
        />
      )}
      {step.kind === 'review' && !itemById.get(step.itemId) && (
        <div className="card">Este elemento ya no existe. <button className="btn" onClick={() => go({ correct: true })}>Continuar</button></div>
      )}
      {step.kind === 'encode' && itemById.get(step.itemId) && (
        <Encode key={`${s.cursor}-${step.itemId}`} item={itemById.get(step.itemId)!} showIpa={settings.showIpa} onNext={() => go({ itemId: step.itemId, correct: true })} />
      )}
      {step.kind === 'match' && (
        <Match key={s.cursor} items={step.itemIds.map((id) => itemById.get(id)!).filter(Boolean)} onLog={logFor()} onNext={(correct) => go({ correct })} />
      )}
      {step.kind === 'order' && itemById.get(step.itemId) && (
        <Order key={s.cursor} item={itemById.get(step.itemId)!} tokens={step.tokens} onLog={logFor()} onNext={(correct) => go({ itemId: step.itemId, correct })} />
      )}
      {step.kind === 'listen' && itemById.get(step.itemId) && (
        <Listen key={s.cursor} item={itemById.get(step.itemId)!} options={step.options.map((id) => itemById.get(id)!).filter(Boolean)} onLog={logFor()} onNext={(correct) => go({ itemId: step.itemId, correct })} />
      )}
      {step.kind === 'speak' && itemById.get(step.itemId) && (
        <Speak key={s.cursor} item={itemById.get(step.itemId)!} onLog={logFor()} onNext={(correct) => go({ itemId: step.itemId, correct })} />
      )}
      {step.kind === 'dialogue' && <Dialogue key={s.cursor} dialogueId={step.dialogueId} onLog={logFor()} onNext={(correct) => go({ correct })} />}
      {step.kind === 'write' && (
        <Write key={s.cursor} items={step.itemIds.map((id) => itemById.get(id)!).filter(Boolean)} onLog={logFor()} onNext={(correct) => go({ correct })} />
      )}
      {step.kind === 'summary' && <Summary session={s} onFinish={async () => { await finishSession(s); onExit(); }} />}

      {editing && itemById.get(editing) && (
        <Sheet title="Nueva asociación" onClose={() => setEditing(null)}>
          <AssocEditor item={itemById.get(editing)!} onDone={() => setEditing(null)} />
        </Sheet>
      )}
    </div>
  );
}

function Summary({ session, onFinish }: { session: SessionRecord; onFinish: () => void }) {
  const { itemById, cards, cardById } = useData();
  const recalls = session.results.filter((r) => r.kind === 'review');
  const ok = recalls.filter((r) => r.correct).length;
  const minutes = Math.max(1, Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60000));
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(23, 59);
  const dueTomorrow = cards.filter((c) => c.fsrs.state !== 0 && c.fsrs.due <= tomorrow && !isDue(c, now)).length;
  const touched = useMemo(() => [...new Set(session.results.map((r) => r.itemId).filter(Boolean) as string[])], [session]);

  return (
    <div className="fade-in">
      <div className="card hero">
        <div className="eyebrow" style={{ color: 'rgba(246,241,231,.7)' }}>Sesión terminada</div>
        <h1>Bien hecho.</h1>
        <p className="muted">{minutes} min · {recalls.length} recuperaciones · {recalls.length ? Math.round((ok / recalls.length) * 100) : 0}% acertadas al primer intento o tras reintento</p>
        <p className="muted">{session.newItemIds.length} palabras nuevas · {dueTomorrow} repasos programados hasta mañana</p>
      </div>
      {touched.length > 0 && (
        <div className="card">
          <h3>Próximos repasos</h3>
          <p className="tiny">Calculados por el algoritmo FSRS según tu desempeño de hoy.</p>
          {touched.map((id) => {
            const it = itemById.get(id);
            const p = cardById.get(cardId(id, 'prod'));
            if (!it) return null;
            return (
              <div key={id} className="row between" style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                <FrWord item={it} big={false} />
                <span className="small muted">{p && p.fsrs.state !== 0 ? relDays(p.fsrs.due) : '—'}</span>
              </div>
            );
          })}
        </div>
      )}
      <p className="small muted center">Recuerda: los puntos no miden el dominio. Lo que cuenta es poder recuperar la palabra días después, sin ayuda.</p>
      <button className="btn primary big block" onClick={onFinish}>Terminar</button>
    </div>
  );
}
