import { useMemo, useState } from 'react';
import { useData, type EffItem } from '../../state';
import { cardId, State, type CardRecord } from '../../engine/srs';
import { findPlacement } from '../../engine/palace';
import type { Item, PartOfSpeech } from '../../content/types';
import { ASSOC_LABEL, FrWord, Ipa, Scene, Sheet, SpeakButtons, STATUS_DOT, STATUS_LABEL, itemStatus, relDays, displayFr, type ItemStatus } from '../common';
import { AssocEditor } from '../AssocEditor';
import { normalize, stripAccents } from '../../engine/text';

const FILTERS: [string, string][] = [['todas', 'Todas'], ['aprendida', 'Aprendidas'], ['pendiente', 'Pendientes'], ['olvidada', 'Olvidadas'], ['aprendiendo', 'Aprendiendo'], ['nueva', 'Nuevas'], ['propias', 'Mías'], ['leech', 'Difíciles']];

export function Library() {
  const { items, cardById, settings } = useData();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('todas');
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const now = new Date();
  const rows = useMemo(() => {
    const nq = stripAccents(normalize(q));
    return items
      .map((it) => {
        const rec = cardById.get(cardId(it.id, 'rec'));
        const prod = cardById.get(cardId(it.id, 'prod'));
        return { it, rec, prod, status: itemStatus([rec, prod], now, settings.retention) };
      })
      .filter((r) => !nq || stripAccents(normalize(`${r.it.fr} ${r.it.es}`)).includes(nq))
      .filter((r) => filter === 'todas' || (filter === 'propias' ? r.it.own : filter === 'leech' ? r.rec?.leech || r.prod?.leech : r.status === filter));
  }, [items, cardById, q, filter, settings.retention]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fade-in">
      <p className="eyebrow">Biblioteca</p>
      <div className="row between">
        <h1 style={{ margin: 0 }}>Palabras</h1>
        <button className="btn sm" onClick={() => setCreating(true)}>+ Mi palabra</button>
      </div>
      <input className="answer-input" style={{ margin: '12px 0', fontSize: '1rem', minHeight: 46 }} placeholder="Buscar en francés o español…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar palabra" />
      <div className="row" style={{ gap: 6, marginBottom: 10 }}>
        {FILTERS.map(([k, l]) => <button key={k} className="chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}</button>)}
      </div>
      <div className="card" style={{ padding: 8 }}>
        {rows.map(({ it, status }) => (
          <button key={it.id} className="word-row" onClick={() => setOpen(it.id)}>
            <Scene item={it} size="tiny" muted />
            <span style={{ flex: 1, minWidth: 0 }}>
              <FrWord item={it} big={false} />
              <div className="small muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.es}</div>
            </span>
            <span className={`dot ${STATUS_DOT[status]}`} title={STATUS_LABEL[status]} />
            <span className="sr-only">{STATUS_LABEL[status]}</span>
          </button>
        ))}
        {!rows.length && <p className="muted center" style={{ padding: 16 }}>No hay palabras con este filtro.</p>}
      </div>
      <p className="tiny">● verde aprendida · ● azul aprendiendo · ● ámbar repaso pendiente · ● rojo olvidada · ○ nueva</p>
      {open && <ItemSheet id={open} onClose={() => setOpen(null)} />}
      {creating && <CreateItem onClose={() => setCreating(false)} />}
    </div>
  );
}

function CardStats({ label, c }: { label: string; c?: CardRecord }) {
  if (!c || c.fsrs.state === State.New) return <div className="stat"><span>{label}</span><b style={{ fontSize: '1rem' }}>Sin repasar</b></div>;
  return (
    <div className="stat">
      <span>{label}</span>
      <b style={{ fontSize: '1.05rem' }}>Estabilidad {c.fsrs.stability < 1 ? '< 1 día' : `${c.fsrs.stability.toFixed(1)} días`}</b>
      <span>Próximo: {relDays(c.fsrs.due)} · {c.fsrs.reps} repasos · {c.fsrs.lapses} olvidos</span>
    </div>
  );
}

function ItemSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const { itemById, cardById, palaces, reviews, settings, introduce, deleteUserItem } = useData();
  const [editing, setEditing] = useState(false);
  const it = itemById.get(id);
  if (!it) return null;
  const rec = cardById.get(cardId(id, 'rec'));
  const prod = cardById.get(cardId(id, 'prod'));
  const place = findPlacement(palaces, id);
  const mine = reviews.filter((r) => r.itemId === id);
  const acc = mine.length ? Math.round((mine.filter((r) => r.correct).length / mine.length) * 100) : null;
  const status: ItemStatus = itemStatus([rec, prod], new Date(), settings.retention);

  return (
    <Sheet title={editing ? 'Editar asociación' : 'Ficha de la palabra'} onClose={onClose}>
      {editing ? (
        <AssocEditor item={it} onDone={() => setEditing(false)} />
      ) : (
        <div className="stack">
          <div className="center">
            <FrWord item={it} />
            {settings.showIpa && <div><Ipa ipa={it.ipa} /></div>}
            <div className="es-meaning">{it.es}</div>
            <SpeakButtons text={displayFr(it)} />
            <Scene item={it} />
            <p>{it.assoc.story}</p>
            <div className="row" style={{ justifyContent: 'center' }}>
              <span className="pill">{ASSOC_LABEL[it.assoc.type]}</span>
              {it.assoc.keyword && <span className="pill accent">Clave: {it.assoc.keyword}</span>}
              <span className="pill">{STATUS_LABEL[status]}</span>
            </div>
          </div>
          <div className="example" lang="fr"><span className="fr">{it.example.fr}</span><br /><span className="muted small">{it.example.es}</span></div>
          <SpeakButtons text={it.example.fr} compact />
          {it.grammar && <p className="small">📘 {it.grammar}</p>}
          {it.phon && <p className="small">🗣️ {it.phon}</p>}
          {place && <p className="small">📍 Casillero: {place.room.name} → {place.position.emoji} {place.position.label}</p>}
          <div className="grid2">
            <CardStats label="Reconocer (FR → ES)" c={rec} />
            <CardStats label="Producir (ES → FR)" c={prod} />
          </div>
          {acc !== null && <p className="tiny">{mine.length} respuestas registradas · {acc}% correctas.</p>}
          <button className="btn" onClick={() => setEditing(true)}>Cambiar o crear mi asociación</button>
          {!prod && <button className="btn ghost" onClick={() => introduce(id)}>Añadir a mis repasos ahora</button>}
          {it.own && <button className="btn danger ghost" onClick={async () => { if (confirm('¿Eliminar esta palabra y su historial de repasos?')) { await deleteUserItem(id); onClose(); } }}>Eliminar mi palabra</button>}
        </div>
      )}
    </Sheet>
  );
}

function CreateItem({ onClose }: { onClose: () => void }) {
  const { saveUserItem, items } = useData();
  const [f, setF] = useState({ fr: '', article: '', es: '', exFr: '', exEs: '', story: '', main: '⭐', pos: 'sustantivo' as PartOfSpeech });
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    if (!f.fr.trim() || !f.es.trim()) return setErr('Escribe la palabra en francés y su significado.');
    if (items.some((i) => normalize(i.fr) === normalize(f.fr) && (i.article ?? '') === f.article)) return setErr('Esa palabra ya existe en tu biblioteca.');
    const article = (f.article || undefined) as Item['article'];
    const gender = f.article === 'le' ? 'm' : f.article === 'la' ? 'f' : undefined;
    const it: Item = {
      id: `mia-${Date.now()}`, unit: 0, lesson: 0, fr: f.fr.trim(), article, gender, es: f.es.trim(),
      esAccept: f.es.split(/[\/,]/).map((s) => s.trim()).filter(Boolean), ipa: '', pos: f.pos, band: 2,
      example: { fr: f.exFr.trim() || f.fr.trim(), es: f.exEs.trim() || f.es.trim() },
      assoc: { type: 'semantica', story: f.story.trim() || `Imagina «${f.es.trim()}» de forma exagerada.`, scene: { main: f.main || '⭐', action: 'ninguna' } }
    };
    await saveUserItem(it);
    onClose();
  };
  return (
    <Sheet title="Añadir mi palabra" onClose={onClose}>
      <p className="small muted">Tus palabras entran primero en la cola de nuevas. Verifica la ortografía y el género en un diccionario confiable (p. ej. Larousse o Le Robert).</p>
      <div className="grid2">
        <div className="field"><label htmlFor="cfr">Francés</label><input id="cfr" lang="fr" value={f.fr} onChange={set('fr')} /></div>
        <div className="field">
          <label htmlFor="cart">Artículo</label>
          <select id="cart" value={f.article} onChange={set('article')}>
            <option value="">(ninguno)</option><option value="le">le (masculino)</option><option value="la">la (femenino)</option><option value="l'">l' (ante vocal)</option><option value="les">les (plural)</option>
          </select>
        </div>
      </div>
      <div className="field"><label htmlFor="ces">Significado en español (sinónimos separados por /)</label><input id="ces" value={f.es} onChange={set('es')} /></div>
      <div className="field">
        <label htmlFor="cpos">Categoría</label>
        <select id="cpos" value={f.pos} onChange={set('pos')}>
          <option value="sustantivo">Sustantivo</option><option value="verbo">Verbo</option><option value="expresion">Expresión</option><option value="adverbio">Adverbio</option><option value="numero">Número</option>
        </select>
      </div>
      <div className="field"><label htmlFor="cexfr">Frase de ejemplo (francés)</label><input id="cexfr" lang="fr" value={f.exFr} onChange={set('exFr')} /></div>
      <div className="field"><label htmlFor="cexes">Traducción del ejemplo</label><input id="cexes" value={f.exEs} onChange={set('exEs')} /></div>
      <div className="field"><label htmlFor="cst">Tu escena memorable</label><textarea id="cst" rows={2} value={f.story} onChange={set('story')} /></div>
      <div className="field"><label htmlFor="cmain">Emoji protagonista</label><input id="cmain" value={f.main} onChange={set('main')} maxLength={8} /></div>
      {err && <div className="notice warn" role="alert">{err}</div>}
      <button className="btn primary big block" onClick={save}>Guardar</button>
    </Sheet>
  );
}

export type { EffItem };
