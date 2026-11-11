// Solo para el build: une catálogo y fotos.
import catalogo from '../data/catalogo.json';
import fotos from '../data/fotos.json';
import { compactar, type Compacto, type Foto, type Producto } from './catalogo';

const FOTOS = fotos as Record<string, Foto>;
export const PRODUCTOS = catalogo as Producto[];
export const COMPACTOS: Compacto[] = PRODUCTOS.map((p) => {
  const f = FOTOS[String(p.id)];
  if (!f) throw new Error(`Falta la foto procesada de ${p.id} (${p.nombre}): npm run fotos`);
  return compactar(p, f);
});

export const TOTAL = COMPACTOS.length;
export const TOTAL_PERFUMES = PRODUCTOS.filter((p) => p.tipo !== 'accesorio').length;

/** Casas con su número de productos, árabes primero y luego por cantidad. */
export const CASAS = (() => {
  const m = new Map<string, { casa: string; n: number; tipo: Producto['tipo'] }>();
  for (const p of PRODUCTOS) {
    const e = m.get(p.casa) || { casa: p.casa, n: 0, tipo: p.tipo };
    e.n++;
    m.set(p.casa, e);
  }
  const orden = { arabe: 0, disenador: 1, accesorio: 2 };
  return [...m.values()].sort((a, b) => orden[a.tipo] - orden[b.tipo] || b.n - a.n || a.casa.localeCompare(b.casa, 'es'));
})();
