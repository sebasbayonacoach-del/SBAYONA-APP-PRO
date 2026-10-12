# BAYONA APP — AUDITORÍA DE ENCAJE · LIFE GAME 1.0.8
Fecha: 2026-10-12. Base de revisión: rama life-game-v108-20261012, derivada de 46ae858.
Alcance: fuente APP React-free/JS nativo + Capacitor, 3D, lógica de negocio, pruebas automatizadas y smoke real a 390 px. No se ha certificado carga masiva ni producción cloud.

## Principio del rediseño
NO CREAR OTRA APP DENTRO DE BAYONA. Conservar la navegación atleta:
**Ahora · Entrenar · Progreso · Perfil**, más el acceso contextual a **Mi Día** y **CORE**.
El juego debe añadir un motivo para volver y ejecutar acciones, no menús adicionales.

## Mapa de integración real

| Dominio actual | Archivos / fuente | Qué funciona | Dónde encaja Life Game |
| --- | --- | --- | --- |
| Entrada / roles | js/ui/auth-gate.js, js/ui/landing-boot.js, js/sync/identity.js | registro, perfil, rol y cuentas separadas | no tocar pantalla inicial; los rangos son del usuario, no del plan comercial |
| Mundo 3D/avatar | js/world.js, js/avatar3d.js, js/ui/appearance.js | avatar persistente, escenas y apariencia | mostrar insignias y cosméticos reales gradualmente, sin reemplazar el avatar |
| Ahora | js/now.js, js/ui/fitness.js | recomendación única considerando sesión, agenda y preparación | futura misión prioritaria entra DESPUÉS de sesiones activas y citas, nunca las reemplaza |
| Entrenar | js/engine.js, js/ui/training.js, js/ui/proplayer-library.js | plan personalizado, sesiones, series, ajustes, biblioteca | fuente real de misiones corporales y XP existente |
| Mi Día | js/planner.js, js/ui/planner.js | bloques, horas, completar, editar, ICS, conflictos, Inbox | tareas opcionales por área de vida, subtareas y recurrencias futuras |
| CORE | js/coach/ai-core.js, js/coach/ai.js, js/ui/core.js | lenguaje natural, propuestas y confirmación | crear/mover/completar; añadir misión solo con confirmación; sin inventar horarios |
| Nutrición | js/ui/nutrition.js, js/nutricion.js | comidas, agua, recetas, registros | crecimiento de Cuerpo; no crear otra app de comida |
| Recuperación | js/ui/recovery.js, js/health/*, js/cycle.js | descanso, preparación y movilidad según datos | recuperación suma a Cuerpo; no penalizar descanso ni pedir registros sensibles |
| Mente/trabajo | js/ui/mind.js, js/ui/trabajo.js | hábitos, foco y pausas | fuentes para Mente/Trabajo; evitar doble XP |
| Progreso | js/ui/progress.js, js/progreso.js, js/timeline.js | historial, técnicas, PR, fotos, habilidades | rango, logros, nivel y áreas; no sustituir análisis deportivo |
| Juego actual | js/state.js, js/rewards.js, js/data.js, js/hoy.js | nivel, XP, siete rangos, dos misiones del día, racha, inventario | ampliar rangos con los mismos XP; reutilizar bonos existentes y eliminar sistemas duplicados |
| Armario | js/ui/armory.js, js/data.js | inventario/rareza, desbloqueos y tienda | futuros cosméticos por rango sin pay-to-rank |
| Coach Studio | js/ui/one.js, js/coachos.js, js/ui/agenda.js, js/gym/* | experiencia profesional, miembros, clases y cuota | permanece SEPARADO. Misiones personales no se mezclan con gestión del gimnasio |
| Sincronización | js/sync/account.js, js/sync/supabase.js, api/supabase/migrations | local-first y espejo cloud RLS | 0007 agrega campo area (requiere aplicar en cloud). No activar nuevos módulos cloud sin RLS/probar |
| Android | mobile/android/**, js/integrations/* | APK, calendario nativo, share, mapas y música | preservar permisos explícitos y UX offline; nunca pedir nuevos permisos al abrir |

## Hallazgos importantes
1. Ya hay dos "Hoy": el motor legado de dos misiones de salud en js/hoy.js y la portada única en js/ui/fitness.js. NO lanzar un tercer "Hoy": después unificar las misiones existentes como fuente que alimenta la portada y Mi Día.
2. RANKS en js/data.js tenía 7. Cambiamos a **26 rangos** desde js/game/ranks.js exportados por la fuente existente. S.level, S.rank y las recompensas siguen funcionando igual.
3. En js/state.js el nivel usa una curva específica (250 + 180 por nivel) y los cosméticos se desbloquean por niveles concretos. La escalera nueva conserva los nombres históricos en sus umbrales, sin recalcular XP.
4. "Mi Día" no era todavía un clon de TickTick: hoy no tiene recurrencias ni subtareas ni arrastre, aunque sí tareas y eventos. Agregamos campo area opcional + 2 propuestas por área, NO inserción automática.
5. El propósito/espiritualidad es una opción personal. Las propuestas neutrales de propósito están disponibles; no inferir fe ni exigir prácticas espirituales.
6. Marcar una tarea manual como hecha NO da XP todavía. Esto evita recompensas fáciles e inflación. Un motor posterior puede conceder un BONUS diario idempotente, limitado y reversible, con la fuente en js/rewards.js.
7. Las tareas sincronizadas de Android con origen device_calendar deben mantener etiqueta de origen; los cambios de eventos externos vuelven por sincronización, no por editar la copia local como si fuera fuente principal.
8. La migración 0007 está en el repositorio pero NO aplicada a Supabase remoto ni sometida a certificación RLS de producción. El cliente usa fallback de inserción 0006 si la columna aún no existe.
9. El espejo planner actual usa borrar/reinsertar por usuario y no es transaccional. Para multi-dispositivo y millones de usuarios, hay que introducir upsert incremental con tombstones y resolver conflictos; no afirmar que hoy existe sincronización robusta bidireccional.
10. El sitio WEB aún mezcla discurso conceptual BAYONA+ con la APP viva. Rediseño web después de confirmar visuales y estados del producto; nunca inventar capturas ni métricas.

## Fase compatible ya codificada
- js/game/ranks.js: 26 rangos originales; milestones existentes INICIADO/ATLETA/VANGUARDIA/ÉLITE/TITÁN/ASCENDIENTE/LEYENDA preservados.
- js/data.js: reexportación de una única lista de rangos.
- js/ui/progress.js: tarjeta rango actual, próximo rango, XP restante y escalera desplegable sin una pestaña nueva.
- js/game/areas.js: cinco áreas, dos acciones propuestas por área y contador derivado, sin nueva economía.
- js/planner.js: normalización de campo area opcional; respeta áreas removidas a voluntad.
- js/ui/planner.js: selector área, etiqueta por tarea, módulo de propuestas plegado con un toque para añadir.
- api/supabase/migrations/0007_life_game_areas.sql + setup.sql: compatibilidad de nube preparada.
- js/sync/account.js: incluye área, fallback del esquema anterior.
- tests/life-game-eval.mjs: regresiones y compatibilidad. Smoke Playwright de Mi Día + Progreso a 390 px.

## Siguientes fases — por prioridad
1. **Tareas PRO (sin rediseñar navegación):** subtareas, recurrencia, prioridades, filtros Hoy/7 días, reprogramar sin perder historial, fechas sin hora.
2. **Unificar misiones:** conservar las 2 extras de js/hoy.js, añadir un solo conjunto de objetivos voluntarios por área, no reclamar dos veces ni premiar dolor/agotamiento.
3. **Progresión y avatar:** XP por áreas solo desde eventos verificados, badge SVG/CSS original BAYONA, logros, cosméticos con gating real en armory.
4. **NOW + misiones:** sólo si no existe cita activa, sesión abierta ni necesidad de recuperación; entregar una sola acción.
5. **Cloud fiable:** validación de migración y RLS, sync incremental e idempotente, QA multiusuario antes de abrir a terceros.
6. **WEB:** capturas reales de Ahora, Mi Día, Progreso y CORE; nuevo discurso de "Tu vida, en progreso", enlaces a la app sin claims falsos.
7. **Android release:** QA con dispositivo conectado, paquete firmado de release, stores cuando proceda. Beta no equivale a publicación.

## Aceptación antes de mezclar a oficial
- npm test (todas las suites, incluyendo Life Game).
- auditoría i18n sin aumento.
- smoke móvil a 390 px / 360 px: Mi Día, Progreso, Entrenar, Cuenta, Coach Studio sin interferencia.
- cero reinicio de partida ni pérdida de XP o inventario.
- migración de planner conserva todos los campos legacy y usuarios externos.
- accesibilidad básica: contraste, foco, reduced-motion, tap targets.
- no desplegar cambios de la WEB hasta confirmar la versión APP.
