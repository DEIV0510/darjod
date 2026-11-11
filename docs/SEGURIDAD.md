# Seguridad

El sitio es **estático**: no hay servidor de aplicación, base de datos, formularios, cuentas,
panel administrativo, pagos ni claves de API. Eso elimina de raíz la mayoría de los riesgos
del brief (inyección SQL, CSRF, robo de sesiones, credenciales expuestas, spam de formularios).
Ninguna medida hace a un sitio imposible de atacar; estas son las que se aplicaron y lo que queda.

## Medidas aplicadas

| Medida | Dónde |
| --- | --- |
| HTTPS obligatorio + HSTS (1 año) | Vercel sirve solo HTTPS; `Strict-Transport-Security` en `vercel.json` |
| CSP estricta por página: solo scripts propios con hash SHA-256, sin `eval`, sin dominios externos, `require-trusted-types-for 'script'` + `trusted-types 'none'` (ningún JS puede escribir HTML como texto) | `<meta>` que escribe `scripts/csp.mjs` al compilar |
| `frame-ancestors 'none'` + `X-Frame-Options: DENY` (anti-clickjacking) | cabeceras |
| `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` (cámara, micrófono, ubicación, pagos… apagados), `Cross-Origin-Resource-Policy` | cabeceras (`scripts/encabezados.mjs` genera `vercel.json` y `public/_headers`) |
| Sin dependencias en el navegador: el JS es propio (~5 KB) | `src/scripts/` |
| Enlaces externos con `rel="noopener"` | componentes |
| Entradas del buscador: se limitan a 60 caracteres y solo se comparan como texto; las tarjetas se crean con `textContent` y atributos, nunca con HTML | `src/scripts/catalogo.ts` |
| JSON-LD escapado (`<` → `<`) | `src/layouts/Base.astro` |
| Sin cookies, sin analítica ni seguimiento; ningún dato personal se guarda en el sitio | — |
| El catálogo no publica el costo, stock ni códigos internos del proveedor | `scripts/catalogo.mjs` |
| Dependencias auditadas (`npm audit`: 0 vulnerabilidades al entregar) y solo de desarrollo, salvo Astro | `package.json` |
| Errores: página 404 propia, sin trazas ni datos internos | `src/pages/404.astro` |

## Riesgos residuales y decisiones

- **Sin `Cross-Origin-Opener-Policy`.** Con `same-origin`, Chrome cambia de proceso al cargar y
  Lighthouse/PageSpeed no pueden medir la página (error `NO_NAVSTART`, comprobado). El sitio no
  tiene sesión ni datos que aislar entre ventanas, así que se priorizó poder auditarlo.
- **`style-src 'unsafe-inline'`**: Astro inserta estilos en línea y algunos componentes usan
  variables CSS en `style=""`. No permite ejecutar código.
- **Cuenta de Vercel y de GitHub**: son la superficie real de ataque. Activar verificación en
  dos pasos en ambas y no dar acceso de escritura al repositorio a terceros.
- **WhatsApp, Google Maps, Instagram y TikTok** son servicios de terceros fuera de este sitio.
- **Fotos del proveedor**: se sirven desde el propio dominio (copiadas al compilar), no se
  enlazan en caliente al servidor del proveedor.
