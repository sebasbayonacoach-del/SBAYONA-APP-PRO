# BAYONA App · Sprint 20: eliminar flash de selector previo al arranque

Fecha: 2026-10-08. Base: rama oficial de desarrollo tras PR #36.

## Síntoma reproducido
En la preview pública, tras abrir el enlace, el navegador mostraba por un instante el selector «¿Cómo quieres entrar?» antes de pintar la portada «Más fuerte. Más tú.». El problema **no** era que hubiera dos páginas cargadas a la vez: el selector HTML de `index.html` tenía `display:flex` por CSS hasta que el script `js/ui/landing-boot.js` añadía `luxe-activo` de forma asíncrona.

## Reproducción
Prueba Playwright demorando `js/ui/landing-boot.js` 2,5 segundos:
- **Antes:** `body.fitness-app`, selector visible y landing vacía (sin navegación montada). Después del script, selector oculto y portada visible.
- **Después:** `body.fitness-app.bayona-boot-pending`, selector / HUD / drawer / mundo 3D ocultos por estilo crítico en HTML. Solo aparece el indicador BAYONA. Cuando el script ha montado la pantalla correcta, libera el primer pintado.

## Solución
- Clase inicial `bayona-boot-pending` desde el **HTML servido**, no desde JS tardío.
- CSS crítico inline para ocultar las capas privadas y no ponerlas detrás de la portada durante la espera.
- Indicador de carga pequeño, accesible y compatible con tema claro/oscuro.
- `releaseFirstPaint()` una vez que la portada está montada para usuario nuevo o `loadApp()` ha terminado para usuario recurrente / PWA.
- Si falla la carga, el indicador ofrece error localizado y **Reintentar**; no libera una UI sin handlers.
- Nuevas pruebas `tests/firstpaint-eval.mjs` (11 assertions) y `tests/firstpaint-browser.mjs`, integradas en `tests/e2e-production.mjs` con arranque público e instalado a baja velocidad.
- Invalidación de Service Worker PWA `bayona-shell-v56`; mensaje de retry en catálogo i18n (se respeta trinquete de cadenas).

## Calidad
- `npm run check:production`: 90/90 suites, sin regresiones.
- `tests/e2e-production.mjs`: 203/203 aserciones, sin errores. Incluye pruebas de arranque deliberadamente demorado y el ciclo completo de Cliente/Coach y entrenamiento.
- Auditoría manual en Playwright de preview anterior y localhost en primer render con carga artificialmente retrasada confirmó la causa. Capturas locales de before/after almacenadas en `artifacts/firstpaint`, sin versionar.

## Límites
No modifica autenticación, Stripe, Supabase, lógica de entrenamiento ni la versión pública de producción. La cuenta coach sigue pendiente de autorización real en el servidor antes de usar datos reales. Los 40 cambios locales del proyecto original no fueron modificados. Fusionar únicamente con los tres workflows de GitHub verdes.
