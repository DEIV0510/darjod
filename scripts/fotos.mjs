// Fotos del catálogo: de _material-cliente/marketplace/fotos/<id>.<ext> (originales del
// proveedor) a public/img/p/<id>.<hash>-<ancho>.{avif,webp}, todas cuadradas.
//
// Las fotos del proveedor vienen de tres tipos:
//   · Fondo de estudio blanco o gris claro (la mayoría): se lleva el fondo a blanco puro
//     (niveles por canal), se recorta el producto y se centra con aire en un cuadrado blanco.
//     En la web la foto se mezcla con «multiply» sobre el marfil de la tarjeta, así el blanco
//     desaparece y el frasco queda apoyado sobre el papel de la página.
//   · PNG con transparencia: igual, sobre blanco.
//   · Fotos con fondo propio (oscuras, de ambiente): recorte cuadrado centrado, sin mezcla.
// Escribe src/data/fotos.json: { id: { b: '/img/p/<id>.<hash>', f: 'b' | 'p' } }
//   f = 'b' (fondo blanco, se mezcla) o 'p' (foto con fondo propio).
// Uso: npm run fotos   (solo procesa lo nuevo o lo cambiado; borra lo que sobra)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import sharp from 'sharp';

const ORIGEN = '_material-cliente/marketplace/fotos';
const OUT = 'public/img/p';
const MANIFIESTO = 'src/data/fotos.json';
const ANCHOS = [360, 640];
const LADO = 640;
const OCUPA = 0.8; // el producto ocupa el 80 % del lado más largo del cuadrado
const VERSION = 'v3'; // cambiarla obliga a regenerar todo

const catalogo = JSON.parse(fs.readFileSync('src/data/catalogo.json', 'utf8'));
fs.mkdirSync(OUT, { recursive: true });
const anterior = fs.existsSync(MANIFIESTO) ? JSON.parse(fs.readFileSync(MANIFIESTO, 'utf8')) : {};

async function analizar(buf) {
  // Muestra del borde (anillo del 3 %) a 200 px para decidir el tipo de fondo.
  const { data, info } = await sharp(buf).resize(200, 200, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const borde = [];
  const m = 6;
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++) {
      if (x >= m && x < info.width - m && y >= m && y < info.height - m) continue;
      const i = (y * info.width + x) * 3;
      borde.push([data[i], data[i + 1], data[i + 2]]);
    }
  const mediana = [0, 1, 2].map((c) => {
    const v = borde.map((p) => p[c]).sort((a, b) => a - b);
    return v[v.length >> 1];
  });
  const cerca = borde.filter((p) => Math.hypot(p[0] - mediana[0], p[1] - mediana[1], p[2] - mediana[2]) < 22).length / borde.length;
  const luz = 0.2126 * mediana[0] + 0.7152 * mediana[1] + 0.0722 * mediana[2];
  return { estudio: luz > 196 && cerca > 0.8, fondo: mediana };
}

async function procesar(entrada) {
  // Aplana transparencias sobre blanco y orienta según EXIF.
  let buf = await sharp(entrada).rotate().flatten({ background: '#ffffff' }).toColourspace('srgb').png().toBuffer();
  const { estudio, fondo } = await analizar(buf);
  if (!estudio) {
    const out = await sharp(buf).resize(LADO, LADO, { fit: 'cover', position: 'centre', kernel: 'lanczos3' }).png().toBuffer();
    return { tipo: 'p', cuadrado: out };
  }
  // Niveles: el gris del fondo pasa a blanco (multiplicador por canal, sin tocar el negro).
  if (fondo.some((c) => c < 250)) {
    buf = await sharp(buf)
      .linear(
        fondo.map((c) => 255 / Math.max(c, 1)),
        [0, 0, 0],
      )
      .png()
      .toBuffer();
  }
  // Recorte del producto contra el blanco.
  let recortado;
  try {
    recortado = await sharp(buf).trim({ background: '#ffffff', threshold: 18 }).png().toBuffer();
  } catch {
    recortado = buf;
  }
  const { width: w, height: h } = await sharp(recortado).metadata();
  const escala = (LADO * OCUPA) / Math.max(w, h);
  const nw = Math.max(1, Math.round(w * escala));
  const nh = Math.max(1, Math.round(h * escala));
  const producto = await sharp(recortado).resize(nw, nh, { kernel: 'lanczos3' }).png().toBuffer();
  const out = await sharp({ create: { width: LADO, height: LADO, channels: 3, background: '#ffffff' } })
    .composite([{ input: producto, left: Math.round((LADO - nw) / 2), top: Math.round((LADO - nh) / 2) }])
    .png()
    .toBuffer();
  return { tipo: 'b', cuadrado: out };
}

const manifiesto = {};
const vivos = new Set();
let nuevos = 0;
const cola = [...catalogo];
async function trabajador() {
  for (let p = cola.shift(); p; p = cola.shift()) {
    const entrada = path.join(ORIGEN, p.foto);
    const firma = crypto.createHash('md5').update(fs.readFileSync(entrada)).update(VERSION).digest('hex').slice(0, 8);
    const base = `${p.id}.${firma}`;
    const archivos = ANCHOS.flatMap((w) => [`${base}-${w}.avif`, `${base}-${w}.webp`]);
    archivos.forEach((a) => vivos.add(a));
    if (archivos.every((a) => fs.existsSync(path.join(OUT, a))) && anterior[p.id]?.b === `/img/p/${base}`) {
      manifiesto[p.id] = anterior[p.id];
      continue;
    }
    const { tipo, cuadrado } = await procesar(entrada);
    for (const w of ANCHOS) {
      const r = sharp(cuadrado).resize(w, w);
      // Más calidad en fondo blanco: los bordes del frasco se notan sobre el marfil.
      await r.clone().avif({ quality: tipo === 'b' ? 56 : 50, effort: 5 }).toFile(path.join(OUT, `${base}-${w}.avif`));
      await r.clone().webp({ quality: tipo === 'b' ? 78 : 72, effort: 5 }).toFile(path.join(OUT, `${base}-${w}.webp`));
    }
    manifiesto[p.id] = { b: `/img/p/${base}`, f: tipo };
    nuevos++;
    if (nuevos % 50 === 0) console.log(`  ${nuevos}…`);
  }
}
await Promise.all(Array.from({ length: Math.max(2, Math.min(6, os.cpus().length - 1)) }, trabajador));

let borrados = 0;
for (const f of fs.readdirSync(OUT))
  if (!vivos.has(f)) {
    fs.rmSync(path.join(OUT, f));
    borrados++;
  }

const ordenado = Object.fromEntries(catalogo.map((p) => [p.id, manifiesto[p.id]]));
fs.writeFileSync(MANIFIESTO, JSON.stringify(ordenado) + '\n');
const peso = fs.readdirSync(OUT).reduce((s, f) => s + fs.statSync(path.join(OUT, f)).size, 0);
const conteo = Object.values(ordenado).reduce((c, v) => ((c[v.f] = (c[v.f] || 0) + 1), c), {});
console.log(`→ ${catalogo.length} fotos (${nuevos} nuevas, ${borrados} archivos borrados) · fondo blanco ${conteo.b || 0} · con fondo ${conteo.p || 0} · ${(peso / 1048576).toFixed(1)} MB en ${OUT}`);
