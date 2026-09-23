// ============================================================
// BAYONA — DATA: exercises, workouts, items, ranks, messages
// ============================================================

export const RANKS = [
  { min: 1,  name: "INICIADO" },
  { min: 6,  name: "ATLETA" },
  { min: 14, name: "VANGUARDIA" },
  { min: 25, name: "ÉLITE" },
  { min: 40, name: "TITÁN" },
  { min: 60, name: "ASCENDIENTE" },
  { min: 85, name: "LEYENDA" },
];

export const RARITY = {
  COMMON:    { color: "#9aa4b0", weight: 1,   label: "COMÚN" },
  RARE:      { color: "#59e0ff", weight: 1.5, label: "RARO" },
  EPIC:      { color: "#b07aff", weight: 2.4, label: "ÉPICO" },
  LEGENDARY: { color: "#d8b26a", weight: 4,   label: "LEGENDARIO" },
  MYTHIC:    { color: "#ff7a3c", weight: 6,   label: "MÍTICO" },
};

// ------------------------------------------------------------
// EXERCISE LIBRARY — each maps to an avatar demo animation
// ------------------------------------------------------------
export const EXERCISES = {
  squat:       { name: "SENTADILLA",     muscle: "PIERNA",   demo: "squat",   xp: 60 },
  bench:       { name: "PRESS BANCA",    muscle: "PECHO",    demo: "bench",   xp: 55 },
  deadlift:    { name: "PESO MUERTO",    muscle: "POSTERIOR",demo: "row",     xp: 65 },
  ohp:         { name: "PRESS MILITAR",  muscle: "HOMBRO",   demo: "press",   xp: 50 },
  pullup:      { name: "DOMINADAS",      muscle: "ESPALDA",  demo: "pullup",  xp: 55 },
  row:         { name: "REMADO",         muscle: "ESPALDA",  demo: "row",     xp: 50 },
  lunge:       { name: "ZANCADAS",       muscle: "PIERNA",   demo: "lunge",   xp: 45 },
  curl:        { name: "CURL BÍCEPS",    muscle: "BRAZO",    demo: "curl",    xp: 35 },
  plank:       { name: "PLANCHA",        muscle: "CORE",     demo: "plank",   xp: 35, timed: true },
  pushup:      { name: "FLEXIONES",      muscle: "PECHO",    demo: "plank",   xp: 40 },
  hipthrust:   { name: "ELEVACIÓN DE CADERA", muscle: "GLÚTEO", demo: "sit",  xp: 45 },
  burpee:      { name: "BURPEES",        muscle: "FULL",     demo: "squat",   xp: 55 },
  mobility:    { name: "MOVILIDAD",      muscle: "MOVILIDAD",demo: "stretch", xp: 30, timed: true },
  breathing:   { name: "RESPIRACIÓN",    muscle: "MIND",     demo: "meditate",xp: 25, timed: true },
};

// ------------------------------------------------------------
// WORKOUT TEMPLATES (OPERATION = session)
// ------------------------------------------------------------
export const WORKOUTS = {
  op_upper: {
    id: "op_upper", name: "OPERACIÓN: POTENCIA SUPERIOR", tag: "FUERZA · TORSO", min: 55,
    desc: "Empuje, tracción y estabilidad de hombro. Récords permitidos.",
    exercises: [
      { ex: "bench",   sets: 4, reps: 8,  kg: 60, rir: 2 },
      { ex: "pullup",  sets: 4, reps: 8,  kg: 0,  rir: 2 },
      { ex: "ohp",     sets: 3, reps: 10, kg: 35, rir: 2 },
      { ex: "row",     sets: 3, reps: 10, kg: 45, rir: 1 },
      { ex: "curl",    sets: 3, reps: 12, kg: 14, rir: 1 },
    ],
  },
  op_lower: {
    id: "op_lower", name: "OPERACIÓN: POTENCIA INFERIOR", tag: "FUERZA · PIERNA", min: 60,
    desc: "Fuerza de pierna y cadera. Calienta bien la primera serie.",
    exercises: [
      { ex: "squat",     sets: 4, reps: 6,  kg: 70, rir: 2 },
      { ex: "hipthrust", sets: 3, reps: 10, kg: 60, rir: 1 },
      { ex: "lunge",     sets: 3, reps: 12, kg: 20, rir: 2 },
      { ex: "plank",     sets: 3, reps: 45, kg: 0,  rir: 1 },
    ],
  },
  op_full: {
    id: "op_full", name: "OPERACIÓN: CUERPO ENTERO", tag: "CUERPO ENTERO", min: 45,
    desc: "Sesión completa de cuerpo entero. Eficiencia máxima.",
    exercises: [
      { ex: "squat",   sets: 3, reps: 8,  kg: 60, rir: 2 },
      { ex: "pushup",  sets: 3, reps: 12, kg: 0,  rir: 2 },
      { ex: "row",     sets: 3, reps: 10, kg: 40, rir: 2 },
      { ex: "lunge",   sets: 3, reps: 12, kg: 16, rir: 1 },
      { ex: "plank",   sets: 3, reps: 40, kg: 0,  rir: 1 },
    ],
  },
  bodyweight: {
    id: "bodyweight", name: "PROTOCOLO CON PESO CORPORAL", tag: "SIN EQUIPAMIENTO", min: 27,
    desc: "Generado automáticamente para tu entorno actual.",
    exercises: [
      { ex: "pushup", sets: 4, reps: 12, kg: 0, rir: 2 },
      { ex: "squat",  sets: 4, reps: 15, kg: 0, rir: 2 },
      { ex: "lunge",  sets: 3, reps: 12, kg: 0, rir: 1 },
      { ex: "plank",  sets: 3, reps: 45, kg: 0, rir: 1 },
      { ex: "burpee", sets: 3, reps: 10, kg: 0, rir: 1 },
    ],
  },
  mobility_flow: {
    id: "mobility_flow", name: "FLUJO DE RECUPERACIÓN", tag: "MOVILIDAD", min: 15,
    desc: "Sesión de movilidad y descarga muscular.",
    exercises: [
      { ex: "mobility",  sets: 3, reps: 60, kg: 0, rir: 3 },
      { ex: "breathing", sets: 2, reps: 60, kg: 0, rir: 3 },
    ],
  },
};

// ------------------------------------------------------------
// ARMORY — modular equipment. `vis` drives the 3D avatar layer.
// ------------------------------------------------------------
export const ITEMS = [
  // TORSO
  { id: "core_tee",    slot: "top", name: "CAMISETA CORE BAYONA", rarity: "COMMON",    physical: true,  vis: { kind: "tee",     color: "#1b2230", accent: "#d8b26a" } },
  { id: "ember_tee",   slot: "top", name: "CAMISETA ASCUA",      rarity: "RARE",      physical: false, vis: { kind: "tee",     color: "#3a1d12", accent: "#ff7a3c" } },
  { id: "apex_jacket", slot: "top", name: "CHAQUETA ÁPICE",      rarity: "EPIC",      physical: true,  vis: { kind: "jacket",  color: "#0f1a2e", accent: "#4a86ff" } },
  { id: "titan_hoodie",slot: "top", name: "SUDADERA TITÁN",      rarity: "LEGENDARY", physical: true,  vis: { kind: "jacket",  color: "#241d0f", accent: "#d8b26a" } },
  { id: "myth_shell",  slot: "top", name: "CUBIERTA MÍTICA",     rarity: "MYTHIC",    physical: false, vis: { kind: "jacket",  color: "#2a1206", accent: "#ff7a3c", glow: true } },
  // PIERNAS
  { id: "core_pants",  slot: "bottom", name: "PANTALÓN CORE",       rarity: "COMMON",    physical: true,  vis: { kind: "long",  color: "#141a24" } },
  { id: "sprint_shorts",slot:"bottom", name: "CORTOS SPRINT",       rarity: "RARE",      physical: true,  vis: { kind: "short", color: "#12243a" } },
  { id: "vanguard_pants",slot:"bottom",name:"PANTALÓN VANGUARDIA",  rarity: "EPIC",      physical: false, vis: { kind: "long",  color: "#1a1030", accent: "#b07aff" } },
  // CALZADO
  { id: "core_runners",slot: "shoes", name: "ZAPATILLAS CORE",     rarity: "COMMON",    physical: true,  vis: { color: "#e8e4dd", accent: "#1b2230" } },
  { id: "apex_lifters",slot: "shoes", name: "ZAPATILLAS ÁPICE",    rarity: "EPIC",      physical: true,  vis: { color: "#d8b26a", accent: "#14100a" } },
  { id: "ghost_kicks", slot: "shoes", name: "ZAPATILLAS FANTASMA", rarity: "RARE",      physical: false, vis: { color: "#59e0ff", accent: "#06202a", glow: true } },
  // MUÑECA
  { id: "perf_bands",  slot: "wrist", name: "MUÑEQUERAS RENDIMIENTO", rarity: "EPIC",   physical: true,  vis: { color: "#ff7a3c" } },
  { id: "focus_straps",slot: "wrist", name: "TIRAS DE ENFOQUE",    rarity: "RARE",      physical: true,  vis: { color: "#59e0ff" } },
  // CABEZA
  { id: "bayona_cap",  slot: "head", name: "GORRA BAYONA",        rarity: "COMMON",    physical: true,  vis: { kind: "cap",        color: "#10151e", accent: "#d8b26a" } },
  { id: "pulse_cans",  slot: "head", name: "AURICULARES PULSO",   rarity: "RARE",      physical: false, vis: { kind: "headphones", color: "#12243a", accent: "#59e0ff" } },
  { id: "sage_wrap",   slot: "head", name: "BANDA SALVIA",        rarity: "COMMON",    physical: false, vis: { kind: "headband",   color: "#1c2c22", accent: "#4fd18b" } },
  // MOCHILA
  { id: "field_pack",  slot: "back", name: "MOCHILA DE CAMPO",    rarity: "RARE",      physical: true,  vis: { color: "#1b2230", accent: "#d8b26a" } },
  { id: "apex_wings",  slot: "back", name: "ALAS ÁPICE",          rarity: "LEGENDARY", physical: false, vis: { color: "#241d0f", accent: "#d8b26a", glow: true } },
  // EFECTOS
  { id: "aura_sun",    slot: "effects", name: "AURA AMANECER",   rarity: "LEGENDARY", physical: false, vis: { color: "#ff7a3c" } },
  { id: "aura_ice",    slot: "effects", name: "AURA GLACIAL",    rarity: "EPIC",      physical: false, vis: { color: "#59e0ff" } },
];

export const SLOTS = ["head", "top", "bottom", "shoes", "wrist", "back", "effects"];
export const SLOT_LABEL = {
  head: "CABEZA", top: "TORSO", bottom: "PIERNAS", shoes: "CALZADO",
  wrist: "MUÑECA", back: "MOCHILA", effects: "EFECTOS",
};

// ------------------------------------------------------------
// NUTRITION quick-log
// ------------------------------------------------------------
export const MEALS = [
  { id: "m_breakfast", name: "DESAYUNO POWER", kcal: 520, p: 32, c: 58, f: 14, icon: "🍳" },
  { id: "m_lunch",     name: "ALMUERZO COMPLETO", kcal: 680, p: 45, c: 62, f: 22, icon: "🥗" },
  { id: "m_dinner",    name: "CENA LIGERA", kcal: 430, p: 38, c: 30, f: 15, icon: "🐟" },
  { id: "m_snack",     name: "SNACK PROTEÍNA", kcal: 210, p: 25, c: 12, f: 5, icon: "🥜" },
  { id: "m_shake",     name: "SHAKE POST-ENTRENO", kcal: 280, p: 30, c: 28, f: 4, icon: "🥤" },
];

export const AFFIRMATIONS = [
  "Actúo con disciplina aunque no tenga ganas.",
  "Puedo controlar mi respuesta, aunque no controle las circunstancias.",
  "Hoy cumpliré aquello que me corresponde.",
  "El progreso real no necesita testigos.",
  "Construyo al personaje construyéndome a mí.",
];

// ------------------------------------------------------------
// MISIONES DEL DÍA (extras sobre el núcleo diario de js/hoy.js)
// -----------------------------------------------------------
// El núcleo de cada día (sesión, hidratación base, check-in, movilidad) ya
// vive en el plan «HOY». Las misiones son objetivos EXTRA, con bono propio
// (fuente única: missionReward en js/rewards.js) y selección diaria
// determinista (misma fecha = mismas misiones). `check` se resuelve en
// js/hoy.js para que este módulo siga siendo solo datos.
export const MISSIONS = [
  { id: "m_pasos",   name: "CAMINA 8.000 PASOS",  hint: "Movimiento real registrado por ti. BAYONA no inventa pasos." },
  { id: "m_comida",  name: "REGISTRA TUS 3 COMIDAS", hint: "Desayuno, comida y cena. Sin dietas milagro: solo constancia." },
  { id: "m_mente",   name: "5 MIN DE MENTE",      hint: "Respiración o silencio. Descansar también es progreso." },
  { id: "m_agua",    name: "META ALTA: 2,5 L DE AGUA", hint: "Por encima de la base diaria (1,5 L). Solo si tu cuerpo lo pide." },
];

// ------------------------------------------------------------
// MACROCYCLE — 24 semanas (LAB view)
// ------------------------------------------------------------
export const MACRO = {
  totalWeeks: 24,
  phases: [
    { code: "ADAPT",  name: "ADAPTACIÓN",   from: 1,  to: 3,  vol: 0.55, int: 0.55 },
    { code: "HIPER",  name: "HIPERTROFIA",  from: 4,  to: 9,  vol: 0.85, int: 0.65 },
    { code: "FUERZA", name: "FUERZA",       from: 10, to: 15, vol: 0.7,  int: 0.85 },
    { code: "PERF",   name: "RENDIMIENTO",  from: 16, to: 21, vol: 0.8,  int: 0.92 },
    { code: "PICO",   name: "PICO",         from: 22, to: 23, vol: 0.45, int: 1.0 },
    { code: "DESCARGA", name: "DESCARGA",       from: 24, to: 24, vol: 0.3,  int: 0.4 },
  ],
  dayPlan: ["op_upper", "op_lower", "mobility_flow", "op_full", "op_lower", "mobility_flow", null],
  dayNames: ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"],
};

export function phaseOfWeek(w) {
  return MACRO.phases.find((p) => w >= p.from && w <= p.to) || MACRO.phases[0];
}

// ------------------------------------------------------------
// CORE COACH — rule-based contextual coach (offline)
// ------------------------------------------------------------

// ------------------------------------------------------------
// CORE COACH — respuestas locales por reglas (asistente local, sin nube).
// Vive en js/coach/replies.js (módulo propio). data.js ya no lo compone.
// ------------------------------------------------------------
export { coreReply } from "./coach/replies.js";
