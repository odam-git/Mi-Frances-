// Editor de asociaciones personales: palabra clave, historia, glifos y foto propia.
import { useState } from 'react';
import { useData, type EffItem } from '../state';
import { Scene, ASSOC_LABEL, FrWord } from './common';
import { normalize, stripAccents } from '../engine/text';

const MAIN_SUGGESTIONS = ['🍎', '☕', '💧', '🐱', '🐶', '🏡', '🚗', '📖', '🚆', '👩', '👨', '🙋', '❤️', '🦉', '🐷', '⭐', '🔥', '🧊', '🌙', '☀️', '🎁', '🚪', '🦅', '🤫'];

/** Reduce la foto a 480 px (JPEG) para que el respaldo no pese demasiado. */
async function resizePhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const max = 480;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.78);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function AssocEditor({ item, onDone }: { item: EffItem; onDone: () => void }) {
  const { items, saveCustom, resetCustom } = useData();
  const [keyword, setKeyword] = useState(item.assoc.keyword ?? '');
  const [story, setStory] = useState(item.assoc.story);
  const [main, setMain] = useState(item.assoc.scene.main);
  const [prop, setProp] = useState(item.assoc.scene.prop ?? '');
  const [photo, setPhoto] = useState<string | undefined>(item.photo);
  const [error, setError] = useState<string | null>(null);
  const protectedItem = item.assoc.type === 'protegida';

  const preview: EffItem = { ...item, photo, assoc: { ...item.assoc, keyword, story, scene: { ...item.assoc.scene, main, prop: prop || undefined } } };

  const save = async () => {
    const kw = keyword.trim();
    if (kw) {
      // Regla del informe §13.1: no reutilizar la misma palabra clave en dos ítems (interferencia).
      const key = stripAccents(normalize(kw));
      const clash = items.find((i) => i.id !== item.id && i.assoc.keyword && stripAccents(normalize(i.assoc.keyword)) === key);
      if (clash) {
        setError(`La palabra clave «${kw}» ya se usa para «${clash.fr}». Usar la misma para dos palabras provoca interferencia; elige otra.`);
        return;
      }
    }
    if (!story.trim()) {
      setError('Escribe una historia breve: el significado debe protagonizar la escena.');
      return;
    }
    await saveCustom({ itemId: item.id, keyword: protectedItem ? undefined : kw || undefined, story: story.trim(), main: main.trim() || item.assoc.scene.main, prop: prop.trim(), photo });
    onDone();
  };

  return (
    <div className="stack">
      <div className="center">
        <FrWord item={item} /> <div className="muted">{item.es}</div>
        <Scene item={preview} />
        <span className="pill">{ASSOC_LABEL[item.assoc.type]}</span>
      </div>
      <div className="notice info small">
        Consejo: que el <b>significado</b> sea el protagonista y haga algo exagerado o absurdo; la palabra clave solo acompaña. Máximo dos elementos.
      </div>
      {protectedItem ? (
        <div className="notice warn small">
          <b>Protección fonética.</b> {item.phon ?? 'Esta palabra tiene un sonido francés que no existe en español.'} Por eso no se usa palabra clave española: podría fijar una mala pronunciación.
        </div>
      ) : (
        <div className="field">
          <label htmlFor="kw">Palabra clave en español (opcional)</label>
          <input id="kw" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Una palabra concreta que suene parecido" />
        </div>
      )}
      <div className="field">
        <label htmlFor="story">Tu escena</label>
        <textarea id="story" rows={3} value={story} onChange={(e) => setStory(e.target.value)} />
      </div>
      <div className="grid2">
        <div className="field">
          <label htmlFor="main">Protagonista (emoji)</label>
          <input id="main" value={main} onChange={(e) => setMain(e.target.value)} maxLength={8} />
        </div>
        <div className="field">
          <label htmlFor="prop">Acompañante (emoji)</label>
          <input id="prop" value={prop} onChange={(e) => setProp(e.target.value)} maxLength={8} />
        </div>
      </div>
      <div className="row" style={{ gap: 6 }}>
        {MAIN_SUGGESTIONS.map((e) => (
          <button key={e} type="button" className="chip" onClick={() => setMain(e)} aria-label={`Usar ${e}`}>{e}</button>
        ))}
      </div>
      <div className="field">
        <label htmlFor="photo">Foto propia (opcional: tu mascota, tu casa…)</label>
        <input
          id="photo"
          type="file"
          accept="image/*"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) setPhoto(await resizePhoto(f));
          }}
        />
        {photo && <button type="button" className="btn sm ghost" onClick={() => setPhoto(undefined)}>Quitar foto</button>}
      </div>
      {error && <div className="notice warn" role="alert">{error}</div>}
      <button className="btn primary big" onClick={save}>Guardar asociación</button>
      {item.customized && !item.own && (
        <button className="btn ghost" onClick={async () => { await resetCustom(item.id); onDone(); }}>Volver a la asociación original</button>
      )}
    </div>
  );
}
