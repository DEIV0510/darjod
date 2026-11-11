// Política de seguridad de contenido (CSP) de cada página, escrita al compilar.
// Calcula el SHA-256 de cada <script> en línea que se ejecuta (la decisión de la pantalla de
// carga y su salida) y pone un <meta http-equiv="Content-Security-Policy"> al principio del
// <head>. Así solo corre el JS propio: ni scripts inyectados, ni de otros dominios, ni eval.
// Los <script type="application/json|ld+json"> son datos, no se ejecutan: no llevan hash.
// Estilos: 'unsafe-inline' porque el diseño usa variables en style="" (no ejecutan código).
// Uso: node scripts/csp.mjs   (después de astro build; lo llama npm run build)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DIST = 'dist';
const sha = (s) => `'sha256-${crypto.createHash('sha256').update(s, 'utf8').digest('base64')}'`;

const paginas = [];
(function recorrer(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) recorrer(p);
    else if (f.endsWith('.html')) paginas.push(p);
  }
})(DIST);

for (const archivo of paginas) {
  let html = fs.readFileSync(archivo, 'utf8');
  if (html.includes('http-equiv="Content-Security-Policy"')) throw new Error(`${archivo} ya tiene CSP`);
  const hashes = [];
  for (const [, attrs, cuerpo] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/\bsrc=/.test(attrs)) continue;
    if (/type="application\/(ld\+)?json"/.test(attrs)) continue;
    hashes.push(sha(cuerpo));
  }
  const politica = [
    "default-src 'self'",
    `script-src 'self' ${hashes.join(' ')}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "manifest-src 'self'",
    "media-src 'none'",
    "frame-src 'none'",
    "worker-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
    // El JS del sitio no escribe HTML como texto: cualquier innerHTML/eval queda bloqueado.
    "require-trusted-types-for 'script'",
    "trusted-types 'none'",
  ].join('; ');
  const meta = `<meta http-equiv="Content-Security-Policy" content="${politica}">`;
  // Justo después del charset: la CSP de un <meta> solo rige para lo que viene después.
  html = html.replace(/<meta charset="utf-8"\s*\/?>/i, (m) => m + meta);
  if (!html.includes(meta)) throw new Error(`${archivo}: no se encontró <meta charset>`);
  fs.writeFileSync(archivo, html);
  console.log(`CSP → ${path.relative(DIST, archivo)} (${hashes.length} scripts en línea)`);
}
