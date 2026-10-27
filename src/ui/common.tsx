import { useEffect, useState, type ReactNode } from 'react';
import { displayFr, type Item } from '../content/types';
import type { EffItem } from '../state';
import { speak } from '../services/speech';
import type { CardRecord } from '../engine/srs';
import { State, Rating, retrievability, isDue } from '../engine/srs';
import { WING_INFO, type Wing } from '../engine/palace';

export function Icon({ name, size = 22 }: { name: string; size?: number }) {
  const p: Record<string, ReactNode> = {
    hoy: <path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />,
    ruta: <path d="M6 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm12-12a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM6 16V9a3 3 0 0 1 3-3h7M18 8v7a3 3 0 0 1-3 3H8" />,
    memoria: <path d="M3 21V9l9-6 9 6v12M3 21h18M9 21v-6h6v6M8 11h.01M16 11h.01" />,
    palabras: <path d="M5 4h10l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm3 8h8M8 16h5M14 4v4h5" />,
    progreso: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
    ajustes: <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.4 7.4 0 0 0-2-1.2L14.5 3h-4l-.4 2.6a7.4 7.4 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.4 7.4 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7.4 7.4 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z" />,
    audio: <path d="M4 9v6h4l5 4V5L8 9H4Zm12.5-.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />,
    lento: <path d="M4 9v6h4l5 4V5L8 9H4Zm12 3h5" />,
    cerrar: <path d="M6 6l12 12M18 6 6 18" />,
    mic: <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-7 9a7 7 0 0 0 14 0M12 19v3" />,
    atras: <path d="M15 5l-7 7 7 7" />
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {p[name]}
    </svg>
  );
}

/** IPA con colores: azul para vocales nasales, ámbar para redondeadas anteriores y [ɥ]. */
export function Ipa({ ipa, className = '' }: { ipa: string; className?: string }) {
  if (!ipa) return null;
  const parts: ReactNode[] = [];
  const chars = [...ipa.normalize('NFD')];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (chars[i + 1] === '̃') {
      parts.push(<span key={i} className="nasal">{(ch + '̃').normalize('NFC')}</span>);
      i++;
    } else if (/[yøœɥ]/.test(ch)) {
      parts.push(<span key={i} className="round">{ch}</span>);
    } else parts.push(ch);
  }
  return <span className={`ipa ${className}`} aria-label={`pronunciación ${ipa}`}>/{parts}/</span>;
}

/** Palabra francesa con el artículo coloreado por género. */
export function FrWord({ item, big = true }: { item: Pick<Item, 'fr' | 'article' | 'gender'>; big?: boolean }) {
  const cls = item.gender === 'm' ? 'art-m' : item.gender === 'f' ? 'art-f' : '';
  const art = item.article ? (item.article === "l'" ? "l'" : `${item.article} `) : '';
  return (
    <span className={big ? 'fr-word' : 'w'} lang="fr">
      {art && <span className={cls}>{art}</span>}
      {item.fr}
      {item.article === "l'" || item.article === 'les' ? (
        <span className={`${cls} small`} style={{ fontFamily: 'var(--body)', fontWeight: 700, marginLeft: 6, fontSize: big ? '0.9rem' : '0.75rem' }}>
          {item.gender === 'f' ? '(f.)' : item.gender === 'm' ? '(m.)' : ''}
        </span>
      ) : null}
    </span>
  );
}

export function wingOf(item: Item): Wing | 'neutra' {
  if (item.pos === 'sustantivo' && item.gender && item.article !== 'les') return item.gender === 'f' ? 'fresca' : 'calida';
  return 'neutra';
}

export function Scene({ item, size, muted = false }: { item: EffItem; size?: 'small' | 'tiny'; muted?: boolean }) {
  const s = item.assoc.scene;
  const wing = wingOf(item);
  return (
    <div className={`scene ${wing} a-${muted ? 'ninguna' : s.action} ${size ?? ''} ${muted ? 'muted' : ''}`} role="img" aria-label={`Escena: ${item.assoc.story}`}>
      {item.photo ? <img className="photo" src={item.photo} alt="" /> : <span className="main" aria-hidden="true">{s.main}</span>}
      {s.prop && size !== 'tiny' && <span className="prop" aria-hidden="true">{s.prop}</span>}
    </div>
  );
}

export function SpeakButtons({ text, compact = false, autoPlay = false, onError }: { text: string; compact?: boolean; autoPlay?: boolean; onError?: (msg: string) => void }) {
  const [err, setErr] = useState<string | null>(null);
  const play = async (slow: boolean) => {
    try {
      setErr(null);
      await speak(text, { slow });
    } catch (e) {
      const m = (e as Error).message === 'sin-voz-francesa'
        ? 'Tu dispositivo no tiene voz francesa instalada (ver Ajustes → Audio).'
        : 'Audio no disponible en este navegador.';
      setErr(m);
      onError?.(m);
    }
  };
  useEffect(() => {
    if (autoPlay) play(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, autoPlay]);
  return (
    <span className="row" style={{ justifyContent: 'center', gap: 8 }}>
      <button type="button" className={`btn ${compact ? 'sm' : ''}`} onClick={() => play(false)} aria-label={`Escuchar: ${text}`}>
        <Icon name="audio" /> {compact ? '' : 'Escuchar'}
      </button>
      <button type="button" className={`btn ${compact ? 'sm' : ''} ghost`} onClick={() => play(true)} aria-label={`Escuchar despacio: ${text}`}>
        <Icon name="lento" /> {compact ? '0.75×' : 'Despacio'}
      </button>
      {err && !compact && <span className="tiny" role="status">{err}</span>}
    </span>
  );
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet fade-in" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="row between" style={{ marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar"><Icon name="cerrar" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export type ItemStatus = 'nueva' | 'aprendiendo' | 'aprendida' | 'olvidada' | 'pendiente';

export function itemStatus(cards: (CardRecord | undefined)[], now: Date, retention = 0.9): ItemStatus {
  const cs = cards.filter(Boolean) as CardRecord[];
  if (!cs.length) return 'nueva';
  if (cs.some((c) => c.fsrs.state !== State.New && (c.lastRating === Rating.Again || retrievability(c.fsrs, now, retention) < 0.7))) return 'olvidada';
  if (cs.some((c) => isDue(c, now))) return 'pendiente';
  const p = cs.find((c) => c.dir === 'prod');
  if (p && p.fsrs.state === State.Review && p.fsrs.stability >= 7) return 'aprendida';
  return 'aprendiendo';
}

export const STATUS_LABEL: Record<ItemStatus, string> = {
  nueva: 'Nueva', aprendiendo: 'Aprendiendo', aprendida: 'Aprendida', olvidada: 'Olvidada', pendiente: 'Repaso pendiente'
};
export const STATUS_DOT: Record<ItemStatus, string> = { nueva: '', aprendiendo: 'learning', aprendida: 'learned', olvidada: 'forgotten', pendiente: 'due' };

export const ASSOC_LABEL: Record<string, string> = {
  directa: 'Imagen directa (cognado)',
  semantica: 'Puente de significado',
  'palabra-clave': 'Palabra clave + escena',
  protegida: 'Protección fonética'
};

export function WingPill({ wing }: { wing: Wing }) {
  const cls = wing === 'calida' ? 'warm' : wing === 'fresca' ? 'cool' : wing === 'verbos' ? 'accent' : '';
  return <span className={`pill ${cls}`}>{WING_INFO[wing].label}</span>;
}

export function relDays(d: Date, now = new Date()): string {
  const ms = d.getTime() - now.getTime();
  const min = Math.round(ms / 60000);
  if (min <= 0) return 'ahora';
  if (min < 60) return `en ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `en ${h} h`;
  const days = Math.round(h / 24);
  if (days === 1) return 'mañana';
  if (days < 31) return `en ${days} días`;
  const months = Math.round(days / 30);
  return months < 12 ? `en ${months} meses` : `en ${(days / 365).toFixed(1)} años`;
}

export { displayFr };
