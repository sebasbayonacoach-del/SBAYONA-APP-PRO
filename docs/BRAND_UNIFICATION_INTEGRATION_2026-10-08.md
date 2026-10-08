# BAYONA App · Integración visual WEB → APP · 2026-10-08

## Procedencia y preservación
- Fuente: estado de trabajo sin confirmar en `brand-unify-app-20261008` (40 rutas modificadas o añadidas).
- Se generaron una copia completa de los cambios versionados y un archivo de los añadidos en `/tmp/bayona-brand-input-backup-20261008/`.
- Se preparó un commit de instantánea `97ed95b` en `/tmp/bayona-brand-source-snapshot-20261008`.
- La rama de integración parte de `bayona-one/visual-integration-v6` con Sprint 13 y PR #25/#26. **No se alteró el árbol de trabajo original.**
- Los respaldos internos `_brand-backup-20261008/` permanecen fuera de la app publicada.

## Sistema visual aplicado
- Capa aditiva `css/bayona-brand.css` por detrás de `css/pro.css`, con pesos Montserrat, Inter y DM Mono.
- Colores de referencia: fondo `#050505`, grafito `#111111`, naranja `#F4A261`, naranja secundario `#E76F51`.
- Las superficies oscuras y claras conservan las mismas familias de marca; no se impide elegir modo día.
- Se integran cambios compatibles de `css/luxe.css`, `css/aurum.css`, `css/dashboard.css` y `css/fitness.css`.

## Conflictos resueltos de forma conservadora
- `css/pro.css`: se conservó íntegra la capa oficial de Hub, Sesión Viva, Nutrición, Progreso, Recovery y demás sprints; la marca nueva funciona como hoja adicional, no la sustituye.
- `js/engine.js`: se conservó el registro de feedback y evidencias actual en lugar de sustituirlo por el legado.
- `js/i18n.js`: prevalecen los textos existentes del producto y se incorporan 31 nuevas claves de la instantánea sin duplicaciones.
- `js/ui/landing.js`: mantiene el indicador de pruebas verificadas en lugar de afirmar una cifra de suites desactualizada.
- `sw.js`: se conserva la lista completa de la PWA, aumenta versión a `v46` y precachea la capa CSS y tres tipografías esenciales. Los demás pesos se cargan bajo demanda.

## Evidencia antes de PR
- `npm run check:production`: 81 suites + lint y perf pasan; precache `2.03 MiB` bajo máximo `2.25 MB`.
- `tests/e2e-production.mjs`: 31/31, sin errores de página.
- Auditoría de layout en navegador: 84 combinaciones (6 tamaños, 2 temas, 7 secciones) sin overflow horizontal.
- Navegador real: Montserrat e Inter cargan; hoja final es `css/bayona-brand.css` y naranja `#f4a261`.
- `tests/brand-assets-eval.mjs`: 38 verificaciones de fuentes, tokens, precache y enlaces, pendiente de incorporar a la batería final.

## Pendiente para publicar a usuarios
- Repetir la batería con la nueva suite, validar CI + bateria + e2e de GitHub y fusionar PR solo con los tres verdes.
- Beta cloud, entitlements remotos, RLS y Stripe real siguen bloqueados hasta sus propias pruebas de staging.
- El árbol de trabajo original no debe borrarse ni sincronizarse a ciegas: contiene otros experimentos que no se han integrado.
