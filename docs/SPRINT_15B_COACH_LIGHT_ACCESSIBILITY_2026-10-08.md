# BAYONA App · Sprint 15B: Coach OS día/noche y legibilidad

Fecha: 2026-10-08. Base oficial: `bayona-one/visual-integration-v6` tras PR #28.

## Error real detectado

En una auditoría de Playwright de 20 vistas (4 secciones de producto y Coach OS, móvil/escritorio, día/noche), Coach OS en modo día mostraba tarjetas blancas con encabezados y cifras prácticamente blancos. La navegación superior aparecía negra con texto oscuro. Los seis botones de acción de la parte superior medían 31 px. Este defecto visual era grave aunque los E2E funcionales anteriores pasaban.

## Corrección aislada

- `css/bayona-brand.css`: los colores, fondos, bordes y texto de Coach OS en modo día se ajustan a una escala clara de alto contraste. Los elementos de estado mantienen sus tonos semánticos.
- Tipografía del estudio: kickers, etiquetas, métricas y datos secundarios con tamaño legible; botones de al menos 44 px en móvil y escritorio.
- Día y noche siguen activables: no se cambia el perfil ni las reglas del negocio.
- `sw.js` v48, CSS de marca query v3: evita que el precache anterior sirva estilos desfasados.
- `tests/e2e-production.mjs`: añade aserciones de contraste WCAG AA renderizado para título, adherencia, operaciones y métricas de Coach OS; y altura de acciones, ambos temas y overflow.

## Validación

Antes de corregir, Coach OS móvil en modo día tenía 18 textos de menos de 11 px y seis controles por debajo de 44 px. Después: un texto pequeño y cero controles cortos, sin desbordamiento horizontal. Se conservaron las pruebas del portal del usuario y las funciones de Coach OS.

Estado de pruebas locales antes del ajuste final de 2 px en botones de escritorio: `82/82` suites, `60/60` comprobaciones de navegador y presupuesto PWA `2.05 MiB`. Repetir pruebas en el commit final y CI GitHub antes de fusionar.

## Protección de trabajo y despliegue

Se trabaja en el clon aislado `/tmp/bayona-sprint15b-precision-20261008`. Los 40 archivos originales no confirmados en `~/TRABAJO/02_DESARROLLO/SBAYONA-APP-PRO` siguen sin alterarse. No activar cobros reales ni despliegue productivo: dependen de las verificaciones cloud, roles, privacidad y Stripe en staging.
