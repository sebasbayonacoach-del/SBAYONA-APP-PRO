# BAYONA — Avatar-Centered Fitness Life RPG

> **CUIDAR A TU PERSONAJE ES CUIDARTE A TI.**
> **BAYONA vive alrededor del personaje.**

Videojuego fitness 3D donde tu avatar es el centro de la experiencia:
tú entrenas → él entrena, tú comes → él come, tú bebes → él bebe.
El avatar es un **gemelo de comportamiento**, no una mascota.
**Todo lo visible al usuario está en español (es-ES).**

## ✨ v4 · CORE (coach conversacional)

CORE deja de ser un formulario con reglas y pasa a ser **una conversación**.
La pieza entera cabe en un vertical slice, y la puerta se abre sin claves.

- **`js/coach/ai-core.js`** — núcleo **puro** (sin DOM, sin red): la puerta de
  seguridad, el allowlist cerrado de herramientas, el prompt por capas y un
  parser SSE que sobrevive a cortes de chunk a mitad de línea.
- **`js/coach/ai.js`** — capa de navegador: reúne el **contexto real** del
  usuario, habla con el proxy y, si algo falla, **mantiene la conversación
  viva** con el motor de reglas de siempre.
- **`api/coach.js`** — proxy de Node (función de Vercel **y** endpoint de
  `tools/serve.mjs` en `/api/coach`). La clave vive en `OPENAI_API_KEY`;
  **jamás** sale del servidor. Solo traduce tokens: no tiene base de datos,
  no autentica y no muta nada. Acepta cualquier gateway compatible con la
  API de chat de OpenAI vía `BAYONA_COACH_UPSTREAM`. Configuración:
  **`api/COACH_IA.md`**.
- **`tools/serve.mjs`** — arranque sin Python (`npm start`), en Node puro.
  Monta `/api/coach` para poder probar la IA en local sin desplegar.
- **`npm run coach:smoke`** — prueba de extremo a extremo (35 puntos):
  levanta el servidor real y habla con `/api/coach` por HTTP.
- **`js/ui/core.js` + `css/coach.css`** — la conversación: burbujas con
  streaming token a token, **tarjetas de herramienta** (ves lo que el coach
  ha hecho de verdad), banner de derivación, historial persistente y un
  composer pensado para el pulgar.
- **`tools/serve.mjs`** — arranque sin Python (`npm start`), en Node puro.

**Las seis garantías van con pruebas** (`tests/coach-ai-eval.mjs`, 67 checks):

| Garantía | Cómo se sostiene |
|---|---|
| La seguridad va primero, siempre | los 30 escenarios corren en el cliente **y** en el proxy, antes de la red |
| El proxy es seguro sin clave | el guion se ejecuta *antes* de mirar `OPENAI_API_KEY` |
| Lo no registrado no se inventa | cada ausente viaja marcado `sin registrar` y el modelo tiene prohibido rellenarlo |
| Las herramientas son una lista cerrada | seis, validadas contra la allowlist antes de ejecutarse |
| El modelo nunca inyecta HTML | todo el streaming entra por `textContent` |
| Si la red cae, el chat sigue | degrada al motor local y lo dice en pantalla |
| Ninguna herramienta se pierde al cerrar | el proxy vuelca las `tool_calls` **antes** del `[DONE]` |

> Por defecto la app arranca **sin nada que configurar** y CORE funciona con el
> motor local. La IA es un acelerador, nunca un requisito.

## ✨ v3 · CINE (rediseño cinematográfico)

- **Ingreso cinematográfico**: portada `#entry` → `ENTRAR` → mundo. Nada se
  muestra de golpe: el contenido vive en el **panel lateral** (misión, métricas,
  nivel + 14 mundos). HUD mínimo (marca · luz · nivel).
- **Movimiento libre del personaje** (`js/move.js`): clic/toque = camina ahí,
  WASD/flechas = caminar (SHIFT corre), arrastrar = cámara orbital, rueda =
  zoom, joystick virtual en móvil.
- **Luz CINE / NOCHE**: por defecto **blanco + naranja** en modo cinematográfico
  (grano de película, barras de encuadre, viñeta); el **negro** queda reservado
  al **modo nocturno**. El mundo 3D cambia de estudio claro a escenario nocturno.
- **Tipografía CLAUDE** (Anthropic): `Styrene B` / `Tiempos Text` declaradas con
  gemelas libres auto-alojadas (`fonts/`: Instrument Sans · Newsreader · Space
  Mono, subset latin, 255 KB). Cero dependencias de red.
- **Cristal** (glassmorphism) + muelles, panel lateral redondeado, onboarding
  rediseñado. Menos texto, más lujo.
- **Backend**: `api/supabase/migrations/0004_perf_sync.sql` — índices calientes,
  `xp_ledger` inmutable + idempotencia, vistas de tablero con
  `security_invoker`, `updated_at` en planes (también en `setup.sql`).

## ✨ v2.1 · MONO NARANJA (rediseño minimalista estricto)

Firma visual nueva: **PALETA ESTRICTA · NARANJA · BLANCO · NEGRO. Nada más.**

- `css/aurum.css` — acabado MONO: superficies planas, filetes 1px, radios mínimos,
  sin aurora/grano/degradados metálicos. Modo NEGRO/BLANCO. El naranja SOLO para
  acción, dato vivo y foco.
- `css/style.css` — tokens canónicos; semántica (`--ok/--danger/--gold/--blue/--cyan`)
  re-mapeada a la paleta (nunca rojo/verde/azul).
- Navegación sin cajas: rail de mundos con pestañas de texto + subrayado naranja
  activo; CTAs con jerarquía NARANJA > BLANCO > CONTORNO.
- Mundo 3D + avatar recoloreados: estudio blanco, maniquí en escala de grises,
  equipamiento negro/blanco/naranja. Toda rareza, macro y dato usa la paleta.
- `js/ui/appearance.js` — panel mínimo (LUZ/DENSIDAD/TEXTO/ESQUINAS/MOVIMIENTO).

## ✨ v2.0 · ATELIER (rediseño de lujo) — superado por v2.1

Capa visual nueva sin tocar la lógica de juego:

- `css/aurum.css` — 7 auras de color, modo claro MARFIL, superficies de cristal,
  letras metálicas, aurora de ambiente, grano fino, tipografía TITÁN/ATELIER.
- `css/motion.css` + `js/ui/motion.js` — transición de mundo cinematográfica,
  revelado escalonado, ripple, tilt 3D, contadores animados, chispas de XP,
  esqueletos de carga. Intensidad PLENO/SERENO/NINGUNO + `prefers-reduced-motion`.
- `js/ui/appearance.js` — panel **APARIENCIA** con vista previa en vivo y 9
  controles (aura, luz, tipografía, densidad, texto, esquinas, cristal, brillo,
  movimiento), persistidos en `localStorage["bayona.appearance.v1"]`.
- Enlaces directos a mundos: `index.html?go=apariencia` · `#entrenamiento` · …

Detalle completo y capturas: **`docs-luxe/`**.

## 🗺️ MAPA DEL REPO

```bash
./run.sh             # → http://localhost:8080   (o: npm start)
npm test             # → batería multiplataforma (tests/run.mjs) + golden set de biomecánica
npm run coach:smoke  # → prueba de extremo a extremo del coach contra /api/coach
npm run mobile:pack  # → empaquetado web para Capacitor (ver docs/MOBILE_RELEASE.md)
```

| Dónde | Qué es |
|---|---|
| `index.html` + `css/` + `js/` + `media/` + `vendor/` | La app: mundo 3D + mundos + plan + armario |
| `js/ui/` | Módulos por mundo (shell, gimnasio, cocina, recuperación, mente, plan, armario, progreso, CORE, más) |
| `js/vision/` | **GEMELO-1**: cámara → contador de reps → biomecánica (procesado 100% local) |
| `js/coach/` · `js/health/` | CORE conversacional (IA con repliegue local) · **Mapa de Salud** (PAR-Q+/PHQ-2/GAD-2) |
| `js/state.js` · `js/rewards.js` · `js/engine.js` | Estado persistente (esquema v3 + migración) · economía (fuente única) · motor de rendimiento |
| `js/contexto.js` · `js/ui/trabajo.js` | **Motor de contexto** (momento del día → entorno/saludo) · contexto **TRABAJO** (foco 25/5, pausas activas, postura) |
| `js/medidas.js` | **Mediciones**: evolución corporal ANTES→AHORA→HACIA DÓNDE (deltas, tendencia, proyección honesta) |
| `js/coachos.js` · `js/ui/coachos.js` | **COACH OS**: command center del entrenador (fichas vivas, alertas por reglas, CORE Coach, macrociclo) |
| `js/hoy.js` | **Plan del día**: jerarquía CRÍTICO→HOY→RECOMENDADO→OPCIONAL→COMPLETADO + misiones diarias deterministas (panel en `js/ui/hoy.js`) |
| `js/i18n.js` · `js/consents.js` · `js/phygital.js` | Catálogo/formato es-ES + `esc()` · consentimientos centralizados · códigos físico→digital |
| `js/data/offlineQueue.js` | Cola offline FIFO idempotente + zona de recuperación (nada se pierde en silencio) |
| `tests/` + `ml/evals/` | 32 suites ejecutables (visión, coach, salud, HOY, cola, economía, estado, phygital…) + golden set |
| `api/` | Proxy del coach (`api/coach.js` + **`api/COACH_IA.md`**) · SQL Supabase (tablas + RLS) + contratos REST · **`api/supabase/SETUP.md`** = guía para crear la cuenta y desplegar · **`api/supabase/setup.sql`** = script único e idempotente para el SQL Editor |
| `mobile/` | Contenedor **Capacitor** → Android / iOS (configurado; sin compilar en esta fase) |
| `sw.js` + `manifest.webmanifest` | PWA: shell offline (network-first para código) + instalable |

## Ejecutar

```bash
./run.sh                    # → http://localhost:8080
./run.sh & abrí index.html  # requiere servidor local por los módulos ES
```

Diagnóstico sin service worker: `index.html?nosw=1`.

## Estado real de los sistemas (verificado con tests + navegador)

| Sistema | Estado | Evidencia |
|---|---|---|
| Onboarding ÚNICO (personaje, objetivo, disponibilidad, equipamiento, consentimientos) | ✅ implementado y probado | E2E navegador |
| Avatar 3D persistente + outfit en tiempo real + rotación 360° | ✅ (avatar procedural = fallback técnico; pipeline GLB/VRM preparado, sin modelos) | E2E navegador |
| Mundos (Inicio · Gimnasio · Cocina · Recuperación · Mente · Laboratorio · Vestidor) con transición 300–900 ms | ✅ | E2E navegador |
| Entrenamiento end-to-end: sesión persistente, registro editable, descanso, PR, XP idempotente, cierre parcial/abandono | ✅ | E2E navegador + `tests/state-eval.mjs` |
| Autoregulación REAL (volumen recortado de verdad, carga sugerida usada en el registro) | ✅ | `tests/state-eval.mjs` + E2E |
| CORE conversacional (streaming, herramientas que actúan de verdad, 30 escenarios de derivación, repliegue local sin red) | ✅ con y sin IA | `tests/coach-ai-eval.mjs` + `tests/seguridad-30-eval.mjs` |
| Nutrición (macros, fibra, comidas custom, hidratación rápida/personalizada) | ✅ | E2E navegador |
| Recuperación con desglose «¿POR QUÉ?» y honestidad de datos ausentes | ✅ | E2E navegador |
| Plan macrociclo: vista SIMPLE / LABORATORIO (hoja profesional, adherencia real) | ✅ | E2E navegador |
| Armario: rarezas, DIGITAL/FÍSICO, equipamiento persistente, códigos phygital (formato+control+uso único+auditoría) | ✅ (validación local; server-side pendiente de backend) | `tests/phygital-eval.mjs` + E2E |
| Progreso: analítica real, fotos privadas (solo dispositivo), comparador ANTES/AHORA | ✅ | E2E navegador |
| Privacidad: consentimientos centralizados/revocables, exportar JSON, eliminar todo | ✅ | E2E navegador |
| PWA offline (shell) + instalable | ✅ probado sin red | E2E navegador offline |
| Idioma: experiencia completa en español + formateo es-ES (fechas, decimales 72,5, 24 h) | ✅ | checklist + revisión visual |
| Economía sin dobles XP (previsto = recibido = guardado) | ✅ | `tests/rewards-eval.mjs`, `tests/state-eval.mjs` |
| Backend real (auth, API, sync) | 🚧 contratos + SQL listos; **sin servidor conectado** | `api/` |
| Comunidad / Tienda / Membresías de pago | 🚧 fuera de este slice (deshabilitadas o informativas, sin falsa experiencia) | — |
| APK / iOS | 🚧 solo configuración (Capacitor); sin compilar ni firmar | `mobile/` |

## Filosofía

- Simple para vivirlo. Profundo para entenderlo. Profesional cuando quieras abrirlo.
- Pagar no compra nivel, fuerza, récords ni disciplina.
- Lo que no se ha registrado no se inventa: sin datos → «Todavía no lo has registrado».
- Descansar bien también es progreso (sin castigo por faltar).


## Actualización de la app · 29 septiembre 2026

Requiere Node.js 22 o posterior para las pruebas (importación JSON).

- Entrada guiada: duración por sesión, resumen del perfil, avatar opcional desplegable y saludo al volver.
- MI PERFIL: edición del perfil y calendario según disponibilidad/material; asignaciones del entrenador tienen prioridad.
- MI RITMO: diario menstrual opcional local con consentimiento, fechas, sensaciones, historial y borrado. No infiere ovulación ni fertilidad.
- Modo suave: reduce las series de la misión por elección explícita; no por una supuesta fase hormonal. Una sesión ya iniciada se conserva.
- Progreso: formulario de medidas recuperado; exportación local incluye el diario; borrar datos también elimina el diario.
- Pausar una sesión devuelve a HOY y recupera la navegación.
- PWA: recursos del avatar recuperados, caché de recursos versionados y paquete móvil completo.

`npm test` ejecuta las 32 suites. `npm run mobile:pack` genera los recursos para Capacitor; no compila ni firma un APK/IPA. El coach con IA es opcional: sin `OPENAI_API_KEY`, CORE sigue funcionando con su motor local (`api/COACH_IA.md`). Backend de cuentas, credenciales y publicación en tiendas requieren configuración y validación independientes.

Criterio para ciclo y entrenamiento: [consenso UEFA, 2025](https://bmjopensem.bmj.com/content/11/3/e002769). La evidencia no respalda prescribir automáticamente la intensidad según una fase estimada del calendario; se priorizan síntomas, autonomía y contexto individual.
