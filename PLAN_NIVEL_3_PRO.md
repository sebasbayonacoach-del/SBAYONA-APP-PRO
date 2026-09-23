# 🎯 BAYONA — NIVEL 3 · PRO
## Blueprint Ejecutable: de la visión al código
### Comité de Expertos · WBS Nivel 3 (tareas · contratos · esquemas) · v1.0

> **Cómo se lee este documento:**
> Nivel 1 = fases (PLAN_MAESTRO.md) · Nivel 2 = entregables · **Nivel 3 = este doc:**
> tareas ejecutables, esquema de datos, contratos de API, algoritmos y Definition of Done.
> Filosofía del producto (README): *"Simple para vivirlo. Profundo para entenderlo.
> Profesional cuando quieras abrirlo."* → este documento es el nivel **PROFESIONAL**.

---

# 0. ESTRUCTURA DEL REPO (monorepo)

```
bayona/
├── app/                        # Cliente (hoy PWA, mañana Expo)
│   ├── index.html              # ← código actual (migración incremental)
│   ├── css/  js/  media/  vendor/  docs/
│   └── src/                    # NUEVO: TypeScript + R3F (migración)
│       ├── three/              # escena, mundos, rigs (desde js/world.js, avatar.js)
│       ├── features/           # training/ nutrition/ recovery/ mind/ armory/ coach/
│       ├── vision/             # GEMELO-1: pose, rep-counter, form-score, retarget
│       │   ├── pose.worker.ts  # MediaPipe on-device (worker aislado)
│       │   ├── repCounter.ts   # máquinas de estado por ejercicio
│       │   ├── formScore.ts    # biomecánica → 0-100 + cues
│       │   └── retarget.ts     # landmarks → huesos del avatar
│       └── avatar-providers/   # ← abstracción clave (ver §2)
├── api/
│   ├── supabase/migrations/    # SQL versionado (ver §3)
│   └── services/               # core-api/ health-ingest/ ai-coach/ media-svc/
├── ml/
│   ├── datasets/  models/  evals/   # modelos de técnica, comida, pose
│   └── notebooks/
├── docs/                       # PLAN_MAESTRO.md · PLAN_NIVEL_3_PRO.md · ADRs
├── .github/workflows/          # ci.yml · eas.yml · deploy.yml
└── turbo.json / pnpm-workspace.yaml
```

**Regla del comité 🏗️:** migración *incremental*. El juego funciona SIEMPRE (no rewrite big-bang).
JS actual sigue corriendo mientras `src/` crece módulo a módulo.

---

# 1. SPRINTS NIVEL 3 — tareas concretas con DoD

## 🏗️ SPRINT 0 — Cimientos (Semana 1) · 40 h
| # | Tarea | Owner | h | Definition of Done |
|---|-------|-------|---|--------------------|
| 0.1 | `git init` + monorepo + trunk-based + conventional commits | Fullstack | 2 | `main` verde, PR template, CODEOWNERS |
| 0.2 | CI: lint (ESLint+Prettier), typecheck (tsc strict), unit (Vitest), build | Fullstack | 4 | todo PR bloquea si falla |
| 0.3 | Supabase: proyecto + Auth (email magic + Apple/Google) | Fullstack | 4 | login/logout persiste en 2 dispositivos |
| 0.4 | Migración SQL `0001_core.sql` (ver §3) + **RLS por usuario** | Fullstack | 8 | test: usuario A no lee datos de B (pgTAP) |
| 0.5 | Progress Vault: bucket privado + signed URLs 5 min + cifrado por usuario | Fullstack | 6 | sube/borra su escaneo; nadie más lo lista |
| 0.6 | Feature flags (Flagsmith self-host o tabla `flags`) | Fullstack | 2 | GEMELO-1 detrás de flag `vision.rep_counter` |
| 0.7 | Telemetría: PostHog (producto) + Sentry (errores) + OTel (trazas) | Fullstack | 4 | evento `workout_completed` visible en dashboard |
| 0.8 | Privacy Center: consentimiento granular por dominio (GDPR art. 9) | DPO+Front | 6 | revocar "visión" apaga cámara al instante |
| 0.9 | ADR-001..003 (stack, avatar-provider, datos de salud) | Comité | 4 | docs/adr/ publicados |

## 🧍 SPRINT 1–2 — GEMELO-1: Rep Counter + Mocap (Semanas 2–3) · 60 h
| # | Tarea | Owner | h | DoD |
|---|-------|-------|---|-----|
| 1.1 | Pipeline cámara: getUserMedia 720p30 + permisos + fallback sin-cámara | Mobile | 6 | arranca/para en <1 s; sin fugas de frames |
| 1.2 | `pose.worker.ts`: MediaPipe BlazePose WASM en Web Worker (hilo aparte) | CV | 10 | 30 fps estables en gama media; UI a 60 |
| 1.3 | Suavizado EMA + gating por `visibility` (>0.6) + reconexión de pose | CV | 6 | sin conteos fantasma con persona fuera de cuadro |
| 1.4 | `repCounter.ts`: máquina de estados squat/press/pullup (ver §4) | CV | 12 | ≥98% exactitud en 50 vídeos de test |
| 1.5 | `formScore.ts`: ángulos → score 0-100 + cues de voz (ver §4.3) | S&C+CV | 10 | ≥90% acuerdo con evaluador humano |
| 1.6 | `retarget.ts`: landmarks → 15 huesos del avatar (ver §4.4) | 3D | 10 | avatar replica al usuario con latencia <250 ms |
| 1.7 | HUD de sesión: reps en vivo, RIR estimado, fatiga (velocity loss) | Front | 4 | overlay no tapa al personaje (regla de diseño #1) |
| 1.8 | Guardado: `sets_log` con reps, score, landmarks resumidos (**0 frames**) | Fullstack | 2 | verificado por DPO: nada de vídeo sale del dispositivo |
| 1.9 | Test set: 50 clips (squat/press/pullup × bueno/regular/malo) + eval CI | CV | 10 | regresión de precisión bloquea el merge |

## 🧍 SPRINT 3–4 — AVATAR REAL "BAYONA Scan" (Semanas 4–6) · 60 h
| # | Tarea | Owner | h | DoD |
|---|-------|-------|---|-----|
| 2.1 | Spike proveedor: in3D vs Avaturn vs RPM con 3 selfies reales (scorecard §2.3) | 3D+Comité | 12 | decisión con datos + ADR-004 |
| 2.2 | `avatar-providers/` interfaz + adapter del ganador | 3D | 8 | swap de proveedor = 1 config, 0 rewrites |
| 2.3 | Onboarding Scan UI: guía 360° + 5 fotos rostro + medidas | Front | 10 | scan completo <60 s con guía de voz |
| 2.4 | Integración `avatar.glb` en escena: LOD, luces, sombras, ropa del rig | 3D | 12 | avatar real viste el equipamiento de la Armory |
| 2.5 | Animaciones base (idle/walk/14 actuales) retargeteadas al nuevo rig | 3D | 12 | sin regressions visuales en los 7 mundos |
| 2.6 | Privacidad del escaneo: cifrado por usuario + borrado total + exp. portabilidad | DPO | 6 | auditoría interna OK |

## 🧠 SPRINT 5–6 — HEALTH MAP + COACH IA (Semanas 7–10) · 80 h
| # | Tarea | Owner | h | DoD |
|---|-------|-------|---|-----|
| 3.1 | Health Map: cuestionario clínico PAR-Q+ + PHQ-2/GAD-2 + body-map dolor | Médico+Front | 12 | scoring con red flags automáticos |
| 3.2 | Screening por cámara: FMS-lite (sentadilla, alcance, rotaciones) | CV+S&C | 14 | informe de desequilibrios + prioridades |
| 3.3 | `ai-coach-service`: orquestador LLM + RAG (ACSM/NSCA/ISSN/OMS) + tools (§5) | ML | 20 | streaming SSE, memoria de contexto, coste <0.05 $/sesión |
| 3.4 | Auto-regulación: plan diario = f(readiness, HRV, sueño, dolor) | S&C+ML | 12 | ajustes explicados ("hoy bajas carga porque HRV -18%") |
| 3.5 | Nutrición por foto → macros (modelo ligero) + plan semanal + lista compra | ML+Nutri | 12 | error macro <15% en dataset de 500 platos |
| 3.6 | Protocolo red flags: detener sesión + aviso clínico + derivación trazada | Médico | 10 | 100% de casos de test derivados con registro |
| 3.7 | HealthKit / Health Connect: pasos, sueño, HRV (consentimiento granular) | Mobile | 8 | sync idempotente, rellena `health_samples` |

## ⌚ SPRINT 7–8 — HARDWARE ECOSYSTEM (Semanas 11–14)
| # | Tarea | h | DoD |
|---|-------|---|-----|
| 4.1 | `health-ingest`: webhooks Garmin/Whoop/Oura/Withings → `health_samples` | 16 | reintentos + idempotencia + backfill histórico 90 días |
| 4.2 | Polar H10 por BLE (Web Bluetooth / nativo) → test de Cooper guiado | 12 | VO₂máx estimado ±5% vs. laboratorio (n=10) |
| 4.3 | Escaneo de progreso: perímetros por LiDAR/visión → Progress Vault 3D | 16 | delta visual del gemelo correlaciona con perímetros reales |
| 4.4 | Coach por voz en entrenamiento (TTS + comandos) | 12 | manos libres: "BAYONA, rep 4, me duele hombro" → ajusta plan |
| 4.5 | CGM opcional (educativo, con nutricionista partner) | 12 | curvas + educación, sin recomendaciones clínicas |

---

# 2. AVATAR REAL — CONTRATOS DE CÓDIGO 🧊

## 2.1 Abstracción de proveedor (TypeScript)
```ts
// app/src/avatar-providers/types.ts
export interface AvatarProvider {
  readonly id: 'in3d' | 'avaturn' | 'rpm' | 'bayona-scan';
  /** Escaneo de onboarding → avatar riggeado */
  createFromScan(input: ScanInput, opts: { signal: AbortSignal }): Promise<AvatarHandle>;
  /** Versión ya creada del usuario (cache en Vault) */
  fetchMine(): Promise<AvatarHandle | null>;
  /** Lista de animaciones que sabe conducir este avatar */
  supportedClips(): MotionClip[];
  /** Conduce el avatar con landmarks del usuario (GEMELO-1) */
  retargetFromLandmarks(landmarks: Pose33): RetargetPose;
}

export interface ScanInput {
  turnVideo: Blob;          // vuelta 360° (≤30 s)
  faceShots: Blob[];        // 5 fotos: neutra/sonrisa/ceño/izq/der
  measurements?: { heightCm: number; weightKg: number; circumferences?: Record<string, number> };
  consentToken: string;     // consentimiento granular (obligatorio)
}

export interface AvatarHandle {
  providerId: string;
  glbUrl: string;           // signed URL 5 min (Vault cifrado)
  rigProfile: 'humanoid-v1' | 'humanoid-v2';
  morphTargets: string[];   // ARKit-52 + body morphs
  fidelityScore: number;    // 0-1 (evaluación de parecido)
}
```

## 2.2 Pipeline BAYONA SCAN (capa propia, fase objetivo)
```
móvil (360° + rostro) → fotogrametría/LiDAR → nube limpia → mesh (wrap CC4)
→ AccuRIG auto-rig → morphs (ARKit-52) → bake texturas 2K/4K → export GLB (Draco+KTX2)
→ validación automática (watertight, peso polígonos ≤80k, LOD x3) → Vault cifrado
```

## 2.3 Scorecard de proveedor (Sprint 3 — decisión con datos)
| Criterio | Peso | in3D | Avaturn | RPM-Hyper |
|---|---|---|---|---|
| Parecido real (eval. ciega 1-10) | 25% | | | |
| Calidad de rig + blendshapes | 20% | | | |
| Peso GLB / rendimiento móvil | 15% | | | |
| Retarget de nuestro mocap | 15% | | | |
| Licencia + privacidad del scan | 15% | | | |
| Precio y riesgo de proveedor | 10% | | | |

---

# 3. ESQUEMA DE DATOS — `0001_core.sql` (Supabase/Postgres) 🗄️

```sql
-- Dominio identidad
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text, birth date, sex text check (sex in ('F','M','X')),
  height_cm numeric(5,1), goals jsonb default '[]',
  created_at timestamptz default now()
);
create table consents (               -- GDPR art.9: un consentimiento por dominio
  user_id uuid references profiles(id) on delete cascade,
  domain text check (domain in ('vision','body_scan','health_wearables',
                                'health_clinical','nutrition_photo','voice')),
  granted bool not null, granted_at timestamptz default now(),
  revoked_at timestamptz, primary key (user_id, domain)
);
create table avatars (
  user_id uuid references profiles(id) on delete cascade,
  provider text not null, glb_path text, rig_profile text,
  morphs jsonb, fidelity_score numeric(3,2), created_at timestamptz default now(),
  primary key (user_id, provider)
);

-- Dominio entrenamiento
create table exercises (
  id text primary key, name text, pattern text,  -- squat/hinge/push/pull...
  cues jsonb, rom_targets jsonb, contraindications text[]
);
create table plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  macrocycle jsonb not null,        -- 24 semanas (ya existe en la app)
  version int default 1, created_at timestamptz default now()
);
create table workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  plan_day_id text, started_at timestamptz, ended_at timestamptz,
  readiness_in numeric(4,1), rpe_out numeric(3,1), status text
);
create table sets_log (
  id bigserial primary key,
  session_id uuid references workout_sessions(id) on delete cascade,
  exercise_id text references exercises(id),
  set_no int, reps int, load_kg numeric(5,2), rir numeric(3,1),
  form_score numeric(4,1), rep_vel_loss numeric(4,3),
  landmarks_summary jsonb,          -- resumen biomecánico. NUNCA vídeo/frames
  created_at timestamptz default now()
);

-- Dominio salud (serie temporal → TimescaleDB en fase 2)
create table health_samples (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete cascade,
  source text not null,             -- 'apple_watch','garmin','withings','manual','camera'
  kind text not null,               -- 'hr','hrv','sleep_min','steps','weight_kg','glucose'...
  ts timestamptz not null, value numeric, unit text, meta jsonb
);
create table readiness_daily (
  user_id uuid references profiles(id) on delete cascade,
  day date not null, score numeric(4,1), factors jsonb,
  primary key (user_id, day)
);
create table scans (                  -- Progress Vault (cifrado por usuario)
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  kind text check (kind in ('body_3d','posture','face')),
  enc_path text not null, meta jsonb, created_at timestamptz default now()
);

-- Dominio salud-mental / seguridad
create table red_flags (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete cascade,
  domain text, severity text check (severity in ('amber','red')),
  action_taken text, referral_url text, resolved_at timestamptz,
  created_at timestamptz default now()   -- trazabilidad 100% (KPI del comité)
);

-- Gamificación (ledger, no saldo mutable)
create table xp_ledger (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete cascade,
  kind text check (kind in ('xp','skill_xp','credits','points')),
  amount int not null, reason text, created_at timestamptz default now()
);

-- RLS: cada usuario es dueño de lo suyo (patrón para todas)
alter table profiles enable row level security;
create policy "own rows" on profiles for all
  using (auth.uid() = id) with check (auth.uid() = id);
-- …repetir patrón por tabla; health_samples exige además consentimiento activo
```

---

# 4. GEMELO-1 — ALGORITMOS DE VISIÓN 👁️

## 4.1 Pipeline
```
getUserMedia 720p30 → pose.worker (MediaPipe BlazePose, WASM) → Pose33 landmarks
→ EMA α=0.4 (suavizado) + gating visibility>0.6 → ángulos articulares (3D si hay
profundidad, 2D+heurística si no) → máquina de estados del ejercicio → reps + score
→ retarget al avatar → HUD. PRIVACIDAD: 0 píxeles salen del dispositivo.
```

## 4.2 Máquinas de estado (conteo)
| Ejercicio | Estado TOP | Estado BOTTOM | Validación |
|---|---|---|---|
| **Squat** | rodilla >160° y cadera >160° | rodilla <100° (fémur ~paralelo) | tobillo visible, cadera descendiendo >0.2×altura |
| **Overhead press** | codo >165° | codo <70° | muñeca sobre codo en TOP |
| **Pull-up** | codo >165° | codo <60° + nariz ≥ muñeca-alto | hombros sobre muñecas al inicio |
| (extensible) | deadlift: cadera 170/70 · lunge: rodilla 170/90 · plank: alineación>85% | | |

Regla: **solo cuenta el ciclo completo** TOP→BOTTOM→TOP con velocidad de fase ≥0.15 rad/s
(evita micro-reps y movimientos fantasma).

## 4.3 Form score (0-100) — ejemplo Squat
```
base 100
− (35) profundidad insuficiente: knee_min > 100° → −15 · >120° → −35
− (25) valgo de rodilla: desplazamiento frontal > 0.12×altura cadera → −25
− (20) inclinación lumbar excesiva: tronco>50° en BOTTOM → −20
− (10) talones despegados / inestabilidad tobillo → −10
− (10) tempo: caída >3 s (sin control) o rebote balístico → −10
```
Cada deducción genera un **cue de voz priorizado** ("rodillas afuera", "baja más lento").
Validación: ≥90% de acuerdo (κ de Cohen) con 2 entrenadores sobre 200 reps etiquetadas.

## 4.4 Retarget landmarks → avatar (latencia <250 ms)
```ts
// Mapeo canónico (humanoid-v1): Pose33 → 15 huesos
const MAP: Record<BoneName, [Lm, Lm, Lm]> = {  // 3 puntos = plano para orientación
  hips:      ['L_HIP','R_HIP','NOSE'],
  spine:     ['L_SHOULDER','R_SHOULDER','L_HIP'],
  upperArmL: ['L_ELBOW','L_SHOULDER','R_SHOULDER'],
  lowerArmL: ['L_WRIST','L_ELBOW','L_SHOULDER'],
  upperLegL: ['L_KNEE','L_HIP','R_HIP'],
  lowerLegL: ['L_ANKLE','L_KNEE','L_HIP'],
  // …simétrico derecho + neck/head
};
// Quaternion del hueso = rotación relativa al bind pose; IK de CCD (2 pasos)
// para plantar pies (evita deslizamiento) + look-at de cabeza al objetivo.
```

---

# 5. COACH IA — CONTRATOS 🧠

## 5.1 Tools del LLM (function calling)
```ts
type CoachTool =
  | { name: 'get_plan_day';        args: { date: string } }
  | { name: 'adjust_session';      args: { sessionId: string; reason: string;
                                    change: 'deload'|'swap'|'skip'|'add'|'extend' } }
  | { name: 'log_symptom';         args: { bodyMap: string; severity: 0|1|2|3;
                                    note: string } }          // severity 3 → red_flag
  | { name: 'escalate_referral';   args: { domain: string; urgency: 'amber'|'red' } }
  | { name: 'explain_evidence';    args: { topic: string } }  // cita RAG (ACSM/NSCA/OMS)
  | { name: 'nutrition_suggest';   args: { kcalTarget?: boolean; prefs: string[] } };
```

## 5.2 Arquitectura de seguridad del prompt (en orden, inamovible)
```
1. POLÍTICA CLÍNICA (system): "no diagnostiques ni trates; screening + derivación"
2. CONTEXTO DEL USUARIO: Health Map + plan + readiness de hoy + dolor activo + meds
3. MEMORIA: últimos acuerdos y estilo de comunicación del usuario
4. RAG: fragmentos citados de ACSM/NSCA/ISSN/OMS
5. SALIDA: respuesta + tool_calls · SIEMPRE con "por qué" y fuente
Red line: si detecta red flag → escalate_referral ANTES que responder.
```

## 5.3 Evaluación continua (ML/evals/)
- 200 casos clínicos golden (médico del deporte etiqueta) → precisión de derivación = 100%
- Calidad de ajuste de plan vs. planificador humano → ≥85% aceptación
- Coste y latencia por sesión (<0.05 $, <2 s a primer token)

---

# 6. API — CONTRATOS PRINCIPALES 🌐

```
POST /onboarding/scan            → { scanId } (multipart cifrado)        [consent: body_scan]
GET  /avatars/me                 → AvatarHandle
POST /vision/session/start       → { sessionId, iceServers }
POST /sessions/:id/sets          → sets_log[]   (landmarks_summary)
GET  /plan/day?date=             → PlanDay + rationale                  [auto-regulación]
POST /health/samples/batch       → ingest idempotente (o webhook proveedor)
GET  /readiness/today            → readiness_daily + factores
POST /coach/chat  (SSE stream)   → tokens + tool_calls                  [consent: health_clinical]
POST /symptoms                   → log_symptom → posible red_flag
POST /scans/progress             → Progress Vault (fotos volumétricas)  [consent: body_scan]
DELETE /me/data?domain=          → borrado total trazado (GDPR)
```
Todos: JWT + scope por consentimiento. 403 si el dominio está revocado. ✅

---

# 7. QA · RENDIMIENTO · SEGURIDAD (DoD global)

| Área | Regla |
|---|---|
| FPS | 60 UI / 30 pose en gama media (Pixel 6a / iPhone 12) |
| Privacidad | 0 frames de vídeo fuera del dispositivo · Landmarks solo resumen · Vault cifrado por usuario |
| Accesibilidad | reduced-motion, contraste AA, subtítulos de cues, sin audio obligatorio |
| Tests | unit ≥80% en `vision/` · E2E flujo de sesión · eval de modelos en CI |
| Fiabilidad | p95 API <300 ms · offline-first (cola de sync) · error budget 0.1% |
| Seguridad | pentest antes de Fase 2 · dependabot · SBOM · secret scan |

---

# 8. LO QUE NO SE TOCA (reglas del README = constitución)

1. El personaje siempre protagonista.
2. Simple para vivirlo · Profundo para entenderlo · **Profesional cuando quieras abrirlo** ← este doc.
3. Fallar no destruye al personaje.
4. Si mejora al avatar pero no a la persona, fuera.
5. Nunca hay que comprar para progresar.

---
*Comité: dictamen ejecutable emitido. Listos para tallar cada sprint.*
*Próximo comando sugerido: "ejecuta Sprint 0" (repo + CI + Supabase) y luego "GEMELO-1".*
