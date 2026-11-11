// Verificación de dist/ después de compilar (npm run check):
//   · Reglas del negocio: el sitio no afirma originalidad ni muestra precios.
//   · Todo recurso local referenciado existe; nada se carga de otros dominios.
//   · Cada página tiene un h1, CSP en <meta> y todas las imágenes llevan alt.
//   · Los enlaces de WhatsApp usan el número del negocio.
import fs from 'node:fs';
import path from 'node:path';

const DIST = 'dist';
const NUMERO = '573135595702';
let errores = 0;
const error = (m) => {
  errores++;
  console.log(`✗ ${m}`);
};

const paginas = [];
(function recorrer(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) recorrer(p);
    else if (f.endsWith('.html')) paginas.push(p);
  }
})(DIST);

for (const archivo of paginas) {
  const html = fs.readFileSync(archivo, 'utf8');
  const rel = path.relative(DIST, archivo);
  const texto = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ');

  // Reglas del negocio (acordadas con el usuario).
  if (/\boriginal(es)?\b|aut[eé]ntic/i.test(texto.replace(/Original Santal/g, ''))) error(`${rel}: afirma «original/auténtico»`);
  if (/\$\s?\d{2,3}[.,]\d{3}/.test(texto)) error(`${rel}: parece mostrar un precio`);

  if ((html.match(/<h1\b/g) || []).length !== 1) error(`${rel}: debe tener exactamente un h1`);
  if (!html.includes('http-equiv="Content-Security-Policy"')) error(`${rel}: sin CSP`);
  // El <template> de tarjetas se llena desde el JS (alt incluido).
  const sinPlantillas = html.replace(/<template[\s\S]*?<\/template>/g, '');
  for (const [img] of sinPlantillas.matchAll(/<img\b[^>]*>/g)) if (!/\salt=/.test(img)) error(`${rel}: <img> sin alt: ${img.slice(0, 80)}`);

  for (const [, url] of html.matchAll(/(?:src|href|srcset|imagesrcset)="([^"]+)"/g)) {
    for (const parte of url.split(',')) {
      const u = parte.trim().split(/\s+/)[0];
      if (!u || u.startsWith('#') || u.startsWith('data:') || u.startsWith('mailto:')) continue;
      if (/^https?:\/\//.test(u)) {
        const ok = /^https:\/\/(wa\.me|www\.google\.com\/maps|www\.instagram\.com|www\.tiktok\.com)\//.test(u) || u.startsWith('https://' + (process.env.SITE_URL || '§').replace(/^https?:\/\//, ''));
        if (!ok) error(`${rel}: recurso externo no permitido ${u}`);
        if (u.startsWith('https://wa.me/') && !u.startsWith(`https://wa.me/${NUMERO}?text=`)) error(`${rel}: WhatsApp con otro número ${u}`);
        continue;
      }
      const limpio = decodeURIComponent(u.split(/[?#]/)[0]);
      const destino = limpio.startsWith('/') ? path.join(DIST, limpio) : path.join(path.dirname(archivo), limpio);
      const existe = fs.existsSync(destino) && (fs.statSync(destino).isFile() || fs.existsSync(path.join(destino, 'index.html')));
      if (!existe) error(`${rel}: no existe ${u}`);
    }
  }
}

// El JSON del catálogo: sin precios ni costos.
const cat = fs.readFileSync(path.join(DIST, 'catalogo.json'), 'utf8');
if (/"(price|cost|precio|costo|stock|barcode)"\s*:|\$\s?\d/i.test(cat)) error('catalogo.json trae precios, costos o stock');
if (/\boriginal\b/i.test(cat.replace(/Original Santal/g, ''))) error('catalogo.json dice «original»');
const fotos = JSON.parse(cat).flatMap((p) => [`${p.b}-360.avif`, `${p.b}-640.webp`]);
const faltan = fotos.filter((f) => !fs.existsSync(path.join(DIST, f)));
if (faltan.length) error(`catalogo.json: ${faltan.length} fotos no existen (p. ej. ${faltan[0]})`);

console.log(errores ? `\n${errores} problemas` : `✓ ${paginas.length} páginas y ${fotos.length / 2} fotos del catálogo verificadas`);
process.exit(errores ? 1 : 0);
