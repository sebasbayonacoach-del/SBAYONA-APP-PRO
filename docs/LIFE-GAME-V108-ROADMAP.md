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
- [x] Mi Día PRO: subtareas, repeticiones diarias/laborables/semanales, aplazamiento con excepción por instancia, prioridades, Hoy/Semana/Pendientes y creación rápida.
- [ ] Drag-and-drop táctil y filtros avanzados (NO implementados; no son prerrequisitos para las tareas actuales).
- [x] Cinco misiones de vida enlazadas a registros y tareas confirmadas, bono único de 8/12 XP por área (máximo 52 XP/día).
- [x] BAYONA NOW prioriza una tarea de crecimiento voluntaria solo si no hay sesión, cita próxima ni recuperación prioritaria.
- [ ] Insignias/animaciones 3D/artefactos originales por rango.
- [ ] Sincronización incremental y RLS producción verificados.
- [ ] Capturas nuevas, copy y marketing de WEB.
- [x] APK 1.0.8-beta compilado en Descargas/BAYONA (debug para pruebas).
- [x] APK 1.0.9-beta con misiones de vida y Progreso compilado (debug, 19 MB). No instalado: ADB sin dispositivo.
- [ ] Instalación en Android real: pendiente de reconectar ADB. No equivale a versión de tienda.

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

## ENTREGABLE TERMINADO — MI DÍA PRO
Se amplió el planificador existente, sin otra app dentro de BAYONA:
1. Tarea rápida en una línea (sin abrir el modal).
2. Formulario completo conserva fecha, hora, categoría, área, ubicación y notas; añade prioridad, recurrencia y hasta 12 subtareas.
3. Recurrencia diaria, laborables y semanal, con fin opcional.
4. Excepciones por fecha para terminar, reprogramar o cancelar una sola aparición.
5. Tres vistas compactas: Hoy / Semana / Pendientes.
6. Pendientes concentra las apariciones futuras de una serie en una tarjeta útil, no decenas de filas repetidas.
7. Eventos externos aparecen con fuente identificada y son solo lectura.
8. Dos misiones diarias verificadas se reutilizan desde js/hoy.js, con su fuente de XP original (sin premios por marcar tareas manuales).
9. SQL 0008 añade datos al esquema existente, sin aplicarse automáticamente al servidor.
10. Sync nube usa upsert por (user_id,client_id), luego eliminación de filas ausentes; requiere migraciones antes de almacenar funciones PRO. Sigue siendo espejo local-first, no sincronización multi-dispositivo certificada.

**Comprobación:** 50 suites de Node en verde, smoke Playwright móvil 390px (crear rápido, recurrencia, subtareas, 3 vistas, 0 errores y 0 overflow).

## NUEVA FASE — MISIONES DE VIDA (CÓDIGO COMPLETADO)
- Motor puro `js/game/missions.js`: Cuerpo, Mente, Trabajo, Relaciones y Propósito.
- Los registros internos de entrenamiento/movilidad, mente y bloques de foco pueden completar misiones. Las tareas manuales completadas también pueden contar, con etiqueta honesta "confirmada por ti".
- Los eventos externos solo dan contexto: NO completan misiones.
- `js/rewards.js` es la fuente del bono; `S.claimAreaMission` valida el estado, fecha y clave reclamada, con 8/12 XP por área y 52 XP/día máximo.
- Un bono no se vuelve a reclamar por volver a marcar/desmarcar una tarea.
- Mi Día muestra las cinco áreas plegadas y permite reclamar bonos. Progreso muestra el mismo estado; Ahora solo sugiere una tarea cuando la jerarquía de seguridad y agenda lo permite.
- Las misiones antiguas de `js/hoy.js` continúan: no se han sustituido ni reiniciado.
- QA: 25 comprobaciones del motor, batería completa 51 suites y smoke móvil de recompensa (0→1/5, +8 XP, no reclamo duplicado, 0 JS errors y 0 overflow).
- La sincronización entre varios dispositivos del registro de bonos sigue SIN certificar y necesita controles del lado servidor para producción a escala.

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
