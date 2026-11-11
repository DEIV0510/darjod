// Filtro del catálogo en el navegador. Las primeras tarjetas ya vienen en el HTML; aquí se
// cargan los datos completos (/catalogo.json), se filtran y se crean tarjetas clonando el
// <template> (sin escribir HTML como texto: la CSP exige Trusted Types).
import { vista, plano, type Compacto, type Vista } from '../lib/catalogo';

interface Entrada {
  c: Compacto;
  v: Vista;
  texto: string;
}

export async function iniciarCatalogo(sec: HTMLElement) {
  const PAGINA = Number(sec.dataset.pagina) || 24;
  const buscar = sec.querySelector<HTMLInputElement>('[data-buscar]')!;
  const generos = [...sec.querySelectorAll<HTMLButtonElement>('[data-genero]')];
  const casa = sec.querySelector<HTMLSelectElement>('[data-casa]')!;
  const rejilla = sec.querySelector<HTMLUListElement>('[data-rejilla]')!;
  const estado = sec.querySelector<HTMLElement>('[data-estado]')!;
  const mas = sec.querySelector<HTMLButtonElement>('[data-mas]')!;
  const restantes = sec.querySelector<HTMLElement>('[data-restantes]')!;
  const vacio = sec.querySelector<HTMLElement>('[data-vacio]')!;
  const plantilla = sec.querySelector<HTMLTemplateElement>('#tpl-tarjeta')!;

  const nodos = new Map<number, HTMLLIElement>();
  rejilla.querySelectorAll<HTMLLIElement>('li[data-id]').forEach((li) => nodos.set(Number(li.dataset.id), li));

  const estadoUI = { q: '', g: 0, casa: '', n: PAGINA };
  let todos: Entrada[] = [];
  let lista: Entrada[] = [];

  try {
    const r = await fetch('/catalogo.json', { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error(String(r.status));
    const datos = (await r.json()) as Compacto[];
    todos = datos.map((c) => {
      const v = vista(c);
      return { c, v, texto: plano(`${c.n} ${c.c} ${c.p ?? ''} ${v.meta} ${c.t === 1 ? '1.1' : ''}`) };
    });
  } catch {
    // Sin datos (red caída): se quedan las tarjetas del HTML y el botón pide el catálogo por WhatsApp.
    mas.hidden = true;
    sec.querySelector<HTMLElement>('.coleccion__sinjs')?.style.setProperty('display', 'inline-flex');
    estado.textContent = 'No pudimos cargar el catálogo completo. Escríbenos y te lo enviamos.';
    return;
  }

  function crear(v: Vista): HTMLLIElement {
    const li = (plantilla.content.firstElementChild as HTMLLIElement).cloneNode(true) as HTMLLIElement;
    const c = (k: string) => li.querySelector<HTMLElement>(`[data-c="${k}"]`)!;
    li.dataset.id = String(v.id);
    li.classList.toggle('tarjeta--blanco', v.blanco);
    (c('avif') as HTMLSourceElement).srcset = v.avif;
    const img = c('img') as HTMLImageElement;
    img.srcset = v.webp;
    img.src = v.src;
    img.alt = v.alt;
    c('casa').textContent = v.casa;
    c('es11').hidden = !v.es11;
    c('nombre').textContent = v.nombre;
    c('meta').textContent = v.meta;
    const comprar = c('comprar') as HTMLAnchorElement;
    comprar.href = v.comprar;
    comprar.setAttribute('aria-label', `Comprar ${v.nombre} por WhatsApp`);
    const consultar = c('consultar') as HTMLAnchorElement;
    consultar.href = v.consultar;
    consultar.setAttribute('aria-label', `Consultar disponibilidad de ${v.nombre} por WhatsApp`);
    nodos.set(v.id, li);
    return li;
  }

  function filtrar() {
    const palabras = plano(estadoUI.q).split(/\s+/).filter(Boolean);
    lista = todos.filter(
      (e) =>
        (!estadoUI.g || e.c.g === estadoUI.g) &&
        (!estadoUI.casa || e.c.c === estadoUI.casa) &&
        palabras.every((p) => e.texto.includes(p)),
    );
  }

  function pintar(agregar: boolean) {
    const visibles = lista.slice(0, estadoUI.n);
    if (agregar) {
      const ya = rejilla.children.length;
      const frag = document.createDocumentFragment();
      visibles.slice(ya).forEach((e, k) => {
        const li = nodos.get(e.v.id) ?? crear(e.v);
        li.classList.add('entra');
        li.style.setProperty('--k', String(k % PAGINA));
        frag.append(li);
      });
      rejilla.append(frag);
    } else {
      rejilla.replaceChildren(
        ...visibles.map((e) => {
          const li = nodos.get(e.v.id) ?? crear(e.v);
          li.classList.remove('entra');
          return li;
        }),
      );
    }
    const total = lista.length;
    const filtrado = estadoUI.q || estadoUI.g || estadoUI.casa;
    estado.textContent = total
      ? `Mostrando ${visibles.length} de ${total}${filtrado ? (total === 1 ? ' resultado' : ' resultados') : ' fragancias'}`
      : 'Sin resultados';
    vacio.hidden = total > 0;
    const quedan = total - visibles.length;
    mas.hidden = quedan <= 0;
    restantes.textContent = `(${quedan})`;
  }

  // Al cambiar un filtro con la rejilla ya recorrida, se vuelve al principio de los resultados.
  function alPrincipio() {
    const arriba = estado.getBoundingClientRect().top;
    if (arriba < 0) {
      const cab = document.getElementById('cabecera')?.offsetHeight ?? 64;
      const filtros = sec.querySelector<HTMLElement>('[data-filtros]')?.offsetHeight ?? 0;
      scrollTo({ top: scrollY + arriba - cab - filtros - 8, behavior: 'auto' });
    }
  }
  function aplicar() {
    estadoUI.n = PAGINA;
    filtrar();
    pintar(false);
    alPrincipio();
  }

  let espera = 0;
  buscar.addEventListener('input', () => {
    clearTimeout(espera);
    espera = window.setTimeout(() => {
      estadoUI.q = buscar.value.slice(0, 60);
      aplicar();
    }, 140);
  });
  buscar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') buscar.blur();
  });
  generos.forEach((b) =>
    b.addEventListener('click', () => {
      estadoUI.g = Number(b.dataset.genero);
      generos.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      aplicar();
    }),
  );
  casa.addEventListener('change', () => {
    estadoUI.casa = casa.value;
    aplicar();
  });
  mas.addEventListener('click', () => {
    estadoUI.n += PAGINA;
    pintar(true);
  });

  // Si el navegador restauró valores del formulario (volver atrás), se respetan.
  estadoUI.q = buscar.value;
  estadoUI.casa = casa.value;
  filtrar();
  if (estadoUI.q || estadoUI.casa) pintar(false);
  else pintar(true);
}
