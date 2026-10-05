// BAYONA · COACHING CLOUD
// Vínculo Coach ↔ cliente y rutinas compartidas sobre Supabase + RLS.
// No usa service_role. Todas las operaciones se ejecutan con la sesión del usuario.
import {
  currentUser, currentSession, accountRole,
  select, insert, rpc,
} from "./supabase.js";

function mustUser() {
  const u = currentUser();
  if (!currentSession() || !u?.id) throw new Error("Inicia sesión para usar el coaching en la nube.");
  return u;
}

function asArray(value) {
  return Array.isArray(value) ? value : value == null ? [] : [value];
}

const COMPLETE_QUEUE_KEY = "bayona.coaching.complete.v1";

function readCompleteQueue() {
  try { return JSON.parse(localStorage.getItem(COMPLETE_QUEUE_KEY) || "[]").filter(Boolean); }
  catch { return []; }
}

function writeCompleteQueue(ids) {
  try {
    const unique = [...new Set((ids || []).filter(Boolean))].slice(-100);
    if (unique.length) localStorage.setItem(COMPLETE_QUEUE_KEY, JSON.stringify(unique));
    else localStorage.removeItem(COMPLETE_QUEUE_KEY);
  } catch { /* la cola es auxiliar; nunca rompe Training */ }
}

function queueCompletion(id) {
  if (!id) return;
  writeCompleteQueue(readCompleteQueue().concat(id));
}

function inFilter(values = []) {
  const safe = values.filter(Boolean).map((v) => String(v).replace(/[(),]/g, ""));
  return safe.length ? `in.(${safe.join(",")})` : null;
}

export function cloudRole() {
  return accountRole();
}

export async function linkedClients() {
  const u = mustUser();
  if (accountRole() !== "coach") return [];
  const links = await select("coach_clients", {
    coach_id: `eq.${u.id}`,
    status: "eq.active",
    order: "accepted_at.desc",
  });
  const ids = asArray(links).map((x) => x.client_id).filter(Boolean);
  const filter = inFilter(ids);
  if (!filter) return [];
  const profiles = await select("profiles", { id: filter, select: "id,display_name,role" });
  const byId = new Map(asArray(profiles).map((p) => [p.id, p]));
  return asArray(links).map((link) => ({
    ...link,
    profile: byId.get(link.client_id) || null,
    name: byId.get(link.client_id)?.display_name || "Cliente BAYONA",
  }));
}

export async function linkedCoaches() {
  const u = mustUser();
  const links = await select("coach_clients", {
    client_id: `eq.${u.id}`,
    status: "eq.active",
    order: "accepted_at.desc",
  });
  const ids = asArray(links).map((x) => x.coach_id).filter(Boolean);
  const filter = inFilter(ids);
  if (!filter) return [];
  const profiles = await select("profiles", { id: filter, select: "id,display_name,role" });
  const byId = new Map(asArray(profiles).map((p) => [p.id, p]));
  return asArray(links).map((link) => ({
    ...link,
    profile: byId.get(link.coach_id) || null,
    name: byId.get(link.coach_id)?.display_name || "Coach BAYONA",
  }));
}

export async function createInvite(hours = 72) {
  mustUser();
  if (accountRole() !== "coach") throw new Error("Esta acción requiere una cuenta Coach.");
  const result = await rpc("create_coach_invite", { p_hours: Math.max(1, Math.min(168, Number(hours) || 72)) });
  return typeof result === "string" ? result : result?.code || asArray(result)[0]?.create_coach_invite || asArray(result)[0] || "";
}

export async function acceptInvite(code) {
  mustUser();
  const clean = String(code || "").trim().toUpperCase();
  if (!clean) throw new Error("Introduce el código de invitación.");
  const result = await rpc("accept_coach_invite", { p_code: clean });
  return asArray(result);
}

export async function saveCloudRoutine({ clientId = null, name, min, exercises } = {}) {
  const u = mustUser();
  if (accountRole() !== "coach") throw new Error("Esta acción requiere una cuenta Coach.");
  const rows = await insert("coach_routines", [{
    coach_id: u.id,
    client_id: clientId || null,
    name: String(name || "RUTINA PROPLAYER").trim().slice(0, 80) || "RUTINA PROPLAYER",
    duration_min: Math.max(5, Math.min(180, Math.round(Number(min) || 45))),
    exercises: Array.isArray(exercises) ? exercises.slice(0, 12) : [],
    source: "proplayer",
  }]);
  return asArray(rows)[0] || null;
}

export async function assignCloudRoutine({ clientId, routineId, scheduledFor, note = "" } = {}) {
  const u = mustUser();
  if (accountRole() !== "coach") throw new Error("Esta acción requiere una cuenta Coach.");
  if (!clientId || !routineId || !scheduledFor) throw new Error("Faltan datos de la asignación.");
  const rows = await insert("coach_assignments", [{
    coach_id: u.id,
    client_id: clientId,
    routine_id: routineId,
    scheduled_for: scheduledFor,
    note: String(note || "").slice(0, 500),
    status: "pending",
  }]);
  return asArray(rows)[0] || null;
}

export async function pendingAssignmentsForMe() {
  const u = mustUser();
  const assignments = await select("coach_assignments", {
    client_id: `eq.${u.id}`,
    status: "eq.pending",
    order: "scheduled_for.asc",
    limit: "30",
  });
  const rows = asArray(assignments);
  const ids = rows.map((x) => x.routine_id).filter(Boolean);
  const filter = inFilter(ids);
  const routines = filter
    ? asArray(await select("coach_routines", { id: filter, select: "id,coach_id,client_id,name,duration_min,exercises,source" }))
    : [];
  const byId = new Map(routines.map((x) => [x.id, x]));
  return rows.map((assignment) => ({ ...assignment, routine: byId.get(assignment.routine_id) || null }));
}

export async function completeCloudAssignment(assignmentId) {
  mustUser();
  if (!assignmentId) return false;
  try {
    const result = await rpc("complete_coach_assignment", { p_assignment: assignmentId });
    const ok = result === true || asArray(result)[0] === true;
    if (ok) writeCompleteQueue(readCompleteQueue().filter((id) => id !== assignmentId));
    return ok;
  } catch (e) {
    queueCompletion(assignmentId);
    throw e;
  }
}

export async function flushCloudCompletions() {
  if (!currentSession()) return 0;
  const pending = readCompleteQueue();
  if (!pending.length) return 0;
  let done = 0;
  const keep = [];
  for (const id of pending) {
    try {
      const result = await rpc("complete_coach_assignment", { p_assignment: id });
      if (result === true || asArray(result)[0] === true) done += 1;
      else keep.push(id);
    } catch {
      keep.push(id);
    }
  }
  writeCompleteQueue(keep);
  return done;
}

/**
 * Baja asignaciones pendientes de la nube al estado local para que el motor
 * de Training pueda ejecutarlas offline. No borra datos locales.
 */
export async function hydrateAssignmentsToLocal(S) {
  if (!S || !currentSession()) return 0;
  const cloud = await pendingAssignmentsForMe();
  let count = 0;
  for (const item of cloud) {
    if ((S.data.asignaciones || []).some((x) => x.cloudAssignmentId === item.id && x.estado === "completada")) continue;
    const r = item.routine;
    if (!r || !Array.isArray(r.exercises) || !r.exercises.length) continue;
    const localId = "cloud_" + r.id;
    const local = S.saveCustomRoutine({
      id: localId,
      name: r.name,
      min: r.duration_min,
      desc: "Rutina asignada por tu Coach en BAYONA.",
      exercises: r.exercises,
      createdAt: item.created_at || undefined,
    });
    if (!local) continue;
    S.addAsignacion({
      clienteId: "local",
      workoutId: local.id,
      customRoutineId: local.id,
      dia: item.scheduled_for,
      nota: item.note || "",
      origen: "cloud-coach",
      autor: "Coach BAYONA",
      cloudAssignmentId: item.id,
      cloudRoutineId: r.id,
      coachId: item.coach_id,
    });
    count += 1;
  }
  return count;
}
