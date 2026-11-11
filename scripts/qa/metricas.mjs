// LCP y CLS medidos desde la página (PerformanceObserver) con red 4G lenta y CPU ×4.
// Tres escenarios: 1.ª visita (con pantalla de carga), visita repetida (sin ella) y fuentes
// retrasadas 1,5 s (para ver saltos de diseño al llegar la fuente).
// Uso: node scripts/qa/metricas.mjs [url]
import { chromium } from 'playwright-core';

const URL = process.argv[2] || 'http://localhost:5651/';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const nav = await chromium.launch({ executablePath: CHROME, headless: true });

const observar = () => {
  window.__m = { lcp: 0, lcpEl: '', cls: 0, fuentes: [] };
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      window.__m.lcp = e.startTime;
      window.__m.lcpEl = e.element ? `${e.element.tagName.toLowerCase()}.${[...e.element.classList].join('.')}` : e.url;
    }
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      if (e.hadRecentInput) continue;
      window.__m.cls += e.value;
      window.__m.fuentes.push(...e.sources.map((s) => `${s.node?.nodeName?.toLowerCase() ?? '?'}.${s.node?.className?.toString?.().slice(0, 40) ?? ''} ${e.value.toFixed(4)}`));
    }
  }).observe({ type: 'layout-shift', buffered: true });
};

async function medir(nombre, { intro, fuentesLentas = false }) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  await page.addInitScript(observar);
  if (!intro) await page.addInitScript(() => sessionStorage.setItem('dj-intro', '1'));
  if (fuentesLentas)
    await page.route('**/*.woff2', async (r) => {
      await new Promise((ok) => setTimeout(ok, 1500));
      await r.continue();
    });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(5000);
  const m = await page.evaluate(() => window.__m);
  console.log(`${nombre}: LCP ${Math.round(m.lcp)} ms (${m.lcpEl}) · CLS ${m.cls.toFixed(4)}${m.fuentes.length ? ' · ' + m.fuentes.slice(0, 5).join(' | ') : ''}`);
  await ctx.close();
}

await medir('1.ª visita, con pantalla de carga', { intro: true });
await medir('visita repetida, sin pantalla de carga', { intro: false });
await medir('fuentes retrasadas 1,5 s', { intro: false, fuentesLentas: true });
await nav.close();
