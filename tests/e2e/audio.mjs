// Prueba del audio: Safari en iPhone solo reproduce speechSynthesis.speak() si se llama
// DENTRO del gesto del usuario (el toque). Chromium no impone esa regla, así que aquí se
// simula el motor de voz y se registra si cada speak() ocurrió durante un toque.
// Uso: npm run build && npm run audio
import { spawn } from 'node:child_process';
import { mkdtempSync, symlinkSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '../..');
const serveRoot = mkdtempSync(path.join(os.tmpdir(), 'mf-audio-'));
symlinkSync(path.join(projectRoot, 'dist'), path.join(serveRoot, 'mi-frances'));
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node-tools/node_modules/playwright'); }

const PORT = 4792;
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: serveRoot, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));

const results = [];
const ok = (name, cond, extra = '') => {
  results.push(!!cond);
  console.log(`${cond ? '✔' : '✘'} ${name}${extra ? ` — ${extra}` : ''}`);
};

const browser = await playwright.chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  // Motor de voz simulado, con las voces cargando tarde (como en iOS).
  await ctx.addInitScript(() => {
    window.__inGesture = false;
    window.__spoken = [];
    const on = () => (window.__inGesture = true);
    const off = () => (window.__inGesture = false);
    for (const t of ['click', 'touchend', 'pointerup']) {
      window.addEventListener(t, on, true);
      window.addEventListener(t, off, false);
    }
    const voices = [];
    const listeners = [];
    setTimeout(() => {
      voices.push({ name: 'Amélie (mejorada)', lang: 'fr-FR', voiceURI: 'amelie', localService: true, default: false });
      voices.push({ name: 'Paulina', lang: 'es-MX', voiceURI: 'paulina', localService: true, default: true });
      listeners.forEach((f) => f());
    }, 600);
    class Utt { constructor(text) { this.text = text; this.lang = ''; this.rate = 1; this.volume = 1; } }
    window.SpeechSynthesisUtterance = Utt;
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      speaking: false, pending: false, paused: false,
      getVoices: () => voices,
      addEventListener: (t, f) => t === 'voiceschanged' && listeners.push(f),
      cancel() {}, resume() {},
      speak(u) {
        window.__spoken.push({ text: u.text, lang: u.lang, voice: u.voice?.name ?? null, volume: u.volume, inGesture: window.__inGesture });
        setTimeout(() => u.onend?.(), 20);
      }
    } });
  });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/mi-frances/`, { waitUntil: 'networkidle' });
  const spoken = () => page.evaluate(() => window.__spoken.filter((s) => s.text.trim()));

  await page.getByRole('button', { name: 'Ajustes' }).click();
  await page.getByRole('button', { name: 'Probar voz' }).click();
  await page.waitForTimeout(100);
  let s = await spoken();
  ok('«Probar voz» habla dentro del toque (Safari lo permite)', s.length === 1 && s[0].inGesture, JSON.stringify(s[0]));
  ok('Usa la voz francesa del sistema', s[0]?.voice === 'Amélie (mejorada)' && s[0]?.lang === 'fr-FR');

  const unlock = await page.evaluate(() => window.__spoken.find((x) => !x.text.trim()));
  ok('El primer toque desbloquea el audio con una frase muda dentro del gesto', unlock && unlock.volume === 0 && unlock.inGesture);

  await page.getByRole('button', { name: 'Palabras', exact: true }).click();
  await page.locator('.word-row').first().click();
  await page.locator('.sheet').getByRole('button', { name: /^Escuchar:/ }).first().click();
  await page.locator('.sheet').getByRole('button', { name: /^Escuchar despacio:/ }).first().click();
  await page.waitForTimeout(100);
  s = await spoken();
  const last = s.slice(-2);
  ok('«Escuchar» y «Despacio» hablan dentro del toque', last.length === 2 && last.every((x) => x.inGesture), JSON.stringify(last.map((x) => x.text)));
  await ctx.close();

  // Voces que aún no cargaron: debe hablar igual con lang=fr-FR en vez de fallar.
  const ctx2 = await browser.newContext();
  await ctx2.addInitScript(() => {
    window.__spoken = [];
    class Utt { constructor(text) { this.text = text; } }
    window.SpeechSynthesisUtterance = Utt;
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { speaking: false, pending: false, paused: false, getVoices: () => [], addEventListener() {}, cancel() {}, resume() {}, speak(u) { window.__spoken.push({ text: u.text, lang: u.lang }); setTimeout(() => u.onend?.(), 10); } } });
  });
  const p2 = await ctx2.newPage();
  await p2.goto(`http://127.0.0.1:${PORT}/mi-frances/`, { waitUntil: 'domcontentloaded' });
  await p2.getByRole('button', { name: 'Ajustes' }).click();
  await p2.getByRole('button', { name: 'Probar voz' }).click();
  await p2.waitForTimeout(100);
  const s2 = await p2.evaluate(() => window.__spoken.filter((x) => x.text.trim()));
  ok('Sin lista de voces todavía: habla igualmente en fr-FR', s2.length === 1 && s2[0].lang === 'fr-FR');
  await ctx2.close();
} catch (e) {
  ok('Excepción durante la prueba', false, String(e).slice(0, 400));
} finally {
  await browser.close();
  server.kill();
}
const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} comprobaciones de audio superadas.`);
process.exit(failed ? 1 : 0);
