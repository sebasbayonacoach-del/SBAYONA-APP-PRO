// Profile-based suggestions. Coach overrides always take precedence in state.js.
export const GOALS = ["FUERZA", "HIPERTROFIA", "RESISTENCIA", "SALUD"];
export const EXPERIENCE = ["EMPIEZO AHORA", "ALGO DE EXPERIENCIA", "ENTRENO HACE AÑOS"];
export const AVAILABILITY = ["2 DÍAS/SEMANA", "3 DÍAS/SEMANA", "4-5 DÍAS/SEMANA", "CASI A DIARIO"];
export const EQUIPMENT = ["SIN EQUIPAMIENTO", "MANCUERNAS/BANDAS", "GIMNASIO COMPLETO"];
export function validateProfile(input) {
  if (!GOALS.includes(input.goal) || !EXPERIENCE.includes(input.experience) || !AVAILABILITY.includes(input.availability) || !EQUIPMENT.includes(input.equipment)) throw new Error("Revisa las opciones de tu perfil.");
  const minutes = Number(input.sessionMinutes);
  if (![15,30,45,60].includes(minutes)) throw new Error("Elige la duración de la sesión.");
  return { name: String(input.name || "ATLETA").trim().slice(0,18) || "ATLETA", goal: input.goal, experience: input.experience, availability: input.availability, equipment: input.equipment, sessionMinutes: minutes };
}
export function profileWeek(profile) {
  const days = { "2 DÍAS/SEMANA": [0,3], "3 DÍAS/SEMANA": [0,2,4], "4-5 DÍAS/SEMANA": [0,1,3,4], "CASI A DIARIO": [0,1,3,4] }[profile.availability] || [0,2,4];
  const gym = profile.equipment === "GIMNASIO COMPLETO";
  const split = gym && days.length > 3;
  let i = 0;
  return Array.from({length:7}, (_,day) => days.includes(day) ? (split ? ["op_upper","op_lower"][i++ % 2] : gym ? "op_full" : "bodyweight") : (profile.availability === "CASI A DIARIO" && [2,5].includes(day) ? "mobility_flow" : null));
}
export function personalizeWorkout(workout, profile) {
  if (!workout || !profile.onboarded) return workout;
  const beginner = profile.experience === EXPERIENCE[0];
  const time = Number(profile.sessionMinutes) || 45;
  const fraction = Math.min(1, time / workout.min);
  const exs = workout.exercises.map(e => ({ ...e, sets: Math.max(1, Math.floor(e.sets * fraction)), ...(beginner && workout.id !== "mobility_flow" ? {sets: Math.min(2, Math.max(1, Math.floor(e.sets * fraction))), rir: 3} : {}) }));
  // Duration is an estimate, never a promise. No inferred starting weights.
  return { ...workout, exercises: exs, min: Math.min(time, workout.min) };
}
