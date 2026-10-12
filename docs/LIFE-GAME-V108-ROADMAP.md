# BAYONA LIFE GAME v1.0.8 — PLAN INTEGRADO Y CORREGIDO
Fecha: 2026-10-12. Esta versión sustituye el planteamiento inicial de cinco pestañas nuevas.
**Filosofía:** No rehacer BAYONA. Integrar el juego de la vida en sus módulos existentes.

## Navegación real (mantener 4)
**AHORA** · **ENTRENAR** · **PROGRESO** · **PERFIL**

Rutas secundarias (sin pestañas extra): **Mi Día** desde Ahora; **Misiones diarias** desde Mi Día/Ahora; **Rangos** dentro de Progreso; **CORE** siempre accesible; tienda/armario dentro de Perfil. Coach Studio conserva su navegación por rol.

## ESTADO A FECHA DE ESTA RAMA
- [x] Revisado estado, UI, negocios, cámara, coach, nube, 3D, tests y shell Android.
- [x] Base existente conservada. Ningún reset de la cuenta ni del XP.
- [x] 26 rangos en fuente única de juego que js/data.js reexporta; S.rank() no cambia API.
- [x] Escalera de rango y XP restante en Progreso.
- [x] Cinco áreas: Cuerpo, Mente, Trabajo, Relaciones, Propósito.
- [x] Dos propuestas por área, desplegables en Mi Día (sin añadir de oficio).
- [x] Etiqueta de área en tareas nuevas y legacy; se puede quitar.
- [x] SQL 0007 para campo area; no aplicado en remoto.
- [x] Prueba de flujo real Mi Día → Progreso en Playwright a 390 px.
- [ ] Sistema PRO de tareas: subtareas, recurrencias, drag/reprogramar, prioridades visuales.
- [ ] Misiones por áreas conectadas a registros verificables y límites de XP.
- [ ] Integración de misión prioritaria en BAYONA NOW.
- [ ] Insignias/animaciones 3D/artefactos originales por rango.
- [ ] Sincronización incremental y RLS producción verificados.
- [ ] Capturas nuevas, copy y marketing de WEB.
- [ ] APK de esta rama empaquetado e instalado (no realizado; no confundir con beta 1.0.7).

## ARQUITECTURA
- **js/state.js** sigue siendo economía, nivel, inventario, racha, habilidades.
- **js/rewards.js** sigue siendo ÚNICA autoridad que concede XP.
- **js/game/ranks.js** agrega únicamente catalogación y proyección de rango.
- **js/game/areas.js** agrega únicamente taxonomía y propuestas, sin fabricar puntos.
- **js/planner.js** es ÚNICA agenda; añade campo area como metadato.
- **js/hoy.js** mantiene motor existente de misiones de salud hasta integrarlo (sin doble misión diaria).
- **js/now.js** decide UNA acción prioritaria; no introducir un motor paralelo.
- **js/ui/progress.js** aloja rangos, evitando pantalla extra.
- **js/ui/planner.js** aloja tareas y objetivos por área, sin forzar diez obligaciones.
- **js/ui/one.js** conserva Coach Studio separado de la experiencia del cliente.

## ENTREGABLE SIGUIENTE — TAREAS PRO
Incorporar a la agenda existente:
1. subtareas opcionales con progreso;
2. fecha límite sin hora + recurrencia diaria/semanal;
3. filtros Hoy / Semana / Pendientes;
4. reprogramar sin crear tareas duplicadas;
5. pruebas de calendario externo, privacidad y no alteración de eventos sincronizados.

No empezar una app nueva ni volver a pedir onboarding.

## DESPUÉS — GAMIFICACIÓN VERIFICABLE
1. Vista de misiones plegable en Mi Día, máximo 3-5 sugeridas en Ahora.
2. Reutilizar misiones de js/hoy.js y unir áreas de vida.
3. Premio diario por completar compromisos verificados, con límite y reversión. Una tarea manual no compra puntos repetidamente.
4. Badge original por rango: vectores propios de BAYONA (no insignias copiadas de Tanki).
5. Armario y avatar aprovechan cosméticos existentes.
6. CORE propone, el usuario confirma.
7. Descanso vale como decisión correcta. La app no incentiva entrenar con dolor ni trabajar sin pausa.

## VINCULACIÓN CON LA WEB
Sólo una vez la APP esté validada, rediseñar sección APP de la WEB con capturas del build real:
“Tu vida, en progreso” / “Planifica, actúa y evoluciona”.
Nunca confundir demostración o roadmap con características disponibles.
Ver docs/LIFE-GAME-FIT-AUDIT.md para el mapa detallado.

## CRITERIO DE ÉXITO
En un día normal:
**abrir Ahora → ver qué importa → abrir Mi Día o Entrenar → marcar lo realizado → ver progreso real y rango → cerrar**.
Ningún paso debe obligar a navegar más de dos niveles o crear una cuenta adicional.
