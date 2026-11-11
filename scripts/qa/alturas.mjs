// Alto total de la página y de cada sección, en escritorio y móvil.
// Uso: node scripts/qa/alturas.mjs [url]
import { chromium } from 'playwright-core';
const URL = process.argv[2] || 'http://localhost:5651/';
const nav = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
for (const [nombre, vp] of [['escritorio', { width: 1440, height: 900 }], ['móvil', { width: 390, height: 844 }]]) {
  const ctx = await nav.newContext({ viewport: vp, isMobile: vp.width < 500, deviceScaleFactor: vp.width < 500 ? 2 : 1 });
  const p = await ctx.newPage();
  await p.addInitScript(() => sessionStorage.setItem('dj-intro', '1'));
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  const r = await p.evaluate(() => {
    const total = document.documentElement.scrollHeight;
    const secs = [...document.querySelectorAll('main > section, footer.pie')].map((s) => `${s.id || s.className.split(' ')[0]} ${Math.round(s.getBoundingClientRect().height)}`);
    return { total, secs };
  });
  console.log(`${nombre}: ${r.total} px (${(r.total / vp.height).toFixed(1)} pantallas) · ${r.secs.join(' · ')}`);
  await ctx.close();
}
await nav.close();
