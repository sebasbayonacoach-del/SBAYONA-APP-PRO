// APP 7.0 · Preparación pura del historial para un espejo aditivo sin borrados.
// Cada serie obtiene un clientId estable para ON CONFLICT (session_id,client_id).
// No se envían frames ni vídeos: solo resúmenes numéricos.
export function workoutSyncPayload(userId, history = [], makeUuid = () => crypto.randomUUID()) {
  if (!userId || typeof userId !== "string") throw new Error("Falta identidad del usuario");
  const sessions = [], sets = [];
  let changed = false;
  for (const entry of Array.isArray(history) ? history : []) {
    if (!entry || typeof entry !== "object") continue;
    // La historia contiene también resúmenes de días de descanso (sets es número).
    const entries = Array.isArray(entry.sets) ? entry.sets
      : Array.isArray(entry.setLog) ? entry.setLog : [];
    const actualWorkout = Boolean(
      entry.sid || entry.workoutId || entry.id || entry.startedAt ||
      entry.endedAt || entry.at || entry.status || Number(entry.workouts) > 0 || entries.length
    );
    if (!actualWorkout) continue;

    if (!entry.sid) { entry.sid = makeUuid(); changed = true; }
    const sid = entry.sid;
    sessions.push({
      id: sid,
      user_id: userId,
      plan_day_id: entry.workoutId || entry.id || null,
      started_at: entry.at || entry.startedAt || null,
      ended_at: entry.at || entry.endedAt || null,
      readiness_in: entry.readiness ?? null,
      rpe_out: entry.rpe ?? null,
      status: entry.status || "completada",
    });

    entries.forEach((s, index) => {
      if (!s || typeof s !== "object") return;
      if (!s.clientId) { s.clientId = makeUuid(); changed = true; }
      sets.push({
        session_id: sid,
        client_id: s.clientId,
        exercise_id: s.ex || s.exKey || null,
        set_no: s.setIdx ?? index + 1,
        reps: s.reps ?? null,
        load_kg: s.kg ?? null,
        rir: s.rir ?? null,
        form_score: s.formScore ?? null,
        rep_vel_loss: s.velLoss ?? null,
        landmarks_summary: s.landmarks || null,
      });
    });
  }
  return { sessions, sets, changed };
}
