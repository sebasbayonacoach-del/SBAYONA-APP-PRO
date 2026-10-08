# BAYONA · Integridad de Planning Studio · 2026-10-08

## Alcance
Continuación sobre la versión oficial de Sprint 13, sin tocar la rama local de unificación visual ni habilitar servicios de producción.

## Correcciones
- La edad sin declarar (`null`, `undefined`, cadena vacía, valores no plausibles o booleanos) ya no se clasifica como edad infantil.
- Las edades válidas menores de 18 años y de 65 o más siguen activando revisión contextual adaptada.
- Dolor, enfermedad declarada, postcirugía y demás señales de revisión manual conservan prioridad sobre cualquier edad.
- Los días de inicio y fin de macro/microciclos se operan en UTC como fechas de calendario: no se desplazan por horario de verano ni husos UTC+14.
- Fechas imposibles o mal formadas ya no se normalizan silenciosamente a otro día: la función de borrador recurre a la fecha actual UTC, comportamiento preexistente para entradas no válidas.

## Verificación ejecutada
- `node tests/planning-integrity-eval.mjs`: 39 verificaciones nuevas (incluye cuatro zonas horarias y bisiestos).
- `npm run check:production`: 80/80 suites, lint y presupuesto de performance OK.
- `BAYONA_E2E_URL=http://127.0.0.1:8098/?nosw=1 node tests/e2e-production.mjs`: 31/31 comprobaciones de navegador, sin errores.
- Ninguna carga, resultado de test o dato médico es fabricado.

## Riesgos y pasos pendientes
- Certificación final en CI del PR contra `bayona-one/visual-integration-v6`.
- Los cambios visuales de unificación de marca se mantienen aparte, sin mezclar ni descartar modificaciones existentes.
- Supabase, Stripe y backup cloud siguen sujetos a las puertas de seguridad y pruebas reales documentadas en `docs/BETA_CLOUD_STAGING_GATES_2026-10-08.md`.
