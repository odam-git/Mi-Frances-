import { describe, expect, it } from 'vitest';
import { UNIT1_ITEMS } from '../../src/content/unit1';
import { DIALOGUES } from '../../src/content/dialogues';
import { DIAG_WORDS } from '../../src/content/diagnostic';
import { displayFr } from '../../src/content/types';
import { checkFrench, checkPhrase, checkSpanish, makeCloze, skeleton, normalize } from '../../src/engine/text';
import { applyAttempt, autoRating, newCardRecord, Rating, State, reviveCard, seedKnown, isDue } from '../../src/engine/srs';
import { buildDailySession, buildMasteryExam, withRetry } from '../../src/engine/session';
import { defaultPalace, placeItem, suggestPosition, walkRoute, findPlacement } from '../../src/engine/palace';
import { overview, streak, dayKey } from '../../src/engine/stats';

const item = (id: string) => UNIT1_ITEMS.find((i) => i.id === id)!;
const NOW = new Date('2026-10-27T10:00:00');

describe('contenido', () => {
  it('tiene al menos 30 ítems con ids únicos y campos completos', () => {
    expect(UNIT1_ITEMS.length).toBeGreaterThanOrEqual(30);
    expect(new Set(UNIT1_ITEMS.map((i) => i.id)).size).toBe(UNIT1_ITEMS.length);
    for (const i of UNIT1_ITEMS) {
      expect(i.fr && i.es && i.ipa && i.example.fr && i.example.es && i.assoc.story && i.assoc.scene.main, i.id).toBeTruthy();
      expect(i.esAccept.length, i.id).toBeGreaterThan(0);
      if (i.pos === 'sustantivo') expect(i.article, i.id).toBeTruthy();
    }
  });
  it('no repite palabras clave (evita interferencia mnemotécnica)', () => {
    const kws = UNIT1_ITEMS.map((i) => i.assoc.keyword).filter(Boolean);
    expect(new Set(kws).size).toBe(kws.length);
  });
  it('los ítems con palabra clave no están marcados como protegidos y viceversa', () => {
    for (const i of UNIT1_ITEMS) {
      if (i.assoc.type === 'palabra-clave') expect(i.assoc.keyword, i.id).toBeTruthy();
      if (i.assoc.type === 'protegida') expect(i.assoc.keyword, i.id).toBeFalsy();
    }
  });
  it('la forma de referencia de cada ítem se acepta como correcta', () => {
    for (const i of UNIT1_ITEMS) {
      expect(checkFrench(displayFr(i), i).verdict, i.id).toBe('exacta');
      expect(checkSpanish(i.es.split('/')[0], i).correct, i.id).toBe(true);
    }
  });
  it('cada turno de diálogo acepta su respuesta modelo y tiene la opción correcta', () => {
    for (const d of DIALOGUES) {
      for (const l of d.lines.filter((x) => x.speaker === 'tu')) {
        expect(checkPhrase(l.fr, l.accept!), `${d.id}: ${l.fr}`).toBe(true);
        expect(l.choices!.filter((c) => checkPhrase(c, l.accept!)).length, `${d.id}: ${l.fr}`).toBe(1);
      }
    }
  });
  it('el diagnóstico apunta a ítems existentes', () => {
    for (const w of DIAG_WORDS) if (w.itemId) expect(item(w.itemId), w.itemId).toBeTruthy();
  });
});

describe('corrección de respuestas', () => {
  it('francés: exacta, acentos, errata, sin artículo, incorrecta', () => {
    expect(checkFrench('la pomme', item('pomme')).verdict).toBe('exacta');
    expect(checkFrench('  La Pomme ', item('pomme')).verdict).toBe('exacta');
    expect(checkFrench('enchante', item('enchante')).verdict).toBe('acentos');
    expect(checkFrench('la voitur', item('voiture')).verdict).toBe('casi');
    expect(checkFrench('pomme', item('pomme')).verdict).toBe('sin-articulo');
    expect(checkFrench('le pomme', item('pomme')).verdict).not.toBe('exacta');
    expect(checkFrench('la maison', item('pomme')).correct).toBe(false);
    expect(checkFrench('', item('pomme')).correct).toBe(false);
  });
  it('acepta apóstrofo tipográfico', () => {
    expect(checkFrench('l’eau', item('eau')).verdict).toBe('exacta');
    expect(checkFrench("s'il vous plait", item('svp')).verdict).toBe('exacta');
  });
  it('no acepta femenino por masculino (revisión de contenido)', () => {
    expect(checkFrench('une', item('un')).correct).toBe(false);
    expect(checkSpanish('amiga', item('ami')).correct).toBe(false);
  });
  it('español: sinónimos, artículos y acentos opcionales', () => {
    expect(checkSpanish('El carro', item('voiture')).correct).toBe(true);
    expect(checkSpanish('coche', item('voiture')).correct).toBe(true);
    expect(checkSpanish('¿dónde?', item('ou')).correct).toBe(true);
    expect(checkSpanish('perro', item('chat')).correct).toBe(false);
  });
  it('frases: acepta nombre libre tras «je m\'appelle»', () => {
    expect(checkPhrase("Je m'appelle Odín", ["je m'appelle"])).toBe(true);
    expect(checkPhrase('Au revoir', ["je m'appelle"])).toBe(false);
  });
  it('esqueleto y huecos', () => {
    expect(skeleton('pomme')).toBe('p _ _ _ e');
    const c = makeCloze(item('cafe'))!;
    expect(c.before + c.answer + c.after).toBe(item('cafe').example.fr);
    expect(makeCloze(item('un'))).not.toBeNull();
    expect(normalize('Où ?')).toBe('où');
  });
});

describe('repetición espaciada (FSRS)', () => {
  it('calificación automática según aciertos, pistas y latencia', () => {
    const base = { verdict: 'exacta' as const, correct: true, hints: 0, mode: 'escrita' as const };
    expect(autoRating({ ...base, latencyMs: 1500 })).toBe(Rating.Easy);
    expect(autoRating({ ...base, latencyMs: 4000 })).toBe(Rating.Good);
    expect(autoRating({ ...base, latencyMs: 9000 })).toBe(Rating.Hard);
    expect(autoRating({ ...base, latencyMs: 1500, hints: 1 })).toBe(Rating.Hard);
    expect(autoRating({ ...base, latencyMs: 1500, hints: 3 })).toBe(Rating.Again);
    expect(autoRating({ ...base, latencyMs: 1500, verdict: 'acentos' })).toBe(Rating.Good);
    expect(autoRating({ ...base, latencyMs: 1500, correct: false, verdict: 'incorrecta' })).toBe(Rating.Again);
  });
  it('acertar alarga los intervalos y fallar los acorta', () => {
    let rec = newCardRecord('pomme', 'prod', NOW);
    const good = { verdict: 'exacta' as const, correct: true, hints: 0, latencyMs: 3000, mode: 'escrita' as const };
    let t = NOW;
    const intervals: number[] = [];
    for (let i = 0; i < 4; i++) {
      const out = applyAttempt(rec, good, t);
      rec = out.record;
      intervals.push(rec.fsrs.due.getTime() - t.getTime());
      t = rec.fsrs.due;
    }
    expect(rec.fsrs.state).toBe(State.Review);
    expect(intervals[3]).toBeGreaterThan(intervals[2]);
    const fail = applyAttempt(rec, { ...good, correct: false, verdict: 'incorrecta' }, t);
    expect(fail.rating).toBe(Rating.Again);
    expect(fail.record.fsrs.lapses).toBe(1);
    expect(fail.record.fsrs.due.getTime() - t.getTime()).toBeLessThan(intervals[3]);
    expect(fail.record.fsrs.stability).toBeLessThan(rec.fsrs.stability);
  });
  it('marca sanguijuela tras lapsos repetidos', () => {
    let rec = newCardRecord('gare', 'prod', NOW);
    const good = { verdict: 'exacta' as const, correct: true, hints: 0, latencyMs: 3000, mode: 'escrita' as const };
    const bad = { ...good, correct: false, verdict: 'incorrecta' as const };
    let t = NOW;
    let leech = false;
    for (const a of [good, good, good, bad, good, good, bad, good, bad]) {
      const out = applyAttempt(rec, a, t);
      rec = out.record;
      leech = leech || out.becameLeech;
      t = new Date(Math.max(rec.fsrs.due.getTime(), t.getTime() + 60_000));
    }
    expect(rec.fsrs.lapses).toBeGreaterThanOrEqual(2);
    expect(leech).toBe(true);
    expect(rec.leech).toBe(true);
  });
  it('rehidrata fechas desde JSON', () => {
    const rec = seedKnown(newCardRecord('merci', 'prod', NOW), NOW);
    const back = reviveCard(JSON.parse(JSON.stringify(rec)));
    expect(back.fsrs.due).toBeInstanceOf(Date);
    expect(back.fsrs.due.getTime()).toBe(rec.fsrs.due.getTime());
    expect(isDue(back, new Date(NOW.getTime() + 365 * 86_400_000))).toBe(true);
  });
});

describe('sesión diaria', () => {
  const base = { now: NOW, newPerDay: 6, introducedToday: 0, items: UNIT1_ITEMS, cards: [], dialogues: DIALOGUES, sound: true, retention: 0.9, seed: 7 };
  it('primera sesión de 15 min: codifica 5 nuevos y los recupera en ambas direcciones', () => {
    const steps = buildDailySession({ ...base, minutes: 15 });
    const enc = steps.filter((s) => s.kind === 'encode');
    expect(enc.length).toBe(5);
    const reviews = steps.filter((s) => s.kind === 'review');
    expect(reviews.length).toBe(10);
    // Cada recuperación va después de su codificación.
    for (const r of reviews) {
      const e = steps.findIndex((s) => s.kind === 'encode' && s.itemId === (r as { itemId: string }).itemId);
      expect(steps.indexOf(r)).toBeGreaterThan(e);
    }
    expect(steps.at(-1)!.kind).toBe('summary');
    expect(steps.some((s) => s.kind === 'match')).toBe(true);
    expect(steps.some((s) => s.kind === 'order')).toBe(true);
  });
  it('sesión breve de 5 min: como mucho 1 palabra nueva', () => {
    const steps = buildDailySession({ ...base, minutes: 5 });
    expect(steps.filter((s) => s.kind === 'encode').length).toBeLessThanOrEqual(1);
  });
  it('respeta el tope diario de palabras nuevas', () => {
    const steps = buildDailySession({ ...base, minutes: 20, introducedToday: 6 });
    expect(steps.filter((s) => s.kind === 'encode').length).toBe(0);
  });
  it('prioriza los repasos vencidos más olvidados', () => {
    const cards = UNIT1_ITEMS.slice(0, 4).map((i, k) => {
      const r = seedKnown(newCardRecord(i.id, 'prod', new Date(NOW.getTime() - (40 + k * 10) * 86_400_000)), new Date(NOW.getTime() - (40 + k * 10) * 86_400_000));
      return r;
    });
    const steps = buildDailySession({ ...base, minutes: 15, cards });
    const first = steps[0];
    expect(first.kind).toBe('review');
    expect((first as { itemId: string }).itemId).toBe(UNIT1_ITEMS[3].id);
  });
  it('reintento después de un fallo, con pausa y como máximo dos veces', () => {
    const steps = buildDailySession({ ...base, minutes: 15 });
    const idx = steps.findIndex((s) => s.kind === 'review');
    const st = steps[idx] as Extract<(typeof steps)[number], { kind: 'review' }>;
    let s2 = withRetry(steps, idx, st);
    expect(s2.length).toBe(steps.length + 1);
    expect(s2[idx + 4]).toMatchObject({ cardId: st.cardId, retry: true });
    s2 = withRetry(withRetry(s2, idx, st), idx, st);
    expect(s2.filter((s) => s.kind === 'review' && s.cardId === st.cardId && s.retry).length).toBe(2);
    expect(s2.at(-1)!.kind).toBe('summary');
  });
  it('examen de dominio solo con ítems introducidos hace ≥ 3 días y sin pistas', () => {
    const old = new Date(NOW.getTime() - 5 * 86_400_000);
    const cards = UNIT1_ITEMS.slice(0, 20).map((i) => newCardRecord(i.id, 'prod', old));
    cards.push(newCardRecord(UNIT1_ITEMS[25].id, 'prod', NOW));
    const steps = buildMasteryExam(cards, UNIT1_ITEMS, NOW, 12, 3);
    expect(steps.filter((s) => s.kind === 'review').length).toBe(12);
    expect(steps.every((s) => s.kind !== 'review' || (s.noHints && s.itemId !== UNIT1_ITEMS[25].id))).toBe(true);
  });
});

describe('casilleros mentales', () => {
  it('sugiere ala por género y escalón por número', () => {
    const p = defaultPalace(NOW);
    expect(suggestPosition(p, item('pomme'))!.room.wing).toBe('fresca');
    expect(suggestPosition(p, item('pain'))!.room.wing).toBe('calida');
    expect(suggestPosition(p, item('trois'))!.position.label).toBe('Escalón 3');
    expect(suggestPosition(p, item('parler'))!.room.wing).toBe('verbos');
  });
  it('colocar mueve la palabra y el recorrido la incluye', () => {
    let p = defaultPalace(NOW);
    p = placeItem(p, 'sala-1', 'pain');
    p = placeItem(p, 'sala-2', 'pain');
    expect(findPlacement([p], 'pain')!.position.id).toBe('sala-2');
    expect(walkRoute(p).length).toBe(1);
  });
});

describe('progreso y racha', () => {
  it('cuenta pendientes y no vistas', () => {
    const o = overview(UNIT1_ITEMS, [], NOW);
    expect(o.unseen).toBe(UNIT1_ITEMS.length);
    expect(o.due).toBe(0);
  });
  it('racha con un día de descanso', () => {
    const d = (n: number) => dayKey(new Date(NOW.getTime() - n * 86_400_000));
    expect(streak(new Set([d(0), d(1), d(2)]), NOW).current).toBe(3);
    expect(streak(new Set([d(1), d(2)]), NOW).current).toBe(2); // hoy aún no cuenta en contra
    expect(streak(new Set([d(0), d(2), d(3)]), NOW).current).toBe(3); // un descanso tolerado
    expect(streak(new Set([d(0), d(3), d(4)]), NOW).current).toBe(1); // dos días seguidos rompen
  });
});
