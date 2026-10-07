# Sprint 07 · Recovery + Sleep

Fecha: 2026-10-07

## Objetivo

Convertir Recuperación en un sistema diario coherente: sueño, energía, estrés, molestias, carga, pausas activas, prácticas de recuperación, otros deportes/actividad y cierre nocturno.

## Principios

- Nada de sueño, HRV o wearables simulados.
- Un dato ausente sigue siendo ausente.
- Readiness sigue siendo una estimación explicada, no diagnóstico.
- Un horario objetivo no se presenta como sueño real.
- Los recordatorios de BAYONA no se presentan como alarmas del sistema operativo.
- Los wearables solo aparecen conectados cuando existe proveedor + conexión + sincronización real.

## Dominio

Nuevo `js/recovery-sleep.js`:

- preferencias de sueño;
- duración de ventana nocturna;
- timeline desacelerar → dormir → despertar;
- siguiente evento nocturno;
- registro real de sueño a partir de horas;
- pausas activas configurables;
- otras actividades/deportes;
- prácticas de recuperación;
- wearable snapshot;
- tendencia de 7 días;
- snapshot unificado de recuperación.

## Estado · schema 7

Nuevos campos diarios:

- `sleepBedAt`;
- `sleepWakeAt`;
- `sleepSource`;
- `recoveryPractices`;
- `otherActivities`;
- `recoveryNote`.

Nuevos dominios raíz:

- `recovery.preferences`;
- `recovery.activePause`;
- `integrations.health`.

El rollover conserva:

- sueño;
- estrés;
- horas de dormir/despertar;
- fuente del sueño;
- prácticas;
- otros deportes;
- pausas activas;
- rutina nocturna;
- nota de recuperación.

## UI

Orden de la pantalla:

1. Recovery Hero.
2. Horario de sueño.
3. Registro de noche real.
4. Readiness explicada.
5. Energía / estrés / molestias.
6. Tendencia de 7 días.
7. Wearable.
8. Pausas activas.
9. Prácticas de recuperación.
10. Otros deportes/actividad.
11. Nota contextual.
12. Cierre del día.
13. Avisos de salud.
14. Flujo de movilidad.

## Wearables

`wearable.sync` continúa reservado a PERFORMANCE+.

Si el plan permite wearable pero no hay un proveedor configurado:

- se muestra “sin conexión”;
- no aparece HRV inventado;
- no aparece sueño importado;
- no existe un botón que simule “conectar”.

La escritura de `integrations.health` queda preparada para una integración verificada futura.

## Recordatorios

BAYONA puede guardar:

- hora objetivo de dormir;
- hora objetivo de despertar;
- minutos de desaceleración;
- preferencia de recordatorio;
- intervalo objetivo de pausa activa.

No se promete:

- alarma nativa del sistema;
- despertar el teléfono;
- ejecución en background garantizada.

Eso requiere integración móvil/native o capacidades del sistema operativo.

## PWA

- `js/recovery-sleep.js` precacheado.
- shell v39.

## Validación

Nuevas suites:

- `tests/recovery-sleep-eval.mjs`
- `tests/recovery-state-eval.mjs`
- `tests/recovery-ui-eval.mjs`

Suite total esperada: **75 suites**.

Merge únicamente con `bateria` y `ci` verdes.
