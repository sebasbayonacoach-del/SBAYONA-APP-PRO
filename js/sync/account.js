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
import {
  isConfigured, currentSession, currentUser, onAuth,
  signInWithPassword, signUpWithPassword, signInWithMagicLink,
  signOut, ensureFreshSession, refreshUser, completeAuthFromHash,
  select, insert, upsert, remove,
} from "./supabase.js";

TITLES.account = ["CUENTA", "BAYONA EN LA NUBE · TUS DATOS, TUS REGLAS"];

const STATE = { busy: false, last: null, error: null, pending: 0 };

/* ============================================================
   SINCRONIZACIÓN — espejo idempotente local → remoto
   ============================================================ */

/** 1. profile + 2. consents (PK natural = id/dominio → upsert) */
async function pushProfile() {
  const d = S.data;
  const u = currentUser();
  if (!u) throw new Error("sin sesión");
  await upsert("profiles", [{
    id: u.id,
    display_name: d.profile.name || null,
    height_cm: d.profile.heightCm || null,
    goals: [d.profile.goal].filter(Boolean),
  }]);
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

/** orquestador */
export async function syncNow(opts = {}) {
  if (STATE.busy) return false;
  STATE.busy = true;
  STATE.error = null;
  buildIfOpen();
  try {
    await ensureFreshSession();
    if (!currentSession()) throw new Error("inicia sesión para sincronizar");
    await pushProfile();
    await pushReadiness();
    await pushWorkouts();
    STATE.last = new Date().toISOString();
    STATE.pending = 0;
    if (!opts.silent) toast("SINCRONIZADO", "Tus datos están en la nube.");
  } catch (e) {
    STATE.error = e.message || String(e);
    STATE.pending = 1;
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

BUILDERS.account = (body) => {
  body = body || document.getElementById("drawer-body");
  body.textContent = "";
  open = true;

  // ---------- ESTADO ----------
  body.appendChild(el("div", "sec-label", "ESTADO"));
  const cfg = isConfigured();
  const ses = currentSession();
  const usr = currentUser();
  const st = el("div", "card shine");
  st.innerHTML = `
    <div class="card-row">
      <h4>${ses ? "EN LA NUBE" : "SOLO EN ESTE DISPOSITIVO"}</h4>
      <span class="pill ${ses ? "green" : "gold"}">${ses ? "CUENTA ACTIVA" : cfg ? "SIN SESIÓN" : "SIN CONFIGURAR"}</span>
    </div>
    <div class="sub">${ses
      ? `Conectado como <b>${esc(usr?.email || usr?.id || "usuario")}</b>. Tus datos viajan cifrados (TLS) y cada fila solo es tuya (RLS).`
      : cfg
        ? "Tu progreso se guarda aquí mismo. Inicia sesión para tener copia en la nube y poder cambiar de dispositivo."
        : "Falta la clave de Supabase en <b>js/sync/config.js</b>. La app funciona igualmente, 100 % local."}</div>
    <div class="kv"><span class="k">ÚLTIMA SINCRONIZACIÓN</span><span class="v">${STATE.last ? esc(fmtDate(STATE.last)) : "—"}</span></div>
    <div class="kv"><span class="k">EN COLA</span><span class="v">${STATE.pending ? "PENDIENTE" : "TODO ENVIADO"}</span></div>
    ${STATE.error ? `<div class="kv"><span class="k">AVISO</span><span class="v" style="color:var(--danger)">${esc(STATE.error)}</span></div>` : ""}`;
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
      msg.textContent = "Enviando…";
      try {
        await signInWithMagicLink(email(), location.origin + location.pathname);
        msg.textContent = "Email enviado. Revisa tu bandeja y pulsa el enlace.";
        toast("EMAIL ENVIADO", "Tu enlace de acceso está en camino.");
      } catch (e) { msg.textContent = "No se pudo enviar: " + e.message; }
    };
    bIn.onclick = async () => {
      msg.textContent = "Entrando…";
      try {
        await signInWithPassword(email(), pass());
        toast("SESIÓN INICIADA", "Ya estás en la nube.");
        buildIfOpen();
      } catch (e) { msg.textContent = "No se pudo entrar: " + e.message; }
    };
    bUp.onclick = async () => {
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
  bSync.disabled = !ses || STATE.busy;
  bSync.onclick = () => syncNow();
  const bPull = el("button", "btn btn-gold btn-block", "DESCARGAR COPIA DE LA NUBE");
  bPull.style.marginTop = "8px";
  bPull.disabled = !ses;
  bPull.onclick = pullBackup;
  dat.append(bSync, bPull);
  body.appendChild(dat);

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

// sincronizado suave al terminar un entreno o al recuperar red
on("session", () => { if (currentSession()) syncNow({ silent: true }); });
addEventListener("online", () => { if (currentSession()) syncNow({ silent: true }); });

// si el email trae token en el hash, completar sesión al arrancar
if (completeAuthFromHash()) {
  toast("SESIÓN INICIADA", "Bienvenido de vuelta.");
  refreshUser();
}
