// BAYONA · COACHING CLOUD
// Vínculo Coach ↔ cliente y rutinas compartidas sobre Supabase + RLS.
// No usa service_role. Todas las operaciones se ejecutan con la sesión del usuario.
import {
  currentUser, currentSession, accountRole,
  select, insert, update, rpc,
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


/* =====================================================================
   COACH CRM CLOUD · sync explícita
   ---------------------------------------------------------------------
   No se ejecuta automáticamente: contactos y notas solo suben cuando
   el Coach pulsa sincronizar. Si la migración 0006 no está desplegada,
   la operación falla sin tocar ni borrar el CRM local.
   ===================================================================== */

const crmIso = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};
const crmNewer = (a, b) => {
  const ta = crmIso(a) ? new Date(a).getTime() : 0;
  const tb = crmIso(b) ? new Date(b).getTime() : 0;
  return ta > tb;
};
const first = (v) => asArray(v)[0] || null;

function assertCoachCloud() {
  const u = mustUser();
  if (accountRole() !== "coach") throw new Error("Esta acción requiere una cuenta Coach.");
  return u;
}

function cloudClientPatch(local, coachId) {
  return {
    coach_id: coachId,
    client_id: local.linkedUserId || null,
    name: local.name,
    email: local.email || null,
    phone: local.phone || null,
    status: local.status,
    source: local.source || "manual",
    note: local.note || "",
  };
}

async function pushClient(local, coachId) {
  const patch = cloudClientPatch(local, coachId);
  if (local.cloudId) {
    return first(await update("coach_crm_clients", patch, {
      id: `eq.${local.cloudId}`,
      coach_id: `eq.${coachId}`,
    }));
  }
  return first(await insert("coach_crm_clients", [patch]));
}

const CHILDREN = {
  appointments: {
    table: "coach_crm_appointments",
    parent: "clientId",
    patch: (x, coachId, cloudClientId) => ({
      coach_id: coachId, crm_client_id: cloudClientId,
      start_at: x.startAt, duration_min: x.durationMin, kind: x.kind,
      status: x.status, note: x.note || "", source: x.source || "manual",
    }),
    from: (r, localClientId) => ({
      cloudId:r.id, clientId:localClientId, startAt:r.start_at, durationMin:r.duration_min,
      kind:r.kind, status:r.status, note:r.note||"", source:r.source||"cloud",
      createdAt:r.created_at, updatedAt:r.updated_at,
    }),
  },
  payments: {
    table: "coach_crm_payments",
    parent: "clientId",
    patch: (x, coachId, cloudClientId) => ({
      coach_id: coachId, crm_client_id: cloudClientId,
      amount_cents:x.amountCents, currency:x.currency, status:x.status,
      due_at:x.dueAt||null, paid_at:x.paidAt||null, method:x.method||null,
      reference:x.reference||null, note:x.note||"", source:x.source||"manual",
    }),
    from: (r, localClientId) => ({
      cloudId:r.id, clientId:localClientId, amountCents:Number(r.amount_cents),
      currency:r.currency, status:r.status, dueAt:r.due_at, paidAt:r.paid_at,
      method:r.method, reference:r.reference, note:r.note||"", source:r.source||"billing",
      createdAt:r.created_at, updatedAt:r.updated_at,
    }),
  },
  referrals: {
    table: "coach_crm_referrals",
    parent: "referrerClientId",
    patch: (x, coachId, cloudClientId) => ({
      coach_id:coachId, referrer_crm_client_id:cloudClientId,
      referred_name:x.referredName, contact:x.contact||null, status:x.status,
      note:x.note||"",
    }),
    from: (r, localClientId) => ({
      cloudId:r.id, referrerClientId:localClientId, referredName:r.referred_name,
      contact:r.contact, status:r.status, note:r.note||"",
      createdAt:r.created_at, updatedAt:r.updated_at,
    }),
  },
  purchases: {
    table: "coach_crm_purchases",
    parent: "clientId",
    patch: (x, coachId, cloudClientId) => ({
      coach_id:coachId, crm_client_id:cloudClientId, item:x.item,
      amount_cents:x.amountCents, currency:x.currency, status:x.status,
      reference:x.reference||null, note:x.note||"", source:x.source||"manual",
    }),
    from: (r, localClientId) => ({
      cloudId:r.id, clientId:localClientId, item:r.item, amountCents:Number(r.amount_cents),
      currency:r.currency, status:r.status, reference:r.reference, note:r.note||"",
      source:r.source||"store", createdAt:r.created_at, updatedAt:r.updated_at,
    }),
  },
  notes: {
    table: "coach_crm_notes",
    parent: "clientId",
    immutable: true,
    patch: (x, coachId, cloudClientId) => ({
      coach_id:coachId, crm_client_id:cloudClientId, text:x.text,
      tags:Array.isArray(x.tags)?x.tags:[],
    }),
    from: (r, localClientId) => ({
      cloudId:r.id, clientId:localClientId, text:r.text, tags:r.tags||[], at:r.created_at,
    }),
  },
};

export async function pushCoachCrmToCloud(S) {
  const u = assertCoachCloud();
  if (!S?.data?.coachCrm) return { clients:0, records:0 };

  const local = S.data.coachCrm;
  const cloudByLocal = new Map();
  let clients = 0, records = 0;

  for (const c of local.clients || []) {
    const row = await pushClient(c, u.id);
    if (!row?.id) throw new Error("No se pudo sincronizar una ficha CRM.");
    cloudByLocal.set(c.id, row.id);
    S.upsertCoachCrmClient({
      ...c, cloudId:row.id, linkedUserId:row.client_id||c.linkedUserId||null,
      updatedAt:row.updated_at||c.updatedAt,
    });
    clients++;
  }

  for (const [kind, def] of Object.entries(CHILDREN)) {
    for (const item of local[kind] || []) {
      const cloudClientId = cloudByLocal.get(item[def.parent])
        || local.clients?.find((c)=>c.id===item[def.parent])?.cloudId;
      if (!cloudClientId) continue;
      const patch = def.patch(item, u.id, cloudClientId);
      let row = null;
      if (item.cloudId) {
        if (def.immutable) { records++; continue; }
        row = first(await update(def.table, patch, {
          id:`eq.${item.cloudId}`, coach_id:`eq.${u.id}`,
        }));
      } else {
        row = first(await insert(def.table, [patch]));
      }
      if (!row?.id) throw new Error(`No se pudo sincronizar ${kind}.`);
      S.addCoachCrmRecord(kind, {
        ...item, cloudId:row.id, updatedAt:row.updated_at||item.updatedAt,
      });
      records++;
    }
  }
  return { clients, records };
}

export async function pullCoachCrmFromCloud(S) {
  const u = assertCoachCloud();
  if (!S) return { clients:0, records:0 };

  const remoteClients = asArray(await select("coach_crm_clients", {
    coach_id:`eq.${u.id}`, order:"updated_at.asc", limit:"500",
  }));

  const remoteToLocal = new Map();
  let clients = 0, records = 0;

  for (const r of remoteClients) {
    const current = (S.data.coachCrm?.clients||[]).find((c)=>
      c.cloudId===r.id || (r.client_id && c.linkedUserId===r.client_id)
    );
    const localId = current?.id || `cloudcrm_${r.id}`;
    remoteToLocal.set(r.id, localId);
    if (!current || !crmNewer(current.updatedAt, r.updated_at)) {
      S.upsertCoachCrmClient({
        id:localId, cloudId:r.id, linkedUserId:r.client_id||null,
        name:r.name, email:r.email, phone:r.phone, status:r.status, source:r.source,
        note:r.note||"", createdAt:r.created_at, updatedAt:r.updated_at,
      });
      clients++;
    }
  }

  for (const [kind, def] of Object.entries(CHILDREN)) {
    const rows = asArray(await select(def.table, {
      coach_id:`eq.${u.id}`, order:"created_at.asc", limit:"2000",
    }));
    for (const r of rows) {
      const cloudParent = r.crm_client_id || r.referrer_crm_client_id;
      const localClientId = remoteToLocal.get(cloudParent);
      if (!localClientId) continue;
      const current = (S.data.coachCrm?.[kind]||[]).find((x)=>x.cloudId===r.id);
      const remoteUpdated = r.updated_at || r.created_at;
      if (current && crmNewer(current.updatedAt||current.at||current.createdAt, remoteUpdated)) continue;
      const mapped = def.from(r, localClientId);
      const id = current?.id || `cloud_${kind}_${r.id}`;
      S.addCoachCrmRecord(kind, { ...mapped, id });
      records++;
    }
  }

  return { clients, records };
}

export async function syncCoachCrmCloud(S) {
  const pulled = await pullCoachCrmFromCloud(S);
  const pushed = await pushCoachCrmToCloud(S);
  return {
    pulled,
    pushed,
    total: pulled.clients + pulled.records + pushed.clients + pushed.records,
  };
}
