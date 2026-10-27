// Prueba de extremo a extremo con Chromium real (Playwright), pantalla de iPhone.
// Sirve el build (dist/) bajo /mi-frances/, como GitHub Pages.
// Uso: npm run build && npm run e2e
import { spawn } from 'node:child_process';
import { readFileSync, readdirSync, mkdirSync, mkdtempSync, symlinkSync } from 'node:fs';
import os from 'node:os';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '../..');
const distDir = path.join(projectRoot, 'dist');
// Simula GitHub Pages: la app vive en /mi-frances/.
const serveRoot = mkdtempSync(path.join(os.tmpdir(), 'mf-e2e-'));
symlinkSync(distDir, path.join(serveRoot, 'mi-frances'));
const shots = path.resolve(here, '../../test-results');
mkdirSync(shots, { recursive: true });
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node-tools/node_modules/playwright'); }
const { UNIT1_ITEMS } = await import(path.resolve(here, '../../src/content/unit1.ts'));
const { DIALOGUES } = await import(path.resolve(here, '../../src/content/dialogues.ts'));

const disp = (i) => (!i.article ? i.fr : i.article === "l'" ? `l'${i.fr}` : `${i.article} ${i.fr}`);
const PORT = 4789;
const BASE = `http://127.0.0.1:${PORT}/mi-frances/`;
const results = [];
const ok = (name, cond, extra = '') => {
  results.push({ name, pass: !!cond, extra });
  console.log(`${cond ? '✔' : '✘'} ${name}${extra ? ` — ${extra}` : ''}`);
};

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: serveRoot, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));

const browser = await playwright.chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-MX' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && !/fonts\.g|ERR_|Failed to load resource/i.test(m.text()) && errors.push(m.text()));

const text = () => page.locator('main, .app').first().innerText();
const click = (name, opts = {}) => page.getByRole('button', { name, exact: false, ...opts }).first().click();

try {
  // ── 1. Carga inicial y diagnóstico ──
  await page.goto(BASE, { waitUntil: 'networkidle' });
  ok('La app carga en una subcarpeta', (await page.title()) === 'MI FRANCÉS');
  ok('Primera visita propone el diagnóstico', /Haz tu diagnóstico/i.test(await text()));
  await page.screenshot({ path: `${shots}/01-inicio.png` });

  await click('Empezar diagnóstico');
  await page.getByLabel('¿Cómo te llamas? (opcional)').fill('Odín');
  await click('Empezar');
  await click('Un poco');
  await click('Siguiente');
  // Vocabulario: acierta merci, oui, l'eau; dice «no la sé» al resto.
  const vocabAnswers = { gracias: 'merci', 'sí': 'oui', 'el agua': "l'eau" };
  for (let i = 0; i < 12; i++) {
    const t = await page.locator('.prompt-card').innerText().catch(() => '');
    if (!/¿Cómo se dice/i.test(t)) break;
    const es = t.split('\n').pop().trim();
    if (vocabAnswers[es]) {
      await page.locator('input.answer-input').fill(vocabAnswers[es]);
      await click('Responder');
    } else await click('No la sé');
  }
  ok('El diagnóstico pasa a la prueba de oído', /¿Cuál escuchaste\?/i.test(await text()));
  await click('Escuchar');
  await page.waitForTimeout(300);
  ok('Sin voz francesa, el diagnóstico lo indica', /No hay voz francesa/i.test(await text()));
  await click('Saltar esta parte');
  await click('15 min');
  await click('Ver resultado');
  const res = await text();
  ok('Resultado del diagnóstico con nivel estimado', /A1 inicial|A0/i.test(res), res.match(/A\d[^\n]*/)?.[0]);
  ok('Detecta palabras ya conocidas', /3 palabras que ya conoces/i.test(res));
  await page.screenshot({ path: `${shots}/02-diagnostico.png` });
  await click('Guardar y empezar');
  await page.waitForTimeout(300);
  ok('Tras el diagnóstico, el panel ofrece la sesión de hoy', /Sesión de hoy/i.test(await text()));
  ok('Saludo personalizado', /Odín/i.test(await text()));
  ok('Aviso de audio no disponible', /no tiene una voz francesa/i.test(await text()));
  await page.screenshot({ path: `${shots}/03-panel.png`, fullPage: true });

  // ── 2. Sesión diaria completa ──
  await click('15 min');
  await click('Empezar');
  const seen = {};
  let reloadedMidSession = false;
  let wrongOnPurpose = false;
  let leechOrRetrySeen = false;
  for (let guard = 0; guard < 80; guard++) {
    await page.waitForTimeout(120);
    const phase = await page.locator('.phase-label').first().innerText().catch(() => '');
    const body = await page.locator('.app').innerText();
    if (/Sesión terminada/i.test(body)) { seen.summary = true; break; }

    // Reanudar: recarga la página a mitad de sesión.
    if (!reloadedMidSession && seen.review >= 3) {
      reloadedMidSession = true;
      const before = await page.locator('.tiny').filter({ hasText: /^\d+\/\d+$/ }).first().innerText();
      await page.reload({ waitUntil: 'networkidle' });
      ok('Tras recargar, el panel ofrece continuar donde se quedó', /Continuar donde te quedaste/i.test(await text()));
      await click('Continuar');
      await page.waitForTimeout(200);
      const after = await page.locator('.tiny').filter({ hasText: /^\d+\/\d+$/ }).first().innerText();
      ok('La sesión se reanuda en el mismo paso', before === after, `${before} → ${after}`);
      continue;
    }

    if (/Palabra nueva/i.test(body) && (await page.getByRole('button', { name: 'Ya la repetí' }).count())) {
      seen.encode = (seen.encode ?? 0) + 1;
      await click('Ya la repetí');
      await click('Me sirve: visualizarla 5 s');
      ok(seen.encode === 1 ? 'Visualización guiada de 5 s' : `Visualización ${seen.encode}`, await page.locator('.dim-overlay').isVisible());
      if (seen.encode === 1) {
        await page.waitForTimeout(5600);
        ok('La visualización termina sola y pasa al contexto', /En contexto/i.test(await text()));
      } else await click('Saltar');
      await click('Siguiente');
      const place = page.getByRole('button', { name: 'Colocarla aquí y seguir' });
      if (await place.count()) { seen.placed = (seen.placed ?? 0) + 1; await place.click(); } else await click('Seguir');
      continue;
    }
    if (/Arrastra cada imagen/i.test(body)) {
      seen.match = true;
      // Arrastre real con el puntero para la primera, toques para el resto.
      const slots = page.locator('[data-drop]');
      const n = await slots.count();
      for (let k = 0; k < n; k++) {
        const slot = slots.nth(k);
        const word = (await slot.innerText()).trim();
        const item = UNIT1_ITEMS.find((i) => disp(i) === word.replace(/\s*\((m|f)\.\)$/, '').trim() || word.startsWith(disp(i)));
        const tile = page.getByRole('button', { name: `Imagen ${item.assoc.scene.main}` });
        if (k === 0) {
          const a = await tile.boundingBox(); const b = await slot.boundingBox();
          await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
          await page.mouse.move(a.x + 30, a.y + 30, { steps: 4 });
          await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 }); await page.mouse.up();
        } else { await tile.click(); await slot.click(); }
      }
      await click('Comprobar');
      ok('Relacionar imágenes con palabras: todo correcto', /¡Todas correctas!/i.test(await text()));
      await click('Continuar');
      continue;
    }
    if (/Construye la frase/i.test(body)) {
      seen.order = true;
      const es = (await page.locator('.card p').first().innerText()).trim();
      const item = UNIT1_ITEMS.find((i) => i.example.es === es);
      const toks = item.example.fr.replace(/\s+([?!:;])/g, ' $1').split(' ').filter(Boolean);
      for (const t of toks) await page.locator('.tiles:not(.target) .tile', { hasText: t }).filter({ hasText: new RegExp(`^${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).first().click();
      await click('Comprobar');
      ok('Ordenar palabras: frase correcta', /¡Correcto!/i.test(await text()), item.example.fr);
      await click('Continuar');
      continue;
    }
    if (/Escucha y elige el significado/i.test(body)) {
      seen.listen = true;
      const fr = (await page.locator('.prompt-card b[lang=fr]').innerText().catch(() => '')).trim();
      const item = UNIT1_ITEMS.find((i) => disp(i) === fr);
      ok('Escucha sin voz: muestra el texto como alternativa', !!item, fr);
      await page.getByRole('button', { name: item.es, exact: true }).click();
      await click('Continuar');
      continue;
    }
    if (/Escucha y repite en voz alta/i.test(body)) {
      seen.speak = true;
      ok('Práctica oral avisa que no es evaluación fonética', /no es una evaluación fonética|No se califica tu pronunciación|no permite usar el micrófono/i.test(body));
      await click('Continuar');
      continue;
    }
    if (/Diálogo ·/i.test(body)) {
      seen.dialogue = true;
      const title = body.match(/Diálogo · ([^\n]+)/i)[1].trim();
      const d = DIALOGUES.find((x) => x.title.toLowerCase() === title.toLowerCase());
      for (const line of d.lines) {
        if (line.speaker !== 'tu') continue;
        await page.locator('input.answer-input').waitFor({ timeout: 15000 });
        await page.locator('input.answer-input').fill(line.fr);
        await click('Responder');
        await page.waitForTimeout(150);
      }
      await page.getByRole('button', { name: 'Continuar' }).waitFor({ timeout: 15000 });
      ok('Diálogo completado sin ayuda', /\d+ de \d+ respuestas sin ayuda/i.test(await text()), title);
      await click('Continuar');
      continue;
    }
    if (/Escribe una frase tuya/i.test(body)) {
      seen.write = true;
      const target = (await page.locator('.pill.accent').first().innerText()).trim();
      await page.locator('textarea').fill(`Aujourd'hui, ${target} !`);
      await click('Comprobar');
      ok('Escritura libre detecta la palabra objetivo', /Usaste:/i.test(await text()), target);
      await click('Continuar');
      continue;
    }
    if (/¿Qué significa\?|Escucha: ¿qué significa\?|Dilo en francés|Completa la frase/i.test(body)) {
      seen.review = (seen.review ?? 0) + 1;
      const card = await page.locator('.prompt-card').innerText();
      let answer = null;
      if (/Dilo en francés/i.test(card)) {
        const es = card.split('\n').filter(Boolean).pop().trim();
        const item = UNIT1_ITEMS.find((i) => i.es === es);
        answer = disp(item);
        seen.prod = true;
        // Una vez, prueba el rescate en escalones y un error deliberado.
        if (!wrongOnPurpose) {
          wrongOnPurpose = true;
          await click('No me acuerdo');
          await click('Otra pista');
          await click('Otra pista');
          ok('Rescate: 3 escalones de pistas visibles', /Pista 3 de 3/i.test(await text()));
          ok('Rescate: esqueleto de letras', (await page.locator('.skeleton').count()) === 1);
          await page.locator('input.answer-input').fill('zzz');
          await click('Comprobar');
          ok('Respuesta incorrecta: retroalimentación con la forma correcta', /No es así/i.test(await text()) && (await text()).includes(item.es));
          await page.getByText(/Calificación automática/).waitFor();
          ok('Calificación automática visible (fallo con 3 pistas = «Otra vez»)', /Calificación automática: Otra vez/i.test(await text()));
          await click('Continuar');
          leechOrRetrySeen = true;
          seen.retryItem = item.es;
          continue;
        }
      } else if (/Completa la frase/i.test(card)) {
        const es = card.split('\n').filter(Boolean).pop().trim();
        const item = UNIT1_ITEMS.find((i) => i.example.es === es);
        answer = item.fr.replace(/ \?$/, '');
        seen.cloze = true;
      } else if (/Escucha: ¿qué significa/i.test(card)) {
        answer = 'no sé';
        seen.audio = true;
      } else {
        const fr = card.split('\n').filter(Boolean)[1].replace(/\s*\((m|f)\.\)$/, '').trim();
        const item = UNIT1_ITEMS.find((i) => disp(i) === fr);
        answer = item.es.split('/')[0].trim();
        seen.rec = true;
      }
      await page.locator('input.answer-input').fill(answer);
      await click('Comprobar');
      await page.getByRole('button', { name: 'Continuar' }).waitFor();
      if (seen.review === 1) await page.screenshot({ path: `${shots}/04-feedback.png`, fullPage: true });
      await click('Continuar');
      continue;
    }
    throw new Error(`Paso no reconocido: ${phase}\n${body.slice(0, 400)}`);
  }
  ok('Sesión: codificación de palabras nuevas', seen.encode >= 4, `${seen.encode}`);
  ok('Sesión: recuperación FR→ES y ES→FR', seen.rec && seen.prod);
  ok('Sesión: arrastrar, ordenar, diálogo y escritura', seen.match && seen.order && seen.dialogue && seen.write);
  ok('Sesión: cada palabra nueva se recupera en ambas direcciones y el fallo se vuelve a preguntar', leechOrRetrySeen && seen.review >= 2 * seen.encode + 1, `${seen.review} recuperaciones, ${seen.encode} nuevas`);
  ok('Sesión: palabras colocadas en casilleros', seen.placed >= 1, `${seen.placed}`);
  ok('Sesión: resumen final', seen.summary);
  await page.screenshot({ path: `${shots}/05-resumen.png`, fullPage: true });
  ok('Resumen muestra próximos repasos programados', /Próximos repasos/i.test(await text()));
  await click('Terminar');

  // ── 3. Persistencia tras cerrar y reabrir ──
  const dbBefore = await page.evaluate(async () => {
    const open = indexedDB.open('mi-frances');
    const db = await new Promise((r) => (open.onsuccess = () => r(open.result)));
    const count = (s) => new Promise((r) => { const q = db.transaction(s).objectStore(s).count(); q.onsuccess = () => r(q.result); });
    return { cards: await count('cards'), reviews: await count('reviews'), sessions: await count('sessions') };
  });
  ok('Las respuestas quedan registradas en la base local', dbBefore.reviews >= 15 && dbBefore.cards >= 16, JSON.stringify(dbBefore));
  const errorsLogged = await page.evaluate(async () => {
    const open = indexedDB.open('mi-frances');
    const db = await new Promise((r) => (open.onsuccess = () => r(open.result)));
    return new Promise((r) => { const q = db.transaction('reviews').objectStore('reviews').getAll(); q.onsuccess = () => r(q.result.filter((x) => !x.correct).length); });
  });
  ok('Los errores también quedan registrados', errorsLogged >= 1, `${errorsLogged} errores`);

  const page2 = await context.newPage();
  await page.close();
  await page2.goto(BASE, { waitUntil: 'networkidle' });
  const t2 = await page2.locator('.app').innerText();
  ok('Tras cerrar y reabrir: ya no pide diagnóstico y conserva datos', !/Haz tu diagnóstico/i.test(t2) && /aprendidas/i.test(t2));

  // Programación: la palabra fallada debe tener su repaso pronto; las acertadas, más tarde.
  const sched = await page2.evaluate(async () => {
    const open = indexedDB.open('mi-frances');
    const db = await new Promise((r) => (open.onsuccess = () => r(open.result)));
    const all = await new Promise((r) => { const q = db.transaction('cards').objectStore('cards').getAll(); q.onsuccess = () => r(q.result); });
    return all.filter((c) => c.fsrs.state !== 0).map((c) => ({ id: c.id, due: new Date(c.fsrs.due).getTime() - Date.now(), s: c.fsrs.stability, last: c.lastRating, seeded: !!c.seeded }));
  });
  const failedId = UNIT1_ITEMS.find((i) => i.es === seen.retryItem).id + '|prod';
  const failedCard = sched.find((c) => c.id === failedId);
  const easy = sched.filter((c) => c.id !== failedId && !c.seeded && c.last === 4);
  ok('Repasos programados por FSRS (la palabra fallada queda con menos estabilidad y repaso más próximo)',
    failedCard && easy.length > 0 && easy.every((g) => g.s > failedCard.s && g.due > failedCard.due),
    `fallada: S=${failedCard?.s.toFixed(2)} d, repaso en ${Math.round(failedCard?.due / 3600000)} h · aciertos rápidos: S≥${Math.min(...easy.map((e) => e.s)).toFixed(2)} d, repaso en ≥${Math.round(Math.min(...easy.map((e) => e.due)) / 3600000)} h`);

  // ── 4. Biblioteca, asociación personal y casilleros ──
  await page2.getByRole('button', { name: 'Palabras', exact: true }).click();
  ok('Biblioteca lista las 50 palabras', (await page2.locator('.word-row').count()) === UNIT1_ITEMS.length);
  await page2.locator('.word-row', { hasText: 'pomme' }).first().click();
  await page2.getByRole('button', { name: 'Cambiar o crear mi asociación' }).click();
  await page2.getByLabel('Palabra clave en español (opcional)').fill('lo');
  await page2.getByRole('button', { name: 'Guardar asociación' }).click();
  ok('Bloquea palabra clave repetida (interferencia)', /ya se usa para/i.test(await page2.locator('.sheet').innerText()));
  await page2.getByLabel('Palabra clave en español (opcional)').fill('pomada');
  await page2.getByLabel('Tu escena').fill('Una manzana gigante se unta POMADA y rueda brillando por la cocina.');
  await page2.getByRole('button', { name: 'Guardar asociación' }).click();
  await page2.waitForTimeout(200);
  ok('Asociación personal guardada', /POMADA/i.test(await page2.locator('.sheet').innerText()));
  await page2.screenshot({ path: `${shots}/06-ficha.png`, fullPage: true });
  await page2.getByRole('button', { name: 'Cerrar' }).click();

  await page2.getByRole('button', { name: 'Memoria', exact: true }).click();
  const filled = await page2.locator('.position.filled').count();
  ok('Casilleros muestran palabras colocadas', filled >= 1, `${filled}`);
  await page2.screenshot({ path: `${shots}/07-palacio.png`, fullPage: true });
  await page2.getByRole('tab', { name: 'Recorrido' }).click();
  ok('Recorrido mental disponible', /Parada 1 de/i.test(await page2.locator('main').innerText()));
  await page2.getByRole('button', { name: 'No la recuerdo' }).click();
  ok('Recorrido muestra la palabra del lugar', (await page2.locator('.feedback').count()) === 1);

  // ── 5. Progreso, respaldo e importación ──
  await page2.getByRole('button', { name: 'Progreso', exact: true }).click();
  const tp = await page2.locator('main').innerText();
  ok('Progreso muestra destrezas e historial', /Destrezas/i.test(tp) && /Historial de sesiones/i.test(tp) && /Sesión/i.test(tp));
  await page2.screenshot({ path: `${shots}/08-progreso.png`, fullPage: true });

  await page2.getByRole('button', { name: 'Ajustes', exact: true }).click();
  const [download] = await Promise.all([page2.waitForEvent('download'), page2.getByRole('button', { name: 'Exportar respaldo' }).click()]);
  const backupPath = `${shots}/respaldo.json`;
  await download.saveAs(backupPath);
  const backup = JSON.parse(readFileSync(backupPath, 'utf8'));
  ok('Exporta respaldo JSON con tarjetas, respuestas y asociaciones', backup.format === 'mi-frances-respaldo' && backup.cards.length >= 16 && backup.reviews.length >= 15 && backup.custom.length === 1);

  page2.once('dialog', (d) => d.accept('BORRAR'));
  await page2.getByRole('button', { name: 'Borrar todos mis datos' }).click();
  await page2.waitForTimeout(300);
  await page2.getByRole('button', { name: 'Hoy', exact: true }).click();
  ok('Tras borrar, vuelve al estado inicial', /Haz tu diagnóstico/i.test(await page2.locator('main').innerText()));
  await page2.getByRole('button', { name: 'Ajustes', exact: true }).click();
  page2.once('dialog', (d) => d.accept());
  const chooser = page2.waitForEvent('filechooser');
  await page2.getByRole('button', { name: 'Importar respaldo' }).click();
  await (await chooser).setFiles(backupPath);
  await page2.waitForTimeout(500);
  ok('Importa el respaldo', /Respaldo importado/i.test(await page2.locator('main').innerText()));
  await page2.getByRole('button', { name: 'Hoy', exact: true }).click();
  ok('Tras importar, recupera el progreso', !/Haz tu diagnóstico/i.test(await page2.locator('main').innerText()));

  page2.once('dialog', (d) => d.accept());
  const chooser2 = page2.waitForEvent('filechooser');
  await page2.getByRole('button', { name: 'Ajustes', exact: true }).click();
  await page2.getByRole('button', { name: 'Importar respaldo' }).click();
  const bad = `${shots}/no-es-respaldo.json`;
  (await import('node:fs')).writeFileSync(bad, '{"hola":1}');
  await (await chooser2).setFiles(bad);
  await page2.waitForTimeout(300);
  ok('Rechaza un archivo que no es respaldo sin borrar datos', /no es un respaldo/i.test(await page2.locator('main').innerText()));

  // ── 6. Ruta, escritorio, accesibilidad básica ──
  await page2.getByRole('button', { name: 'Ruta', exact: true }).click();
  ok('Ruta MCER A1→B2 con examen bloqueado hasta tener dominio', /De A1 a B2/i.test(await page2.locator('main').innerText()) && (await page2.getByRole('button', { name: /Examen de dominio/ }).isDisabled()));
  const noHScroll = await page2.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  ok('Sin desplazamiento horizontal en iPhone', noHScroll);
  const unlabeled = await page2.evaluate(() => [...document.querySelectorAll('button')].filter((b) => !(b.innerText.trim() || b.getAttribute('aria-label'))).length);
  ok('Todos los botones tienen nombre accesible', unlabeled === 0, `${unlabeled} sin nombre`);
  const small = await page2.evaluate(() => [...document.querySelectorAll('.tabbar button, .btn:not(.sm)')].filter((b) => b.getBoundingClientRect().height > 0 && b.getBoundingClientRect().height < 44).length);
  ok('Objetivos táctiles principales ≥ 44 px', small === 0, `${small} pequeños`);

  const desk = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  await desk.goto(BASE, { waitUntil: 'networkidle' });
  await desk.screenshot({ path: `${shots}/09-escritorio.png` });
  ok('Escritorio: carga y mantiene el ancho de lectura', (await desk.locator('.app').boundingBox()).width <= 760);
  await desk.close();

  // ── 7. Seguridad: sin claves en el código publicado ──
  const dist = distDir;
  const files = readdirSync(path.join(dist, 'assets')).map((f) => readFileSync(path.join(dist, 'assets', f), 'utf8')).join('\n') + readFileSync(path.join(dist, 'index.html'), 'utf8');
  ok('No hay claves de API en el código publicado', !/sk-ant-|ANTHROPIC_API_KEY|AZURE_SPEECH_KEY|Ocp-Apim-Subscription-Key/i.test(files));
  ok('Manifest PWA y service worker presentes', readdirSync(dist).includes('manifest.webmanifest') && readdirSync(dist).includes('sw.js'));

  ok('Sin errores de JavaScript en la consola', errors.length === 0, errors.slice(0, 3).join(' | '));
  await page2.close();
} catch (e) {
  ok('Excepción durante la prueba', false, String(e).slice(0, 600));
  console.log('Errores de página:', errors.join('\n').slice(0, 2000));
  try { await context.pages()[0]?.screenshot({ path: `${shots}/error.png`, fullPage: true }); } catch { /* sin página */ }
} finally {
  await browser.close();
  server.kill();
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} comprobaciones superadas.`);
process.exit(failed.length ? 1 : 0);
