# BAYONA — Avatar-Centered Fitness Life RPG

> **CUIDAR A TU PERSONAJE ES CUIDARTE A TI.**
> **BAYONA vive alrededor del personaje.**

Videojuego fitness 3D donde tu avatar es el centro de la experiencia:
tú entrenas → él entrena, tú comes → él come, tú bebes → él bebe.
El avatar es un **gemelo de comportamiento**, no una mascota.
**Todo lo visible al usuario está en español (es-ES).**

## ✨ v2.0 · ATELIER (rediseño de lujo)

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
npm run mobile:pack  # → empaquetado web para Capacitor (ver docs/MOBILE_RELEASE.md)
```

| Dónde | Qué es |
|---|---|
| `index.html` + `css/` + `js/` + `media/` + `vendor/` | La app: mundo 3D + mundos + plan + armario |
| `js/ui/` | Módulos por mundo (shell, gimnasio, cocina, recuperación, mente, plan, armario, progreso, CORE, más) |
| `js/vision/` | **GEMELO-1**: cámara → contador de reps → biomecánica (procesado 100% local) |
| `js/coach/` · `js/health/` | CORE local (reglas + red flags) · **Mapa de Salud** (PAR-Q+/PHQ-2/GAD-2) |
| `js/state.js` · `js/rewards.js` · `js/engine.js` | Estado persistente (esquema v3 + migración) · economía (fuente única) · motor de rendimiento |
| `js/i18n.js` · `js/consents.js` · `js/phygital.js` | Catálogo/formato es-ES + `esc()` · consentimientos centralizados · códigos físico→digital |
| `js/data/offlineQueue.js` | Cola offline FIFO idempotente + zona de recuperación (nada se pierde en silencio) |
| `tests/` + `ml/evals/` | 11 suites ejecutables (visión, coach, salud, cola, economía, estado, phygital…) + golden set |
| `api/` | SQL Supabase (tablas + RLS) + contratos REST · **`api/supabase/SETUP.md`** = guía para crear la cuenta y desplegar · **`api/supabase/setup.sql`** = script único e idempotente para el SQL Editor |
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
| CORE local (español, sin inventar datos, adaptación "tengo X minutos" real, filtro de red flags) | ✅ | `tests/coach-eval.mjs` + E2E |
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
