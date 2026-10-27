// Casilleros mentales, recorrido de recuperación, diálogos libres y tutor IA.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useData, type EffItem } from '../../state';
import { placeItem, walkRoute, WING_INFO, type Palace, type Room, type Wing } from '../../engine/palace';
import { checkFrench } from '../../engine/text';
import { DIALOGUES } from '../../content/dialogues';
import { askTutor, type ChatMessage, type TutorReply } from '../../services/tutor';
import { FrWord, Icon, Scene, SpeakButtons, Sheet, WingPill, displayFr } from '../common';
import { useDragDrop, wasDragged } from '../drag';
import { Dialogue } from '../exercises/Practice';
import { cardId } from '../../engine/srs';

export function Memory({ sub, setSub }: { sub: string; setSub: (s: string) => void }) {
  return (
    <div className="fade-in">
      <p className="eyebrow">Memoria y práctica</p>
      <h1>Tu palacio</h1>
      <div className="row" role="tablist" style={{ margin: '12px 0' }}>
        {[['palacio', 'Casilleros'], ['recorrido', 'Recorrido'], ['practicar', 'Diálogos'], ['tutor', 'Tutor IA']].map(([k, l]) => (
          <button key={k} role="tab" className="chip" aria-pressed={sub === k} aria-selected={sub === k} onClick={() => setSub(k)}>{l}</button>
        ))}
      </div>
      {sub === 'palacio' && <PalaceEditor />}
      {sub === 'recorrido' && <Walk />}
      {sub === 'practicar' && <FreeDialogues />}
      {sub === 'tutor' && <Tutor />}
    </div>
  );
}

function PalaceEditor() {
  const { palaces, savePalace, deletePalace, items, cardById } = useData();
  const [pid, setPid] = useState(palaces[0]?.id);
  const palace = palaces.find((p) => p.id === pid) ?? palaces[0];
  const [armed, setArmed] = useState<string | null>(null);
  const [adding, setAdding] = useState<'room' | 'palace' | null>(null);
  const placed = useMemo(() => new Set(palaces.flatMap((p) => p.rooms.flatMap((r) => r.positions.map((x) => x.itemId).filter(Boolean)))), [palaces]);
  const introduced = items.filter((i) => cardById.has(cardId(i.id, 'prod')));
  const unplaced = introduced.filter((i) => !placed.has(i.id));
  const byId = new Map(items.map((i) => [i.id, i]));

  const drop = async (itemId: string, positionId: string) => {
    await savePalace(placeItem(palace, positionId, itemId));
    setArmed(null);
  };
  const { bind, ghost, over } = useDragDrop((payload, target) => drop(payload, target));

  if (!palace) return null;
  return (
    <>
      <div className="notice info small">
        Los casilleros son un <b>apoyo opcional</b>. Ala cálida = masculinos; ala fresca = femeninos; el taller guarda verbos en 5 estaciones. Arrastra una palabra a un lugar, o tócala y luego toca el lugar.
      </div>
      <div className="row" style={{ marginBottom: 10 }}>
        {palaces.length > 1 && (
          <select value={palace.id} onChange={(e) => setPid(e.target.value)} aria-label="Elegir palacio" className="chip">
            {palaces.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        <button className="btn sm" onClick={() => setAdding('room')}>+ Habitación</button>
        <button className="btn sm ghost" onClick={() => setAdding('palace')}>+ Otro lugar (oficina, casa de tu infancia…)</button>
      </div>

      {palace.rooms.map((room) => (
        <div key={room.id} className={`room ${room.wing}`}>
          <div className="row between">
            <h3 style={{ margin: 0 }}>{room.emoji} {room.name}</h3>
            <WingPill wing={room.wing} />
          </div>
          <p className="tiny">{WING_INFO[room.wing].hint}</p>
          <div className="positions">
            {room.positions.map((p) => {
              const it = p.itemId ? byId.get(p.itemId) : undefined;
              return (
                <button
                  key={p.id}
                  data-drop={p.id}
                  className={`position ${it ? 'filled' : ''} ${over === p.id ? 'over' : ''} ${armed && !it ? 'armed' : ''}`}
                  onClick={async () => {
                    if (armed) await drop(armed, p.id);
                    else if (it && confirm(`¿Quitar «${it.fr}» de ${p.label}?`)) await savePalace(placeItem(palace, p.id, undefined));
                  }}
                  aria-label={`${p.label}${it ? `: ${displayFr(it)}` : ', libre'}`}
                >
                  <span className="pe" aria-hidden="true">{it ? it.assoc.scene.main : p.emoji}</span>
                  <span>
                    <span className="pl">{p.label}</span>
                    {it && <div className="pw" lang="fr">{displayFr(it)}</div>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {palace.id !== 'casa' && <button className="btn danger ghost" onClick={() => confirm(`¿Eliminar «${palace.name}»?`) && deletePalace(palace.id)}>Eliminar este lugar</button>}

      {unplaced.length > 0 && (
        <div className="tray">
          <div className="tiny" style={{ marginBottom: 6 }}>Palabras sin casillero ({unplaced.length}) {armed && <b>· toca un lugar para colocar «{byId.get(armed)?.fr}»</b>}</div>
          <div className="tray-items">
            {unplaced.map((i) => (
              <button
                key={i.id}
                className={`tile ${i.gender === 'm' ? 'm' : i.gender === 'f' ? 'f' : i.pos === 'verbo' ? 'v' : ''} ${armed === i.id ? 'selected' : ''}`}
                aria-pressed={armed === i.id}
                lang="fr"
                {...bind(i.id, <span className="tile">{i.fr}</span>)}
                onClick={(e) => !wasDragged(e.currentTarget) && setArmed(armed === i.id ? null : i.id)}
                style={{ whiteSpace: 'nowrap' }}
              >
                {i.assoc.scene.main} {i.fr}
              </button>
            ))}
          </div>
        </div>
      )}
      {ghost}
      {adding && <AddPlace kind={adding} palace={palace} onClose={() => setAdding(null)} onCreated={(id) => setPid(id)} />}
    </>
  );
}

function AddPlace({ kind, palace, onClose, onCreated }: { kind: 'room' | 'palace'; palace: Palace; onClose: () => void; onCreated: (id: string) => void }) {
  const { savePalace } = useData();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🚪');
  const [wing, setWing] = useState<Wing>('neutra');
  const [positions, setPositions] = useState('Puerta, Escritorio, Ventana, Estante, Silla');
  const make = (): Room => {
    const id = `r-${Date.now()}`;
    return { id, name: name.trim(), wing, emoji, positions: positions.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20).map((label, i) => ({ id: `${id}-${i + 1}`, label, emoji: '📍' })) };
  };
  const save = async () => {
    if (!name.trim()) return;
    if (kind === 'room') await savePalace({ ...palace, rooms: [...palace.rooms, make()] });
    else {
      const p: Palace = { id: `p-${Date.now()}`, name: name.trim(), createdAt: new Date().toISOString(), rooms: [{ ...make(), name: 'Primera habitación' }] };
      await savePalace(p);
      onCreated(p.id);
    }
    onClose();
  };
  return (
    <Sheet title={kind === 'room' ? 'Nueva habitación' : 'Nuevo lugar'} onClose={onClose}>
      <p className="small muted">Funciona mejor con lugares reales que conoces bien (tu oficina, la casa de tu infancia).</p>
      <div className="field"><label htmlFor="pn">Nombre</label><input id="pn" value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === 'room' ? 'Cocina, Oficina…' : 'Mi oficina en el PJF'} /></div>
      <div className="grid2">
        <div className="field"><label htmlFor="pe">Emoji</label><input id="pe" value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={8} /></div>
        <div className="field">
          <label htmlFor="pw">Tipo de zona</label>
          <select id="pw" value={wing} onChange={(e) => setWing(e.target.value as Wing)}>
            {(Object.keys(WING_INFO) as Wing[]).map((w) => <option key={w} value={w}>{WING_INFO[w].label}</option>)}
          </select>
        </div>
      </div>
      <div className="field"><label htmlFor="pp">Posiciones en orden de recorrido (separadas por comas)</label><textarea id="pp" rows={3} value={positions} onChange={(e) => setPositions(e.target.value)} /></div>
      <button className="btn primary big block" onClick={save} disabled={!name.trim()}>Crear</button>
    </Sheet>
  );
}

function Walk() {
  const { palaces, itemById, logPractice } = useData();
  const route = useMemo(() => palaces.flatMap((p) => walkRoute(p)), [palaces]);
  const [i, setI] = useState(0);
  const [value, setValue] = useState('');
  const [res, setRes] = useState<{ ok: boolean; item: EffItem } | null>(null);
  const [score, setScore] = useState(0);
  const start = useRef(performance.now());
  if (!route.length) return <div className="card"><p>Aún no hay palabras en tus casilleros. Colócalas en «Casilleros» o al aprender palabras nuevas.</p></div>;
  if (i >= route.length)
    return (
      <div className="card center">
        <h2>Recorrido completo</h2>
        <p>{score} de {route.length} recuperadas.</p>
        <button className="btn primary" onClick={() => { setI(0); setScore(0); }}>Recorrer otra vez</button>
      </div>
    );
  const { room, position } = route[i];
  const item = itemById.get(position.itemId!);
  if (!item) return null;
  const check = async () => {
    const c = checkFrench(value, item);
    setRes({ ok: c.correct, item });
    if (c.correct) setScore((s) => s + 1);
    await logPractice({ itemId: item.id, exercise: 'recorrido', skill: 'escritura', correct: c.correct, latencyMs: Math.round(performance.now() - start.current), hints: 0, answer: value });
  };
  return (
    <div className="fade-in">
      <p className="tiny">Parada {i + 1} de {route.length}. Camina mentalmente por el lugar y recupera la palabra que dejaste ahí.</p>
      <div className={`card room ${room.wing} center`}>
        <div style={{ fontSize: '3rem' }}>{position.emoji}</div>
        <h2 style={{ marginTop: 4 }}>{position.label}</h2>
        <p className="muted">{room.emoji} {room.name}</p>
      </div>
      {!res ? (
        <form className="stack" onSubmit={(e) => { e.preventDefault(); check(); }}>
          <input className="answer-input" lang="fr" value={value} onChange={(e) => setValue(e.target.value)} placeholder="¿Qué palabra está aquí?" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} />
          <button className="btn primary big" type="submit" disabled={!value.trim()}>Comprobar</button>
          <button className="btn ghost" type="button" onClick={() => { setRes({ ok: false, item }); logPractice({ itemId: item.id, exercise: 'recorrido', skill: 'escritura', correct: false, latencyMs: 0, hints: 4 }); }}>No la recuerdo</button>
        </form>
      ) : (
        <>
          <div className={`feedback ${res.ok ? 'ok' : 'bad'}`}>
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <Scene item={item} size="small" />
              <div><FrWord item={item} big={false} /><div className="muted">{item.es}</div></div>
            </div>
            <SpeakButtons text={displayFr(item)} compact />
          </div>
          <button className="btn dark big block" onClick={() => { setRes(null); setValue(''); setI(i + 1); start.current = performance.now(); }}>Siguiente lugar</button>
        </>
      )}
      <p className="tiny" style={{ marginTop: 10 }}>El recorrido es práctica libre: se registra, pero no altera la programación de repasos.</p>
    </div>
  );
}

function FreeDialogues() {
  const { logPractice } = useData();
  const [open, setOpen] = useState<string | null>(null);
  if (open)
    return (
      <>
        <button className="btn ghost sm" onClick={() => setOpen(null)}><Icon name="atras" size={18} /> Volver</button>
        <Dialogue dialogueId={open} onLog={(p) => logPractice({ ...p, latencyMs: Math.round(p.latencyMs ?? 0), hints: p.hints ?? 0 })} onNext={() => setOpen(null)} />
      </>
    );
  return (
    <div className="stack">
      {DIALOGUES.map((d) => (
        <button key={d.id} className="card" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => setOpen(d.id)}>
          <h3>{d.title}</h3>
          <p className="small muted" style={{ margin: 0 }}>{d.situation}</p>
        </button>
      ))}
      <p className="tiny">Diálogos guiados sin conexión. El audio usa la voz francesa de tu dispositivo.</p>
    </div>
  );
}

const SITUATIONS = ['Pedir en un café de París', 'Presentarte en una reunión', 'Preguntar cómo llegar a la estación', 'Hablar de tu trabajo y tu familia'];

function Tutor() {
  const { settings, cards, itemById, sessions, logPractice } = useData();
  const [situation, setSituation] = useState(SITUATIONS[0]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [replies, setReplies] = useState<Record<number, TutorReply>>({});
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, busy]);

  const known = useMemo(() => [...new Set(cards.map((c) => itemById.get(c.itemId)).filter(Boolean).map((i) => displayFr(i!)))], [cards, itemById]);
  const targets = useMemo(() => {
    const last = [...sessions].reverse().find((s) => s.newItemIds.length);
    return (last?.newItemIds ?? []).map((id) => itemById.get(id)?.fr).filter(Boolean) as string[];
  }, [sessions, itemById]);

  if (!settings.proxyUrl)
    return (
      <div className="card">
        <h3>Tutor de conversación con IA</h3>
        <p>Conversa en francés con un tutor que usa solo las palabras que ya aprendiste, te ayuda en español y corrige tus errores con tacto.</p>
        <div className="notice warn small">
          Requiere una <b>clave de API de Anthropic</b> (se paga aparte de cualquier suscripción a Claude) y un pequeño servidor intermedio gratuito para guardarla de forma segura. Instrucciones en el archivo <code>server/README.md</code> del proyecto. Después, pega su dirección en <b>Ajustes → Servicios externos</b>.
        </div>
        <p className="small muted">Mientras tanto, practica con los <b>diálogos guiados</b>, que funcionan sin conexión.</p>
      </div>
    );

  const send = async (text: string) => {
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setValue('');
    setBusy(true);
    setErr(null);
    try {
      const r = await askTutor(next, { level: settings.level, knownWords: known, targetWords: targets, situation });
      setReplies((m) => ({ ...m, [next.length]: r }));
      setMessages([...next, { role: 'assistant', content: r.raw }]);
      if (text !== '(Empieza tú la conversación.)') {
        const lower = text.toLowerCase();
        const used = targets.filter((t) => lower.includes(t.toLowerCase()));
        await logPractice({ itemId: 'tutor', exercise: 'tutor', skill: 'escritura', correct: used.length > 0, answer: text, latencyMs: 0, hints: 0 });
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {!messages.length && (
        <div className="card">
          <h3>Elige una situación</h3>
          <div className="stack">
            {SITUATIONS.map((s) => <button key={s} className={`btn option ${situation === s ? 'correct' : ''}`} onClick={() => setSituation(s)}>{s}</button>)}
          </div>
          {targets.length > 0 && <p className="small" style={{ marginTop: 8 }}>Intenta usar: <b lang="fr">{targets.join(', ')}</b></p>}
          <button className="btn primary big block" style={{ marginTop: 10 }} onClick={() => send('(Empieza tú la conversación.)')}>Empezar conversación</button>
        </div>
      )}
      {messages.map((m, idx) => {
        if (m.role === 'user') return m.content.startsWith('(') ? null : <div key={idx} className="bubble tu" lang="fr">{m.content}</div>;
        const r = replies[idx];
        return (
          <div key={idx}>
            <div className="bubble otro" lang="fr">{r?.french ?? m.content} {r?.french && <SpeakButtons text={r.french} compact />}</div>
            {r?.correction && <div className="bubble otro correction">✍️ {r.correction}</div>}
            {r?.help && <div className="bubble otro small muted">💡 {r.help}</div>}
          </div>
        );
      })}
      {busy && <div className="bubble otro muted">…</div>}
      {err && <div className="notice warn" role="alert">{err}</div>}
      <div ref={endRef} />
      {messages.length > 0 && (
        <form className="row" style={{ marginTop: 10, flexWrap: 'nowrap' }} onSubmit={(e) => { e.preventDefault(); if (value.trim()) send(value.trim()); }}>
          <input className="answer-input" lang="fr" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Responde en francés (o pide ayuda en español)…" autoCorrect="off" autoCapitalize="off" spellCheck={false} />
          <button className="btn primary" type="submit" disabled={busy || !value.trim()}>Enviar</button>
        </form>
      )}
      <p className="tiny" style={{ marginTop: 8 }}>El tutor solo ve texto: no evalúa tu pronunciación.</p>
    </div>
  );
}
