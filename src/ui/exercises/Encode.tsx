// Codificación multimodal de un ítem nuevo (informe §6.1):
// escucha + IPA → escena (significado protagonista) → visualización guiada de 5 s → contexto → casillero.
import { useEffect, useState } from 'react';
import { useData, type EffItem } from '../../state';
import { FrWord, Ipa, Scene, SpeakButtons, ASSOC_LABEL, WingPill, displayFr } from '../common';
import { findPlacement, placeItem, suggestPosition, WING_INFO } from '../../engine/palace';
import { AssocEditor } from '../AssocEditor';

type Stage = 'escucha' | 'escena' | 'visualiza' | 'contexto' | 'casillero';

export function Encode({ item, showIpa, onNext }: { item: EffItem; showIpa: boolean; onNext: () => void }) {
  const { palaces, savePalace, introduce } = useData();
  const [stage, setStage] = useState<Stage>('escucha');
  const [left, setLeft] = useState(5);
  const [editing, setEditing] = useState(false);
  const palace = palaces[0];
  const existing = findPlacement(palaces, item.id);
  const suggestion = palace ? suggestPosition(palace, item) : null;

  // Las tarjetas se crean al empezar la codificación, para no perder el ítem si se cierra la app.
  useEffect(() => {
    introduce(item.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  useEffect(() => {
    if (stage !== 'visualiza') return;
    if (left <= 0) {
      setStage('contexto');
      return;
    }
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [stage, left]);

  if (editing) {
    return (
      <div className="card fade-in">
        <h2>Tu propia asociación</h2>
        <AssocEditor item={item} onDone={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="card prompt-card">
        <div className="eyebrow">Palabra nueva</div>
        <FrWord item={item} />
        {showIpa && <div style={{ margin: '6px 0' }}><Ipa ipa={item.ipa} /></div>}
        <SpeakButtons text={displayFr(item)} autoPlay={stage === 'escucha'} />
        {item.phon && <p className="small muted" style={{ marginTop: 10 }}>🗣️ {item.phon}</p>}
      </div>

      {stage === 'escucha' && (
        <>
          <p className="center muted">Escúchala y repítela en voz alta dos veces.</p>
          <button className="btn primary big block" onClick={() => setStage('escena')}>Ya la repetí</button>
        </>
      )}

      {stage !== 'escucha' && (
        <div className="card fade-in center">
          <div className="es-meaning" style={{ fontFamily: 'var(--display)', fontSize: '1.5rem', color: 'var(--ink)' }}>{item.es}</div>
          <Scene item={item} />
          <p>{item.assoc.story}</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <span className="pill">{ASSOC_LABEL[item.assoc.type]}</span>
            {item.assoc.keyword && <span className="pill accent">Clave: {item.assoc.keyword}</span>}
          </div>
          {stage === 'escena' && (
            <div className="stack" style={{ marginTop: 14 }}>
              <button className="btn primary big" onClick={() => { setLeft(5); setStage('visualiza'); }}>Me sirve: visualizarla 5 s</button>
              <button className="btn" onClick={() => setEditing(true)}>Crear mi propia asociación</button>
            </div>
          )}
        </div>
      )}

      {stage === 'visualiza' && (
        <div className="dim-overlay" role="dialog" aria-label="Visualización guiada">
          <div>
            <p style={{ maxWidth: 420, margin: '0 auto 16px' }}>Cierra los ojos o mira la escena. <b>Imagínala en movimiento</b>, con sonido y exageración: <i>{item.assoc.story}</i></p>
            <Scene item={item} />
            <div className="countdown" aria-live="polite">{left}</div>
            <button className="btn light sm" onClick={() => setStage('contexto')}>Saltar</button>
          </div>
        </div>
      )}

      {(stage === 'contexto' || stage === 'casillero') && (
        <div className="card fade-in">
          <div className="eyebrow">En contexto</div>
          <div className="example" lang="fr"><span className="fr">{item.example.fr}</span></div>
          <p className="muted">{item.example.es}</p>
          <SpeakButtons text={item.example.fr} compact />
          {item.grammar && <p className="small" style={{ marginTop: 10 }}>📘 {item.grammar}</p>}
          {stage === 'contexto' && <button className="btn primary big block" style={{ marginTop: 10 }} onClick={() => setStage('casillero')}>Siguiente</button>}
        </div>
      )}

      {stage === 'casillero' && (
        <div className="card fade-in">
          <div className="eyebrow">Casillero mental (opcional)</div>
          {existing ? (
            <p>Ya está en <b>{existing.room.name}</b> → {existing.position.emoji} {existing.position.label}.</p>
          ) : suggestion ? (
            <>
              <p>
                Colócala en <b>{suggestion.room.name}</b> → {suggestion.position.emoji} <b>{suggestion.position.label}</b>.
              </p>
              <div className="row"><WingPill wing={suggestion.room.wing} /><span className="tiny">{WING_INFO[suggestion.room.wing].hint}</span></div>
              <p className="small muted" style={{ marginTop: 8 }}>Imagina la escena ocurriendo justo ahí.</p>
            </>
          ) : (
            <p className="muted">Tu palacio está lleno: añade habitaciones en «Memoria».</p>
          )}
          <div className="stack" style={{ marginTop: 10 }}>
            {!existing && suggestion && (
              <button className="btn primary big" onClick={async () => { await savePalace(placeItem(palace, suggestion.position.id, item.id)); onNext(); }}>
                Colocarla aquí y seguir
              </button>
            )}
            <button className={`btn ${existing ? 'primary big' : ''}`} onClick={onNext}>{existing ? 'Seguir' : 'Seguir sin casillero'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
