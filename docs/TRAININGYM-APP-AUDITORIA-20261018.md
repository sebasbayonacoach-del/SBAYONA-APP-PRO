# BAYONA APP · Auditoría PROPLAYER / Trainingym (18 de octubre de 2026)

## Alcance
- Auditoría de **3.141 fichas** desde el catálogo que ya incluye BAYONA APP.
- Estados del propio catálogo: 1.607 OK, 648 referencias duplicadas, 828 sin acción de vídeo, 58 errores.
- En Biblioteca, sólo la interfaz del coach cuyo rol se verificó mediante
  is_bayona_coach() y accountRole() muestra el panel. No constituye un control
  de acceso a datos privados por sí solo: el catálogo fuente ya es público en la APP.
- La vista no introduce archivos ni URLs multimedia nuevos, registros de clientes,
  vídeos, ficheros locales del PC ni sincronización de Trainingym.
- Su fuente es trainingym/catalog.json; la auditoría privada eventos.jsonl sigue
  en el ordenador y no se cruza con el catálogo enriquecido por posición,
  pues el orden de las fuentes puede diferir.

## Uso
- Entrar como único entrenador verificado, abrir Biblioteca PROPLAYER.
- Revisar la sección «Control de fichas y vídeos».
- Filtrar estados, buscar por ejercicio/músculo/ID, paginar y elegir «Ver ficha».
- Los atletas tienen la biblioteca habitual, pero no esta vista de auditoría.

## Propiedad y publicación
Disponer de referencias y archivos de Trainingym para consulta interna no es
una licencia de publicación o distribución. Los MP4 locales continúan en el
archivo privado, sin copiarse a la APP. Un estado «OK» no significa que el
CDN siga operativo hoy o que haya permiso de reproducción para todos los públicos.

## Validación
- node tests/trainingym-owner-audit-eval.mjs — 13 verificaciones.
- node tests/run.mjs — 53 suites PASS en la rama aislada.
- Playwright Chromium (desktop 1440, móvil 390 y 320 px):
  5 filtros con conteos correctos, búsqueda, «Ver ficha», 15 por página,
  sin errores JS ni desbordamiento horizontal.
- La rama es de integración, no despliegue oficial. La versión pública aún
  necesita reconciliarse con cambios recientes de autenticación/APP.
