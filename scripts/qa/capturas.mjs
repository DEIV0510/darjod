// Capturas de revisión en Chrome real (escritorio y móvil), recorriendo la página para que
// aparezcan las secciones. Guarda en qa-salida/.
// Uso: node scripts/qa/capturas.mjs [url]
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const URL = process.argv[2] || 'http://localhost:5651/';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = 'qa-salida';
fs.mkdirSync(OUT, { recursive: true });
const nav = await chromium.launch({ executablePath: CHROME, headless: true });

async function capturar(nombre, opciones, { intro = false } = {}) {
  const ctx = await nav.newContext({ ...opciones, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  const errores = [];
  page.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
  page.on('pageerror', (e) => errores.push(String(e)));
  if (!intro) await page.addInitScript(() => sessionStorage.setItem('dj-intro', '1'));
  await page.goto(URL, { waitUntil: intro ? 'commit' : 'networkidle' });
  if (intro) {
    await page.waitForFunction(() => document.querySelector('.carga__logo.is-cargado'), null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/${nombre}-intro.png` });
    await page.waitForTimeout(2600);
  }
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${OUT}/${nombre}-1-heroe.png` });
  // Recorre la página para disparar apariciones y carga diferida.
  const alto = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < alto; y += 500) {
    await page.evaluate((v) => scrollTo(0, v), y);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(1200);
  const secciones = ['coleccion', 'casa', 'experiencia', 'contacto'];
  for (const s of secciones) {
    await page.evaluate((id) => document.getElementById(id)?.scrollIntoView(), s);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/${nombre}-${s}.png` });
  }
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${nombre}-final.png` });
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  console.log(`${nombre}: desborde horizontal ${desborde}px · errores ${errores.length ? errores.join(' | ') : 0}`);
  await ctx.close();
}

await capturar('escritorio', { viewport: { width: 1440, height: 900 } }, { intro: true });
await capturar('movil', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, { intro: true });
await nav.close();
