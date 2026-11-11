// Fuentes autoalojadas (sin peticiones a Google):
//   · Cinzel: titulares en mayúsculas romanas, el mismo aire de las letras del logo.
//     Instancia estática 500 (una sola: pesa menos y no obliga a instanciar la variable).
//   · Cormorant Garamond cursiva 500: frases editoriales.
//   · Jost 400–500: textos, navegación y botones.
// - Recorta cada fuente a los glifos del español que usa el sitio.
// - Nombre con hash (caché inmutable) en public/fonts/.
// - Escribe src/styles/fuentes.css con @font-face + respaldos con métricas ajustadas (capsize)
//   para que el texto no salte al llegar la fuente (CLS), y src/data/fuentes.json.
// Las métricas vienen de @capsizecss/metrics (copiadas aquí: el paquete completo no se
// instala bien en Windows).
// Uso: npm run fonts
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import subsetFont from 'subset-font';
import { createFontStack } from '@capsizecss/core';

const cinzel = { familyName: 'Cinzel', fullName: 'Cinzel Regular', postscriptName: 'Cinzel-Regular', category: 'serif', capHeight: 700, ascent: 976, descent: -372, lineGap: 0, unitsPerEm: 1000, xHeight: 500, xWidthAvg: 556 };
const cormorant = { familyName: 'Cormorant Garamond', fullName: 'Cormorant Garamond Regular', postscriptName: 'CormorantGaramond-Regular', category: 'serif', capHeight: 625, ascent: 924, descent: -287, lineGap: 0, unitsPerEm: 1000, xHeight: 386, xWidthAvg: 394 };
const jost = { familyName: 'Jost', fullName: 'Jost Regular', postscriptName: 'Jost-Regular', category: 'sans-serif', capHeight: 700, ascent: 1070, descent: -375, lineGap: 0, unitsPerEm: 1000, xHeight: 460, xWidthAvg: 428 };
const arial = { familyName: 'Arial', fullName: 'Arial', postscriptName: 'ArialMT', category: 'sans-serif', capHeight: 1467, ascent: 1854, descent: -434, lineGap: 67, unitsPerEm: 2048, xHeight: 1062, xWidthAvg: 913 };
const times = { familyName: 'Times New Roman', fullName: 'Times New Roman', postscriptName: 'TimesNewRomanPSMT', category: 'serif', capHeight: 1356, ascent: 1825, descent: -443, lineGap: 87, unitsPerEm: 2048, xHeight: 916, xWidthAvg: 832 };

const OUT_DIR = 'public/fonts';
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

let chars = '';
for (let c = 0x20; c <= 0x7e; c++) chars += String.fromCharCode(c);
for (let c = 0xa0; c <= 0xff; c++) chars += String.fromCharCode(c);
chars += [0x2013, 0x2014, 0x2018, 0x2019, 0x201c, 0x201d, 0x2026, 0x2022, 0x2032, 0x2192, 0x2190, 0x2197, 0x2212, 0x2009, 0x202f, 0x00b7, 0x0152, 0x0153]
  .map((c) => String.fromCharCode(c))
  .join('');

const hash = (buf) => crypto.createHash('md5').update(buf).digest('hex').slice(0, 8);
const BASE = 'node_modules/@fontsource-variable';

async function build(src, nombre, opts = {}) {
  const input = fs.readFileSync(src);
  const out = await subsetFont(input, chars, { targetFormat: 'woff2', ...opts });
  const archivo = `${nombre}.${hash(out)}.woff2`;
  fs.writeFileSync(path.join(OUT_DIR, archivo), out);
  console.log(`${archivo}: ${(input.length / 1024).toFixed(1)} KB → ${(out.length / 1024).toFixed(1)} KB`);
  return `/fonts/${archivo}`;
}

const titular = await build(`${BASE}/cinzel/files/cinzel-latin-wght-normal.woff2`, 'cinzel', { variationAxes: { wght: 500 } });
const cursiva = await build(`${BASE}/cormorant-garamond/files/cormorant-garamond-latin-wght-italic.woff2`, 'cormorant-cursiva', { variationAxes: { wght: 500 } });
const texto = await build(`${BASE}/jost/files/jost-latin-wght-normal.woff2`, 'jost', { variationAxes: { wght: { min: 400, max: 500 } } });

const display = createFontStack([cinzel, times], { fontFaceFormat: 'styleString' });
const editorial = createFontStack([cormorant, times], { fontFaceFormat: 'styleString' });
const text = createFontStack([jost, arial], { fontFaceFormat: 'styleString' });

const css = `/* Generado por scripts/fuentes.mjs — no editar a mano. */
@font-face {
  font-family: 'Cinzel';
  src: url('${titular}') format('woff2');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Cormorant Garamond';
  src: url('${cursiva}') format('woff2');
  font-weight: 500;
  font-style: italic;
  font-display: swap;
}
@font-face {
  font-family: 'Jost';
  src: url('${texto}') format('woff2');
  font-weight: 400 500;
  font-style: normal;
  font-display: swap;
}
${display.fontFaces}
${editorial.fontFaces.replace(/font-family: "([^"]+)";/, 'font-family: "$1";\n  font-style: italic;')}
${text.fontFaces}
:root {
  --font-titular: ${display.fontFamily}, Georgia, serif;
  --font-cursiva: ${editorial.fontFamily}, Georgia, serif;
  --font-texto: ${text.fontFamily}, system-ui, sans-serif;
}
`;

fs.mkdirSync('src/styles', { recursive: true });
fs.writeFileSync('src/styles/fuentes.css', css);
fs.writeFileSync('src/data/fuentes.json', JSON.stringify({ titular, cursiva, texto }, null, 2) + '\n');
console.log('→ src/styles/fuentes.css, src/data/fuentes.json');
