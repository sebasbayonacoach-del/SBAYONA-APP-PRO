# BAYONA — SPRINT 01
## Entrada que vende + onboarding que conoce + entitlement foundation

Fecha: 2026-10-06
Depende de: BAYONA_MASTER_PRODUCT_PLAN_2026-10-06.md

## Objetivo
Rehacer la primera experiencia del usuario sin romper la app ya funcional.

Al final del sprint:
- la demo pública permite explorar la app;
- hay tema noche/día real;
- el usuario entiende FREE / RAÍZ / PERFORMANCE / ELITE;
- el onboarding recopila contexto útil sin parecer interrogatorio;
- elige Coach persona;
- las funciones premium tienen entitlement;
- el Coach guía la primera entrada;
- la app no mezcla Coach OS con la experiencia personal;
- todo pasa tests y móvil/desktop.

---

## 1. FOUNDATION

### 1.1 Entitlement engine
Crear:
- js/entitlements.js
- tests/entitlements-eval.mjs

Modelo:
- free
- raiz
- performance
- elite

Funciones:
- normalizePlan(plan)
- hasFeature(plan, feature)
- featureTier(feature)
- lockedFeatureCopy(feature, plan)
- planComparison()

Features mínimas:
- training.basic
- training.custom
- training.videoAnalysis
- coach.chat
- coach.call
- progress.basic
- progress.advanced
- planning.macrocycle
- nutrition.basic
- nutrition.advanced
- wearable.sync
- backup.cloud
- community.post
- ai.adaptive

Regla:
ningún componente decide planes por strings hardcodeados fuera de este módulo.

### 1.2 Profile schema v4
Extender js/state.js con migración conservadora.

Campos:
profile:
- name
- birthDate
- ageBand
- language
- goalPrimary
- goals[]
- customGoals[]
- trainingPlaces[]
- customPlaces[]
- equipment[]
- weeklyAvailability
- preferredSessionRange
- coachPersona
- membershipPlan
- onboardingVersion
- onboardingCompletedAt

Separar:
- physiologySex (opcional, uso justificado)
- displayIdentity (opcional)
- developmentProfile
- consents

No borrar campos existentes.

### 1.3 Theme engine
Crear:
- js/theme.js

Tokens:
- dark
- light
- system

Persistencia:
bayona.theme.v1

Aplicar con:
document.documentElement.dataset.theme

No duplicar layouts.

---

## 2. DEMO “VER CÓMO FUNCIONA”

Archivos principales:
- js/ui/landing.js
- css/luxe.css / css/pro.css
- index.html

Componente:
DemoDevice

Estados:
- theme: dark/light
- plan: free/raiz/performance/elite
- surface: home/training/nutrition/progress/coach

Elementos:
- carcasa móvil;
- pantalla interna;
- tabs de membresía;
- toggle noche/día;
- hotspots;
- texto lateral de “incluido / bloqueado”.

No cargar toda la app 3D para la demo.

Test:
- demo no aumenta el arranque público de forma desproporcionada;
- keyboard accessible;
- no overflow 390px.

---

## 3. ONBOARDING V3

Reescribir js/onboarding.js sobre máquina de estados clara.

Pantallas:

1. Nombre
2. Objetivos
3. Lugares/material
4. Semana real
5. Perfil de desarrollo
6. Seguridad
7. Coach persona
8. Membresía
9. Resumen

### Objetivos
multi-select + principal + custom text.

### Lugares
multi-select + custom.

### Semana real
selector de días y duración por día.

Copy:
“¿Cómo es tu semana real?”
“No necesitas acertar. BAYONA puede reajustarlo después.”

### Perfil de desarrollo
Adultos:
- birthDate/ageBand.

Menores:
- ruta separada;
- no continuar como si fuera adulto.

### Seguridad
Reutilizar Health Map / lógica existente.
No duplicar motor clínico.

### Coach persona
Sebastián / Coach femenina / Minimal.

Primero usar assets seguros/placeholder de producto; después sustituir por branding final.

### Membresía
Plan actual preseleccionado.
Comparador breve.
Funciones locked visibles.

---

## 4. TOUR INICIAL

Crear:
- js/ui/first-run-tour.js
- css/first-run-tour.css
- tests/first-run-tour-eval.mjs

Eventos:
tour.start
tour.step
tour.skip
tour.complete

Pasos:
1 Inicio
2 Check-in
3 Sesión
4 Progreso
5 Coach
6 Personaje

Solo una vez por onboardingVersion.

Debe poder reiniciarse desde Perfil > Ayuda.

---

## 5. CHECK-IN Y NOTIFICACIONES

Primera pulsación en “¿Cómo estás?”:
- registrar estado;
- explicar opción de seguimiento;
- dejar elegir momentos.

Moments:
- morning
- preTraining
- evening

Solo después pedir Notifications API.

Guardar:
notificationPreferences

No repetir prompt si rechazado.

---

## 6. COPY

Eliminar:
- “ATLETA” como genérico;
- “TU TIEMPO”;
- copy clínico innecesario en primer contacto.

Preferir:
- “Tu semana”
- “Tu sesión”
- “Cómo llegas hoy”
- “Tu progreso”
- “Tu Coach”
- “Tu espacio”

---

## 7. QA

### Unit / contract
- entitlements
- migration profile v4
- onboarding state machine
- theme persistence
- notification preference
- tour one-time behavior

### Browser
Desktop:
- 1440x1000

Mobile:
- 390x844
- 360x800

Capturas:
- demo dark/free
- demo light/performance
- onboarding goal
- onboarding week
- coach selection
- membership
- personal home first-run

### Accessibility
- focus trap;
- labels;
- aria-pressed;
- no permission request without user gesture;
- contrast dark/light.

### Regression
npm test

Criterio:
54 suites previas siguen verdes + nuevas suites.

---

## 8. NO HACER EN ESTE SPRINT

No construir todavía:
- todo Coach OS V3;
- wearable sync real;
- community backend;
- cloud backup;
- análisis IA de vídeo cloud;
- macrociclo editor completo.

Sí dejar interfaces/data contracts para que entren después.

---

## 9. DEFINITION OF DONE

- [ ] Working tree limpio.
- [ ] Tests completos 0 fallos.
- [ ] Visual QA móvil/desktop.
- [ ] Landing no pierde velocidad de arranque.
- [ ] Onboarding no usa “atleta” genérico.
- [ ] Custom goals/places funcionan.
- [ ] Theme light/dark funciona realmente.
- [ ] Entitlements gobiernan UI.
- [ ] Primera guía Coach funciona una sola vez.
- [ ] Notificaciones solo se solicitan con contexto.
- [ ] Producción verificada.
- [ ] Commit + push + deploy documentados.

---

## Próximo sprint
HUB PERSONAL + personaje + cámara narrativa + funciones locked + journey map.
