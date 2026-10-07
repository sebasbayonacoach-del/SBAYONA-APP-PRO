# Sprint 04 · Brand System WEB → APP

Fecha: 2026-10-07

## Objetivo

Eliminar la distancia visual entre SBAYONA-WEB-PRO y SBAYONA-APP-PRO. La app debe usar los tokens reales de la web actual, no una interpretación antigua del naranja BAYONA.

## Fuente de verdad

Repositorio web:
- `SBAYONA-WEB-PRO/src/styles.css`
- `SBAYONA-WEB-PRO/src/engine/config/theme.js`

Paleta canónica:
- `#050505`
- `#0C0C0D`
- `#141416`
- `#FFFFFF`
- `#C4C4C4`
- `#949494`
- `#F4A261`
- `#E76F51`
- `#D45D38`
- `#FFC08A`
- `#9C4F1F`

## Implementado

- `js/brand.js`: fuente única de tokens de marca.
- Theme Engine consume `brand.js`.
- Noche replica los negros y naranjas de la web.
- Día conserva el mismo naranja con una adaptación clara accesible.
- `meta theme-color` sincronizado con el modo.
- Apariencia:
  - swatches reales;
  - Noche + Día;
  - geometría recta por defecto;
  - glass apagado por defecto.
- `css/pro.css`:
  - capa final Brand System;
  - controles principales rectos;
  - CTA naranja BAYONA;
  - labels con Orange On Dark / Orange On Light;
  - barras de progreso y estado en naranja;
  - entrada/HUD/Hub/Sesión sincronizados.
- `css/luxe.css`:
  - landing pública sincronizada;
  - demo móvil mantiene forma física;
  - CTAs y superficies consumen la nueva paleta.
- Mundo 3D:
  - fondo `#050505`;
  - superficies `#0C0C0D/#141416`;
  - acento `#F4A261`;
  - alerta `#E76F51`;
  - modo Día derivado accesible.
- Avatar:
  - defaults visuales migrados al nuevo naranja/negros.
- Fallback 2D y catálogo:
  - naranja legado retirado cuando correspondía.
- PWA:
  - `brand.js` precacheado;
  - shell v36.

## Decisión de tipografía

La web usa Montserrat / Inter / DM Mono. La app conserva sus fuentes autoalojadas actuales para no romper el modo offline ni añadir una dependencia remota. Los roles se mantienen:
- display;
- cuerpo;
- datos monoespaciados.

La migración tipográfica exacta solo debe hacerse cuando las fuentes estén autoalojadas legalmente dentro del proyecto.

## Integridad

- No se elimina el modo Día solicitado.
- Noche sigue siendo la firma predeterminada.
- No se alteran colores semánticos de peligro/éxito solo por branding.
- Los elementos físicamente circulares (avatar/personaje) conservan el círculo.
- El teléfono de demo conserva esquinas físicas; no se trata como una tarjeta de marca.

## Validación

Nuevas suites:
- `tests/brand-eval.mjs`
- `tests/brand-ui-eval.mjs`

Suite total esperada: **54 suites**.

Merge únicamente con `bateria` y `ci` verdes.
