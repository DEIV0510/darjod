// Piezas de marca a partir del material del cliente (_material-cliente/):
//   · logo-plateado.png (1568 × 1003, fondo transparente) → logo completo con marco, el
//     núcleo (frasco + DARJOD PARFUMS), la palabra (DARJOD PARFUMS) y el frasco solo.
//     Los recortes se hacen por rectángulos medidos sobre el original, para que no entren
//     trozos del marco ornamental.
//   · logo-terciopelo.png → imagen para compartir (public/og.jpg, 1200 × 630).
//   · Fotos propias de producto → AVIF y WebP en varios anchos para el héroe y la sección
//     editorial.
// Todo con hash en el nombre (caché inmutable). Escribe public/marca/, public/favicon.ico,
// public/og.jpg y src/data/marca.json.
// Uso: npm run marca
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const ORIGEN = '_material-cliente';
const OUT = 'public/marca';
const VINO = '#3a0a14';
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const hash = (buf) => crypto.createHash('md5').update(buf).digest('hex').slice(0, 8);
async function guardar(nombre, buf) {
  const final = nombre.replace('{h}', hash(buf));
  fs.writeFileSync(path.join(OUT, final), buf);
  return `/marca/${final}`;
}
const kb = (b) => `${(b.length / 1024).toFixed(1)} KB`;

// ── Logo ────────────────────────────────────────────────────────────────────────────────
const LOGO = path.join(ORIGEN, 'logo-plateado.png');
const meta = await sharp(LOGO).metadata();
// Rectángulos medidos sobre el original (ver el comentario del encabezado).
const FRASCO = { left: 597, top: 150, width: 375, height: 506 };
const DARJOD = { left: 412, top: 655, width: 734, height: 136 };
// En la palabra sola se empieza 7 px más abajo: arriba de la «J» asoma la base del frasco.
const DARJOD_SOLO = { left: 412, top: 662, width: 734, height: 129 };
const PARFUMS = { left: 528, top: 795, width: 500, height: 67 };

async function recorte(zonas, caja) {
  const capas = [];
  for (const z of zonas) {
    capas.push({ input: await sharp(LOGO).extract(z).png().toBuffer(), left: z.left - caja.left, top: z.top - caja.top });
  }
  return sharp({ create: { width: caja.width, height: caja.height, channels: 4, background: '#0000' } })
    .composite(capas)
    .png()
    .toBuffer();
}
const cajaDe = (zonas) => {
  const l = Math.min(...zonas.map((z) => z.left));
  const t = Math.min(...zonas.map((z) => z.top));
  const r = Math.max(...zonas.map((z) => z.left + z.width));
  const b = Math.max(...zonas.map((z) => z.top + z.height));
  return { left: l, top: t, width: r - l, height: b - t };
};

const marca = {};

// Logo completo con marco (pantalla de carga y cierre).
{
  const anchos = [420, 720, 1040];
  marca.logo = { ancho: meta.width, alto: meta.height, avif: [], webp: [] };
  for (const w of anchos) {
    const base = sharp(LOGO).resize(w);
    const avif = await base.clone().avif({ quality: 52, effort: 6 }).toBuffer();
    const webp = await base.clone().webp({ quality: 74, alphaQuality: 70, effort: 6 }).toBuffer();
    marca.logo.avif.push([await guardar(`logo-${w}.{h}.avif`, avif), w]);
    marca.logo.webp.push([await guardar(`logo-${w}.{h}.webp`, webp), w]);
    console.log(`logo ${w}: avif ${kb(avif)} · webp ${kb(webp)}`);
  }
}

// Palabra «DARJOD PARFUMS» (cabecera y pie).
{
  const zonas = [DARJOD_SOLO, PARFUMS];
  const caja = cajaDe(zonas);
  const png = await recorte(zonas, caja);
  const anchos = [200, 400];
  marca.palabra = { ancho: caja.width, alto: caja.height, avif: [], webp: [] };
  for (const w of anchos) {
    const avif = await sharp(png).resize(w).avif({ quality: 60, effort: 6 }).toBuffer();
    const webp = await sharp(png).resize(w).webp({ quality: 82, alphaQuality: 80, effort: 6 }).toBuffer();
    marca.palabra.avif.push([await guardar(`palabra-${w}.{h}.avif`, avif), w]);
    marca.palabra.webp.push([await guardar(`palabra-${w}.{h}.webp`, webp), w]);
  }
}

// Núcleo: frasco + palabra (menú móvil).
{
  const zonas = [FRASCO, DARJOD, PARFUMS];
  const caja = cajaDe(zonas);
  const png = await recorte(zonas, caja);
  marca.nucleo = { ancho: caja.width, alto: caja.height, avif: [], webp: [] };
  for (const w of [240, 360, 480]) {
    const avif = await sharp(png).resize(w).avif({ quality: 56, effort: 6 }).toBuffer();
    const webp = await sharp(png).resize(w).webp({ quality: 78, alphaQuality: 75, effort: 6 }).toBuffer();
    marca.nucleo.avif.push([await guardar(`nucleo-${w}.{h}.avif`, avif), w]);
    marca.nucleo.webp.push([await guardar(`nucleo-${w}.{h}.webp`, webp), w]);
  }
}

// Frasco solo: íconos.
const frasco = await recorte([FRASCO], FRASCO);
{
  marca.iconos = {};
  const tamaños = { i16: [16, 0.92], i32: [32, 0.9], i180: [180, 0.74], i192: [192, 0.74], i512: [512, 0.74], m512: [512, 0.6] };
  for (const [clave, [lado, escala]] of Object.entries(tamaños)) {
    const alto = Math.round(lado * escala);
    const capa = await sharp(frasco).resize({ height: alto }).png().toBuffer();
    const { width: ancho } = await sharp(capa).metadata();
    const png = await sharp({ create: { width: lado, height: lado, channels: 4, background: VINO } })
      .composite([{ input: capa, left: Math.round((lado - ancho) / 2), top: Math.round((lado - alto) / 2) }])
      .png({ compressionLevel: 9, ...(lado >= 180 ? { palette: true, quality: 92, effort: 10 } : {}) })
      .toBuffer();
    marca.iconos[clave] = await guardar(`icono-${clave}.{h}.png`, png);
  }
  // favicon.ico con dos PNG dentro (16 y 32).
  const ico = [16, 32].map((l) => fs.readFileSync(path.join('public', marca.iconos[`i${l}`])));
  const cabecera = Buffer.alloc(6 + 16 * ico.length);
  cabecera.writeUInt16LE(0, 0);
  cabecera.writeUInt16LE(1, 2);
  cabecera.writeUInt16LE(ico.length, 4);
  let desplazamiento = cabecera.length;
  ico.forEach((png, k) => {
    const l = k === 0 ? 16 : 32;
    const o = 6 + 16 * k;
    cabecera.writeUInt8(l, o);
    cabecera.writeUInt8(l, o + 1);
    cabecera.writeUInt16LE(1, o + 4);
    cabecera.writeUInt16LE(32, o + 6);
    cabecera.writeUInt32LE(png.length, o + 8);
    cabecera.writeUInt32LE(desplazamiento, o + 12);
    desplazamiento += png.length;
  });
  fs.writeFileSync('public/favicon.ico', Buffer.concat([cabecera, ...ico]));
}

// ── Imagen para compartir (WhatsApp, Facebook…) ─────────────────────────────────────────
{
  const og = await sharp(path.join(ORIGEN, 'logo-terciopelo.png'))
    .resize(1200, 630, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer();
  fs.writeFileSync('public/og.jpg', og);
  console.log(`og.jpg ${kb(og)}`);
}

// ── Fotos propias (héroe y sección editorial) ───────────────────────────────────────────
// recorte: zona útil del original (fuera bordes de mueble o manos); anchos: variantes.
const FOTOS = {
  khamrah: { archivo: 'khamrah.jpg', anchos: [420, 640, 824], recorte: null, alt: 'Frasco de Khamrah de Lattafa con su tapa de cristal tallado' },
  eclaire: { archivo: 'eclaire-set.jpg', anchos: [320, 560, 900], recorte: { left: 0, top: 150, width: 1054, height: 1450 }, alt: 'Estuche Eclaire de Lattafa: perfume, crema corporal y atomizador de viaje' },
  amber: { archivo: 'amber-oud-gold.jpg', anchos: [480, 760, 960], recorte: { left: 120, top: 150, width: 840, height: 1050 }, alt: 'Amber Oud Gold Edition de Al Haramain, 120 ml' },
  clubDeNuit: { archivo: 'club-de-nuit-set.jpg', anchos: [360, 600, 900], recorte: { left: 0, top: 180, width: 900, height: 1000 }, alt: 'Estuche Club de Nuit Intense Man de Armaf' },
  khamrahCofre: { archivo: 'khamrah-cofre.jpg', anchos: [480, 800, 1180], recorte: { left: 100, top: 210, width: 1180, height: 640 }, alt: 'Cofre de Khamrah de Lattafa con body mist, perfume y accesorios' },
};
marca.fotos = {};
for (const [clave, f] of Object.entries(FOTOS)) {
  let base = sharp(path.join(ORIGEN, f.archivo)).rotate();
  if (f.recorte) base = base.extract(f.recorte);
  const buf = await base.toBuffer();
  const { width, height } = await sharp(buf).metadata();
  const item = { ancho: width, alto: height, alt: f.alt, avif: [], webp: [] };
  for (const w of f.anchos.filter((a) => a <= width)) {
    const r = sharp(buf).resize(w);
    const avif = await r.clone().avif({ quality: 50, effort: 6 }).toBuffer();
    const webp = await r.clone().webp({ quality: 72, effort: 6 }).toBuffer();
    item.avif.push([await guardar(`${clave}-${w}.{h}.avif`, avif), w]);
    item.webp.push([await guardar(`${clave}-${w}.{h}.webp`, webp), w]);
    if (w === f.anchos[f.anchos.length - 1] || w === f.anchos[0]) console.log(`${clave} ${w}: avif ${kb(avif)} · webp ${kb(webp)}`);
  }
  marca.fotos[clave] = item;
}

fs.writeFileSync('src/data/marca.json', JSON.stringify(marca, null, 2) + '\n');
console.log('→ public/marca/, public/favicon.ico, public/og.jpg, src/data/marca.json');
