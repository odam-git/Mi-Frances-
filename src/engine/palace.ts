// Casilleros mentales (método de loci adaptado, informe §6.2).
// Nivel 1: alas por género (cálida = masculino, fresca = femenino).
// Nivel 2: taller de verbos con 5 estaciones fijas.
// Son apoyo opcional: ninguna palabra exige estar ubicada.
import type { Item } from '../content/types';

export type Wing = 'calida' | 'fresca' | 'neutra' | 'verbos' | 'numeros';

export interface Position {
  id: string;
  label: string;
  emoji: string;
  itemId?: string;
}

export interface Room {
  id: string;
  name: string;
  wing: Wing;
  emoji: string;
  positions: Position[];
}

export interface Palace {
  id: string;
  name: string;
  createdAt: string;
  rooms: Room[];
}

export const WING_INFO: Record<Wing, { label: string; hint: string }> = {
  calida: { label: 'Ala cálida', hint: 'Masculinos (le / un): fuego, sol, madera.' },
  fresca: { label: 'Ala fresca', hint: 'Femeninos (la / une): agua, hielo, plantas.' },
  neutra: { label: 'Zona neutra', hint: 'Expresiones, plurales y palabras sin género.' },
  verbos: { label: 'Taller de verbos', hint: 'Verbos y conjugaciones: 5 estaciones por verbo.' },
  numeros: { label: 'Escalera de números', hint: 'Cada escalón es un número.' }
};

const pos = (roomId: string, labels: [string, string][]): Position[] =>
  labels.map(([label, emoji], i) => ({ id: `${roomId}-${i + 1}`, label, emoji }));

export function defaultPalace(now = new Date()): Palace {
  return {
    id: 'casa',
    name: 'Mi casa',
    createdAt: now.toISOString(),
    rooms: [
      { id: 'entrada', name: 'Entrada', wing: 'neutra', emoji: '🚪', positions: pos('entrada', [['Tapete', '🟫'], ['Perchero', '🧥'], ['Espejo', '🪞'], ['Repisa de llaves', '🔑'], ['Timbre', '🔔'], ['Paragüero', '☂️'], ['Zapatera', '👟'], ['Cuadro', '🖼️'], ['Buzón', '📫'], ['Lámpara', '💡']]) },
      { id: 'sala', name: 'Sala junto a la chimenea', wing: 'calida', emoji: '🔥', positions: pos('sala', [['Chimenea', '🔥'], ['Sillón', '🛋️'], ['Librero', '📚'], ['Lámpara de pie', '🪔'], ['Mesa de centro', '🟤'], ['Ventana soleada', '🌞'], ['Tapete', '🟧'], ['Reloj', '🕰️']]) },
      { id: 'estudio', name: 'Estudio de madera', wing: 'calida', emoji: '🪵', positions: pos('estudio', [['Escritorio', '🗄️'], ['Silla', '🪑'], ['Estante', '📦'], ['Globo terráqueo', '🌍'], ['Chimenea pequeña', '🕯️'], ['Baúl', '🧳']]) },
      { id: 'bano', name: 'Baño con pecera', wing: 'fresca', emoji: '🐟', positions: pos('bano', [['Pecera', '🐟'], ['Regadera', '🚿'], ['Lavabo', '🚰'], ['Tina', '🛁'], ['Espejo empañado', '🌫️'], ['Planta', '🪴'], ['Toallero', '🧺'], ['Ventana con hielo', '🧊']]) },
      { id: 'jardin', name: 'Jardín con fuente', wing: 'fresca', emoji: '⛲', positions: pos('jardin', [['Fuente', '⛲'], ['Banca', '🪵'], ['Rosal', '🌹'], ['Árbol', '🌳'], ['Estanque', '🪷'], ['Columpio', '🎠']]) },
      { id: 'taller', name: 'Taller de verbos (cocina)', wing: 'verbos', emoji: '🍳', positions: pos('taller', [['1 · Puerta: infinitivo', '🚪'], ['2 · Encimera: je / tu / il', '🔪'], ['3 · Estufa: nous / vous / ils', '🍳'], ['4 · Escalera: participio y auxiliar', '🪜'], ['5 · Ventana: futuro', '🪟'], ['Refrigerador', '🧊'], ['Alacena', '🥫'], ['Mesa', '🍽️']]) },
      { id: 'escalera', name: 'Escalera de números', wing: 'numeros', emoji: '🪜', positions: pos('escalera', [['Escalón 1', '1️⃣'], ['Escalón 2', '2️⃣'], ['Escalón 3', '3️⃣'], ['Escalón 4', '4️⃣'], ['Escalón 5', '5️⃣'], ['Escalón 6', '6️⃣'], ['Escalón 7', '7️⃣'], ['Escalón 8', '8️⃣'], ['Escalón 9', '9️⃣'], ['Escalón 10', '🔟']]) }
    ]
  };
}

/** Ala sugerida para un ítem según su categoría y género. */
export function suggestedWing(item: Item): Wing {
  if (item.pos === 'numero') return 'numeros';
  if (item.pos === 'verbo') return 'verbos';
  if (item.pos === 'sustantivo' && item.article !== 'les') return item.gender === 'f' ? 'fresca' : 'calida';
  return 'neutra';
}

export function findPlacement(palaces: Palace[], itemId: string): { palace: Palace; room: Room; position: Position } | null {
  for (const palace of palaces) {
    for (const room of palace.rooms) {
      const position = room.positions.find((p) => p.itemId === itemId);
      if (position) return { palace, room, position };
    }
  }
  return null;
}

/** Primera posición libre en el ala sugerida (o en cualquier ala si está llena). */
export function suggestPosition(palace: Palace, item: Item): { room: Room; position: Position } | null {
  const wing = suggestedWing(item);
  const rooms = [...palace.rooms.filter((r) => r.wing === wing), ...palace.rooms.filter((r) => r.wing !== wing)];
  // Para números, el escalón coincide con el valor.
  if (wing === 'numeros') {
    const n = ['un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix'].indexOf(item.fr);
    const room = palace.rooms.find((r) => r.wing === 'numeros');
    const position = n >= 0 ? room?.positions[n] : undefined;
    if (room && position && !position.itemId) return { room, position };
  }
  for (const room of rooms) {
    const position = room.positions.find((p) => !p.itemId);
    if (position) return { room, position };
  }
  return null;
}

/** Devuelve una copia del palacio con el ítem colocado (y retirado de su posición anterior). */
export function placeItem(palace: Palace, positionId: string, itemId: string | undefined): Palace {
  return {
    ...palace,
    rooms: palace.rooms.map((room) => ({
      ...room,
      positions: room.positions.map((p) => {
        if (p.id === positionId) return { ...p, itemId };
        if (itemId && p.itemId === itemId) return { ...p, itemId: undefined };
        return p;
      })
    }))
  };
}

/** Recorrido ordenado: todas las posiciones ocupadas, habitación por habitación. */
export function walkRoute(palace: Palace): { room: Room; position: Position }[] {
  return palace.rooms.flatMap((room) => room.positions.filter((p) => p.itemId).map((position) => ({ room, position })));
}

export function wingOfPlacement(palaces: Palace[], itemId: string): Wing | null {
  return findPlacement(palaces, itemId)?.room.wing ?? null;
}
