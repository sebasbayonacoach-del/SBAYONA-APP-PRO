# BAYONA App · Sprint 15D: integridad del calendario semanal

Fecha: 2026-10-08. Base: Sprint 15C (`c1f61b1`), que ya pasó 83 suites y 78 E2E y fue fusionado por PR #30.

## Inconsistencias encontradas

- La navegación permitía entrar a semanas cero o negativas y pasar la semana 24.
- Al visualizar semanas distintas a la actual, el encabezado y los indicadores de intensidad/volumen seguían utilizando la fase **de hoy**, aunque el número de semana hubiera cambiado.
- El detalle automático mostraba **la fecha de hoy** incluso al avanzar una semana, en lugar de la fecha de la semana visible.
- Un `setTimeout` podía completar el detalle de un panel que el usuario ya había abandonado.

## Corrección de producto

- Nuevo módulo puro `js/training-calendar.js`: `weekView(current,offset)` limita navegación a 1–24 y calcula la fase de la semana visible; `weekDayDate(ref,offset,day)` genera fechas locales robustas ante cambio de mes, año y horario de verano.
- El calendario reutiliza los siete días de la programación personal existente, sin mutar sesiones, objetivos ni recompensas.
- Navegación Anterior/Siguiente inhabilitada en los límites, con estado visual correspondiente.
- La tarjeta automática de detalle representa ahora el día equivalente **de la semana visible**. Solo se actualiza si el calendario sigue conectado al DOM.
- Caché PWA v50 y CSS v5 para que el cambio funcione offline tras la actualización.

## Validación

- `tests/training-calendar-eval.mjs`: 1.704 combinaciones semana/desplazamiento y pruebas de fases, cambio de mes/año y zona horaria Europa/Madrid y America/New_York.
- E2E: botones nativos, calendario desplazable, fecha y sesión anunciadas, Enter selecciona día, navegación Anterior/Siguiente actualiza fechas y fase sin salir de 1–24.
- Ejecutar `npm run check:production` y la E2E completa de navegador en esta rama, y posteriormente verificar CI, batería y E2E de GitHub en el HEAD exacto.

## Protección

Se trabaja en `/tmp/bayona-sprint15d-calendar-20261008`, separado de la carpeta original con sus 40 cambios sin confirmar. No despliegue a main, no pagos reales y ningún tratamiento de datos personales añadido.
