// BAYONA APP 7.0 — entrenadores virtuales para PROPLAYER.
// Ningun video se atribuye a una persona sin verificaciones explicitas.
// Modulo puro: no solicita acceso a camara, voz, rostro ni red.
export const INSTRUCTOR_CHOICES = Object.freeze([
  { id: "reference", label: "REFERENCIA DEL CATALOGO" },
  { id: "sebas", label: "SEBASTIAN BAYONA" },
  { id: "profesora", label: "PROFESORA BAYONA" },
]);

export const EMPTY_INSTRUCTOR_MANIFEST = Object.freeze({
  version: 1,
  exercises: Object.freeze({}),
});

const TRAINER_IDS = new Set(["sebas", "profesora"]);

export function instructorLabel(id) {
  return INSTRUCTOR_CHOICES.find((choice) => choice.id === id)?.label || "INSTRUCTOR";
}

// Solo rutas del directorio propio. Impide URLs de terceros y rutas manipuladas.
// Cuando el almacenamiento externo de BAYONA este preparado se ampliara
// mediante un origen permitido explicitamente, no una URL arbitraria.
export function isInstructorMediaUrl(value) {
  return typeof value === "string"
    && /^\/?(?:\.\/)?media\/instructors\/(?:sebas|profesora)\/[a-zA-Z0-9_/-]+\.(?:mp4|webm)$/i.test(value)
    && !value.includes("..")
    && !value.includes("//");
}

export function resolveInstructorVideo(manifest, record, instructorId) {
  if (!TRAINER_IDS.has(instructorId) || !record) return null;
  if (!manifest || manifest.version !== 1 || typeof manifest.exercises !== "object") return null;
  const key = String(record.pos ?? "");
  if (!/^\d{1,5}$/.test(key)) return null;
  const demo = manifest.exercises?.[key]?.[instructorId];
  if (!demo || typeof demo !== "object") return null;
  if (demo.published !== true || demo.identity_approved !== true ||
      demo.rights_clear !== true || demo.technique_approved !== true) return null;
  if (!isInstructorMediaUrl(demo.url)) return null;
  const pathRole = instructorId === "sebas" ? "sebas" : "profesora";
  if (!new RegExp("^(?:\\/|\\.\\/)?media/instructors/" + pathRole + "/").test(demo.url)) return null;
  return { url: demo.url, instructorId, type: "bayona-original" };
}

export function instructorCoverage(manifest, records, instructorId) {
  if (!Array.isArray(records) || !TRAINER_IDS.has(instructorId)) return 0;
  return records.filter((record) => resolveInstructorVideo(manifest, record, instructorId)).length;
}
