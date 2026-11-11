# Pendientes (necesitan al cliente)

1. **Confirmar la etiqueta 1.1.** El proveedor describe *todas* sus categorías como «perfumes
   1.1», también las árabes (Lattafa, Armaf, Afnan…). Hoy solo llevan la etiqueta las casas de
   diseñador y nicho, como se acordó. Si las árabes también son 1.1, cambiar la lista `ARABES`
   en `scripts/catalogo.mjs` y volver a compilar.
2. **Dominio y despliegue.** Conectar el repo a Vercel (o el hosting que elija) y definir
   `SITE_URL`; sin dominio el sitemap sale vacío y no hay canonical absoluto.
3. **Facebook.** La captura muestra un perfil «Darjod Parfums» pero no la dirección; si se quiere
   en el pie, agregarla a `REDES` en `src/lib/empresa.ts`.
4. **Datos legales.** Las políticas usan nombre, ciudad y WhatsApp. Si DARJOD tiene NIT, razón
   social o correo, conviene agregarlos a `src/pages/datos-personales.astro`.
5. **Foto de Sauvage (Dior).** No se usó como imagen de marca: es de una casa de diseñador y el
   sitio no afirma originalidad. Las demás fotos propias sí están (héroe y Experiencia).
6. **Fotos propias mejores.** Las fotos de ambiente vienen de WhatsApp (comprimidas). Con fotos
   de mejor resolución, reemplazarlas en `_material-cliente/` y correr `npm run marca`.
