// Catálogo completo en formato compacto para el filtro del navegador.
import type { APIRoute } from 'astro';
import { COMPACTOS } from '../lib/datos';

export const GET: APIRoute = () =>
  new Response(JSON.stringify(COMPACTOS), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
