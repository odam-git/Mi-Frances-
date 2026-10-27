// Modelo del contenido educativo. El contenido es estático (vive en el código, revisado);
// las personalizaciones del usuario se guardan aparte en la base de datos local.

export type PartOfSpeech = 'expresion' | 'sustantivo' | 'verbo' | 'numero' | 'adverbio' | 'pronombre';
export type Gender = 'm' | 'f';

/**
 * Tipo de asociación (informe §4.2 y §6.1):
 * - directa: cognado transparente → imagen clara, sin escena absurda (contraste de lista mixta).
 * - semantica: puente de significado/etimología (p. ej. «au revoir» = volver a ver). No es pista de sonido.
 * - palabra-clave: palabra española que comparte sonido + escena inverosímil de dos entidades.
 * - protegida: contiene un contraste fonético crítico (nasal, [y], [ø], [ɥ]); se bloquea la pista
 *   fonética española para no fosilizar errores y se ofrece una nota articulatoria.
 */
export type AssocType = 'directa' | 'semantica' | 'palabra-clave' | 'protegida';

export type SceneAction = 'ninguna' | 'rodar' | 'rebotar' | 'girar' | 'temblar' | 'flotar' | 'crecer' | 'asentir';

export interface Scene {
  /** Glifo protagonista: SIEMPRE representa el significado real (evita el fallo C6). */
  main: string;
  /** Glifo instrumento: la palabra clave o el escenario (opcional, máximo dos entidades). */
  prop?: string;
  action: SceneAction;
}

export interface Association {
  type: AssocType;
  /** Palabra clave española (solo en tipo palabra-clave). Debe ser única entre ítems. */
  keyword?: string;
  /** Historia breve: el significado actúa, la palabra clave acompaña. */
  story: string;
  scene: Scene;
}

export interface Item {
  id: string;
  unit: number;
  lesson: number;
  /** Forma francesa sin artículo. */
  fr: string;
  /** Artículo definido con el que se aprende (sustantivos). */
  article?: 'le' | 'la' | "l'" | 'les';
  gender?: Gender;
  /** Formas francesas alternativas aceptadas al producir. */
  frAccept?: string[];
  /** Significado principal en español (como se muestra en la tarjeta ES→FR). */
  es: string;
  /** Significados aceptados al traducir FR→ES (sin acentos ni mayúsculas importa poco). */
  esAccept: string[];
  ipa: string;
  pos: PartOfSpeech;
  example: { fr: string; es: string };
  /** Nota gramatical breve. */
  grammar?: string;
  /** Nota de pronunciación / articulación para hispanohablantes. */
  phon?: string;
  assoc: Association;
  /** Banda de frecuencia aproximada (1 = 500 palabras más frecuentes). */
  band: 1 | 2 | 3;
}

export interface Lesson {
  unit: number;
  lesson: number;
  title: string;
  goal: string;
}

export interface Unit {
  id: number;
  level: 'A1' | 'A2' | 'B1' | 'B2';
  title: string;
  objectives: string[];
  /** Disponible en esta versión (tiene contenido). */
  available: boolean;
}

/** Forma con artículo para mostrar: «la pomme», «l'eau». */
export function displayFr(item: Pick<Item, 'fr' | 'article'>): string {
  if (!item.article) return item.fr;
  return item.article === "l'" ? `l'${item.fr}` : `${item.article} ${item.fr}`;
}
