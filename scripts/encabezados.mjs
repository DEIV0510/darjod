// Encabezados HTTP del sitio, una sola fuente para todos los hostings:
//   · vercel.json  (Vercel)
//   · public/_headers  (Cloudflare Pages y Netlify)
//   · scripts/serve-dist.mjs los aplica en local, así las pruebas corren con lo mismo que producción.
// La CSP completa (con los hashes de los scripts en línea) va en un <meta> que escribe
// scripts/csp.mjs al compilar; aquí va la parte que un <meta> no puede llevar (frame-ancestors).
// Uso: node scripts/encabezados.mjs   (reescribe vercel.json y public/_headers)
import fs from 'node:fs';

const UN_ANO = 'public, max-age=31536000, immutable';
const UN_DIA = 'public, max-age=86400, must-revalidate';

export const REGLAS = [
  {
    // Todo el sitio
    ruta: '/*',
    encabezados: {
      'Strict-Transport-Security': 'max-age=31536000',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'none'",
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), browsing-topics=()',
      // Sin Cross-Origin-Opener-Policy: con «same-origin» Chrome cambia de proceso al cargar y
      // Lighthouse/PageSpeed pierden la traza (NO_NAVSTART). El sitio no tiene sesión ni datos
      // que aislar; ver docs/SEGURIDAD.md.
      'Cross-Origin-Resource-Policy': 'same-site',
      'X-Permitted-Cross-Domain-Policies': 'none',
    },
  },
  // Archivos con hash en el nombre: no cambian nunca.
  ...['_astro', 'img', 'fonts', 'marca'].map((d) => ({ ruta: `/${d}/*`, encabezados: { 'Cache-Control': UN_ANO } })),
  // Sin hash: se pueden reemplazar, caché corta.
  ...['/og.jpg', '/favicon.ico', '/manifest.webmanifest', '/robots.txt', '/sitemap.xml', '/catalogo.json'].map((r) => ({ ruta: r, encabezados: { 'Cache-Control': UN_DIA } })),
];

// «/x/*» → patrón de Vercel «/x/(.*)».
const aVercel = (ruta) => ruta.replace(/\*$/, '(.*)');

if (process.argv[1]?.endsWith('encabezados.mjs')) {
  const vercel = {
    $schema: 'https://openapi.vercel.sh/vercel.json',
    // El build incluye la CSP (scripts/csp.mjs): no basta con «astro build».
    buildCommand: 'npm run build',
    outputDirectory: 'dist',
    trailingSlash: true,
    headers: REGLAS.map((r) => ({
      source: aVercel(r.ruta),
      headers: Object.entries(r.encabezados).map(([key, value]) => ({ key, value })),
    })),
  };
  fs.writeFileSync('vercel.json', JSON.stringify(vercel, null, 2) + '\n');

  const headers = REGLAS.map((r) => [r.ruta, ...Object.entries(r.encabezados).map(([k, v]) => `  ${k}: ${v}`)].join('\n')).join('\n\n');
  fs.writeFileSync('public/_headers', `# Generado por scripts/encabezados.mjs — no editar a mano.\n${headers}\n`);
  console.log(`→ vercel.json y public/_headers (${REGLAS.length} reglas)`);
}
