// Normalización y comparación de respuestas escritas.
import { displayFr, type Item } from '../content/types';

export function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Minúsculas, apóstrofos unificados, sin signos de puntuación, espacios simples. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[¿?¡!.,;:«»"()…]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s*'\s*/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

/** Errores tipográficos tolerados según la longitud de la palabra. */
function typoTolerance(len: number): number {
  if (len >= 9) return 2;
  if (len >= 5) return 1;
  return 0;
}

export type Verdict = 'exacta' | 'acentos' | 'casi' | 'sin-articulo' | 'incorrecta';

export interface Check {
  verdict: Verdict;
  correct: boolean;
  expected: string;
  note?: string;
}

/** Corrige una respuesta en francés para un ítem (dirección ES→FR). */
export function checkFrench(input: string, item: Item): Check {
  const expected = displayFr(item);
  const given = normalize(input);
  const targets = [expected, ...(item.frAccept ?? [])].map(normalize);
  if (!given) return { verdict: 'incorrecta', correct: false, expected };
  if (targets.includes(given)) return { verdict: 'exacta', correct: true, expected };

  const givenPlain = stripAccents(given);
  const plainTargets = targets.map(stripAccents);
  if (plainTargets.includes(givenPlain)) {
    return { verdict: 'acentos', correct: true, expected, note: `Cuida los acentos: ${expected}` };
  }
  if (plainTargets.some((t) => levenshtein(t, givenPlain) <= typoTolerance(t.length))) {
    return { verdict: 'casi', correct: true, expected, note: `Casi: la forma correcta es «${expected}».` };
  }
  if (item.article && stripAccents(normalize(item.fr)) === givenPlain) {
    const gender = item.gender === 'f' ? 'femenino' : item.gender === 'm' ? 'masculino' : 'plural';
    return { verdict: 'sin-articulo', correct: true, expected, note: `Aprende la palabra con su artículo: «${expected}» (${gender}).` };
  }
  return { verdict: 'incorrecta', correct: false, expected };
}

const ES_ARTICLES = /^(el|la|los|las|un|una|lo)\s+/;

function normEs(s: string): string {
  return stripAccents(normalize(s)).replace(ES_ARTICLES, '').trim();
}

/** «amigo» ↔ «amiga»: un cambio de género no es una errata. */
function genderSwap(a: string, b: string): boolean {
  const m = /^(.*)([oa])(s?)$/;
  const x = a.match(m);
  const y = b.match(m);
  return !!x && !!y && x[1] === y[1] && x[3] === y[3] && x[2] !== y[2];
}

/** Corrige una respuesta en español (dirección FR→ES). */
export function checkSpanish(input: string, item: Item): Check {
  const expected = item.es;
  const given = normEs(input);
  if (!given) return { verdict: 'incorrecta', correct: false, expected };
  const targets = [...item.esAccept, ...item.es.split('/')].map(normEs).filter(Boolean);
  if (targets.includes(given)) return { verdict: 'exacta', correct: true, expected };
  if (targets.some((t) => levenshtein(t, given) <= typoTolerance(t.length) && !genderSwap(t, given))) {
    return { verdict: 'casi', correct: true, expected, note: `Correcto (con una pequeña errata): ${expected}` };
  }
  return { verdict: 'incorrecta', correct: false, expected };
}

/** Comparación flexible para frases (diálogos, dictados). */
export function checkPhrase(input: string, accepts: string[]): boolean {
  const given = stripAccents(normalize(input));
  if (!given) return false;
  return accepts.some((raw) => {
    const a = stripAccents(normalize(raw));
    if (a === given) return true;
    if (levenshtein(a, given) <= Math.max(1, Math.floor(a.length * 0.12))) return true;
    // «je m'appelle» + cualquier nombre: la respuesta aceptada es un prefijo de varias palabras.
    return a.includes(' ') && given.startsWith(a + ' ') && a.length >= 8;
  });
}

/** Esqueleto para el escalón 3 del rescate: «la p _ _ _ e». */
export function skeleton(word: string): string {
  return word
    .split(' ')
    .map((w) => {
      const letters = [...w];
      return letters
        .map((ch, i) => (i === 0 || i === letters.length - 1 || /[^a-zà-ÿœæ]/i.test(ch) ? ch : '_'))
        .join(' ');
    })
    .join('   ');
}

/** Hueco para ejercicios de completar: busca la palabra en la frase de ejemplo. */
export function makeCloze(item: Item): { before: string; after: string; answer: string } | null {
  const sentence = item.example.fr;
  const target = item.fr.replace(/ \?$/, '');
  const idx = stripAccents(sentence.toLowerCase()).indexOf(stripAccents(target.toLowerCase()));
  if (idx < 0) return null;
  // Evita coincidencias dentro de otra palabra («un» dans «une»).
  const nextCh = sentence[idx + target.length] ?? ' ';
  const prevCh = idx === 0 ? ' ' : sentence[idx - 1];
  if (/[a-zà-ÿ]/i.test(nextCh) || /[a-zà-ÿ]/i.test(prevCh)) return null;
  return {
    before: sentence.slice(0, idx),
    after: sentence.slice(idx + target.length),
    answer: sentence.slice(idx, idx + target.length)
  };
}

/** Separa una frase en fichas para el ejercicio de ordenar. */
export function tokenize(sentence: string): string[] {
  return sentence
    .replace(/\s+([?!:;])/g, ' $1')
    .split(' ')
    .filter(Boolean);
}
