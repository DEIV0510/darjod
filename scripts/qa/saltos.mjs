// Busca saltos de diseño (CLS) con fuentes retrasadas, a 412 px como Lighthouse móvil.
// Uso: node scripts/qa/saltos.mjs [url]
import { chromium } from 'playwright-core';
const URL = process.argv[2] || 'http://localhost:5651/';
const nav = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
for (const [retraso, intro] of [[600, true], [1500, true], [600, false], [1500, false]]) {
  const ctx = await nav.newContext({ viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  await page.addInitScript((intro) => {
    if (!intro) sessionStorage.setItem('dj-intro', '1');
    window.__s = [];
    new PerformanceObserver((l) => {
      for (const e of l.getEntries())
        if (!e.hadRecentInput)
          window.__s.push(`${e.value.toFixed(4)} @${Math.round(e.startTime)}: ` + e.sources.map((s) => `${s.node?.nodeName}.${String(s.node?.className || '').slice(0, 30)} y${Math.round(s.previousRect.y)}→${Math.round(s.currentRect.y)} h${Math.round(s.previousRect.height)}→${Math.round(s.currentRect.height)}`).join(' | '));
    }).observe({ type: 'layout-shift', buffered: true });
  }, intro);
  await page.route('**/*.woff2', async (r) => {
    await new Promise((ok) => setTimeout(ok, retraso));
    await r.continue();
  });
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(4000);
  const s = await page.evaluate(() => window.__s);
  console.log(`fuentes +${retraso} ms, ${intro ? 'con' : 'sin'} intro: ${s.length ? '\n  ' + s.join('\n  ') : 'sin saltos'}`);
  await ctx.close();
}
await nav.close();
