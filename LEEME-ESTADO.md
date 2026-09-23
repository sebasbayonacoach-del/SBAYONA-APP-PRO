# BAYONA v2.0 · ESTADO, PLAN Y DÓNDE VAMOS

> Documento vivo. Última actualización: 2026-09-23 · Sprint 1 cerrado.

---

## 1. En qué punto estamos

### ✅ Hecho y verificado

| Área | Estado | Evidencia |
|---|---|---|
| **App completa** (mundo 3D, 8 lugares, entrenamiento, nutrición, mente, plan, armario, progreso, CORE) | ✅ | E2E navegador |
| **Rediseño LUJO v2.0 «ATELIER»** (7 auras, modo claro MARFIL, cristal, aurora, grano, letras metálicas) | ✅ | QA visual 8–9/10 |
| **Sistema de movimiento** (velo+destello de mundo, ripple, tilt 3D, contadores, chispas de XP, esqueletos) | ✅ | QA visual |
| **Personalización total** (panel APARIENCIA: 9 controles con vista previa en vivo) | ✅ | QA visual |
| **Barrido de color en módulos autocontenidos** (onboarding, diario, salud, cámara) | ✅ | 91 hex → tokens |
| **Esquema Supabase desplegado** | ✅ | 12 tablas confirmadas en tu proyecto |
| **RLS por usuario + consentimiento GDPR art. 9** | ✅ | `api/supabase/migrations/0001_core.sql` |
| **Cliente Supabase propio** (auth + REST, sin dependencias) | ✅ | `js/sync/` |
| **Panel CUENTA** (email+contraseña, magic link, sincronizar, copia, cerrar sesión) | ✅ | `js/sync/account.js` |
| **Sistema «HOY»** (plan del día con jerarquía, siguiente acción, check-in rápido de 15 s, misiones diarias con bono idempotente) | ✅ | `tests/hoy-eval.mjs` (32 aserciones) |
| **Modo sesión de entrenamiento** (foco total, botones 60 px, móvil/gimnasio) | ✅ | QA manual + `js/ui/training.js` |
| **Motor de contexto + TRABAJO** (foco 25/5, pausas, postura; tope sano) | ✅ | `tests/contexto-eval.mjs` (27 aserciones) |
| **COACH OS básico** (centro de mando, fichas vivas, alertas, CORE Coach, laboratorio) | ✅ | `tests/coachos-eval.mjs` (33 aserciones) |
| **Mediciones «ANTES→AHORA→HACIA DÓNDE»** (peso, perímetros, tendencia, proyección topeada) | ✅ | `tests/medidas-eval.mjs` (25) |
| **Loop Coach OS ⇄ cliente** (asignar → ejecutar → observar) | ✅ | `tests/asignaciones-eval.mjs` (17) |
| **Historia unificada + recetas/adherencia + plan escribible + espejo ampliado** | ✅ | `timeline/nutricion/plan/mirror-eval` (50) |
| **Batería de tests** | ✅ | 20 suites · 0 fallos |

### 🔶 En marcha / pendiente

| Qué | Estado | Qué falta |
|---|---|---|
| **Sincronización end-to-end con datos reales** | 🔶 | La `anon` key va en `js/sync/config.js` (un único hueco) |
| **Auth email + contraseña** | 🔶 | Marcar **Confirm email: OFF** en Supabase (o crear usuario desde la app ya lo hace) |
| **Cola offline → servidor** | 🔶 | Ya existe `js/data/offlineQueue.js`; falta conectarla a `syncNow()` |
| **Coach IA server-side** (CLINICAL_POLICY + RAG) | ⬜ | Edge Function |
| **Signed URLs de avatar 3D** | ⬜ | Storage + Edge Function |
| **Export GDPR PDF** | ⬜ | Edge Function |
| **App Android/iOS** | ⬜ | `npm run mobile:pack` + Capacitor build |

---

## 2. Lo único que te falta a ti (2 minutos)

La credencial **no puede pasar por mí**: mi entorno la detecta como secreto y la borra.
Y **no debe pasar**: la `anon` key está hecha para ir en el navegador del usuario.

1. Supabase → **Project Settings → API** → fila **`anon` `public`** → **Copy**
2. Abre `js/sync/config.js` y pega el valor en `anonKey`:

```js
const INLINE = {
  url: "https://bppjzewgqdrghexazgcj.supabase.co",
  anonKey: "PEGA_AQUI_TU_ANON_KEY",   // ← aquí
};
```

3. Supabase → **Authentication → Sign In / Providers → Email**
   - **Confirm email: OFF** *(para desarrollo; ON en producción)*
4. Listo. En la app: **MÁS → CUENTA → CREAR CUENTA** y ya se sincroniza.

> 🚫 La `service_role` key **nunca** en este fichero ni en el cliente.

---

## 3. Plan inmediato (siguientes sprints)

### Sprint 2 · Cuenta y nube (1–2 días)
1. Alta/login con contraseña → `auth.users` + fila `profiles`
2. Sincronización espejo: `profiles`, `consents`, `readiness_daily`, `workout_sessions`, `sets_log`
3. Cola offline con reenvío automático al recuperar red
4. Conflicto de dispositivos: "última escritura gana + aviso explícito" (nunca perder en silencio)

### Sprint 3 · Entrenamiento real conectado (2–3 días)
1. Series del GEMELO-1 → `sets_log` (solo resúmenes numéricos, cero vídeo)
2. Sesiones → `workout_sessions` con estado (pausada / completada / abandonada)
3. XP idempotente sobre `xp_ledger` (ledger inmutable, sin saldo mutable)
4. PRs y autoregulación con trazabilidad en servidor

### Sprint 4 · Salud con consentimiento (2–3 días)
1. `health_samples` con ingest idempotente (`idempotencyKey`)
2. `readiness_daily` con desglose de factores
3. Revocar consentimiento → corta la ingesta, conserva el acceso y la exportación (GDPR)

### Sprint 5 · Coach IA y producción (1 semana)
1. Edge Function `/coach/chat` con `CLINICAL_POLICY` → contexto → RAG (ACSM/NSCA/ISSN/OMS)
2. Screening determinista **antes** del modelo: si hay red flag → `referral`, sin chat
3. Export GDPR (JSON + PDF) y borrado total trazado con acuse
4. Storage + signed URLs de 5 min para avatares
5. Build Android/iOS con Capacitor

---

## 4. Decisiones de arquitectura ya tomadas

- **La verdad vive en el dispositivo**; la nube es un **espejo idempotente**
  (borrar-y-reinsertar por alcance: usuario completo o sesión concreta).
  Un reenvío o una red caída nunca duplican datos.
- **RLS manda**: cada fila es visible solo para su dueño (`auth.uid()`).
  La escritura de salud exige consentimiento activo y revocable.
- **Cero vídeo/frames por la API** (ADR-003): solo resúmenes numéricos de
  biomecánica. Las fotos de progreso y la voz se quedan en el dispositivo.
- **Cliente Supabase propio** (230 líneas) en vez de `supabase-js`: la app es
  vanilla JS con módulos ES y no necesita más.
- **Sin saldo mutable**: XP, créditos y puntos viven en `xp_ledger`
  (append-only). El saldo se calcula; no se guarda.

---

## 5. Cómo ejecutar todo

```bash
./run.sh                    # → http://localhost:8080
./run.sh & abrí index.html  # requiere servidor local por los módulos ES
npm test                    # batería completa (20 suites + golden set)
npm run mobile:pack         # empaquetado para Capacitor (Android/iOS)
```

Diagnóstico sin service worker: `index.html?nosw=1`
Enlaces directos: `index.html?go=account` · `?go=apariencia` · `#entrenamiento` …

---

## 6. Mapa del proyecto

```
BAYONA-v2.0-LUXE/
├── index.html                 shell (HUD + mundo 3D + cajón + modal)
├── css/style.css              Design System v3 base
├── css/aurum.css              ★ capa LUJO v2.0 (auras, cristal, metálico)
├── css/motion.css             ★ sistema de movimiento
├── js/ui/motion.js            ★ motor ripple/tilt/contadores/chispas
├── js/ui/appearance.js        ★ panel APARIENCIA (9 controles)
├── js/ui/hoy.js               ★ panel HOY (check-in + misiones del día)
├── js/hoy.js                  ★ planificador del día (dominio puro, testeado)
├── js/sync/config.js          ★ ÚNICO hueco de credencial
├── js/sync/supabase.js        ★ cliente Auth + REST (sin dependencias)
├── js/sync/account.js         ★ panel CUENTA + sincronización espejo
├── js/ui/…                    mundos (training, nutrition, mind, plan…)
├── js/vision/…                GEMELO-1 (cámara → reps → biomecánica)
├── js/health/…                Mapa de Salud (PAR-Q+/PHQ-2/GAD-2)
├── api/supabase/setup.sql     ★ script único para el SQL Editor
├── api/supabase/SETUP.md      ★ guía completa de despliegue
├── api/API_REST.md            contratos REST v1
├── docs-luxe/                 capturas QA del rediseño
└── tests/ + ml/evals/         20 suites + golden set biomecánica
```
