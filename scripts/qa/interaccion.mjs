// Pruebas de interacción en Chrome real contra dist/ servido (npm run preview → 5651).
// Uso: node scripts/qa/interaccion.mjs [url]
import { chromium } from 'playwright-core';

const BASE = (process.argv[2] || 'http://localhost:5651/').replace(/\/$/, '');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const nav = await chromium.launch({ executablePath: CHROME, headless: true });
let fallos = 0;
let pruebas = 0;
const ok = (cond, msg) => {
  pruebas++;
  if (!cond) {
    fallos++;
    console.log(`  ✗ ${msg}`);
  } else console.log(`  ✓ ${msg}`);
};
const WA = 'https://wa.me/573135595702?text=';

async function pagina(opciones = {}) {
  const ctx = await nav.newContext({ viewport: { width: 1280, height: 860 }, reducedMotion: 'no-preference', ...opciones });
  const page = await ctx.newPage();
  const problemas = [];
  page.on('console', (m) => (m.type() === 'error' || /Content Security Policy/i.test(m.text())) && problemas.push(m.text()));
  page.on('pageerror', (e) => problemas.push(String(e)));
  page.on('response', (r) => r.status() >= 400 && !r.url().endsWith('/no-existe/') && problemas.push(`${r.status()} ${r.url()}`));
  await page.addInitScript(() => sessionStorage.setItem('dj-intro', '1'));
  return { ctx, page, problemas };
}

// ── Escritorio: catálogo ───────────────────────────────────────────────────────────────
console.log('Catálogo (escritorio)');
{
  const { ctx, page, problemas } = await pagina();
  const json = page.waitForResponse((r) => r.url().endsWith('/catalogo.json'));
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  const tarjetas = () => page.locator('[data-rejilla] > li').count();
  ok((await tarjetas()) === 8, 'el HTML trae 8 tarjetas');
  await page.locator('#coleccion').scrollIntoViewIfNeeded();
  await json;
  await page.waitForTimeout(300);
  const estado = () => page.locator('[data-estado]').textContent();
  ok(/8 de 505/.test(await estado()), `estado inicial: «${await estado()}»`);

  await page.click('[data-mas]');
  await page.waitForTimeout(200);
  ok((await tarjetas()) === 20, '«Ver más» agrega 12 (20)');
  ok(/\(485\)/.test(await page.locator('[data-restantes]').textContent()), 'el botón dice cuántas quedan (485)');

  await page.click('[data-genero="1"]');
  await page.waitForTimeout(200);
  const metasDama = await page.locator('[data-rejilla] [data-c="meta"]').allTextContents();
  ok(metasDama.length > 0 && metasDama.every((m) => m.includes('Dama')), `filtro Dama: ${metasDama.length} tarjetas, todas «Dama»`);
  ok((await page.getAttribute('[data-genero="1"]', 'aria-pressed')) === 'true', 'botón Dama queda presionado');
  await page.click('[data-genero="0"]');

  await page.selectOption('[data-casa]', 'Lattafa');
  await page.waitForTimeout(200);
  const casas = await page.locator('[data-rejilla] [data-c="casa"]').allTextContents();
  ok(casas.length > 0 && casas.every((c) => c === 'Lattafa'), `filtro casa Lattafa: ${casas.length} tarjetas`);
  ok(/8 de 6\d resultados/.test(await estado()), `estado con filtro: «${await estado()}»`);
  const sin11 = await page.locator('[data-rejilla] [data-c="es11"]:not([hidden])').count();
  ok(sin11 === 0, 'las casas árabes no llevan «1.1»');

  await page.selectOption('[data-casa]', 'Dior');
  await page.waitForTimeout(200);
  const con11 = await page.locator('[data-rejilla] [data-c="es11"]:not([hidden])').count();
  const totalDior = await tarjetas();
  ok(totalDior > 0 && con11 === totalDior, `Dior: ${con11}/${totalDior} con etiqueta 1.1`);
  const hrefDior = decodeURIComponent((await page.locator('[data-rejilla] [data-c="comprar"]').first().getAttribute('href')).replace(WA, ''));
  ok(/\(1\.1\)/.test(hrefDior), `el mensaje de un 1.1 lo dice: «${hrefDior}»`);
  await page.selectOption('[data-casa]', '');

  await page.fill('[data-buscar]', 'khamrah');
  await page.waitForTimeout(400);
  const nombres = await page.locator('[data-rejilla] [data-c="nombre"]').allTextContents();
  ok(nombres.length >= 5 && nombres.every((n) => /khamrah/i.test(n)), `búsqueda «khamrah»: ${nombres.join(', ')}`);
  const comprar = await page.locator('[data-rejilla] [data-c="comprar"]').first().getAttribute('href');
  const consultar = await page.locator('[data-rejilla] [data-c="consultar"]').first().getAttribute('href');
  const msj = decodeURIComponent(comprar.replace(WA, ''));
  const msjC = decodeURIComponent(consultar.replace(WA, ''));
  ok(comprar.startsWith(WA) && /^Hola, DARJOD PARFUMS\. Estoy interesado en el perfume .*Khamrah.*\. ¿Me pueden brindar información\?$/.test(msj), `Comprar → «${msj}»`);
  ok(consultar.startsWith(WA) && /^Hola, DARJOD PARFUMS\. ¿Tienen disponible el perfume .*Khamrah.*\?$/.test(msjC), `Consultar → «${msjC}»`);
  ok((await page.locator('[data-rejilla] [data-c="comprar"]').first().getAttribute('target')) === '_blank', 'los enlaces de WhatsApp abren en otra pestaña');

  await page.fill('[data-buscar]', 'sin tildes acentuadas zzz');
  await page.waitForTimeout(400);
  ok(await page.locator('[data-vacio]').isVisible(), 'búsqueda sin resultados muestra el aviso con WhatsApp');
  ok(await page.locator('[data-mas]').isHidden(), '«Ver más» se oculta sin resultados');
  await page.fill('[data-buscar]', 'clasico');
  await page.waitForTimeout(400);
  ok((await tarjetas()) > 0, `búsqueda sin tilde «clasico» encuentra «Clásico» (${await tarjetas()})`);

  // Imágenes de las tarjetas clonadas cargan.
  await page.fill('[data-buscar]', '');
  await page.waitForTimeout(300);
  await page.click('[data-mas]');
  await page.waitForTimeout(200);
  await page.locator('[data-rejilla] > li').nth(16).scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  const rotas = await page.evaluate(() => [...document.querySelectorAll('[data-rejilla] img')].filter((i) => i.complete && i.getBoundingClientRect().top < innerHeight && i.naturalWidth === 0).length);
  ok(rotas === 0, 'imágenes visibles de tarjetas nuevas cargan');

  // Todos los enlaces de WhatsApp del HTML inicial.
  const was = await page.locator('a[href^="https://wa.me/"]').evaluateAll((as) => as.map((a) => a.href));
  ok(was.every((h) => h.startsWith(WA) && decodeURIComponent(h.split('text=')[1]).startsWith('Hola, DARJOD PARFUMS.')), `${was.length} enlaces de WhatsApp con número +57 313 559 5702 y saludo`);

  // Anclas internas apuntan a secciones existentes.
  const anclas = await page.locator('a[href^="#"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')).filter((h) => h.length > 1));
  const faltan = await page.evaluate((l) => l.filter((h) => !document.querySelector(h)), anclas);
  ok(faltan.length === 0, `anclas internas válidas (${anclas.length})${faltan.length ? ' faltan: ' + faltan.join(',') : ''}`);
  ok(problemas.length === 0, `sin errores de consola, CSP ni 4xx/5xx${problemas.length ? ': ' + problemas.join(' | ') : ''}`);
  await ctx.close();
}

// ── Móvil: menú, flotante ──────────────────────────────────────────────────────────────
console.log('Móvil');
{
  const { ctx, page, problemas } = await pagina({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  ok(!(await page.locator('#flotante').evaluate((e) => e.classList.contains('is-visible'))), 'el flotante no aparece sobre el héroe');
  await page.click('[data-abrir-menu]');
  await page.waitForTimeout(400);
  ok(await page.locator('#menu-movil').evaluate((d) => d.open), 'el menú se abre');
  ok((await page.getAttribute('[data-abrir-menu]', 'aria-expanded')) === 'true', 'aria-expanded=true');
  await page.goBack();
  await page.waitForTimeout(300);
  ok(!(await page.locator('#menu-movil').evaluate((d) => d.open)), '«Atrás» cierra el menú');
  ok(page.url().endsWith('/'), '«Atrás» no saca de la página');
  await page.click('[data-abrir-menu]');
  await page.waitForTimeout(400);
  await page.click('#menu-movil a[href="#experiencia"]');
  await page.waitForTimeout(1500);
  const top = await page.locator('#experiencia').evaluate((e) => e.getBoundingClientRect().top);
  ok(!(await page.locator('#menu-movil').evaluate((d) => d.open)) && Math.abs(top) < 120, `enlace del menú cierra y lleva a la sección (top ${Math.round(top)})`);
  await page.keyboard.press('Escape');
  await page.locator('#coleccion').scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  ok(await page.locator('#flotante').evaluate((e) => e.classList.contains('is-visible')), 'el flotante aparece en la colección');
  await page.locator('#contacto').scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  ok(!(await page.locator('#flotante').evaluate((e) => e.classList.contains('is-visible'))), 'el flotante se aparta en contacto');
  const ancho = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  ok(ancho === 0, 'sin desborde horizontal a 390 px');
  const pequenos = await page.evaluate(() =>
    [...document.querySelectorAll('a, button, select, input')]
      .filter((e) => e.offsetParent && !e.closest('dialog:not([open])') && !e.classList.contains('salto'))
      .map((e) => [e, e.getBoundingClientRect()])
      .filter(([, r]) => r.width > 0 && (r.height < 24 || r.width < 24))
      .map(([e]) => e.textContent.trim().slice(0, 30) || e.getAttribute('aria-label')),
  );
  ok(pequenos.length === 0, `objetivos táctiles ≥ 24 px${pequenos.length ? ': ' + pequenos.join(', ') : ''}`);
  ok(problemas.length === 0, `sin errores${problemas.length ? ': ' + problemas.join(' | ') : ''}`);
  await ctx.close();
}

// ── Otras páginas ──────────────────────────────────────────────────────────────────────
console.log('Páginas');
{
  const { ctx, page, problemas } = await pagina();
  for (const r of ['/privacidad/', '/datos-personales/', '/terminos/']) {
    const res = await page.goto(`${BASE}${r}`, { waitUntil: 'networkidle' });
    ok(res.status() === 200 && (await page.locator('h1').count()) === 1, `${r} responde 200 con un h1`);
  }
  ok(problemas.length === 0, `sin errores en las páginas legales${problemas.length ? ': ' + problemas.join(' | ') : ''}`);
  const res = await page.goto(`${BASE}/no-existe/`, { waitUntil: 'networkidle' });
  ok(res.status() === 404 && /no dejó huella/i.test(await page.locator('h1').textContent()), '/no-existe/ → 404 propio');
  for (const r of ['/robots.txt', '/sitemap.xml', '/manifest.webmanifest', '/favicon.ico', '/og.jpg']) {
    const x = await page.request.get(`${BASE}${r}`);
    ok(x.status() === 200, `${r} 200`);
  }
  const h = await page.request.get(`${BASE}/`);
  const enc = h.headers();
  ok(enc['x-frame-options'] === 'DENY' && /frame-ancestors 'none'/.test(enc['content-security-policy'] || '') && enc['x-content-type-options'] === 'nosniff', 'cabeceras de seguridad presentes');
  await ctx.close();
}

await nav.close();
console.log(`\n${pruebas - fallos}/${pruebas} pruebas correctas`);
process.exit(fallos ? 1 : 0);
