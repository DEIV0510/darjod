# DARJOD PARFUMS — sitio web

Landing comercial de **DARJOD PARFUMS** (Calarcá, Quindío). Concepto: *El arte de dejar huella*.
Sitio **estático** (Astro 7): catálogo de 505 productos con buscador y filtros, compra y consulta
por WhatsApp (+57 313 559 5702), sin backend, sin formularios y sin base de datos.

## Uso

```bash
npm install
npm run dev        # desarrollo → http://localhost:5650
npm run build      # compila a dist/ y escribe la CSP con los hashes de los scripts en línea
npm run preview    # sirve dist/ con las mismas cabeceras de producción → http://localhost:5651
npm run qa         # 44 pruebas de interacción en Chrome (con preview corriendo)
```

## Contenido y de dónde sale

| Qué | Origen | Script |
| --- | --- | --- |
| Catálogo (505 productos) | Marketplace del proveedor `marketplace.cabal-app.com/perfumeriacolombia` | `npm run catalogo` → `src/data/catalogo.json` |
| Fotos del catálogo | Fotos originales del proveedor → cuadradas, AVIF/WebP 360 y 640 | `npm run fotos` → `public/img/p/` |
| Logo, favicon, imagen para compartir y fotos de ambiente | `_material-cliente/` (lo que envió el cliente) | `npm run marca` → `public/marca/` |
| Fuentes (Cinzel, Cormorant Garamond cursiva, Jost) | `@fontsource-variable`, recortadas al español | `npm run fonts` → `public/fonts/` |

Para **actualizar el catálogo** cuando el proveedor cambie productos:

```bash
npm run catalogo -- --red   # vuelve a descargar el listado y las fotos nuevas
npm run fotos               # procesa solo lo nuevo y borra lo que ya no está
npm run build
```

Reglas del catálogo (acordadas con el usuario el 2026-11-10):

- **Sin precios**: todo se consulta por WhatsApp.
- **No se afirma originalidad.** El proveedor marca sus categorías como «perfumes 1.1». Las
  fragancias de casas de diseñador y nicho llevan la etiqueta **1.1** en la tarjeta, en el
  mensaje de WhatsApp y en los términos. Las casas árabes van sin etiqueta.
- Se corrigen erratas evidentes de nombres (lista en `scripts/catalogo.mjs`); el mensaje de
  WhatsApp identifica el producto con nombre, casa, ml y presentación.
- No se guarda el costo, el stock ni el código de barras del proveedor.

## Estructura

- `src/components/` — una pieza por sección: `Carga` (pantalla de carga), `Cabecera`, `Heroe`,
  `Catalogo` + `Tarjeta`, `Diferencial` (La casa), `Experiencia`, `Contacto`, `Cierre`, `Pie`,
  `Flotante` (WhatsApp).
- `src/lib/empresa.ts` — datos del negocio y mensajes de WhatsApp. **Cambiar aquí el número,
  horario o redes.**
- `src/lib/catalogo.ts` — cómo se arma cada tarjeta y su mensaje (mismo código en el build y
  en el navegador).
- `src/scripts/` — JS del navegador: `app.ts` (cabecera, menú, apariciones) y `catalogo.ts`
  (filtro; se carga solo cuando la colección se acerca).
- `scripts/` — generación de datos, imágenes, fuentes, CSP y cabeceras; `scripts/qa/` pruebas.

## Despliegue (Vercel)

Conectar el repositorio en Vercel: `vercel.json` ya trae el comando de build, la carpeta `dist`
y las cabeceras. Para que el sitemap, el canonical y `og:url` tengan el dominio, definir
`SITE_URL` (p. ej. `https://darjodparfums.com`) en las variables del proyecto; sin ella se usa
el dominio de producción que entrega Vercel.

Ver también `docs/SEGURIDAD.md` y `docs/PENDIENTES.md`.
