// Catálogo de DARJOD PARFUMS a partir del marketplace del proveedor
// (marketplace.cabal-app.com/perfumeriacolombia). El usuario indicó sacar los perfumes de ahí.
//
// Qué hace:
//   1. Descarga las páginas del listado (Next.js las sirve con los datos embebidos) y guarda
//      una copia cruda en _material-cliente/marketplace/productos.json — SIN costo, código de
//      barras ni stock (no se publican y no hacen falta).
//   2. Descarga la foto original de cada producto (la de mayor resolución que da el proveedor)
//      a _material-cliente/marketplace/fotos/<id>.<ext>; si ya existe, no la vuelve a bajar.
//   3. Normaliza y escribe src/data/catalogo.json, que es lo único que usa el sitio.
//
// Reglas acordadas con el usuario (2026-11-10):
//   · Todos los productos, SIN precios (todo se consulta por WhatsApp).
//   · El sitio no dice «original» ni «auténtico». El proveedor marca sus categorías como
//     «perfumes 1.1»; las fragancias de casas de diseñador y nicho llevan la etiqueta «1.1».
//
// Uso: npm run catalogo            (usa la copia cruda si existe)
//      npm run catalogo -- --red   (vuelve a descargar el listado del proveedor)
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'https://marketplace.cabal-app.com/perfumeriacolombia/products?category_ids=';
const DIR = '_material-cliente/marketplace';
const CRUDO = path.join(DIR, 'productos.json');
const FOTOS = path.join(DIR, 'fotos');
const SALIDA = 'src/data/catalogo.json';
const UA = { 'User-Agent': 'Mozilla/5.0 (catalogo DARJOD)' };

fs.mkdirSync(FOTOS, { recursive: true });

// ── 1. Listado ──────────────────────────────────────────────────────────────────────────
function extraer(html) {
  const trozos = [...html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)].map((m) => JSON.parse(`"${m[1]}"`));
  const txt = trozos.join('');
  const leer = (clave) => {
    const i = txt.indexOf(`"${clave}":`);
    if (i < 0) return null;
    let profundidad = 0;
    let fin = i + clave.length + 3;
    const inicio = fin;
    for (let enCadena = false, escape = false; fin < txt.length; fin++) {
      const c = txt[fin];
      if (enCadena) {
        if (escape) escape = false;
        else if (c === '\\') escape = true;
        else if (c === '"') enCadena = false;
        continue;
      }
      if (c === '"') enCadena = true;
      else if (c === '[' || c === '{') profundidad++;
      else if (c === ']' || c === '}') {
        profundidad--;
        if (profundidad === 0) return JSON.parse(txt.slice(inicio, fin + 1));
      }
    }
    return null;
  };
  return { resultados: leer('results'), paginacion: leer('pagination') };
}

async function pagina(n) {
  for (let intento = 1; intento <= 3; intento++) {
    try {
      const r = await fetch(`${BASE}&page=${n}`, { headers: UA });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return extraer(await r.text());
    } catch (e) {
      if (intento === 3) throw e;
      await new Promise((ok) => setTimeout(ok, 1500 * intento));
    }
  }
}

let crudos;
if (process.argv.includes('--red') || !fs.existsSync(CRUDO)) {
  crudos = [];
  const primera = await pagina(1);
  crudos.push(...primera.resultados);
  const ultima = primera.paginacion?.last ?? 1;
  for (let n = 2; n <= ultima; n++) {
    crudos.push(...(await pagina(n)).resultados);
    await new Promise((ok) => setTimeout(ok, 300));
  }
  // Nada de costo, código de barras ni stock en el repositorio.
  crudos = crudos.map(({ cost, barcode, stock, is_avg_cost, show_in_pos, ...resto }) => resto);
  fs.writeFileSync(CRUDO, JSON.stringify(crudos, null, 1) + '\n');
  console.log(`Listado: ${crudos.length} productos (${ultima} páginas)`);
} else {
  crudos = JSON.parse(fs.readFileSync(CRUDO, 'utf8'));
}

// ── 2. Fotos originales ─────────────────────────────────────────────────────────────────
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const yaEsta = (id) => fs.readdirSync(FOTOS).find((f) => f.startsWith(`${id}.`));
async function foto(p) {
  if (yaEsta(p.id)) return;
  const url = p.images?.[0]?.image_url || p.main_image;
  const firmado = url.split('/redirect/')[1].split('/')[0];
  const nombre = url.slice(url.lastIndexOf('/') + 1);
  // La «representation» viene recortada a 500 × 500; el blob es el archivo original.
  const candidatos = [`https://api.cabal-app.com/rails/active_storage/blobs/redirect/${firmado}/${nombre}`, url];
  for (const c of candidatos) {
    try {
      const r = await fetch(c, { headers: UA, redirect: 'follow' });
      const tipo = (r.headers.get('content-type') || '').split(';')[0];
      if (!r.ok || !EXT[tipo]) continue;
      fs.writeFileSync(path.join(FOTOS, `${p.id}.${EXT[tipo]}`), Buffer.from(await r.arrayBuffer()));
      return;
    } catch {}
  }
  throw new Error(`Sin foto: ${p.id} ${p.name}`);
}
const pendientes = crudos.filter((p) => !yaEsta(p.id));
for (let i = 0; i < pendientes.length; i += 6) await Promise.all(pendientes.slice(i, i + 6).map(foto));
if (pendientes.length) console.log(`Fotos nuevas: ${pendientes.length}`);

// ── 3. Normalización ────────────────────────────────────────────────────────────────────
// Nombre visible de cada casa (corrige erratas del proveedor: «Louis Vuitonn», «Ralph Laurent»…).
const CASAS = {
  ACCESORIOS: 'Accesorios',
  AFNAN: 'Afnan',
  AHLI: 'Ahli',
  'AL HARAMAIN': 'Al Haramain',
  'ANTONIO BANDERAS': 'Antonio Banderas',
  'ARIANA GRANDE': 'Ariana Grande',
  ARMAF: 'Armaf',
  AZZARO: 'Azzaro',
  BHARARA: 'Bharara',
  'BODY SPRAYS': 'Body sprays',
  BOND: 'Bond No. 9',
  BVLGARI: 'Bvlgari',
  'CALVIN KLEIN': 'Calvin Klein',
  'CAROLINA HERRERA': 'Carolina Herrera',
  CHANEL: 'Chanel',
  'CLINIQUE HAPPY': 'Clinique',
  CREED: 'Creed',
  DIESEL: 'Diesel',
  DIOR: 'Dior',
  'DOLCE & GABANNA': 'Dolce & Gabbana',
  'EMPORIO ARMANI': 'Emporio Armani',
  'FRENCH AVENUE': 'French Avenue',
  'GIORGIO ARMANI': 'Giorgio Armani',
  GIVENCHY: 'Givenchy',
  GUCCI: 'Gucci',
  'HUGO BOSS': 'Hugo Boss',
  ILMIN: 'Ilmin',
  'ISSEY MIYAKE PARFUMS': 'Issey Miyake',
  'JEAN PAUL GAULTIER': 'Jean Paul Gaultier',
  'JO MILANO': 'Jo Milano',
  'KITS O SET DE PERFUMERÍA': 'Kits y sets',
  LACOSTE: 'Lacoste',
  LANCOME: 'Lancôme',
  LATTAFA: 'Lattafa',
  'LE LABO': 'Le Labo',
  'LOUIS VUITONN': 'Louis Vuitton',
  'MARC JACOBS': 'Marc Jacobs',
  MONTBLANC: 'Montblanc',
  MOSCHINO: 'Moschino',
  NAUTICA: 'Nautica',
  ORIENTICA: 'Orientica',
  OTROS: 'Otras casas',
  'PACO RABANNE': 'Paco Rabanne',
  'PERRY ELIS': 'Perry Ellis',
  'RALPH LAURENT': 'Ralph Lauren',
  RASASSI: 'Rasasi',
  'TOMMY HILFIGER': 'Tommy Hilfiger',
  VALENTINO: 'Valentino',
  VERSACE: 'Versace',
  XERJOFF: 'Xerjoff',
};
// Productos que el proveedor dejó sin categoría: la casa sale del propio nombre.
const SIN_CATEGORIA = [
  [/givenchy/i, 'Givenchy'],
  [/kenzo/i, 'Kenzo'],
  [/light blue/i, 'Dolce & Gabbana'],
  [/omnia/i, 'Bvlgari'],
];
// Casas árabes (de Oriente Medio). Todo lo demás —diseñador y nicho— lleva la etiqueta «1.1».
const ARABES = new Set(['Afnan', 'Ahli', 'Al Haramain', 'Armaf', 'Body sprays', 'French Avenue', 'Ilmin', 'Jo Milano', 'Kits y sets', 'Lattafa', 'Orientica', 'Rasasi']);
// Dentro de «Otras casas»: Marwa (Arabiyat Prestige) y Nitro Red (Dumont) son árabes.
const ARABES_POR_NOMBRE = [/marwa/i, /nitro red/i];
// En estas casas el nombre repite la marca («Afef Lattafa»): se quita para no leerla dos veces.
const QUITAR_CASA = { Lattafa: /\blattafa\b/i, Bharara: /\bbhara(ra)?\b/i, Ilmin: /\bilmin\b/i, Orientica: /\borientica\b/i, Ahli: /\b(ahli|alhi)\b/i };

const normalizar = (s) => (s || '').normalize('NFC').replace(/\s+/g, ' ').trim();
const sinAcentos = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const slug = (s) =>
  sinAcentos(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function presentacionDe(nombre) {
  const partes = [];
  if (/cofre\s+gam(u|a)sado/i.test(nombre)) partes.push('Cofre gamuzado');
  else if (/caja\s+gam(u|a)sad[oa]/i.test(nombre)) partes.push('Caja gamuzada');
  else if (/\bcofre\b/i.test(nombre)) partes.push(/lujo/i.test(nombre) ? 'Cofre de lujo' : 'Cofre');
  else if (/\bcaja\b/i.test(nombre)) partes.push('En caja');
  if (/\bT\/M\b|tapa met[aá]lica/i.test(nombre)) partes.push('Tapa metálica');
  if (/\bnueva p\b/i.test(nombre)) partes.push('Nueva presentación');
  if (/\bkit\b.*\b5 pz\b/i.test(nombre)) partes.push('Kit de 5 piezas');
  if (/pa[ñn]uelo/i.test(nombre)) partes.push('con pañuelo');
  return capital(partes.join(' · ').replace(' · con pañuelo', ' con pañuelo').toLowerCase());
}

// Erratas evidentes del proveedor en los nombres visibles. El mensaje de WhatsApp conserva
// el nombre tal cual lo publica el proveedor (campo «ref»), para que identifique el producto.
const CORRECCIONES = [
  [/\bAboslu\b/i, 'Absolu'],
  [/\bFharenheit\b/i, 'Fahrenheit'],
  [/\bWhit You\b/i, 'With You'],
  [/\bIntensly\b/i, 'Intensely'],
  [/\bHugos Boss Inmontion\b/i, 'Hugo Boss In Motion'],
  [/\bUnlimiteed\b/i, 'Unlimited'],
  [/\bRalp Laurent\b/i, 'Ralph Lauren'],
  [/\bOdissey\b/gi, 'Odyssey'],
  [/\bBumble Gumm\b/i, 'Bubble Gum'],
  [/\bClasique\b/i, 'Classique'],
  [/\bBourbone\b/i, 'Bourbon'],
  [/\bOversdose\b/i, 'Overdose'],
  [/\bBrezze\b/i, 'Breeze'],
  [/\bMillestone\b/i, 'Milestone'],
  [/\bToffe Coffe\b/i, 'Toffee Coffee'],
  [/\bMarsmallow\b/i, 'Marshmallow'],
  [/\bNight Outh\b/i, 'Night Out'],
  [/\b9\s?am\b/gi, '9 AM'],
  [/\b9\s?pm\b/gi, '9 PM'],
  [/\bDunkan\b/i, 'Dukhan'],
  [/\bQawha\b/i, 'Qahwa'],
  [/\bFakar\b/i, 'Fakhar'],
  [/\bMusaman\b/i, 'Musamam'],
  [/\bAzurre\b/i, 'Azure'],
  [/\bBvlgary\b/gi, 'Bvlgari'],
  [/\bAqua marine pour Home\b/i, 'Aqua Marine Pour Homme'],
  [/\bDaysi\b/i, 'Daisy'],
  [/\bBoyage\b/i, 'Voyage'],
  [/\bHallowen\b/i, 'Halloween'],
  [/\bTatto\b/i, 'Tattoo'],
  [/\bEsential\b/i, 'Essential'],
  [/\bExtravaganzza\b/i, 'Extravaganza'],
  [/\bBor(in|n)? In Roma\b|\bBorin Roma\b/i, 'Born in Roma'],
  [/\bLigth\b/i, 'Light'],
  [/\bDolce Gaban+a\b/i, 'Dolce & Gabbana'],
  [/\bTurqoise\b/i, 'Turquoise'],
  [/\bNighy\b/i, 'Night'],
  [/\bDotdrama\b/i, 'Dot Drama'],
  [/\bPhanton\b/i, 'Phantom'],
  [/\bLaphrodisiaque\b/i, "L'Aphrodisiaque"],
  [/\bLemperatrice\b/i, "L'Impératrice"],
  [/\bLuis Vuitton\b/i, 'Louis Vuitton'],
  [/\bPacifi Chill\b/i, 'Pacific Chill'],
  [/\bL'inmensete\b/i, "L'Immensité"],
  [/\bNuit Dissey\b/i, "Nuit d'Issey"],
  [/\bAnge u Demon\b/i, 'Ange ou Démon'],
  [/\bBlecker\b/i, 'Bleecker'],
  [/\bAqua Di Giola\b/i, 'Acqua di Gioia'],
  [/\bAqua De Gio\b/i, 'Acqua di Giò'],
  [/\bClasic\b/i, 'Clásico'],
  [/\bClasico\b/i, 'Clásico'],
  [/\bClasica\b/i, 'Clásica'],
  [/\bJadore\b/i, "J'adore"],
  [/\bChanel N5\b/i, 'Chanel N°5'],
  [/\bLe Bea Parfum\b/i, 'Le Beau Parfum'],
  [/\bCLub\b/, 'Club'],
  [/\bAmber rouge\b/, 'Amber Rouge'],
  [/\bHis confession\b/, 'His Confession'],
  [/\bItalian love\b/, 'Italian Love'],
  [/\bfor women\b/, 'For Women'],
  [/\bIn 2u\b/, 'In 2U'],
  [/\bprestige\b/, 'Prestige'],
  [/\bEnvoltura especial\s*\+\s*Tarjeta Personalizable\b/i, 'Envoltura especial + tarjeta personalizable'],
];
// Siglas que se quedan en mayúsculas al pasar a tipo título los nombres escritos en mayúsculas.
const SIGLAS = new Set(['XS', 'VIP', 'NYC', 'MTV', 'CK', 'CH', 'JPG', 'EDP', 'EDT', 'II', 'III', 'NY', 'LT', 'C/N', 'C/M', 'AM', 'PM', 'XX', 'REM', 'ARI']);

function tipoTitulo(n) {
  return n
    .split(' ')
    .map((p) => {
      if (SIGLAS.has(p.toUpperCase())) return p.toUpperCase();
      if (p === p.toUpperCase() && /[A-Z]{2,}/.test(p)) return p.charAt(0) + p.slice(1).toLowerCase();
      return p;
    })
    .join(' ');
}

function limpiarNombre(nombre, casa) {
  let n = nombre
    .replace(/\s*\+\s*pa[ñn]uelo/i, '')
    .replace(/\b(cofre|caja)\s+gam(u|a)sad[oa]\b/gi, '')
    .replace(/\bcofre(\s+cofre)*(\s+(de\s+)?lujo)?\b/gi, '')
    .replace(/\b(en\s+)?caja\b/gi, '')
    .replace(/\bT\/M\b|\btapa met[aá]lica\b/gi, '')
    .replace(/\bnueva p\b/gi, '')
    .replace(/^kit\s+(.+?)\s+5 pz$/i, '$1')
    .replace(/\|\|\|/g, 'III')
    .replace(/\bArabe\b/g, 'Árabe');
  if (QUITAR_CASA[casa]) {
    const sin = n.replace(QUITAR_CASA[casa], '').replace(/\s+de\s*$/i, '');
    if (normalizar(sin).length >= 3) n = sin;
  }
  // «Body Spray Arabe Original»: el sitio no afirma originalidad (acuerdo con el usuario).
  if (casa === 'Body sprays') n = n.replace(/\boriginal\b/i, '');
  n = tipoTitulo(normalizar(n));
  for (const [re, bien] of CORRECCIONES) n = n.replace(re, bien);
  return capital(normalizar(n));
}

// Género: si el NOMBRE lo dice sin ambigüedad («Pour Femme», «For Men», «Dama»…) manda el
// nombre, porque el proveedor tiene descripciones cruzadas («Dylan Blue Pour Femme … para
// caballero»). Si el nombre no lo dice, se usa la descripción.
function generoDe(desc, nombre) {
  const n = sinAcentos(nombre).toLowerCase();
  const d = sinAcentos(desc).toLowerCase();
  if (/unisex/.test(n)) return 'Unisex';
  const nDama = /\b(dama|mujer|women|woman|femme|feme|her|elle|girl|donna|lady)\b/.test(n);
  const nCab = /\b(caballero|hombre|men|man|homme|him|uomo|boy)\b/.test(n);
  if (nDama !== nCab) return nDama ? 'Dama' : 'Caballero';
  if (/unisex|hombre y dama|hombre y mujer/.test(d)) return 'Unisex';
  const dDama = /\b(dama|mujer)\b/.test(d);
  const dCab = /\b(caballero|hombre)\b/.test(d);
  if (dDama !== dCab) return dDama ? 'Dama' : 'Caballero';
  return null;
}

const vistos = new Set();
const firmas = new Set();
const productos = [];
for (const p of crudos) {
  if (vistos.has(p.id)) continue;
  vistos.add(p.id);
  const nombreOriginal = normalizar(p.name);
  const desc = normalizar(p.description).replace(/^peefume/i, 'Perfume');
  const categoria = normalizar(p.product_category?.name).toUpperCase();
  let casa = CASAS[categoria];
  if (!casa) casa = SIN_CATEGORIA.find(([re]) => re.test(nombreOriginal))?.[1];
  if (!casa) throw new Error(`Casa desconocida: «${categoria}» en ${p.id} ${nombreOriginal}`);

  const archivo = fs.readdirSync(FOTOS).find((f) => f.startsWith(`${p.id}.`));
  if (!archivo) throw new Error(`Falta la foto de ${p.id}`);

  const accesorio = casa === 'Accesorios';
  const arabe = ARABES.has(casa) || ARABES_POR_NOMBRE.some((re) => re.test(nombreOriginal));
  const nombre = limpiarNombre(nombreOriginal, casa);
  const kit = casa === 'Kits y sets';
  const ml = !accesorio && !kit ? Number(desc.match(/(\d{2,3})\s*ml/i)?.[1]) || null : null;
  const genero = accesorio || kit ? null : generoDe(desc, nombreOriginal);
  const presentacion = presentacionDe(nombreOriginal) || null;

  // Duplicados exactos del proveedor (mismo nombre, descripción y casa): se publica uno.
  const firma = `${casa}|${nombreOriginal.toLowerCase()}|${desc.toLowerCase()}`;
  if (firmas.has(firma)) {
    console.log(`Duplicado omitido: ${p.id} ${nombreOriginal}`);
    continue;
  }
  firmas.add(firma);

  productos.push({
    id: p.id,
    nombre,
    // Nombre tal cual lo publica el proveedor (para el mensaje de WhatsApp: identifica el producto exacto).
    ref: nombreOriginal.replace(/\bArabe Original\b/i, 'Árabe'),
    casa,
    tipo: accesorio ? 'accesorio' : arabe ? 'arabe' : 'disenador',
    genero,
    ml,
    presentacion,
    detalle: accesorio ? capital(desc.replace(/\s*\.$/, '')) : null,
    foto: archivo,
    slug: slug(`${casa}-${nombre}`),
  });
}

// Orden de presentación: primero las casas árabes y luego diseñador/nicho; dentro de cada
// grupo se alternan las casas (una de cada una, por turnos) para que la primera pantalla del
// catálogo muestre variedad. Los accesorios van al final.
function alternar(lista) {
  const porCasa = new Map();
  for (const p of lista.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))) {
    if (!porCasa.has(p.casa)) porCasa.set(p.casa, []);
    porCasa.get(p.casa).push(p);
  }
  const casas = [...porCasa.keys()].sort((a, b) => porCasa.get(b).length - porCasa.get(a).length);
  const out = [];
  while (out.length < lista.length) for (const c of casas) if (porCasa.get(c).length) out.push(porCasa.get(c).shift());
  return out;
}
// Las presentaciones en cofre abren el catálogo: son las fotos más vistosas.
const arabes = productos.filter((p) => p.tipo === 'arabe');
const ordenados = [
  ...alternar(arabes.filter((p) => p.presentacion)),
  ...alternar(arabes.filter((p) => !p.presentacion)),
  ...alternar(productos.filter((p) => p.tipo === 'disenador')),
  ...productos.filter((p) => p.tipo === 'accesorio'),
];

// Slugs únicos (dos «Erba Pura» con distinto cofre, por ejemplo).
const usados = new Map();
for (const p of ordenados) {
  const n = (usados.get(p.slug) || 0) + 1;
  usados.set(p.slug, n);
  if (n > 1) p.slug = `${p.slug}-${n}`;
}

fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
fs.writeFileSync(SALIDA, JSON.stringify(ordenados, null, 1) + '\n');
const cuenta = (f) => ordenados.filter(f).length;
console.log(
  `→ ${SALIDA}: ${ordenados.length} productos · árabes ${cuenta((p) => p.tipo === 'arabe')} · diseñador/nicho ${cuenta((p) => p.tipo === 'disenador')} · accesorios ${cuenta((p) => p.tipo === 'accesorio')} · sin género ${cuenta((p) => p.tipo !== 'accesorio' && !p.genero)} · sin ml ${cuenta((p) => p.tipo !== 'accesorio' && !p.ml)}`,
);
