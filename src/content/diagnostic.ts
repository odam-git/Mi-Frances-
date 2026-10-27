// Diagnóstico inicial (informe §8.1): producción escrita bidireccional por bandas de
// frecuencia (no opción múltiple, que el hispanohablante adivina por parecido) y
// discriminación auditiva de pares mínimos.

export interface DiagWord {
  /** Pista en español; el usuario escribe en francés. */
  es: string;
  accept: string[];
  band: 1 | 2 | 3;
  /** Ítem de la unidad 1 que se marca como conocido si acierta. */
  itemId?: string;
}

export const DIAG_WORDS: DiagWord[] = [
  { es: 'gracias', accept: ['merci'], band: 1, itemId: 'merci' },
  { es: 'sí', accept: ['oui'], band: 1, itemId: 'oui' },
  { es: 'el agua', accept: ["l'eau", 'eau', 'de l\'eau'], band: 1, itemId: 'eau' },
  { es: 'la casa', accept: ['la maison', 'maison'], band: 1, itemId: 'maison' },
  { es: 'el perro', accept: ['le chien', 'chien'], band: 1, itemId: 'chien' },
  { es: 'hoy', accept: ["aujourd'hui", 'aujourdhui'], band: 1, itemId: 'aujourdhui' },
  { es: 'siempre', accept: ['toujours'], band: 2 },
  { es: 'aprender', accept: ['apprendre'], band: 2 },
  { es: 'la ventana', accept: ['la fenêtre', 'fenêtre', 'la fenetre', 'fenetre'], band: 2 },
  { es: 'demasiado', accept: ['trop'], band: 2 },
  { es: 'sin embargo', accept: ['cependant', 'pourtant', 'toutefois', 'néanmoins', 'neanmoins'], band: 3 },
  { es: 'aunque (+ subjuntivo)', accept: ['bien que', 'quoique'], band: 3 }
];

export interface MinimalPair {
  a: string;
  b: string;
  contrast: string;
}

/** Contrastes críticos para hispanohablantes (informe §4.4 y §8.1). */
export const MINIMAL_PAIRS: MinimalPair[] = [
  { a: 'beau', b: 'bon', contrast: 'oral [o] / nasal [ɔ̃]' },
  { a: 'vu', b: 'vous', contrast: '[y] / [u]' },
  { a: 'tu', b: 'tout', contrast: '[y] / [u]' },
  { a: 'deux', b: 'doux', contrast: '[ø] / [u]' },
  { a: 'paix', b: 'pain', contrast: 'oral [ɛ] / nasal [ɛ̃]' }
];
