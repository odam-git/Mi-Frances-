import { useMemo } from 'react';
import { useData } from '../../state';
import { ALL_LESSONS, MASTERY_RULE, UNITS } from '../../content/curriculum';
import { unitMastery } from '../../engine/stats';
import { itemStatus } from '../common';
import { cardId } from '../../engine/srs';

export function Route({ onExam }: { onExam: () => void }) {
  const { items, cards, cardById, sessions } = useData();
  const now = new Date();
  const unit1 = items.filter((i) => i.unit === 1);
  const mastery = useMemo(() => unitMastery(unit1, cards, now), [unit1, cards]); // eslint-disable-line react-hooks/exhaustive-deps
  const examPassed = sessions.some((s) => s.mode === 'examen' && s.status === 'terminada' && s.results.length > 0 && s.results.filter((r) => r.correct).length / s.results.length >= MASTERY_RULE.examPass);

  return (
    <div className="fade-in">
      <p className="eyebrow">Tu ruta</p>
      <h1>De A1 a B2</h1>
      <p className="muted small">Ruta orientativa alineada con el Marco Común Europeo (MCER). La app no otorga certificaciones. Las unidades se desbloquean por <b>dominio comprobado</b> (recuerdo diferido), no por puntos ni rachas.</p>

      <div className="path" style={{ marginTop: 18 }}>
        {UNITS.map((u) => {
          const isU1 = u.id === 1;
          const unlocked = isU1 || (u.id === 2 && examPassed);
          return (
            <div key={u.id} className={`path-node ${isU1 ? 'on' : ''} ${!u.available ? 'locked' : ''}`}>
              <div className="card">
                <div className="row between">
                  <span className="pill accent">{u.level}</span>
                  {!u.available && <span className="pill">{unlocked ? 'Desbloqueada · contenido en preparación' : 'En preparación'}</span>}
                </div>
                <h3 style={{ marginTop: 8 }}>Unidad {u.id}. {u.title}</h3>
                <ul className="small muted" style={{ paddingLeft: 18, margin: '4px 0 8px' }}>
                  {u.objectives.map((o) => <li key={o}>{o}</li>)}
                </ul>
                {isU1 && (
                  <>
                    {ALL_LESSONS.map((l) => {
                      const li = unit1.filter((i) => i.lesson === l.lesson);
                      const seen = li.filter((i) => cardById.has(cardId(i.id, 'prod'))).length;
                      const learned = li.filter((i) => itemStatus([cardById.get(cardId(i.id, 'rec')), cardById.get(cardId(i.id, 'prod'))], now) === 'aprendida').length;
                      return (
                        <div key={l.lesson} style={{ padding: '8px 0', borderTop: '1px solid var(--line)' }}>
                          <div className="row between"><b className="small">{l.lesson}. {l.title}</b><span className="tiny">{learned}/{li.length} aprendidas · {seen} vistas</span></div>
                          <div className="tiny">{l.goal}</div>
                          <div className="bar ok" style={{ marginTop: 4 }}><i style={{ width: `${(learned / li.length) * 100}%` }} /></div>
                        </div>
                      );
                    })}
                    <div className="notice" style={{ marginTop: 12 }}>
                      <b>Dominio de la unidad: {Math.round(mastery.share * 100)}%</b>
                      <div className="bar" style={{ margin: '6px 0' }}><i style={{ width: `${mastery.share * 100}%` }} /></div>
                      <div className="tiny">
                        {mastery.strongItems} de {mastery.totalItems} palabras con memoria productiva estable (≥ {MASTERY_RULE.minStabilityDays} días). Necesitas {Math.round(MASTERY_RULE.minShare * 100)}% y al menos {MASTERY_RULE.examSize} palabras introducidas hace {MASTERY_RULE.minDelayDays}+ días para el examen.
                      </div>
                      {examPassed ? (
                        <p className="small" style={{ marginTop: 6 }}>✅ Examen de dominio aprobado.</p>
                      ) : (
                        <button className="btn sm" style={{ marginTop: 8 }} disabled={!mastery.eligibleForExam} onClick={onExam}>Examen de dominio (sin pistas)</button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
