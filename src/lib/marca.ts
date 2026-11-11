// src/data/marca.json (scripts/marca.mjs) con tipos: JSON no distingue tuplas [ruta, ancho].
import datos from '../data/marca.json';

export type Fuente = [string, number];
export interface Variante {
  ancho: number;
  alto: number;
  alt?: string;
  avif: Fuente[];
  webp: Fuente[];
}
interface Marca {
  logo: Variante;
  palabra: Variante;
  nucleo: Variante;
  iconos: Record<'i16' | 'i32' | 'i180' | 'i192' | 'i512' | 'm512', string>;
  fotos: Record<'khamrah' | 'eclaire' | 'amber' | 'clubDeNuit' | 'khamrahCofre', Variante>;
}
export const marca = datos as unknown as Marca;

export const srcset = (l: Fuente[]) => l.map(([u, w]) => `${u} ${w}w`).join(', ');
/** Variante más pequeña / más grande (la lista va de menor a mayor). */
export const menor = (v: Variante) => v.webp[0]!;
export const mayor = (v: Variante) => v.webp[v.webp.length - 1]!;
