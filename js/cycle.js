// Optional menstrual diary. Kept outside the account sync and game state.
export const CYCLE_KEY = "bayona.cycle.v1";
export const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const blank = () => ({ consent: false, start: "", regular: false, length: 28, hormonal: false, entries: [] });
function dayNumber(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
  const date = new Date(value + "T12:00:00Z");
  if (!Number.isFinite(+date) || date.toISOString().slice(0,10) !== value) return null;
  return Math.floor(+date / 86400000);
}
export function validateCycle(data, today = localDate()) {
  if (data.start && (dayNumber(data.start) === null || data.start > today)) throw new Error("Indica una fecha válida que no sea futura.");
  if (!Number.isInteger(Number(data.length)) || Number(data.length) < 15 || Number(data.length) > 90) throw new Error("Revisa la duración: usa un número entero entre 15 y 90 días. Es un dato, no un diagnóstico.");
  return { consent: true, start: data.start || "", length: Number(data.length), regular: data.regular === true, hormonal: data.hormonal === true };
}
export function readCycle(storage = globalThis.localStorage) {
  try {
    const value = JSON.parse(storage?.getItem(CYCLE_KEY) || "null");
    if (!value?.consent) return blank();
    const config = validateCycle(value);
    const entries = Array.isArray(value.entries) ? value.entries.filter(e => dayNumber(e?.date) !== null && e.date <= localDate() && ["habitual","suave","descanso"].includes(e.mode) && ["ninguno","leve","moderado","intenso"].includes(e.pain) && ["baja","media","alta"].includes(e.energy)).slice(-90) : [];
    return { ...config, entries };
  } catch { return blank(); }
}
export function saveCycle(config, storage = globalThis.localStorage) {
  if (config.consent !== true) throw new Error("Activa el permiso para guardar el diario en este dispositivo.");
  const value = { ...validateCycle(config), entries: readCycle(storage).entries };
  storage.setItem(CYCLE_KEY, JSON.stringify(value));
  return value;
}
export function logCycle(entry, storage = globalThis.localStorage, today = localDate()) {
  const value = readCycle(storage);
  if (!value.consent) throw new Error("El diario está desactivado.");
  if (!["habitual","suave","descanso"].includes(entry.mode) || !["ninguno","leve","moderado","intenso"].includes(entry.pain) || !["baja","media","alta"].includes(entry.energy)) throw new Error("Completa las sensaciones de hoy.");
  const record = { date: today, pain: entry.pain, energy: entry.energy, bleeding: entry.bleeding === true, mode: entry.mode };
  value.entries = [...value.entries.filter(e => e.date !== today), record].sort((a,b) => a.date.localeCompare(b.date)).slice(-90);
  storage.setItem(CYCLE_KEY, JSON.stringify(value));
  return value;
}
export function deleteCycle(storage = globalThis.localStorage) { storage?.removeItem(CYCLE_KEY); }
export function cycleSummary(value, today = localDate()) {
  const entry = value.consent ? value.entries?.find(e => e.date === today) : null;
  const elapsed = value.consent && value.start ? dayNumber(today) - dayNumber(value.start) : null;
  const day = elapsed !== null && elapsed >= 0 ? elapsed + 1 : null;
  let next = null;
  // Never roll an unconfirmed period forward or infer ovulation from calendar dates.
  if (day && value.regular && !value.hormonal && day <= value.length) next = value.length - day + 1;
  let guidance = "Registra cómo te sientes; el calendario por sí solo no decide tu entrenamiento.";
  if (entry?.pain === "intenso") guidance = "Dolor intenso: pausa el entrenamiento y consulta con un profesional sanitario. Si aparece desmayo, dolor súbito fuerte o sangrado muy abundante, busca atención urgente.";
  else if (entry?.mode === "descanso") guidance = "Has elegido descansar. Puedes volver a entrenar cuando te encuentres preparada; no pierdes XP por esta elección.";
  else if (entry?.mode === "suave") guidance = "Has elegido una sesión suave: reducimos las series de la misión de hoy. Cambia de opción cuando quieras.";
  else if (entry) guidance = "Sesión habitual seleccionada. Ajusta el esfuerzo a tus sensaciones y detente si aparece dolor.";
  return { day, next, entry, guidance };
}
