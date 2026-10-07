// BAYONA — personalización de perfil y sesión.
// La capa actual conserva compatibilidad con el planificador v2 mientras Profile v4
// añade objetivos/lugares múltiples y una semana real.

export const GOALS = [
  "COMPOSICIÓN CORPORAL",
  "HIPERTROFIA MUSCULAR",
  "FUERZA Y POTENCIA",
  "RESISTENCIA Y CONDICIÓN FÍSICA",
  "MOVILIDAD Y FUNCIÓN",
  "RENDIMIENTO DEPORTIVO",
  "BIENESTAR Y ADHERENCIA",
  "VOLVER A ENTRENAR",
  "PREPARAR UNA PRUEBA",
];

export const EXPERIENCE = ["EMPIEZO AHORA", "ALGO DE EXPERIENCIA", "ENTRENO HACE AÑOS"];
export const AVAILABILITY = ["2 DÍAS/SEMANA", "3 DÍAS/SEMANA", "4-5 DÍAS/SEMANA", "CASI A DIARIO"];

// Compatibilidad: el motor de ejercicios todavía consume este campo resumido.
export const EQUIPMENT = ["SIN EQUIPAMIENTO", "MANCUERNAS/BANDAS", "GIMNASIO COMPLETO"];

export const TRAINING_PLACES = [
  "CASA · SIN MATERIAL",
  "CASA · CON MATERIAL",
  "GIMNASIO",
  "PARQUE / CALISTENIA",
  "PISTA / CAMPO",
  "PISCINA",
  "BOX / ESTUDIO",
  "CLUB DEPORTIVO",
  "TRABAJO",
  "VIAJO MUCHO",
];

const LEGACY_GOAL = new Map([
  ["FUERZA", "FUERZA Y POTENCIA"],
  ["HIPERTROFIA", "HIPERTROFIA MUSCULAR"],
  ["RESISTENCIA", "RESISTENCIA Y CONDICIÓN FÍSICA"],
  ["SALUD", "BIENESTAR Y ADHERENCIA"],
]);

export function normalizeGoal(goal) {
  const raw = String(goal || "").trim().toUpperCase();
  return LEGACY_GOAL.get(raw) || raw;
}

function cleanText(value, max = 80) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, max);
}

function uniqueTexts(values, maxItems = 12, maxLength = 80) {
  return [...new Set((Array.isArray(values) ? values : []).map((x) => cleanText(x, maxLength)).filter(Boolean))].slice(0, maxItems);
}

export function availabilityFromDays(days) {
  const n = uniqueTexts(days, 7, 12).length;
  if (n <= 2) return "2 DÍAS/SEMANA";
  if (n === 3) return "3 DÍAS/SEMANA";
  if (n <= 5) return "4-5 DÍAS/SEMANA";
  return "CASI A DIARIO";
}

export function legacyEquipmentFromPlaces(places) {
  const list = uniqueTexts(places).map((x) => x.toUpperCase());
  if (list.some((x) => x.includes("GIMNASIO") || x.includes("BOX") || x.includes("CLUB"))) return "GIMNASIO COMPLETO";
  if (list.some((x) => x.includes("CON MATERIAL"))) return "MANCUERNAS/BANDAS";
  return "SIN EQUIPAMIENTO";
}

export function parseEquipmentItems(value) {
  const source = Array.isArray(value)
    ? value
    : String(value || "").split(/[;,\n]/);
  return uniqueTexts(source, 30, 60);
}

export function normalizeHealthContext(input = {}) {
  const pregnancy = ["none", "pregnant", "postpartum", "unspecified"].includes(input.pregnancyPostpartum)
    ? input.pregnancyPostpartum
    : "none";
  return {
    currentInjuries: cleanText(input.currentInjuries, 240),
    currentPain: cleanText(input.currentPain, 240),
    conditions: cleanText(input.conditions, 240),
    medications: cleanText(input.medications, 240),
    professionalRestrictions: cleanText(input.professionalRestrictions, 240),
    allergiesIntolerances: cleanText(input.allergiesIntolerances, 240),
    pregnancyPostpartum: pregnancy,
  };
}

export function validateProfile(input = {}) {
  const rawGoals = uniqueTexts(input.goals?.length ? input.goals : [input.goal].filter(Boolean), 8, 80)
    .map(normalizeGoal);
  const primary = normalizeGoal(input.goalPrimary || input.goal || rawGoals[0] || "BIENESTAR Y ADHERENCIA");
  if (!GOALS.includes(primary)) throw new Error("Revisa el objetivo principal de tu perfil.");
  const goals = [...new Set([primary, ...rawGoals.filter((goal) => GOALS.includes(goal))])];
  const customGoals = uniqueTexts(input.customGoals, 5, 80);

  const places = uniqueTexts(input.trainingPlaces?.length ? input.trainingPlaces : [], 10, 80);
  const customPlaces = uniqueTexts(input.customPlaces, 5, 80);
  const equipmentItems = parseEquipmentItems(input.equipmentItems);
  const healthContext = normalizeHealthContext(input.healthContext);

  const experience = EXPERIENCE.includes(input.experience) ? input.experience : EXPERIENCE[1];
  const weeklyDays = uniqueTexts(input.weeklyAvailability?.days, 7, 12);
  const availability = AVAILABILITY.includes(input.availability)
    ? input.availability
    : availabilityFromDays(weeklyDays.length ? weeklyDays : ["L", "X", "V"]);

  const equipment = EQUIPMENT.includes(input.equipment)
    ? input.equipment
    : legacyEquipmentFromPlaces([...places, ...customPlaces]);

  const minutes = Number(input.sessionMinutes || input.preferredSessionMinutes || 30);
  if (![15, 30, 45, 60].includes(minutes)) throw new Error("Elige una duración aproximada válida.");

  const preferredSessionRange = uniqueTexts(input.preferredSessionRange, 2, 12);
  const membershipPlan = cleanText(input.membershipPlan || "free", 20).toLowerCase();

  return {
    name: cleanText(input.name || "TÚ", 18) || "TÚ",

    // v2 compatibility
    goal: primary,
    experience,
    availability,
    equipment,
    sessionMinutes: minutes,

    // Profile v4
    goalPrimary: primary,
    goals,
    customGoals,
    trainingPlaces: places,
    customPlaces,
    equipmentItems,
    healthContext,
    weeklyAvailability: {
      days: weeklyDays,
      preferredWindows: uniqueTexts(input.weeklyAvailability?.preferredWindows, 7, 24),
      difficultDays: uniqueTexts(input.weeklyAvailability?.difficultDays, 7, 12),
    },
    preferredSessionRange: preferredSessionRange.length ? preferredSessionRange : [String(minutes)],
    birthDate: cleanText(input.birthDate, 10) || null,
    ageBand: cleanText(input.ageBand, 24) || null,
    developmentProfile: input.developmentProfile && typeof input.developmentProfile === "object"
      ? { ...input.developmentProfile }
      : null,
    physiologySex: ["female", "male", "intersex", "unspecified"].includes(input.physiologySex)
      ? input.physiologySex
      : "unspecified",
    displayIdentity: cleanText(input.displayIdentity, 40) || null,
    coachPersona: cleanText(input.coachPersona || "sebastian", 24).toLowerCase(),
    membershipPlan,
    onboardingVersion: Number(input.onboardingVersion) || 3,
    onboardingCompletedAt: input.onboardingCompletedAt || null,
  };
}

export function profileWeek(profile = {}) {
  const dayIndex = { L:0, M:1, X:2, J:3, V:4, S:5, D:6 };
  const explicit = (profile.weeklyAvailability?.days || []).map((d) => dayIndex[String(d).toUpperCase()]).filter(Number.isInteger);
  const days = explicit.length ? explicit : ({
    "2 DÍAS/SEMANA": [0, 3],
    "3 DÍAS/SEMANA": [0, 2, 4],
    "4-5 DÍAS/SEMANA": [0, 1, 3, 4],
    "CASI A DIARIO": [0, 1, 3, 4],
  }[profile.availability] || [0, 2, 4]);

  const gym = profile.equipment === "GIMNASIO COMPLETO";
  const split = gym && days.length > 3;
  let i = 0;
  return Array.from({ length: 7 }, (_, day) =>
    days.includes(day)
      ? (split ? ["op_upper", "op_lower"][i++ % 2] : gym ? "op_full" : "bodyweight")
      : (profile.availability === "CASI A DIARIO" && [2, 5].includes(day) ? "mobility_flow" : null)
  );
}

export function personalizeWorkout(workout, profile) {
  if (!workout || !profile?.onboarded) return workout;
  const beginner = profile.experience === EXPERIENCE[0];
  const time = Number(profile.sessionMinutes) || 45;
  const fraction = Math.min(1, time / workout.min);
  const exs = workout.exercises.map((e) => ({
    ...e,
    sets: Math.max(1, Math.floor(e.sets * fraction)),
    ...(beginner && workout.id !== "mobility_flow"
      ? { sets: Math.min(2, Math.max(1, Math.floor(e.sets * fraction))), rir: 3 }
      : {}),
  }));
  return { ...workout, exercises: exs, min: Math.min(time, workout.min) };
}
