// ============================================================
// BAYONA · SYNC/account — cuenta en la nube + sincronización
// ------------------------------------------------------------
// Política de la v1: "espejo". La verdad vive en el dispositivo y se
// refleja en Supabase de forma IDEMPOTENTE (borrar-y-reinsertar por
// alcance: usuario completo o sesión concreta). Así un reenvío o una
// red caída nunca duplican datos.
//
// Dominios sincronizados (los del esquema 0001_core.sql):
//   profiles · consents · readiness_daily · workout_sessions · sets_log
// GDPR: cero vídeo/frames. Salud solo con consentimiento activo.
// ============================================================
import { S, on } from "../state.js";
import { esc, fmtDate } from "../i18n.js";
import { UI, el, elT, toast, BUILDERS, TITLES, openSection } from "../ui/shared.js";
import { consentStatus, isGranted } from "../consents.js";
import { payloadMedidas, payloadAsignaciones, payloadAvatar } from "./mirror.js";
import * as outbox from "./outbox.js";
import {
  createInvite, acceptInvite, linkedClients, linkedCoaches, hydrateAssignmentsToLocal,
  completeCloudAssignment, flushCloudCompletions,
} from "./coaching.js";
import {
  isConfigured, probeBackend, currentSession, currentUser, accountRole, onAuth,
  signInWithPassword, signUpWithPassword, signInWithMagicLink,
  signOut, ensureFreshSession, refreshUser, completeAuthFromHash,
  select, insert, upsert, remove,
} from "./supabase.js";

TITLES.account = ["CUENTA", "BAYONA EN LA NUBE · TUS DATOS, TUS REGLAS"];

const STATE = {
  busy: false,
  last: null,
  error: null,
  cloud: null,
  cloudAt: 0,
  cloudProbeBusy: false,
};

async function refreshCloudHealth({ force = false, rebuild = false } = {}) {
  if (STATE.cloudProbeBusy) return STATE.cloud;
  STATE.cloudProbeBusy = true;
  try {
    const result = await probeBackend({ force });
    STATE.cloud = result;
    STATE.cloudAt = Date.now();
    return result;
  } finally {
    STATE.cloudProbeBusy = false;
    if (rebuild && open) buildIfOpen();
  }
}

async function requireCloud(messageNode = null) {
  const health = await refreshCloudHealth({ force: true });
  if (health?.ok) return true;
  if (messageNode) {
    messageNode.textContent = "La nube BAYONA no responde ahora. Tus datos locales siguen disponibles; reintenta cuando vuelva el servicio.";
  }
  return false;
}

/* ============================================================
   SINCRONIZACIÓN — espejo idempotente local → remoto
   ============================================================ */

/** 1. profile + 2. consents (PK natural = id/dominio → upsert) */
async function pushProfile() {
  const d = S.data;
  const u = currentUser();
  if (!u) throw new Error("sin sesión");
  const profileRow = {
    id: u.id,
    display_name: d.profile.name || null,
    height_cm: d.profile.heightCm || null,
    goals: [d.profile.goal].filter(Boolean),
  };
  try {
    await upsert("profiles", [{ ...profileRow, role: accountRole() }]);
  } catch (e) {
    // Compatibilidad con instalaciones que aún no aplicaron 0005_launch_coaching.sql.
    if (e?.status === 400 && /role|column|schema cache/i.test(e.message || "")) {
      await upsert("profiles", [profileRow]);
    } else {
      throw e;
    }
  }
  const rows = Object.entries(consentStatus()).map(([domain, v]) => ({
    user_id: u.id,
    domain,
    granted: Boolean(v.concedido),
    granted_at: v.desde || new Date().toISOString(),
    revoked_at: v.revocado ? (v.hasta || new Date().toISOString()) : null,
  }));
  if (rows.length) await upsert("consents", rows);
}

/** 3. readiness_daily (PK = user_id, day) */
async function pushReadiness() {
  const u = currentUser();
  const score = S.readiness();
  if (score == null) return;
  const day = new Date().toISOString().slice(0, 10);
  await upsert("readiness_daily", [{
    user_id: u.id, day, score,
    factors: S.readinessDetail().factors || {},
  }]);
}

/** 4-5. workout_sessions + sets_log (espejo total del usuario: borra y reinserta) */
async function pushWorkouts() {
  const u = currentUser();
  const sessions = [];
  const sets = [];

  for (const h of S.data.history || []) {
    const sid = h.sid || (h.sid = crypto.randomUUID());
    sessions.push({
      id: sid,
      user_id: u.id,
      plan_day_id: h.workoutId || h.id || null,
      started_at: h.at || h.startedAt || null,
      ended_at: h.at || h.endedAt || null,
      readiness_in: h.readiness ?? null,
      rpe_out: h.rpe ?? null,
      status: h.status || "completada",
    });
    (h.sets || []).forEach((s, i) => sets.push({
      session_id: sid,
      exercise_id: s.ex || s.exKey || null,
      set_no: s.setIdx ?? i + 1,
      reps: s.reps ?? null,
      load_kg: s.kg ?? null,
      rir: s.rir ?? null,
      form_score: s.formScore ?? null,
      rep_vel_loss: s.velLoss ?? null,
      landmarks_summary: s.landmarks || null,
    }));
  }

  await remove("workout_sessions", { user_id: `eq.${u.id}` }); // cascada → sets_log
  if (sessions.length) await insert("workout_sessions", sessions);
  if (sets.length) await insert("sets_log", sets);
}

/** espejo de MEDICIONES (tabla nueva: requiere migración 0002 aplicada) */
async function pushMedidas() {
  const u = currentUser();
  const p = payloadMedidas(u.id, S.medidasList());
  await remove(p.tabla, p.del);
  if (p.filas.length) await insert(p.tabla, p.filas);
}

/** espejo de ASIGNACIONES del entrenador (solo reales: la demo nunca se sube) */
async function pushAsignaciones() {
  const u = currentUser();
  const p = payloadAsignaciones(u.id, S.asignacionesDe("local"));
  await remove(p.tabla, p.del);
  if (p.filas.length) await insert(p.tabla, p.filas);
}

/** espejo del AVATAR 3D (tabla avatars: existe en el esquema base) */
async function pushAvatar() {
  const u = currentUser();
  const p = payloadAvatar(u.id, S.data.profile);
  await remove(p.tabla, p.del);
  if (p.filas.length) await insert(p.tabla, p.filas);
}

/** orquestador */
export async function syncNow(opts = {}) {
  if (STATE.busy) return false;
  STATE.busy = true;
  STATE.error = null;
  buildIfOpen();
  try {
    const health = await refreshCloudHealth();
    if (!health?.ok) throw new Error("servicio de nube temporalmente no disponible");
    await ensureFreshSession();
    if (!currentSession()) throw new Error("inicia sesión para sincronizar");
    await pushProfile();
    await pushReadiness();
    await pushWorkouts();
    // espejo ampliado: BEST-EFFORT (si falta la migración, el resto sincroniza igual)
    try { await pushMedidas(); await pushAsignaciones(); await pushAvatar(); }
    catch { /* tablas nuevas pendientes de migración: no rompe el espejo principal */ }
    STATE.last = new Date().toISOString();
    outbox.limpiar();
    if (!opts.silent) toast("SINCRONIZADO", "Tus datos están en la nube.");
  } catch (e) {
    STATE.error = e.message || String(e);
    outbox.registrarFallo(STATE.error);
    if (!opts.silent) toast("SIN PA CONEXIÓN", `No se pudo sincronizar: ${STATE.error}`, "danger");
  } finally {
    STATE.busy = false;
    buildIfOpen();
  }
  return !STATE.error;
}

/** descarga y ofrece la copia de la nube (no pisa lo local a ciegas) */
export async function pullBackup() {
  try {
    await ensureFreshSession();
    const u = currentUser();
    const [profiles, readiness, workout_sessions] = await Promise.all([
      select("profiles", { id: `eq.${u.id}` }),
      select("readiness_daily", { user_id: `eq.${u.id}`, order: "day.desc", limit: "30" }),
      select("workout_sessions", { user_id: `eq.${u.id}`, order: "started_at.desc", limit: "50" }),
    ]);
    const blob = { exportedAt: new Date().toISOString(), profiles, readiness, workout_sessions, local: S.data };
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(blob, null, 2)], { type: "application/json" }));
    a.download = `bayona-nube-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast("COPIA DESCARGADA", "Copia de la nube + copia local en un JSON.");
  } catch (e) {
    toast("ERROR", "No se pudo descargar la copia.", "danger");
  }
}

/* ============================================================
   CUENTA (UI)
   ============================================================ */
let open = false;
function buildIfOpen() { if (open) BUILDERS.account(document.getElementById("drawer-body")); }

onAuth(() => buildIfOpen());

function field(label, type, id, ph) {
  const wrap = el("div", "slider-row");
  const lab = el("label", "", label);
  const inp = el("input");
  inp.type = type; inp.id = id; inp.placeholder = ph || "";
  inp.autocomplete = type === "password" ? "current-password" : "email";
  wrap.append(lab, inp);
  return wrap;
}

function renderCoachingCloud(body) {
  if (!currentSession()) return;
  body.appendChild(el("div", "sec-label", accountRole() === "coach" ? "CLIENTES EN LA NUBE" : "MI COACH"));
  const card = el("div", "card");
  const title = el("h4", "", accountRole() === "coach" ? "VÍNCULOS COACH" : "CONECTAR CON MI COACH");
  const sub = el("div", "sub", accountRole() === "coach"
    ? "Crea un código temporal para vincular un cliente real. Solo los clientes vinculados pueden recibir tus rutinas."
    : "Introduce el código que te envía tu Coach. El vínculo es explícito y revocable.");
  const status = el("div", "media-caption", "Comprobando vínculos…");
  card.append(title, sub);

  if (accountRole() === "coach") {
    const invite = el("button", "btn btn-primary btn-block", "CREAR CÓDIGO DE INVITACIÓN");
    invite.style.marginTop = "12px";
    invite.onclick = async () => {
      invite.disabled = true;
      status.textContent = "Creando invitación…";
      try {
        await syncNow({ silent: true });
        const code = await createInvite(72);
        status.innerHTML = code
          ? `Código válido 72 h: <b class="mono">${esc(String(code))}</b>`
          : "No se pudo generar el código.";
        if (code) toast("INVITACIÓN CREADA", "Comparte el código con tu cliente.");
      } catch (e) {
        status.textContent = "No se pudo crear la invitación: " + (e.message || e);
      } finally {
        invite.disabled = false;
      }
    };
    card.appendChild(invite);
    linkedClients().then((clients) => {
      status.textContent = clients.length
        ? clients.map((c) => c.name).join(" · ")
        : "Todavía no tienes clientes vinculados.";
    }).catch((e) => {
      status.textContent = "El módulo de vínculos aún no está disponible: " + (e.message || e);
    });
  } else {
    const input = el("input");
    input.type = "text";
    input.maxLength = 16;
    input.placeholder = "CÓDIGO DEL COACH";
    input.autocomplete = "off";
    input.style.marginTop = "12px";
    const accept = el("button", "btn btn-primary btn-block", "VINCULAR MI CUENTA");
    accept.style.marginTop = "8px";
    accept.onclick = async () => {
      accept.disabled = true;
      status.textContent = "Vinculando…";
      try {
        const result = await acceptInvite(input.value);
        await hydrateAssignmentsToLocal(S).catch(() => 0);
        const coachName = result?.[0]?.coach_name || "tu Coach";
        status.textContent = "Vinculado con " + coachName + ".";
        toast("COACH VINCULADO", "Tu cuenta ya puede recibir rutinas.");
      } catch (e) {
        status.textContent = "No se pudo vincular: " + (e.message || e);
      } finally {
        accept.disabled = false;
      }
    };
    card.append(input, accept);
    linkedCoaches().then((coaches) => {
      status.textContent = coaches.length
        ? "Vinculado con: " + coaches.map((c) => c.name).join(" · ")
        : "No hay ningún Coach vinculado todavía.";
    }).catch((e) => {
      status.textContent = "El módulo de vínculos aún no está disponible: " + (e.message || e);
    });
  }

  card.appendChild(status);
  body.appendChild(card);
}

BUILDERS.account = (body) => {
  body = body || document.getElementById("drawer-body");
  body.textContent = "";
  open = true;

  // ---------- ESTADO ----------
  body.appendChild(el("div", "sec-label", "ESTADO"));
  const cfg = isConfigured();
  const ses = currentSession();
  const usr = currentUser();
  const cloudStale = !STATE.cloudAt || Date.now() - STATE.cloudAt > 30000;
  if (cfg && !STATE.cloudProbeBusy && (!STATE.cloud || cloudStale)) {
    refreshCloudHealth({ rebuild: true }).catch(() => {});
  }
  const cloudOk = STATE.cloud?.ok === true;
  const cloudDown = STATE.cloud?.ok === false;
  const cloudLabel = cloudOk ? "ONLINE" : cloudDown ? "SIN RESPUESTA" : cfg ? "COMPROBANDO" : "SIN CONFIGURAR";

  const st = el("div", "card shine");
  const heading = cloudDown
    ? (ses ? "SESIÓN LOCAL · NUBE NO DISPONIBLE" : "SOLO EN ESTE DISPOSITIVO")
    : ses ? (STATE.last ? "DATOS SINCRONIZADOS" : "CUENTA ACTIVA") : "SOLO EN ESTE DISPOSITIVO";
  const pillText = cloudDown
    ? "NUBE OFFLINE"
    : ses ? (STATE.last ? "NUBE OK" : "SESIÓN ACTIVA") : cfg ? (cloudOk ? "NUBE LISTA" : "COMPROBANDO") : "SIN CONFIGURAR";
  const pillTone = cloudDown ? "gold" : ses || cloudOk ? "green" : "gold";
  const statusCopy = cloudDown
    ? "El servicio de nube BAYONA no está respondiendo ahora. La app continúa funcionando con tus datos locales; no se marcará una sincronización como correcta hasta que el servidor vuelva."
    : ses
      ? `Conectado como <b>${esc(usr?.email || usr?.id || "usuario")}</b>. La sesión está activa; la app confirma la copia en nube únicamente después de una sincronización correcta.`
      : cfg
        ? "Tu progreso se guarda aquí mismo. Cuando la nube responda puedes iniciar sesión para tener copia y cambiar de dispositivo."
        : "La conexión de nube no está configurada. La app continúa funcionando de forma local y offline.";

  st.innerHTML = `
    <div class="card-row">
      <h4>${heading}</h4>
      <span class="pill ${pillTone}">${pillText}</span>
    </div>
    <div class="sub">${statusCopy}</div>
    <div class="kv"><span class="k">SERVICIO NUBE</span><span class="v">${cloudLabel}</span></div>
    ${ses ? `<div class="kv"><span class="k">ROL DE CUENTA</span><span class="v">${accountRole() === "coach" ? "COACH" : "CLIENTE"}</span></div>` : ""}
    <div class="kv"><span class="k">ÚLTIMA SINCRONIZACIÓN</span><span class="v">${STATE.last ? esc(fmtDate(STATE.last)) : "—"}</span></div>
    <div class="kv"><span class="k">EN COLA</span><span class="v">${outbox.estaPendiente() ? "PENDIENTE" : "TODO ENVIADO"}</span></div>
    ${STATE.error ? `<div class="kv"><span class="k">AVISO</span><span class="v" style="color:var(--danger)">${esc(STATE.error)}</span></div>` : ""}`;
  if (cfg && cloudDown) {
    const retryCloud = el("button", "btn btn-block", "REINTENTAR NUBE");
    retryCloud.style.marginTop = "12px";
    retryCloud.onclick = async () => {
      retryCloud.disabled = true;
      retryCloud.textContent = "COMPROBANDO…";
      await refreshCloudHealth({ force: true, rebuild: true }).catch(() => {});
    };
    st.appendChild(retryCloud);
  }
  body.appendChild(st);

  // ---------- ACCESO ----------
  if (!ses && cfg) {
    body.appendChild(el("div", "sec-label", "ACCESO"));
    const form = el("div", "card");
    form.innerHTML = `<h4>ENTRA EN TU CUENTA</h4><div class="sub">Email + contraseña. Recomendado: contraseña de 8+ caracteres y única para BAYONA.</div>`;
    form.append(field("EMAIL", "email", "ac-email", "tu@email.com"));
    form.append(field("CONTRASEÑA", "password", "ac-pass", "mínimo 8 caracteres"));
    const row = el("div", "opt-row");
    const bIn = el("button", "opt on", "ENTRAR");
    const bUp = el("button", "opt", "CREAR CUENTA");
    const bMagic = el("button", "opt", "MAGIC LINK");
    row.append(bIn, bUp, bMagic);
    form.appendChild(row);

    const msg = el("div", "media-caption", "");
    form.appendChild(msg);

    const email = () => form.querySelector("#ac-email").value.trim();
    const pass = () => form.querySelector("#ac-pass").value;

    bMagic.onclick = async () => {
      msg.textContent = "Comprobando nube…";
      if (!(await requireCloud(msg))) return;
      msg.textContent = "Enviando…";
      try {
        await signInWithMagicLink(email(), location.origin + location.pathname);
        msg.textContent = "Email enviado. Revisa tu bandeja y pulsa el enlace.";
        toast("EMAIL ENVIADO", "Tu enlace de acceso está en camino.");
      } catch (e) { msg.textContent = "No se pudo enviar: " + e.message; }
    };
    bIn.onclick = async () => {
      msg.textContent = "Comprobando nube…";
      if (!(await requireCloud(msg))) return;
      msg.textContent = "Entrando…";
      try {
        await signInWithPassword(email(), pass());
        await refreshUser();
        await hydrateAssignmentsToLocal(S).catch(() => 0);
        toast("SESIÓN INICIADA", "Ya estás en la nube.");
        buildIfOpen();
      } catch (e) { msg.textContent = "No se pudo entrar: " + e.message; }
    };
    bUp.onclick = async () => {
      msg.textContent = "Comprobando nube…";
      if (!(await requireCloud(msg))) return;
      msg.textContent = "Creando cuenta…";
      try {
        await signUpWithPassword(email(), pass());
        msg.textContent = "Cuenta creada. Si tu proyecto exige confirmar email, revisa tu bandeja.";
        toast("CUENTA CREADA", "Bienvenido a BAYONA.");
        buildIfOpen();
      } catch (e) { msg.textContent = "No se pudo crear: " + e.message; }
    };
    body.appendChild(form);
  }

  // ---------- DATOS ----------
  body.appendChild(el("div", "sec-label", "TUS DATOS"));
  const dat = el("div", "card");
  dat.innerHTML = `<h4>SINCRONIZACIÓN</h4><div class="sub">Perfil, consentimientos, preparación diaria, entrenos y series. Espejo idempotente: reenviar nunca duplica nada.</div>`;
  const bSync = el("button", "btn btn-primary btn-block", ses ? "SINCRONIZAR AHORA" : "SINCRONIZAR (requiere sesión)");
  bSync.style.marginTop = "12px";
  bSync.disabled = !ses || STATE.busy || cloudDown;
  bSync.onclick = () => syncNow();
  const bPull = el("button", "btn btn-gold btn-block", "DESCARGAR COPIA DE LA NUBE");
  bPull.style.marginTop = "8px";
  bPull.disabled = !ses || cloudDown;
  bPull.onclick = pullBackup;
  dat.append(bSync, bPull);
  body.appendChild(dat);

  // ---------- COACHING CLOUD ----------
  if (ses) renderCoachingCloud(body);

  // ---------- SESIÓN ----------
  if (ses) {
    const out = el("button", "btn btn-danger btn-block", "CERRAR SESIÓN");
    out.style.marginTop = "8px";
    out.onclick = async () => { await signOut(); toast("SESIÓN CERRADA", "Tus datos siguen en este dispositivo."); buildIfOpen(); };
    body.appendChild(out);
  }

  // ---------- PRIVACIDAD ----------
  body.appendChild(el("div", "sec-label", "PRIVACIDAD"));
  body.appendChild(el("div", "media-caption",
    "Nunca se suben vídeos ni frames: solo resúmenes numéricos de tus series. Los datos de salud exigen consentimiento activo y revocable por dominio (GDPR art. 9). Cada fila es visible solo para su dueño gracias a RLS."));
};

/* ---------- ganchos ---------- */
export function openAccount() { openSection("account"); }

/* ---------- reintentos y sincronización suave ----------
   El outbox (js/sync/outbox.js) recuerda que HAY algo por subir aunque
   se recargue la pestaña. Aquí se le da músculo: reintentos con backoff
   y espejo automático cuando cambian los datos sincronizados. */
let reintentoTimer = null;
let suaveTimer = null;

function reintentar() {
  if (reintentoTimer || typeof window === "undefined") return;
  reintentoTimer = setTimeout(async () => {
    reintentoTimer = null;
    if (!currentSession() || !outbox.estaPendiente()) return;
    const ok = await syncNow({ silent: true });
    if (!ok) reintentar();
  }, outbox.backoffMs());
}

/** cambios locales → marca la cola y sincroniza sin tocar la UI (debounce 8 s) */
function sincroSuave() {
  outbox.marcarPendiente("cambios locales");
  if (typeof window === "undefined") return;
  clearTimeout(suaveTimer);
  suaveTimer = setTimeout(async () => {
    if (!currentSession()) return; // sin sesión: la cola espera, no molesta
    const ok = await syncNow({ silent: true });
    if (!ok) reintentar();
  }, 8000);
}

// sincronizado suave al terminar un entreno o al cambiar medidas/asignaciones
on("session", sincroSuave);
on("medidas", sincroSuave);
on("asignaciones", sincroSuave);
on("cloud-assignment-complete", async (assignment) => {
  if (!assignment?.cloudAssignmentId || !currentSession()) return;
  try { await completeCloudAssignment(assignment.cloudAssignmentId); }
  catch { /* coaching.js deja la finalización en cola para reintentar */ }
});

// al volver la red: intento inmediato y, si falla, programa el siguiente
addEventListener("online", async () => {
  if (!currentSession()) return;
  await flushCloudCompletions().catch(() => 0);
  await hydrateAssignmentsToLocal(S).catch(() => 0);
  if (!outbox.estaPendiente()) return;
  const ok = await syncNow({ silent: true });
  if (!ok) reintentar();
});

// al arrancar: si quedó algo pendiente de una sesión anterior, reintentar
if (typeof window !== "undefined" && outbox.estaPendiente() && currentSession()) reintentar();

// si el email trae token en el hash, completar sesión al arrancar
if (completeAuthFromHash()) {
  toast("SESIÓN INICIADA", "Bienvenido de vuelta.");
  refreshUser()
    .then(() => hydrateAssignmentsToLocal(S))
    .catch(() => 0);
} else if (currentSession()) {
  ensureFreshSession()
    .then(() => refreshUser())
    .then(async () => {
      await flushCloudCompletions().catch(() => 0);
      return hydrateAssignmentsToLocal(S);
    })
    .catch(() => 0);
}
