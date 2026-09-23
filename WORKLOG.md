# 🛠️ BAYONA — WORKLOG (trabajo autónomo 2 h · 2026-09-23 01:33 GMT+8)

> Modo: **2 horas sin parar**. Cada entrada = algo terminado y commiteado.
> Los timers (+30/+60/+90/+120 min) reanudan este tablero automáticamente.

## 🔥 OLA 1 (en curso)
- [x] Repo Git inicializado (commit 2aa195a)
- [x] PLAN_MAESTRO.md + PLAN_NIVEL_3_PRO.md
- [x] Vendor MediaPipe (tasks-vision 1.0.1 + pose_landmarker_lite.task) → `vendor/mediapipe/`
- [x] `js/vision/angles.js` — geometría + EMA
- [x] `js/vision/pose.js` — pose on-device (worker, 0 frames al servidor)
- [x] `js/vision/repCounter.js` — máquinas de estado squat/press/pullup
- [x] `js/vision/formScore.js` — score biomecánico + cues de voz
- [x] `js/vision/retarget.js` — landmarks → avatar (binding por nombres reales del rig: upArmL/thighL/shinL…)
- [x] `js/vision/boot.js` — UI cámara (overlay propio, consent GDPR, cola local de sets)
- [x] `tests/vision-eval.mjs` — **19/19 PASS** ✅
- [x] Integración index.html (1 script tag)
- [x] Subagente `bayona_infra`: CI + SQL (12 tablas + RLS) + 3 ADRs + PRIVACY_CENTER ✅

## 🌊 OLA 2 (timers la reanudan)
- [x] `js/coach/coachStub.js` CORE→IA: política clínica + red flags + tools + auto-regulación ✅ 21/21
- [x] `js/health/healthMap.js` (PAR-Q+ / PHQ-2 / GAD-2 / body-map / prioridades) ✅ 21/21
- [x] Health Map UI (cuestionario PAR-Q+ / PHQ-2 / GAD-2 / body-map + objetivos + veredicto con recursos de crisis) ✅ 35/35
- [x] Revisión de calidad del subagente + fixes ✅ sin fixes necesarios: SQL 12/12 tablas con RLS + policies, `restrictive` bien usado en consent-gate de health_samples, `revoked_at` existe, CI con batería tests/*.mjs + build-check de referencias de index.html, 3 ADRs y PRIVACY_CENTER coherentes con ADR-003
- [x] `ml/evals/biomech-golden.mjs` golden set: **100% conteo (12/12 casos, ruido ±2° robusto) + 6/6 bandas técnica** — fix: máquina de estados por umbrales+histéresis (la velocidad instantánea perdía reps con ruido)
- [x] api/API_REST.md (contratos §6: ~25 endpoints, scopes por consentimiento, modelo de errores, SSE coach)

## 🌊 OLA 3 (si queda tramo)
- [x] Diario de sesión cinematográfico: consume reps/score reales del GEMELO-1 ✅ 47/47 — escenas por serie (rep héroe / la que costó / arco de fatiga / consistencia), epílogo con MVP + veredicto S-A-B-C-D, overlay cine autoinyectado (`🎬 DIARIO`), historial persistido (30, storage inyectable)
- [ ] SIGUIENTE (timer +90): pulido de integración — botón `🎬 DIARIO` dentro del panel de cámara (js/vision/boot.js) al terminar serie + captura/E2E del overlay; si queda tiempo, `Supabase JS client` queda bloqueado por credenciales del usuario → no tocar
- [x] Cola offline + emisor API §6 (`js/data/offlineQueue.js`): idempotente, FIFO sin saltos, backoff 2s→60s, drop a los 6 intentos, auto-flush al volver la red, body solo-numérico ✅ 25/25
- [ ] Supabase JS client (pendiente de credenciales del usuario): sustituir `makeSender` por el SDK + auth
- [x] Documento API_REST.md con contratos del §6 firmados ✅ (commit e30a3e1; consumido por `makeSender`)

## Decisiones rápidas
- GEMELO-1 en **ES modules puros JS** (sin build step) = integrable hoy mismo.
- UI de cámara autoinyectada (un solo `<script>` en index.html) → acoplamiento mínimo.
- MediaPipe vendorizado localmente → la app sigue funcionando offline.
- Diario cinematográfico como **módulo puro + DOM fino** (patrón rewards/healthMap): `analyzeSet/narrateSet/buildDiary` deterministas y testeables en Node; la UI se autoinyecta con un botón flotante, cero acoplamiento con ui.js.

## 2026-09-23 · FASE DE CORRECCIÓN Y ESPAÑOL (continuación maestra)
- Auditoría real contra el informe de defectos: 20+ hallazgos confirmados y corregidos
  (doble XP en series y en cierre, dos onboarding en paralelo, claves de consentimiento
  rotas '***', fechas UTC, cola offline con firma errónea y descarte silencioso,
  literal `${w.exercises.length}`, innerHTML con texto de usuario, "DEMO EN VIVO" sobre
  vídeo pregrabado, demos reutilizadas, readiness con valores inventados, desbloqueos
  intermedios perdidos, `LEYENDAARY`, hint de rareza roto, proyección 1RM inventada,
  eventos que fabricaban pasos, grabaciones de voz que no se guardaban).
- Reestructuración UI en módulos por mundo (js/ui/*) con shell de mundo persistente.
- Fuente única de recompensas (js/rewards.js): previsto = recibido = guardado.
- Sesión de entrenamiento persistente (sobrevive recargas) con estados
  pendiente/en curso/pausada/completada/abandonada + corrección de serie (undo real).
- i18n es-ES (js/i18n.js) + esc() global; consentimientos centralizados (js/consents.js);
  dominio phygital con formato, dígito de control, uso único y auditoría (js/phygital.js).
- PWA: sw.js (network-first para código), manifest con iconos, offline probado.
- Dark premium (paleta negro/grafito/azul mediterráneo/dorado/naranja) siguiendo la
  referencia visual; misión al panel izquierdo en desktop (centro solo para el avatar).
- Responsive: rail de accesos en 2 filas (8/8 visibles a 390px), panel sin tapar
  navegación, formulario de serie arriba en la vista de sesión.
- Batería: 11 suites (tests/run.mjs multiplataforma) + golden set biomecánico.

---

## 2026-09-23 · v2.0 ATELIER — rediseño lujo + animaciones + personalización

**Objetivo:** dejar la app «mejor de lo que está»: más de lujo, más pro, mejores
animaciones y personalización real de todo.

| Área | Entregado |
|---|---|
| Identidad visual | 7 auras de color + firma `ONYX ORO`, modo claro `MARFIL`, tipografía `TITÁN`/`ATELIER`, letras metálicas, aurora de ambiente, grano fino |
| Superficies | Cristal (blur+sat), bisel de luz, filete fino, sombra multicapa, esquinas paramétricas |
| Animación | Velo+destello de mundo, revelado escalonado, ripple, prensa, brillo de botón, tilt 3D, contadores, chispas de XP, modal/toast elásticos, esqueletos |
| Personalización | Panel APARIENCIA con vista previa en vivo y 9 controles, persistidos aparte del estado del juego |
| Accesibilidad | `prefers-reduced-motion`, intensidad PLENO/SERENO/NINGUNO, foco visible, `aria-pressed` en opciones |
| UX | Rail y barra se recolocan al abrir el cajón (sin solapes), deep-links `?go=`/`#` |

**Verificación:** `npm test` → 11 suites · 0 fallos. QA visual con capturas en
escritorio (1440×900) y móvil (390×844) → `docs-luxe/`.
