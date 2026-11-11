// Sitemap: necesita el dominio público (SITE_URL o el de producción de Vercel). Sin él se
// publica vacío en vez de inventar URLs.
import type { APIRoute } from 'astro';

const RUTAS = ['/', '/privacidad/', '/datos-personales/', '/terminos/'];
export const GET: APIRoute = ({ site }) => {
  const urls = site ? RUTAS.map((r) => `  <url><loc>${new URL(r, site).href}</loc></url>`).join('\n') : '';
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
