// Fotogramas largos (Long Animation Frames) en móvil con CPU ×4: muestra qué parte es estilo/
// maquetación y qué scripts corren. Uso: node scripts/qa/loaf.mjs [url] [intro=1]
import { chromium } from 'playwright-core';
const URL = process.argv[2] || 'http://localhost:5651/';
const intro = process.argv[3] !== '0';
const nav = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const ctx = await nav.newContext({ viewport: { width: 412, height: 823 }, deviceScaleFactor: 2.6, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' });
const page = await ctx.newPage();
await page.addInitScript((intro) => {
  if (!intro) sessionStorage.setItem('dj-intro', '1');
  window.__loaf = [];
  new PerformanceObserver((l) => {
    for (const e of l.getEntries())
      window.__loaf.push({ t: Math.round(e.startTime), d: Math.round(e.duration), estilo: Math.round(e.styleAndLayoutStart ? e.startTime + e.duration - e.styleAndLayoutStart : 0), bloqueo: Math.round(e.blockingDuration), scripts: e.scripts.map((s) => `${s.invokerType}:${(s.sourceURL || '').split('/').pop()}:${s.sourceFunctionName || s.invoker} ${Math.round(s.duration)}ms`) });
  }).observe({ type: 'long-animation-frame', buffered: true });
}, intro);
const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await page.goto(URL, { waitUntil: 'load' });
await page.waitForTimeout(5000);
const r = await page.evaluate(() => window.__loaf);
for (const f of r) console.log(`@${f.t} ${f.d}ms (estilo+layout ${f.estilo}, bloqueo ${f.bloqueo}) ${f.scripts.join(' | ')}`);
await nav.close();
