// Revisión automática de contraste (WCAG) en modo claro y oscuro, pantalla de iPhone.
// Falla si algún texto visible tiene contraste < 3:1 con su fondo; avisa entre 3 y 4.5:1 en texto pequeño.
// Uso: npm run build && npm run contraste
import { spawn } from 'node:child_process';
import { mkdtempSync, symlinkSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '../..');
const shots = path.join(projectRoot, 'test-results');
mkdirSync(shots, { recursive: true });
const serveRoot = mkdtempSync(path.join(os.tmpdir(), 'mf-contraste-'));
symlinkSync(path.join(projectRoot, 'dist'), path.join(serveRoot, 'mi-frances'));
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node-tools/node_modules/playwright'); }

const PORT = 4791;
const BASE = `http://127.0.0.1:${PORT}/mi-frances/`;
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: serveRoot, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));

// Se ejecuta dentro de la página: devuelve los textos con contraste insuficiente.
function audit() {
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return { r, g, b, a };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const blend = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
  const bgOf = (el) => {
    const layers = [];
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none' && !cs.backgroundImage.startsWith('radial-gradient(rgba')) return null; // degradados: no evaluables
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; }
    }
    let bg = { r: 255, g: 255, b: 255, a: 1 };
    for (const l of layers.reverse()) bg = blend(l, bg);
    return bg;
  };
  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) {
    const t = walker.currentNode;
    const el = t.parentElement;
    if (!el || seen.has(el) || !t.textContent.trim()) continue;
    seen.add(el);
    if (el.closest('[aria-hidden="true"], .sr-only, :disabled, .drag-ghost')) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    let opacity = 1;
    for (let n = el; n; n = n.parentElement) opacity *= Number(getComputedStyle(n).opacity);
    if (opacity < 0.95) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden') continue;
    const bg = bgOf(el);
    if (!bg) continue;
    const fg = blend(parse(cs.color), bg);
    const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
    const ratio = (a + 0.05) / (b + 0.05);
    const size = parseFloat(cs.fontSize);
    const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
    if (ratio < (large ? 3 : 4.5)) out.push({ text: t.textContent.trim().slice(0, 50), ratio: Math.round(ratio * 100) / 100, size, severe: ratio < 3 });
  }
  return out;
}

const browser = await playwright.chromium.launch();
let severe = 0;
let warnings = 0;
try {
  for (const scheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, colorScheme: scheme, locale: 'es-MX' });
    const page = await ctx.newPage();
    const check = async (label) => {
      await page.waitForTimeout(700); // deja terminar las animaciones de entrada
      const issues = await page.evaluate(audit);
      const bad = issues.filter((i) => i.severe);
      severe += bad.length;
      warnings += issues.length - bad.length;
      console.log(`${bad.length ? '✘' : '✔'} [${scheme === 'dark' ? 'oscuro' : 'claro'}] ${label}${issues.length ? ` — ${issues.map((i) => `«${i.text}» ${i.ratio}:1${i.severe ? ' (ILEGIBLE)' : ''}`).join(' · ')}` : ''}`);
      await page.screenshot({ path: `${shots}/contraste-${scheme}-${label.replace(/\W+/g, '_')}.png` });
    };
    const btn = (name) => page.getByRole('button', { name, exact: true }).first().click();

    await page.goto(BASE, { waitUntil: 'networkidle' });
    await check('Hoy (antes del diagnóstico)');
    await btn('Empezar diagnóstico');
    await check('Diagnóstico: inicio');
    await btn('Empezar');
    await btn('Siguiente');
    for (let i = 0; i < 12 && (await page.getByRole('button', { name: 'No la sé' }).count()); i++) await btn('No la sé');
    await check('Diagnóstico: oído');
    await btn('Saltar esta parte');
    await btn('Ver resultado');
    await check('Diagnóstico: resultado');
    await btn('Guardar y empezar');
    await check('Hoy (sesión del día)');
    await btn('Ruta');
    await check('Ruta');
    await btn('Memoria');
    await check('Memoria: casilleros');
    for (const tab of ['Diálogos', 'Tutor IA']) {
      await page.getByRole('tab', { name: tab }).click();
      await check(`Memoria: ${tab}`);
    }
    await btn('Palabras');
    await check('Palabras');
    await page.locator('.word-row').first().click();
    await check('Ficha de palabra');
    await page.getByRole('button', { name: 'Cerrar' }).click();
    await btn('Progreso');
    await check('Progreso');
    await page.getByRole('button', { name: 'Ajustes' }).click();
    await check('Ajustes');
    await btn('Hoy');
    await page.getByRole('button', { name: '5 min', exact: true }).click();
    await page.getByRole('button', { name: /Sesión breve|Empezar/ }).first().click();
    await check('Sesión: palabra nueva');
    await ctx.close();
  }
} finally {
  await browser.close();
  server.kill();
}
console.log(`\n${severe} textos ilegibles (< 3:1) · ${warnings} avisos de contraste mejorable (3–4.5:1 en texto pequeño).`);
process.exit(severe ? 1 : 0);
