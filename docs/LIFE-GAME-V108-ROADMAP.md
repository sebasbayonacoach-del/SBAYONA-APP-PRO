# BAYONA LIFE GAME v1.0.8 — PLAN DE IMPLEMENTACIÓN

## Objetivo
Convertir BAYONA en una **Life OS jugable**: el usuario organiza su día, completa acciones reales, gana XP, progresa por áreas de vida, sube de rango y recibe una sola recomendación útil en BAYONA NOW.

## Regla de producto
Menos es más. La app principal se organiza en cinco destinos:
1. **Ahora**
2. **Mi Día**
3. **Misiones**
4. **Rangos**
5. **Perfil**

Entrenamiento, nutrición, recuperación, CORE, Vision, calendario, integraciones y progreso siguen existiendo, pero aparecen desde contexto, no como una colección de menús.

---

## FASE 0 — Mantener lo que ya funciona
No duplicar:
- `js/planner.js` y `js/ui/planner.js`: agenda y tareas.
- `js/rewards.js`: única fuente de XP.
- `js/state.js`: economía, nivel, skills, racha, persistencia.
- `js/now.js`: decisión principal.
- `js/coach/*`: CORE.
- `js/integrations/*`: calendario, Inbox, Maps y música.
- `js/vision/*`: cámara y métricas.
- `js/data.js`: catálogo actual de rangos/misiones.

Antes de cada fase: tests + commit pequeño.

---

## FASE 1 — MOTOR DE JUEGO CENTRAL
### Nuevos módulos
- `js/game/areas.js`
- `js/game/ranks.js`
- `js/game/missions.js`
- `js/game/progression.js`

### Áreas de vida
Definir 5 áreas base, no 15:
- **CUERPO**
- **MENTE**
- **TRABAJO**
- **RELACIONES**
- **ESPÍRITU**

Cada bloque del planner puede pertenecer a una de estas áreas. Los tipos existentes de planner se mapean a áreas, sin romper compatibilidad.

### Progreso
Separar:
- XP global → nivel y rango.
- XP por área → evolución de cada dimensión.
- Racha → constancia, no castigo por descanso.
- Misiones → bonus; nunca doble XP.

### Rangos
Reemplazar los 7 rangos actuales por una escalera larga original BAYONA (20+ rangos), con:
- `id`
- `name`
- `minXp`
- `tier`
- `badgeKey`
- `unlock`
- `description`

La fórmula actual de nivel sigue siendo independiente del nombre del rango.

### Entrega F1
- motor puro testeable
- migración segura desde estado existente
- 0 pérdida de XP actual
- tests de límites, saltos de rango, idempotencia y migración

---

## FASE 2 — MI DÍA 2.0
### Objetivo
Que Mi Día sea el centro práctico tipo planner/TickTick, pero más simple.

### Funciones
- tareas con o sin hora
- bloques de tiempo
- prioridad
- duración
- área de vida
- recurrencia
- subtareas ligeras
- completar / deshacer
- arrastrar/reprogramar posteriormente
- calendario externo
- Inbox
- vista Hoy / Próximos 7 días

### Regla
No obligar al usuario a completar 10 cosas. BAYONA propone **mínimo 1–2 acciones de crecimiento por área**, pero adapta el día para no sobrecargar.

### Generador de día
Nuevo `js/game/day-plan.js`:
- usa objetivos
- disponibilidad
- agenda real
- entrenamiento
- descanso
- historial
- preferencias
- produce acciones sugeridas
- nunca pisa compromisos existentes
- necesita confirmación antes de agregar acciones personales nuevas

### Entrega F2
- nuevo modelo planner compatible
- UI simplificada
- creación ultrarrápida
- CORE puede crear/mover/completar
- tests de conflictos y recurrencia

---

## FASE 3 — MISIONES
### Tipos
- diarias
- semanales
- especiales
- hitos
- misiones por área

### Regla
Una misión representa una acción real medible. Nada de “abre la app 5 veces”.

Ejemplos:
- completar sesión
- leer 20 min
- bloque de foco
- llamar a alguien
- rutina nocturna
- hidratación
- movilidad
- diario/gratitud si el usuario la elige

### Motor
`js/game/missions.js` devuelve:
- misión
- criterio
- progreso
- completada
- XP bonus
- área
- fecha de expiración

### Entrega F3
Nueva pantalla `js/ui/missions.js` con:
- 3–5 misiones máximo visibles
- progreso semanal
- racha
- próxima recompensa

---

## FASE 4 — RANGOS
Nueva pantalla `js/ui/ranks.js`.

### UX
- rango actual protagonista
- progreso al siguiente
- escalera completa
- insignias propias BAYONA
- beneficios/desbloqueos reales
- historial de ascensos

### Regla
No copiar Tanki. Inspiración solo en profundidad y sensación de progresión.

### Desbloqueos
- cosméticos
- marcos
- poses
- fondos
- efectos
- títulos
- variantes del avatar
- retos especiales

Pagar nunca compra rango.

---

## FASE 5 — PERFIL / PERSONAJE
El personaje principal es el usuario.

### Perfil
- avatar
- nivel
- rango
- cinco áreas
- racha
- hitos
- títulos
- inventario cosmético
- camino elegido

### Caminos
No afectan seguridad ni bloquean funciones:
- Fuerza
- Movimiento
- Rendimiento
- Equilibrio

Sirven para personalizar misiones y estética.

---

## FASE 6 — BAYONA NOW + JUEGO
`js/now.js` recibe:
- bloque activo/próximo
- misión prioritaria
- preparación
- agenda
- progreso por áreas
- entrenamiento

Devuelve **una acción**.

Ejemplo:
- “Tu reunión empieza en 25 min. Cierra este bloque y sal con margen.”
- “Cuerpo ya está cubierto hoy. Tu siguiente acción útil es 20 min de lectura.”
- “Hoy llevas suficiente. Cierra el día.”

---

## FASE 7 — NAVEGACIÓN FINAL
Bottom nav del atleta:
- Ahora
- Mi Día
- Misiones
- Rangos
- Perfil

Entrenar deja de competir como pestaña principal; se abre desde Ahora, Mi Día o misión.

Coach Studio mantiene navegación propia.

---

## FASE 8 — DATOS Y NUBE
Supabase:
- planner_items (ya existe)
- life_area_progress
- mission_instances
- rank_events
- user_game_profile
- unlocks

RLS por `user_id`.
Local-first.
Outbox idempotente.
Sin secretos OAuth en estado local.

---

## FASE 9 — QA
Contratos mínimos:
- XP nunca se duplica
- descanso no rompe racha
- eliminar/deshacer revierte correctamente cuando corresponda
- planner no pisa calendario externo
- rangos monotónicos
- 0 claims ficticios
- accesibilidad
- dark/light
- 360 / 390 / tablet
- offline
- Android real

## Orden de commits
1. `feat(game): add life areas and rank ladder`
2. `feat(planner): add life-area tasks and recurrence`
3. `feat(missions): add daily and weekly mission engine`
4. `feat(ranks): add rank progression UI`
5. `feat(profile): add player identity and area progression`
6. `feat(now): prioritize life missions in BAYONA NOW`
7. `refactor(nav): simplify athlete navigation`
8. `feat(sync): persist game progress with RLS`
9. `test(game): certify life game progression`

## Criterio de terminado
La app debe poder usarse durante un día entero sin pensar dónde está cada cosa:
**abrir → ver siguiente acción → hacer → marcar → ganar progreso → continuar**.
