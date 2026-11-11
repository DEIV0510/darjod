import type { APIRoute } from 'astro';
import { marca } from '../lib/marca';

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      name: 'DARJOD PARFUMS',
      short_name: 'DARJOD',
      description: 'Perfumería en Calarcá, Quindío.',
      lang: 'es-CO',
      start_url: '/',
      display: 'browser',
      background_color: '#1c0103',
      theme_color: '#1c0103',
      icons: [
        { src: marca.iconos.i192, sizes: '192x192', type: 'image/png' },
        { src: marca.iconos.i512, sizes: '512x512', type: 'image/png' },
        { src: marca.iconos.m512, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    }),
    { headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' } },
  );
