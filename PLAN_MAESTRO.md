# 🏛️ BAYONA — PLAN MAESTRO
## Del Fitness RPG al **Gemelo Humano de Salud Integral**
### Dictamen del Comité de Expertos · v1.0 · 2026-09-23

> **MISIÓN ACTUALIZADA:** Tu personaje ya no es un avatar procedural.
> **Tu personaje eres TÚ — una persona real — y BAYONA es el sistema operativo
> de tu salud: entrena, come, duerme, se recupera y se hace cargo de tus
> problemas de salud, contigo y con datos reales.**
> *"Cuidar a tu personaje es cuidarte a ti"* → ahora literal.

---

## 1. EL COMITÉ

| # | Experto | Responsabilidad |
|---|---------|-----------------|
| 🩺 | **Dra. Salud Integral** (Medicina del Deporte) | Screening de salud, red flags, derivación clínica, límites éticos |
| 🏋️ | **Coach de Alto Rendimiento** (S&C / periodización) | Programación, autoregulación, tests, transferencia real↔avatar |
| 🍎 | **Nutricionista Deportiva** | Planes alimentarios, composición corporal, CGM educativo |
| 🧠 | **Psicólogo del Deporte** | Conducta, adherencia, salud mental, gamificación sin obsesión |
| 👁️ | **Ingeniero de Visión & Motion Capture** | Pose estimation, biomecánica, rep counting, scoring de técnica |
| 🧊 | **Technical Artist 3D** | Avatar fotorrealista humano, rigs, blendshapes, render |
| 🏗️ | **Arquitecta de Software Cloud** | Backend, datos, ML ops, escalado, resiliencia |
| 📱 | **Ingeniera Frontend/Móvil** | PWA, React Native, WebGL/WebGPU, UX de 60 fps |
| ⌚ | **Ingeniera de Hardware & Wearables** | Relojes, básculas, sensores, captura corporal, phygital |
| 🔒 | **DPO / Seguridad de Datos** | Cifrado, consentimiento granular, GDPR/HIPAA |
| ⚖️ | **Compliance Regulatorio Salud Digital** | MDR/FDA, SaMD, deslindes, certificaciones |
| 📊 | **Productor Ejecutivo** | Roadmap, equipo, KPIs, negocio, riesgos |

---

## 2. DIAGNÓSTICO DEL ESTADO ACTUAL

### ✅ Lo que ya tenemos (slice 1 — muy sólido)
- Motor 3D (Three.js) con **avatar procedural riggeado + 14 animaciones**
- 7 mundos (HOME/GYM/KITCHEN/RECOVERY/MIND/PERFORMANCE/LOCKER) con transiciones
- Motor de entrenamiento (sets/reps/RIR, PRs, XP, misiones, loot ético)
- Nutrición (macros + hidratación), Recovery (readiness), Mente (respiración, voz real)
- Plan: macrociclo 24 semanas, vista SIMPLE/PROFESIONAL
- Armory con items DIGITAL/PHYSICAL, economía anti-pay-to-win
- PWA offline (localStorage), media real por ejercicio (12 demos), editorial v2

### ❌ Los 4 huecos que este plan cierra
1. **El avatar no es una persona real** → pipeline de gemelo humano fotorreal
2. **No hay percepción del usuario real** (cámara, wearables) → el gemelo vive de datos falsos
3. **No hay backend** → todo muere en localStorage; imposible salud multi-dispositivo
4. **No hay IA clínica/deportiva real** → coach por reglas; falta diagnóstico y personalización

---

## 3. DECISIÓN #1 — EL PERSONAJE ES UNA PERSONA REAL 👤

**Dictamen del Technical Artist + Visión (unánime):**

| Opción | Realismo | Animable en web | Coste | Time-to-ship | Veredicto |
|---|---|---|---|---|---|
| **A. SDK de avatar por selfie** (in3D, Avaturn, Ready Player Me Hyper) | 7/10 | ✅ GLB + blendshapes | 💰 bajo | 2–4 semanas | ✅ **MVP** |
| **B. Pipeline propio "BAYONA SCAN"**: escaneo móvil (LiDAR/fotogrametría) → Character Creator 4 + AccuRIG → GLB/USD | 9/10 | ✅ full rig + morphs | 💰💰 medio | 2–3 meses | 🎯 **Objetivo** |
| **C. Gaussian Splatting animable** (FlashAvatar/GaussianAvatar) | 10/10 | ⚠️ research | 💰💰💰 | I+D 6–12 m | 🔬 **I+D** |
| **D. MetaHuman (Unreal)** | 10/10 | ❌ pesado para web | 💰💰💰 | 4–6 meses | ❌ descartado |

### PLAN DE AVATAR (3 capas)
1. **CAPA A — Escaneo de onboarding ("BAYONA Scan", 60 s):**
   - 1 vuelta de 360° con el móvil (LiDAR en iPhone Pro / fotogrametría ML en Android)
   - + 5 fotos de rostro (expresiones neutra, sonrisa, ceño) para blendshapes (ARKit-52)
   - + 3 medidas manuales o estimadas por visión (altura, peso, perímetros) → **cuerpo real, no idealizado**
   - Salida: `avatar.glb` (rig humanoide estándar + morph targets) firme y privado (cifrado, solo tuyo)
2. **CAPA B — Gemelo de comportamiento (ya existe la idea, ahora con datos reales):**
   - El rig real se **conduce con tu cuerpo**: MediaPipe/BlazePose (on-device) → retargeting a tu avatar
   - Tu avatar ejecuta TUS repeticiones con TU técnica — lo que ya planeaba `NEXT_STEPS.md` (Camera Rep Counter) se eleva a **mocap en vivo**
3. **CAPA C — El cuerpo evoluciona de verdad:**
   - El mesh responde a composición corporal real (báscula inteligente + perímetros por visión): progresión visual honesta, no cosmética
   - `Progress Vault` guarda escaneos 3D del físico real → "fotos" volumétricas de tu progreso

**Regla del comité 🧠 (Psicología):** el avatar refleja al usuario **tal como es** con dignidad.
Nunca se "adelgaza por estética", nunca se muscula por apariencia: los cambios del gemelo
son **espejo de salud**, y se comunican como logros funcionales (fuerza, movilidad, energía).

---

## 4. DECISIÓN #2 — APP QUE RESUELVE LA SALUD (INTEGRAL, NO SOLO GIMNASIO) 🩺

**Dictamen de la Dra. Salud Integral (obligatorio leer):**
> "Ninguna app *soluciona todos los problemas de salud*. La que lo afirma es peligrosa e ilegal.
> BAYONA sí puede hacer algo superior: **detectar, priorizar, programar y acompañar** —
> y derivar al médico cuando toca. Eso es lo que salva vidas."

### EL "HEALTH MAP" — evaluación integral de entrada (y trimestral)
| Dominio | Cómo se mide | Qué hace BAYONA |
|---|---|---|
| 🫀 Cardio-metabólico | Wearable (HRV, FC reposo, sueño) + test de Cooper camara + báscula | Estima VO₂máx, tendencia, plan cardio progresivo |
| 🦴 Músculo-esquelético | **Screening postural y movilidad por cámara** (FMS-lite: sentadilla, alcance, rotaciones) | Corrige desequilibrios, previene lesión, prioriza ejercicios |
| 🍽️ Nutrición | Foto de plato (visión) + recordatorio + CGM opcional | Plan semanal, lista de compra, educación glucémica |
| 😴 Sueño & Estrés | Wearable + diario + HRV | Protocolo de higiene, respiración, carga de entrenamiento según readiness |
| 🧠 Mente | Cuestionarios validados (estrés/animo, PHQ-2/GAD-2 como screening) | Rutinas de mindfulness, self-talk guiado, **derivación si hay red flag** |
| 💊 Dolor / Lesión | Body-map (dónde duele) + tests guiados por cámara | Modifica el plan ("entrena alrededor del dolor"), protocolo de derivación |
| 🧬 Hábitos | Racha, adherencia, contexto | Micro-hábitos, quita fricción, celebra consistencia |

**Protocolo de red flags 🚨 (no negociable):** dolor torácico, disnea anormal, síncope,
signos de TCA, ánimo bajo persistente, dolor articular agudo con bloqueo →
**la app detiene el entrenamiento, muestra aviso clínico y ofrece derivación humana** (telémedicina partner / urgencias).

### EL COACH IA (CORE evolucionado — de reglas a copiloto)
- **Motor de periodización**: plan adaptativo diario (carga según readiness/HRV/sueño/dolor reportado)
- **LLM Coach con RAG clínico-deportivo** (ACSM, NSCA, ISSN, OMS) + tools: ajustar plan, explicar
  el *porqué*, responder con lenguaje del usuario. **Nunca diagnostica; siempre explica y deriva.**
- **Visión**: contador de repeticiones + **scoring de técnica en tiempo real**
  (profundidad de sentadilla, valgo de rodilla, ángulo lumbar, ROM hombro) con audio cues
- **Nutrición por foto** de plato → macros estimados + ajuste semanal
- **Motor de adherencia** (Psicología): detecta patrones de abandono → interviene antes

---

## 5. ARQUITECTURA OBJETIVO — NIVEL PRO 🏗️

### Frontend
```
Fase 1  PWA actual → Vite + TypeScript + React Three Fiber (mismo código 3D, sin rewrite de lógica)
Fase 2  Expo / React Native (iOS + Android) — app nativa con el core 3D compartido (R3F corre en RN)
Render  WebGL2 hoy → WebGPU mañana; WASM (Rapier) para física; workers para pose on-device
Calidad  60 fps obligatorios en gama media; avatar LOD; streaming de texturas KTX2/Basis
```

### Backend (de localStorage a plataforma de salud)
```
        ┌─ PWA / iOS / Android ──────────────────────────────┐
        │  pose-on-device (TFLite/CoreML) · LLM streaming UI │
        └──────────────┬──────────────────────────────────────┘
   API Gateway (auth JWT + consent scopes por dominio de salud)
        │
   ┌────┴─────────┬───────────────┬─────────────────┬─────────────┐
   │ core-api     │ health-ingest │ ai-coach        │ media-svc   │
   │ perfiles     │ webhooks      │ orquesta LLM    │ renders del │
   │ planes,ses.  │ Apple/Garmin/ │ RAG + tools +   │ avatar (demos│
   │ economía,XP  │ Withings/Oura │ memoria larga   │ y escaneos) │
   │ Supabase+RLS │ → TimescaleDB │ (GPU, cache)    │ headless 3D │
   └────┬─────────┴───────┬───────┴────────┬────────┴──────┬──────┘
        │                 │                │               │
   Postgres + Timescale   Object Storage (S3/R2: escaneos cifrados)
   Event Bus (Redpanda)   Warehouse (analítica de cohortes) · Feature Store
```
- **Fase 1 backend:** Supabase (Postgres + RLS + Auth + Realtime + signed URLs) — exactamente lo
  que dice `NEXT_STEPS.md`, con el dominio completo: `profiles, avatars, items, workouts, plans,
  sessions, nutrition, health_samples, readiness, scans, consents, xp_ledger`.
- **Fase 2–3:** desacoplar servicios (Go/Node) cuando el ingest de wearables y el coach IA lo pidan.
- **ML Ops:** datasets versionados, evaluación offline de modelos (técnica, comida, plan), A/B.
- **Calidad:** GitHub Actions + EAS (builds), feature flags, Sentry + OpenTelemetry + PostHog,
  tests: unit (Vitest), E2E (Playwright), carga (k6) en el ingest.

### Datos de salud (el petróleo, con candado 🔒)
- Serie temporal `health_samples` (HR, HRV, sueño, pasos, peso, glucosa opcional) → TimescaleDB
- **Cada dominio de salud tiene su propio consentimiento granular y revocable** (GDPR art. 9)
- Cifrado en reposo AES-256 + en tránsito TLS1.3; **escaneos corporales cifrados por usuario**
  (claves del usuario, signed URLs de 5 min); export/borrado total en 1 clic (GDPR/CCPA)
- Retención mínima necesaria; anonimizado para analítica de cohortes

---

## 6. HARDWARE & WEARABLES ⌚

| Nivel | Dispositivo | Dato que aporta | Integración |
|---|---|---|---|
| 🥇 | Apple Watch / Wear OS | FC, HRV, sueño, pasos, ECG, VO₂máx estimado | HealthKit / Health Connect |
| 🥇 | Báscula inteligente (Withings, Xiaomi) | Peso, %grasa, músculo, agua | Withings API / Health Connect |
| 🥇 | Cámara del móvil (RGB) | Rep counting, técnica, postura, escaneo 3D | on-device ML |
| 🥈 | Garmin / Whoop / Oura | Carga, recovery, sueño detallado | APIs oficiales |
| 🥈 | Polar H10 (cinta pecho) | FC precisa → tests de Cooper/lactato caseros | BLE / export |
| 🥈 | Tensiómetro conectado | Tensión arterial → seguimiento (derivación médica) | Withings API |
| 🥉 | **CGM (Dexcom/Libre)** — opcional, educativo | Curva glucémica personal | API/Tidepool · **con supervisión profesional** |
| 🥉 | Auriculares + mic | Coach por voz (TTS), self-talk guiado | Web Audio / nativo |
| 🥉 | **Tags NFC/QR phygital** (ropa BAYONA) | Item físico verificado → gemelo digital | NFC (ya en roadmap) |
| 🔬 | iPhone LiDAR / profundidad | Perímetros corporales → composición | ARKit |

---

## 7. SEGURIDAD, ÉTICA Y REGULACIÓN ⚖️

1. **Clasificación:** BAYONA es *wellness & fitness* (no dispositivo médico) siempre que:
   no diagnostique, no trate y **derive** ante red flags. Si algún módulo empieza a detectar
   condiciones (p. ej. screening de EPOC por cámara), se evalúa como **SaMD** (MDR UE / FDA).
2. **Deslinde clínico visible** + colaboración con **comité médico asesor real** (2 médicos del
   deporte + 1 fisio) antes del lanzamiento público.
3. **Certificaciones objetivo:** ISO 27001, SOC 2 Tipo II (B2B), cumplimiento GDPR/CCPA,
   HIPAA solo si entramos a salud laboral/seguros (EE. UU.).
4. **Ética de gamificación (Psicología):** sin streaks que generen culpa, sin compra de poder,
   "fallar no destruye al personaje" como está en README se convierte en **política de producto**.
5. **IA responsable:** modelos con evaluación por sesgo (cuerpos diversos), explicabilidad,
   humano en el bucle para todo consejo de salud.

---

## 8. ROADMAP — FASES E HITOS 📅

### ⚙️ FASE 0 — Cimientos (semanas 1–3)
- Repo Git (monorepo: `app/`, `api/`, `ml/`, `docs/`), CI/CD, feature flags
- Supabase: auth + esquema completo del dominio + RLS + signed URLs (Progress Vault)
- Migración del código actual a TypeScript + React Three Fiber (sin romper la demo)
- Diseño del consentimiento granular + Privacy Center en la app
- **✅ Hito:** un usuario se registra, entrena y su progreso sobrevive a cambiar de dispositivo

### 🧍 FASE 1 — EL GEMELO REAL (semanas 3–10) ← *lo que pediste*
- **BAYONA Scan MVP** vía SDK de selfie (in3D/Avaturn/RPM) → avatar humano real en la escena
- **Camera Rep Counter + Scoring de técnica** (MediaPipe → biomecánica; lo de NEXT_STEPS, elevado)
- **Mocap en vivo:** tu avatar hace tus repeticiones en tiempo real (retargeting)
- Protocolo de privacidad del escaneo corporal (cifrado por usuario, borrado total)
- **✅ Hito:** "entreno frente a la cámara y mi persona real —mi cuerpo— ejecuta la sesión en BAYONA"

### 🧠 FASE 2 — COACH IA + SALUD INTEGRAL (semanas 8–18)
- **Health Map**: evaluación integral de entrada (cuestionario clínico + screening por cámara + wearable)
- **ai-coach**: LLM con RAG clínico-deportivo + tools (ajustar plan según readiness/dolor/sueño)
- Nutrición por foto + plan semanal + lista de compra
- Protocolo de red flags + derivación (telémedicina partner)
- HealthKit / Health Connect (pasos, sueño, HRV) con consentimiento granular ← de NEXT_STEPS
- **✅ Hito:** "me hace una evaluación completa y me da un plan que se ajusta solo cada semana"

### ⌚ FASE 3 — ECOSISTEMA HARDWARE (semanas 16–26)
- Garmin / Whoop / Oura / Withings / Polar H10; auto-regulación real por datos
- CGM opcional con educación glucémica (programa con nutricionistas partner)
- Escaneo de progreso 3D (perímetros por LiDAR) → Progress Vault volumétrico
- Coach por voz en auriculares durante el entrenamiento
- **✅ Hito:** "BAYONA me conoce mejor que yo: sabe cuándo empujar y cuándo parar"

### 🚀 FASE 4 — PLATAFORMA (semanas 24–40)
- Apps nativas (Expo) con el core 3D compartido; widget de reloj
- **Social Hub** (squads, retos) centrado en avatares reales ← de NEXT_STEPS
- **Shop phygital** DIGITAL→GET PHYSICAL + QR/NFC verification ← de NEXT_STEPS
- WebGPU + I+D de Gaussian Splatting para Progress Vault
- Certificaciones (ISO 27001 / SOC2) y salida B2B (empresas, seguros, clínicas)
- **✅ Hito:** "es mi plataforma de salud completa y mi comunidad entrena conmigo"

---

## 9. EQUIPO Y KPIs 📊

**Equipo mínimo para Fase 0–2:** 1 fullstack sénior, 1 ingeniero ML/CV, 1 technical artist 3D
(media jornada o partner studio), 1 diseñador de producto, asesores médicos (consultoría),
+ este comité (IA) como staff permanente de diseño y revisión.

**KPIs de producto:**
| KPI | Target Fase 2 |
|---|---|
| Adherencia a la rutina (sesiones iniciadas / planeadas) | ≥ 70% |
| Retención D30 | ≥ 45% |
| Precisión del rep counter | ≥ 98% squat/press/pullup |
| Scoring de técnica (vs. evaluador humano) | ≥ 90% acuerdo |
| Red flags detectados → usuario atendido | 100% trazado |
| Satisfacción "mi plan se adapta a mí" (CSAT) | ≥ 4.5/5 |

---

## 10. RIESGOS Y MITIGACIÓN

| Riesgo | Impacto | Mitigación |
|---|---|---|
| SDK de avatar quiebra / sube precio | Alto | Contratos + abstracción `avatar-provider`; pipeline propio (CC4) en paralelo |
| ML de cámara falla en cuerpos/luz diversos | Alto | Datasets diversos, fallback manual de conteo, calibración guiada |
| Clasificación regulatoria (SaMD) | Alto | Diseño "screening + derivación", asesoría legal desde Fase 1 |
| Privacidad del escaneo corporal | Crítico | Cifrado por usuario, procesado on-device cuando sea posible, borrado total |
| Alcance ("soluciona todo") | Alto | Comunicar "detecta, programa, acompaña y deriva" — honestidad como marca |
| Coste GPU del coach IA | Medio | Streaming, cache, modelos pequeños on-device para lo simple |

---

## 11. SIGUIENTE PASO INMEDIATO (esta semana) ✅

1. **Repo Git + monorepo** del código actual (que hoy viaja en zip 😅) — `app/ api/ ml/ docs/`
2. **Slice "GEMELO-1":** Camera Rep Counter (squat/press/pullup) + sincronía avatar↔usuario
   — ya estaba en `NEXT_STEPS.md`, es la puerta al mocap
3. **Spike de avatar real (5 días):** evaluar in3D vs Avaturn vs RPM con 3 selfies reales
   → decisión de proveedor con datos, no con folletos
4. **Supabase**: auth + tablas del dominio + RLS (también en NEXT_STEPS — se ejecuta ya)

*Comité disponible para dictaminar cada decisión técnica o clínica que se abra en el camino.*
