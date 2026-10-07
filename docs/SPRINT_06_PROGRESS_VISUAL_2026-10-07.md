# Sprint 06 · Progreso Visual

Fecha: 2026-10-07

## Objetivo

Convertir Progreso en una lectura visual y coherente de la historia real del usuario: entrenamiento, fuerza, volumen, medidas, fotos, constancia, récords y timeline.

## Problema corregido

La app ya tenía buenos módulos de dominio para progreso, medidas y fotos, pero estaban fragmentados.

En concreto:
- `medidasBlock()` existía pero no entraba en la pantalla principal;
- `photosBlock()` existía pero no entraba en la pantalla principal;
- el resumen estadístico, la analítica y la timeline no compartían una fuente canónica.

## Dominio

Nuevo `js/progress-visual.js`:

- `progressRecords()`;
- `strengthRecords()`;
- `strengthLeaders()`;
- `weeklyLoad()`;
- `periodSummary()`;
- `photoSummary()`;
- `progressSnapshot()`.

### Honestidad de datos

- Los huecos no se rellenan.
- El volumen desconocido queda `null`.
- Una comparación de periodos solo se declara comparable si el periodo anterior tiene datos.
- La fuerza sigue siendo 1RM estimado cuando procede.
- No hay aleatoriedad ni “progreso” sintético.

## Experiencia visual

Nuevo orden:

1. Hero “Antes. Ahora. Lo que sigue.”
2. Sesiones / series / PR / racha / minutos.
3. Próxima revisión de progreso.
4. Últimos 28 días.
5. Fuerza.
6. Progreso honesto:
   - volumen;
   - constancia;
   - 1RM estimado.
7. Mediciones corporales.
8. Registro/edición de mediciones.
9. Fotos privadas.
10. Comparador de fotos.
11. Analítica avanzada.
12. Habilidades.
13. Récords.
14. Timeline completa.

## Membresías

Todos los planes conservan:

- estadísticas básicas;
- curvas basadas en registros;
- mediciones;
- fotos;
- récords;
- timeline.

PERFORMANCE/ELITE reciben `progress.advanced`:

- carga;
- recuperación analítica;
- volumen objetivo;
- proyecciones de fuerza.

La curva histórica de fuerza sigue visible en planes inferiores, pero la proyección futura se oculta.

## Privacidad

Se conserva el contrato anterior:

- fotos privadas por defecto;
- permiso explícito;
- almacenamiento local;
- borrado explícito;
- exportación de datos.

## Brand System

Los nuevos componentes usan:

- negro profundo y superficies web en Noche;
- adaptación clara BAYONA en Día;
- naranja BAYONA para foco/acción;
- geometría recta de producto.

## PWA

- `js/progress-visual.js` precacheado.
- shell v38.

## Validación

Nuevas suites:

- `tests/progress-visual-eval.mjs`
- `tests/progress-visual-ui-eval.mjs`

Suite total esperada: **70 suites**.

Merge únicamente con `bateria` y `ci` verdes.
