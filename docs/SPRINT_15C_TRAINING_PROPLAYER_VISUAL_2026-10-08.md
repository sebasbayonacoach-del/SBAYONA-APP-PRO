# BAYONA App · Sprint 15C — Entrenar + PROPLAYER, 2026-10-08

## Fuente y alcance

Base: `bayona-one/visual-integration-v6` tras PR #29. Trabajo aislado en `/tmp/bayona-sprint15c-training-20261008`. El repositorio del usuario en `~/TRABAJO/02_DESARROLLO/SBAYONA-APP-PRO` conserva **40 cambios no confirmados**, sin editarlos ni guardarlos con stash.

Se auditaron 12 combinaciones reales de `training` y `library`: anchuras 320, 390 y 1440 px; tema oscuro y claro; 0 errores de página y 0 desbordamientos horizontales.

## Fallos detectados y corregidos

1. **Entrenar día, contraste:** tarjetas de recuperación y sesión con textos casi blancos sobre superficies claras; título del acceso a PROPLAYER negro sobre tarjeta negra. Se recuperan pares tinta/fondo legibles, manteniendo el naranja de la web `#F4A261`.
2. **Calendario:** siete días comprimidos en móvil y texto de 7-9px. Ahora se desplaza horizontalmente con celdas de 112px, etiquetas legibles, pista visual de desplazamiento. Cada celda es un botón real con nombre de fecha y sesión, estado `aria-pressed` y activación por teclado Enter/Espacio. No cambia los datos ni el plan.
3. **PROPLAYER día:** métricas y filtros ahora usan superficies marfil, texto oscuro, controles de al menos 44px y paneles de arte en grafito. Noche conserva estética original.
4. **PROPLAYER catálogo real:** búsquedas, reinicio de filtros, fichas y reproducción continúan conectados al catálogo real `trainingym/catalog.json`; no se simula contenido.
5. **Traducciones:** nueva pista de deslizamiento, etiquetas de grupo y de día en el catálogo central `js/i18n.js` sin incrementar el contador de copy hardcodeado (114 = base).
6. **PWA:** versión de caché `v49`, hoja de marca `?v=4` para actualización sin caché obsoleta.

## Verificación

- `npm run check:production`: 83 suites, sintaxis y auditoría de seguridad OK.
- Presupuesto PWA: 2.06 MiB, dentro del máximo.
- `tests/e2e-production.mjs`: **78/78** comprobaciones, sin errores de página.
- Suite nueva `tests/training-accessibility-eval.mjs`: 21 aserciones semánticas (incluida en las 83).
- Auditoría visual 12 escenarios; microtextos en Entrenar móvil 390 de 9/33 a 5/25 elementos visibles; pantalla ProPlayer 390 con 0 textos inferiores a 11px en la zona visible.
- Se comprobaron teclado para calendario, disponibilidad de 3.141 fichas, búsqueda real y recuperación del catálogo tras restablecer filtros.
- La beta cloud y los pagos siguen sin activarse; requiere gates propios.

## Protección

Las capturas de antes/después y herramientas temporales de auditoría quedan sin versionar bajo `artifacts/` / `tools/sprint15c-audit.mjs`. Subir solo código de producto, pruebas y este documento, con PR y CI en verde antes de fusionar.
