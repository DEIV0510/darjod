// Catálogo: datos de src/data/catalogo.json (scripts/catalogo.mjs) + fotos de
// src/data/fotos.json (scripts/fotos.mjs). Este módulo se usa al compilar (Astro) y en el
// navegador (src/scripts/catalogo.ts), por eso no importa nada de Node.
import { MARCA } from './empresa';

export type Tipo = 'arabe' | 'disenador' | 'accesorio';
export interface Producto {
  id: number;
  nombre: string;
  ref: string;
  casa: string;
  tipo: Tipo;
  genero: 'Dama' | 'Caballero' | 'Unisex' | null;
  ml: number | null;
  presentacion: string | null;
  detalle: string | null;
  foto: string;
  slug: string;
}
export interface Foto {
  /** Ruta base: se le agrega -360.avif, -640.webp… */
  b: string;
  /** 'b' fondo blanco (se mezcla con el papel) · 'p' foto con fondo propio. */
  f: 'b' | 'p';
}

/** Versión compacta que se publica en /catalogo.json (la usa el filtro del navegador). */
export interface Compacto {
  i: number;
  n: string;
  c: string;
  t: 0 | 1 | 2; // 0 árabe · 1 diseñador/nicho (1.1) · 2 accesorio
  g: 0 | 1 | 2 | 3; // 0 sin dato · 1 dama · 2 caballero · 3 unisex
  m: number | null;
  p: string | null;
  d: string | null;
  b: string;
  f: 0 | 1; // 1 = fondo blanco
}

const TIPOS: Tipo[] = ['arabe', 'disenador', 'accesorio'];
const GENEROS = [null, 'Dama', 'Caballero', 'Unisex'] as const;

export function compactar(p: Producto, foto: Foto): Compacto {
  return {
    i: p.id,
    n: p.nombre,
    c: p.casa,
    t: TIPOS.indexOf(p.tipo) as Compacto['t'],
    g: GENEROS.indexOf(p.genero) as Compacto['g'],
    m: p.ml,
    p: p.presentacion,
    d: p.detalle,
    b: foto.b,
    f: foto.f === 'b' ? 1 : 0,
  };
}

/** Vista lista para pintar una tarjeta (la misma en el servidor y en el navegador). */
export interface Vista {
  id: number;
  nombre: string;
  casa: string;
  es11: boolean;
  meta: string;
  alt: string;
  avif: string;
  webp: string;
  src: string;
  blanco: boolean;
  comprar: string;
  consultar: string;
  genero: number;
  tipo: number;
}

const WA = '573135595702';
const enlace = (t: string) => `https://wa.me/${WA}?text=${encodeURIComponent(t)}`;

export function vista(c: Compacto): Vista {
  const accesorio = c.t === 2;
  const es11 = c.t === 1;
  const genero = GENEROS[c.g];
  const meta = accesorio ? c.d || '' : [c.m ? `${c.m} ml` : null, genero, c.p].filter(Boolean).join(' · ');
  // Lo que identifica el producto en el mensaje: nombre, casa y lo que lo distingue.
  const casa = accesorio ? '' : ` de ${c.c}${es11 ? ' (1.1)' : ''}`;
  const extra = [c.m ? `${c.m} ml` : null, c.p ? c.p.toLowerCase() : null].filter(Boolean).join(', ');
  const producto = `${c.n}${casa}${!accesorio && extra ? `, ${extra}` : ''}`;
  const sujeto = accesorio ? producto : `el perfume ${producto}`;
  return {
    id: c.i,
    nombre: c.n,
    casa: c.c,
    es11,
    meta,
    alt: accesorio ? c.n : `${c.n} de ${c.c}${c.m ? `, ${c.m} ml` : ''}`,
    avif: `${c.b}-360.avif 360w, ${c.b}-640.avif 640w`,
    webp: `${c.b}-360.webp 360w, ${c.b}-640.webp 640w`,
    src: `${c.b}-640.webp`,
    blanco: c.f === 1,
    comprar: enlace(`Hola, ${MARCA}. Estoy interesado en ${sujeto}. ¿Me pueden brindar información?`),
    consultar: enlace(`Hola, ${MARCA}. ¿Tienen disponible ${sujeto}?`),
    genero: c.g,
    tipo: c.t,
  };
}

/** Texto para buscar: sin tildes y en minúsculas. */
export const plano = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

export const TAMANOS_TARJETA = '(min-width: 1280px) 290px, (min-width: 1024px) 23vw, (min-width: 720px) 31vw, 46vw';
