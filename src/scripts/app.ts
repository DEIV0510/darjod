// JS del sitio (un solo módulo, diferido por Astro). Nada aquí decide cuándo se pinta el
// héroe: eso lo hacen el CSS y el script en línea de la pantalla de carga.
declare global {
  interface Window {
    __djRespaldo?: number;
  }
}
// El respaldo del <head> («mostrar todo» a los 6 s) solo es para cuando este JS no llega.
clearTimeout(window.__djRespaldo);

const d = document.documentElement;
const reducido = matchMedia('(prefers-reduced-motion: reduce)');

// ── Cabecera sólida al bajar y botón flotante ────────────────────────────────────────────
const cabecera = document.getElementById('cabecera');
const flotante = document.getElementById('flotante');
const heroe = document.getElementById('inicio');
// Secciones con su propio botón de WhatsApp: ahí el flotante sobra (y taparía botones).
const conBoton = document.querySelectorAll('#contacto, .cierre, .pie');
const visibles = new Set<Element>();
let pieVisible = false;
let pendiente = false;
function alDesplazar() {
  pendiente = false;
  const y = window.scrollY;
  cabecera?.classList.toggle('is-solida', y > 24);
  const limite = heroe ? heroe.offsetHeight * 0.6 : 200;
  flotante?.classList.toggle('is-visible', y > limite && !pieVisible);
}
addEventListener(
  'scroll',
  () => {
    if (!pendiente) {
      pendiente = true;
      requestAnimationFrame(alDesplazar);
    }
  },
  { passive: true },
);
if (conBoton.length && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver((entradas) => {
    for (const e of entradas) e.isIntersecting ? visibles.add(e.target) : visibles.delete(e.target);
    pieVisible = visibles.size > 0;
    alDesplazar();
  });
  conBoton.forEach((el) => io.observe(el));
}
alDesplazar();

// ── Menú móvil (dialog) ─────────────────────────────────────────────────────────────────
// «Atrás» del teléfono lo cierra: al abrir se agrega una entrada al historial.
const menu = document.getElementById('menu-movil') as HTMLDialogElement | null;
const botonMenu = document.querySelector<HTMLButtonElement>('[data-abrir-menu]');
let conEntrada = false;
function abrirMenu() {
  if (!menu || menu.open) return;
  menu.showModal();
  botonMenu?.setAttribute('aria-expanded', 'true');
  history.pushState({ menu: 1 }, '');
  conEntrada = true;
}
function cerrarMenu(desdeHistorial = false) {
  if (!menu?.open) return;
  menu.close();
  botonMenu?.setAttribute('aria-expanded', 'false');
  if (conEntrada && !desdeHistorial) history.back();
  conEntrada = false;
}
botonMenu?.addEventListener('click', abrirMenu);
menu?.addEventListener('cancel', (e) => {
  e.preventDefault();
  cerrarMenu();
});
menu?.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  const cierre = t.closest('[data-cerrar-menu]');
  if (!cierre) return;
  if (cierre instanceof HTMLAnchorElement && cierre.hash) {
    // Ir a la sección después de cerrar (el history.back() no debe deshacer el salto).
    e.preventDefault();
    const destino = document.querySelector(cierre.hash);
    cerrarMenu();
    setTimeout(() => destino?.scrollIntoView({ behavior: reducido.matches ? 'auto' : 'smooth' }), 60);
    return;
  }
  cerrarMenu();
});
addEventListener('popstate', () => cerrarMenu(true));
matchMedia('(min-width: 960px)').addEventListener('change', (e) => e.matches && cerrarMenu());

// ── Aparición al entrar en pantalla ─────────────────────────────────────────────────────
const aparecen = document.querySelectorAll<HTMLElement>('.aparece');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entradas) => {
      for (const e of entradas)
        if (e.isIntersecting) {
          e.target.classList.add('en');
          io.unobserve(e.target);
        }
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  aparecen.forEach((el) => io.observe(el));
} else {
  d.classList.add('mostrar-todo');
}

// ── Catálogo: el módulo y los datos llegan cuando la sección se acerca ──────────────────
const coleccion = document.getElementById('coleccion');
if (coleccion) {
  let cargado: Promise<void> | null = null;
  const cargar = () => (cargado ??= import('./catalogo').then((m) => m.iniciarCatalogo(coleccion)));
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          io.disconnect();
          cargar();
        }
      },
      { rootMargin: '900px 0px' },
    );
    io.observe(coleccion);
  }
  // Por si alguien usa un filtro antes de que el observador lo haya cargado.
  coleccion.addEventListener('pointerdown', cargar, { once: true });
  coleccion.addEventListener('focusin', cargar, { once: true });
}

export {};
