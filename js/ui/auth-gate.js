// ============================================================
// BAYONA · FRONT DOOR 1.0
// Splash → Auth → perfil mínimo → producto.
// La landing pública sigue separada. Esta puerta es para APK/PWA instalada.
// ============================================================
import { loadApp } from "../app-loader.js";
import {
  accountRole,
  googleOAuthUrl,
  verifyCoachRole,
  completeAuthFromHash,
  currentSession,
  currentUser,
  ensureFreshSession,
  isConfigured,
  probeBackend,
  refreshUser,
  requestPasswordReset,
  select,
  signInWithPassword,
  signUpWithPassword,
  updatePassword,
  updateUserMetadata,
  upsert,
} from "../sync/supabase.js";
import {
  clearActiveIdentity,
  hasScopedState,
  importLegacyUserDataToActive,
  scopedStorage,
  setActiveIdentity,
} from "../sync/identity.js";
import { marcarPendiente } from "../sync/outbox.js";
import {
  displayNameFromUser,
  portableProfile,
  portableProfileFromUser,
} from "../sync/profile.js";
import {
  availabilityFromDays,
  legacyEquipmentFromPlaces,
  validateProfile,
} from "../personalization.js";

const APP_URL = "https://bayona-app-one.vercel.app/?source=pwa";
const LEGACY_KEY = "bayona.save.v2";
const ROLE_KEY = "bayona.entry.role.v1";

const GOALS = [
  ["BIENESTAR Y ADHERENCIA", "Sentirme mejor", "Energía, hábito y constancia"],
  ["COMPOSICIÓN CORPORAL", "Composición corporal", "Perder grasa o recomponer"],
  ["HIPERTROFIA MUSCULAR", "Ganar músculo", "Hipertrofia con progresión"],
  ["FUERZA Y POTENCIA", "Ser más fuerte", "Fuerza, potencia y control"],
  ["RENDIMIENTO DEPORTIVO", "Rendir mejor", "Transferencia a tu deporte"],
  ["MOVILIDAD Y FUNCIÓN", "Moverme mejor", "Movilidad, función y confianza"],
  ["VOLVER A ENTRENAR", "Volver a entrenar", "Retomar con progresión"],
];

const PLACES = [
  ["CASA · SIN MATERIAL", "Casa", "Sin material"],
  ["CASA · CON MATERIAL", "Casa + equipo", "Mancuernas, bandas, barra…"],
  ["GIMNASIO", "Gimnasio", "Equipamiento completo"],
  ["PARQUE / CALISTENIA", "Parque", "Calistenia y exterior"],
  ["BOX / ESTUDIO", "Box / estudio", "Entrenamiento guiado"],
  ["VIAJO MUCHO", "Viajo mucho", "Contexto variable"],
];

const EXPERIENCE = [
  ["EMPIEZO AHORA", "Estoy empezando"],
  ["ALGO DE EXPERIENCIA", "Ya entreno"],
  ["ENTRENO HACE AÑOS", "Entreno hace años"],
];

const FREQUENCIES = [
  [2, ["L", "J"]],
  [3, ["L", "X", "V"]],
  [4, ["L", "M", "J", "S"]],
  [5, ["L", "M", "X", "V", "S"]],
];

const state = {
  mode: "login",
  busy: false,
  message: "",
  tone: "",
  cloud: null,
  pendingEmail: "",
  pendingPassword: "",
  pendingName: "",
  profileStep: 0,
  profile: {
    name: "",
    goal: "BIENESTAR Y ADHERENCIA",
    experience: "ALGO DE EXPERIENCIA",
    place: "GIMNASIO",
    frequency: 3,
    minutes: 45,
  },
};

let root = null;
let surface = "APP";
let booted = false;
let googlePolling = null;
let oauthHandling = false;
function verifyOAuthAttempt(url) {
  const expected = sessionStorage.getItem("bayona.oauth.attempt.v1");
  const actual = url.searchParams.get("auth_state");
  if (!expected || !actual || expected !== actual) return false;
  sessionStorage.removeItem("bayona.oauth.attempt.v1");
  return true;
}


async function consumeGoogleCallback() {
  const native = globalThis.Capacitor?.Plugins?.LifeOS;
  if (!root || !native?.consumeAuthCallback || oauthHandling) return;
  oauthHandling = true;
  try {
    const callback = await native.consumeAuthCallback();
    if (!callback?.url) return;
    const url = new URL(callback.url);
    if (url.protocol !== "bayonafit:" || url.hostname !== "auth" || url.pathname !== "/callback") return;
    if (!verifyOAuthAttempt(url)) return setMessage("El intento de acceso no coincide. Inicia sesión otra vez.", "error");
    const error = new URLSearchParams(url.hash.replace(/^#/, "")).get("error_description")
      || url.searchParams.get("error_description");
    if (error) return setMessage("Google no pudo completar el acceso. Inténtalo de nuevo.", "error");
    if (!completeAuthFromHash(url.hash)) return setMessage("El acceso con Google no se completó.", "error");
    await refreshUser();
    await afterAuthenticated();
  } catch (error) {
    state.busy = false;
    setMessage(errorText(error), "error");
  } finally {
    oauthHandling = false;
  }
}

async function startGoogle() {
  if (state.busy) return;
  state.busy = true;
  state.message = "";
  render();
  try {
    const plugin = globalThis.Capacitor?.Plugins?.LifeOS;
    const url = googleOAuthUrl({ native: Boolean(plugin?.openOAuth) });
    if (plugin?.openOAuth) {
      await plugin.openOAuth({ url });
      if (!googlePolling) googlePolling = setInterval(consumeGoogleCallback, 750);
      state.busy = false;
      render();
    } else {
      location.assign(url);
    }
  } catch (error) {
    state.busy = false;
    setMessage(errorText(error), "error");
  }
}


const esc = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

function legacyProgress() {
  try {
    const data = JSON.parse(localStorage.getItem(LEGACY_KEY) || "null");
    return data?.profile?.onboarded ? data : null;
  } catch {
    return null;
  }
}

function setMessage(message = "", tone = "") {
  state.message = message;
  state.tone = tone;
  render();
}

function errorText(error) {
  const raw = String(error?.message || "");
  if (/invalid login credentials/i.test(raw)) return "Email o contraseña incorrectos.";
  if (/email not confirmed/i.test(raw)) return "Confirma tu correo antes de entrar.";
  if (/already registered|user already exists/i.test(raw)) return "Ese email ya tiene una cuenta. Entra con tu contraseña.";
  if (/password/i.test(raw) && /least|short|weak/i.test(raw)) return "Usa una contraseña de al menos 8 caracteres.";
  if (/network|fetch|failed to fetch/i.test(raw)) return "No pudimos conectar. Revisa tu internet e inténtalo otra vez.";
  return raw || "No pudimos completar la operación.";
}

function emailValid(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function hasUserLocalState(user) {
  return Boolean(user?.id && hasScopedState(user.id));
}

async function cloudProfile(user) {
  if (!user?.id) return null;
  try {
    const rows = await select("profiles", {
      id: "eq." + user.id,
      select: "id,display_name,role,goals",
      limit: "1",
    });
    return Array.isArray(rows) ? rows[0] || null : null;
  } catch {
    try {
      const rows = await select("profiles", {
        id: "eq." + user.id,
        select: "id,display_name,goals",
        limit: "1",
      });
      return Array.isArray(rows) ? rows[0] || null : null;
    } catch {
      return null;
    }
  }
}

async function saveCoreProfile(user, name, role, profile = null) {
  if (!user?.id) return;
  if (role === "coach" && accountRole() !== "coach")
    throw new Error("Coach Studio requiere la autorización del propietario.");
  const core = {
    id: user.id,
    display_name: String(name || "").trim().slice(0, 40) || null,
    goals: profile?.goals?.length ? profile.goals : [],
  };
  try {
    await upsert("profiles", [{ ...core, role: role === "coach" ? "coach" : "athlete" }]);
  } catch (error) {
    if (error?.status === 400 && /role|column|schema cache/i.test(error.message || "")) {
      await upsert("profiles", [core]);
    } else {
      throw error;
    }
  }
  await updateUserMetadata({
    display_name: core.display_name,
    ...(profile ? { bayona_profile: portableProfile({ ...profile, onboarded: true }) } : {}),
  });
}

function prepareProfileState({ user, row }) {
  const meta = portableProfileFromUser(user);
  const metaName = displayNameFromUser(user);
  const rowGoal = Array.isArray(row?.goals) ? row.goals[0] : null;
  state.profile = {
    name: meta?.name || row?.display_name || metaName || state.pendingName || "",
    goal: meta?.goalPrimary || rowGoal || "BIENESTAR Y ADHERENCIA",
    experience: meta?.experience || "ALGO DE EXPERIENCIA",
    place: meta?.trainingPlaces?.[0] || "GIMNASIO",
    frequency: Math.max(2, Math.min(5, meta?.weeklyAvailability?.days?.length || 3)),
    minutes: [15, 30, 45, 60].includes(Number(meta?.sessionMinutes)) ? Number(meta.sessionMinutes) : 45,
  };
  state.profileStep = 0;
}

async function hydratePortableProfile(user, profile) {
  if (!user?.id || !profile?.onboarded || hasUserLocalState(user)) return false;
  const { S } = await import("../state.js");
  S.init();
  S.onboard({
    ...profile,
    onboardingVersion: Math.max(4, Number(profile.onboardingVersion) || 0),
    onboardingCompletedAt: profile.onboardingCompletedAt || new Date().toISOString(),
  });
  return true;
}

function makeProfile() {
  const frequency = FREQUENCIES.find(([n]) => n === Number(state.profile.frequency)) || FREQUENCIES[1];
  const days = frequency[1];
  const place = state.profile.place;
  return validateProfile({
    name: state.profile.name,
    goalPrimary: state.profile.goal,
    goals: [state.profile.goal],
    experience: state.profile.experience,
    trainingPlaces: [place],
    availability: availabilityFromDays(days),
    equipment: legacyEquipmentFromPlaces([place]),
    weeklyAvailability: { days, preferredWindows: [], difficultDays: [] },
    sessionMinutes: Number(state.profile.minutes),
    preferredSessionRange: [String(state.profile.minutes)],
    coachPersona: "sebastian",
    membershipPlan: "free",
    onboardingVersion: 4,
    onboardingCompletedAt: new Date().toISOString(),
  });
}

async function persistLocalProfile(profile) {
  const { S } = await import("../state.js");
  S.init();
  if (!S.data.profile?.onboarded) S.onboard(profile);
  else {
    Object.assign(S.data.profile, profile, { onboarded: true });
    S.save();
  }
}

async function enterProduct({ guest = false, roleOverride = null } = {}) {
  state.busy = true;
  render();
  try {
    let role = roleOverride;
    if (guest) {
      clearActiveIdentity();
      role = "athlete";
    } else {
      const user = currentUser();
      if (user?.id) setActiveIdentity(user.id);
      role = role || accountRole();
    }

    const entryRole = !guest && accountRole() === "coach" ? "coach" : "affiliate";
    localStorage.setItem(ROLE_KEY, entryRole);

    await loadApp();

    // Activa el destino mientras Front Door todavía tapa el producto. Así el
    // selector de rol legado nunca parpadea entre Auth y Home/Coach Studio.
    const button = document.getElementById(entryRole === "coach" ? "entry-coach" : "entry-go");
    button?.click();
    root?.classList.add("auth-gate-leaving");
    await new Promise((resolve) => setTimeout(resolve, 180));
    document.body.classList.remove("auth-gate-active");
    root?.remove();
    root = null;
    if (googlePolling) clearInterval(googlePolling);
    googlePolling = null;

    if (entryRole !== "coach") {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("bayona:first-run-tour-request", { detail: { version: 1 } }));
      }, 900);
    }
  } catch (error) {
    state.busy = false;
    setMessage(errorText(error), "error");
  }
}

async function afterAuthenticated() {
  const user = await refreshUser() || currentUser();
  if (!user?.id) throw new Error("No pudimos validar tu sesión.");
  setActiveIdentity(user.id);

  const row = await cloudProfile(user);
  const role = await verifyCoachRole();

  if (role === "coach") {
    const name = row?.display_name || displayNameFromUser(user) || state.pendingName;
    if (!name) {
      prepareProfileState({ user, row });
      state.mode = "coach-profile";
      state.busy = false;
      render();
      return;
    }
    await saveCoreProfile(user, name, "coach");
    await enterProduct({ roleOverride: "coach" });
    return;
  }

  if (hasUserLocalState(user)) {
    await enterProduct({ roleOverride: "athlete" });
    return;
  }

  const portable = portableProfileFromUser(user);
  if (portable?.onboarded) {
    await hydratePortableProfile(user, portable);
    await enterProduct({ roleOverride: "athlete" });
    return;
  }

  // Una instalación anterior puede tener progreso sin cuenta. Nunca se
  // adjudica a una identidad automáticamente: el usuario confirma si es suyo.
  if (legacyProgress()) {
    prepareProfileState({ user, row });
    state.mode = "migrate";
    state.busy = false;
    render();
    return;
  }

  prepareProfileState({ user, row });
  state.mode = "profile";
  state.busy = false;
  render();
}


function authHeader(kicker, title, copy) {
  return `
    <header class="auth-card-head">
      <span class="auth-kicker">${esc(kicker)}</span>
      <h1>${esc(title)}</h1>
      <p>${esc(copy)}</p>
    </header>`;
}

function messageHtml() {
  if (!state.message) return "";
  return `<div class="auth-message ${state.tone === "error" ? "is-error" : "is-ok"}" role="status">${esc(state.message)}</div>`;
}

function authForm() {
  const signup = state.mode === "signup";
  return `
    <section class="auth-card" aria-label="${signup ? "Crear cuenta BAYONA" : "Entrar a BAYONA"}">
      ${authHeader(
        signup ? "NUEVA CUENTA" : "BIENVENIDO DE VUELTA",
        signup ? "Crea tu BAYONA." : "Continúa donde lo dejaste.",
        signup
          ? "Tu cuenta guarda tu identidad. El perfil se completa después, en menos de un minuto."
          : "Tu progreso, rutinas y espacio vuelven contigo."
      )}
      <div class="auth-tabs" role="tablist">
        <button type="button" data-auth-mode="login" class="${!signup ? "is-active" : ""}" role="tab" aria-selected="${!signup}">Entrar</button>
        <button type="button" data-auth-mode="signup" class="${signup ? "is-active" : ""}" role="tab" aria-selected="${signup}">Crear cuenta</button>
      </div>

      <form id="auth-form" novalidate>
        ${signup ? `
          <label class="auth-field"><span>Nombre</span><input id="auth-name" name="name" autocomplete="name" maxlength="40" value="${esc(state.pendingName)}" placeholder="Cómo quieres que te llamemos"></label>
          <p class="auth-entry-note">Tu espacio personal. Coach Studio está reservado al propietario de BAYONA.</p>
        ` : ""}
        <label class="auth-field"><span>Email</span><input id="auth-email" name="email" type="email" autocomplete="email" inputmode="email" value="${esc(state.pendingEmail)}" placeholder="tu@email.com"></label>
        <label class="auth-field"><span>Contraseña</span><input id="auth-password" name="password" type="password" autocomplete="${signup ? "new-password" : "current-password"}" minlength="8" placeholder="Mínimo 8 caracteres"></label>
        ${signup ? '<label class="auth-field"><span>Repite la contraseña</span><input id="auth-confirm" name="confirm" type="password" autocomplete="new-password" minlength="8" placeholder="Repite tu contraseña"></label>' : ""}
        ${!signup ? '<button class="auth-text-button" type="button" data-auth-action="forgot">He olvidado mi contraseña</button>' : ""}
        ${messageHtml()}
        <button class="auth-primary" type="submit" ${state.busy ? "disabled" : ""}>
          ${state.busy ? "UN MOMENTO…" : signup ? "CREAR MI CUENTA" : "ENTRAR"}
        </button>
      </form>
      <div class="auth-google-divider"><span>O CONTINÚA CON</span></div>
      <button class="auth-google-button" type="button" data-auth-action="google" ${state.busy ? "disabled" : ""}><span class="auth-google-mark">G</span> Continuar con Google</button>
      <div class="auth-security"><span>●</span> Conexión segura · datos separados por cuenta</div>
      ${legacyProgress() ? '<button type="button" class="auth-local" data-auth-action="local">Continuar con el progreso guardado en este dispositivo</button>' : ""}
    </section>`;
}

function verifyView() {
  return `
    <section class="auth-card auth-center">
      <div class="auth-big-mark">✉</div>
      ${authHeader("CONFIRMA TU EMAIL", "Revisa tu bandeja.", "Te enviamos la confirmación. Después vuelve aquí y entraremos con la cuenta que acabas de crear.")}
      <div class="auth-email-chip">${esc(state.pendingEmail)}</div>
      ${messageHtml()}
      <button class="auth-primary" type="button" data-auth-action="confirmed" ${state.busy ? "disabled" : ""}>${state.busy ? "COMPROBANDO…" : "YA LO CONFIRMÉ"}</button>
      <button class="auth-secondary" type="button" data-auth-mode="login">Volver a iniciar sesión</button>
    </section>`;
}

function resetView() {
  return `
    <section class="auth-card">
      ${authHeader("SEGURIDAD", "Crea una contraseña nueva.", "Usa al menos 8 caracteres. Al guardarla podrás seguir usando tu misma cuenta.")}
      <form id="auth-reset-form">
        <label class="auth-field"><span>Nueva contraseña</span><input id="auth-new-password" type="password" autocomplete="new-password" minlength="8"></label>
        <label class="auth-field"><span>Repite la contraseña</span><input id="auth-new-confirm" type="password" autocomplete="new-password" minlength="8"></label>
        ${messageHtml()}
        <button class="auth-primary" type="submit" ${state.busy ? "disabled" : ""}>${state.busy ? "GUARDANDO…" : "GUARDAR CONTRASEÑA"}</button>
      </form>
    </section>`;
}

function profileProgress(step, total) {
  return `<div class="auth-profile-progress"><span>PASO ${step + 1} DE ${total}</span><i><b style="width:${((step + 1) / total) * 100}%"></b></i></div>`;
}

function profileView() {
  const p = state.profile;
  const step = state.profileStep;
  const total = 3;

  if (step === 0) return `
    <section class="auth-card auth-profile-card">
      ${profileProgress(step, total)}
      ${authHeader("TU PERFIL", "¿Qué quieres conseguir?", "Una prioridad basta para darte un punto de partida. Después podrás cambiarlo cuando quieras.")}
      <label class="auth-field"><span>Cómo te llamamos</span><input id="profile-name" autocomplete="name" maxlength="40" value="${esc(p.name)}" placeholder="Tu nombre"></label>
      <div class="auth-choice-list" role="group" aria-label="Objetivo principal">
        ${GOALS.map(([value, label, copy]) => `<button type="button" data-profile-goal="${esc(value)}" class="${p.goal === value ? "is-active" : ""}"><span><strong>${esc(label)}</strong><small>${esc(copy)}</small></span><i>${p.goal === value ? "✓" : "→"}</i></button>`).join("")}
      </div>
      <button class="auth-primary" type="button" data-profile-next>CONTINUAR</button>
    </section>`;

  if (step === 1) return `
    <section class="auth-card auth-profile-card">
      ${profileProgress(step, total)}
      ${authHeader("TU CONTEXTO", "¿Cómo entrenas hoy?", "No buscamos etiquetarte: solo evitar darte una experiencia que no encaje contigo.")}
      <div class="auth-section-label">EXPERIENCIA</div>
      <div class="auth-pills" role="group" aria-label="Experiencia">
        ${EXPERIENCE.map(([value, label]) => `<button type="button" data-profile-experience="${esc(value)}" class="${p.experience === value ? "is-active" : ""}">${esc(label)}</button>`).join("")}
      </div>
      <div class="auth-section-label">DÓNDE SUELES ENTRENAR</div>
      <div class="auth-choice-grid" role="group" aria-label="Lugar de entrenamiento">
        ${PLACES.map(([value, label, copy]) => `<button type="button" data-profile-place="${esc(value)}" class="${p.place === value ? "is-active" : ""}"><strong>${esc(label)}</strong><small>${esc(copy)}</small></button>`).join("")}
      </div>
      <div class="auth-step-actions"><button class="auth-secondary" type="button" data-profile-back>ATRÁS</button><button class="auth-primary" type="button" data-profile-next>CONTINUAR</button></div>
    </section>`;

  return `
    <section class="auth-card auth-profile-card">
      ${profileProgress(step, total)}
      ${authHeader("TU SEMANA", "Haz que BAYONA quepa en tu vida.", "Elige una frecuencia y una duración realistas. El sistema podrá adaptarlas después.")}
      <div class="auth-section-label">DÍAS POR SEMANA</div>
      <div class="auth-number-grid">
        ${FREQUENCIES.map(([value]) => `<button type="button" data-profile-frequency="${value}" class="${Number(p.frequency) === value ? "is-active" : ""}"><b>${value}</b><span>días</span></button>`).join("")}
      </div>
      <div class="auth-section-label">TIEMPO POR SESIÓN</div>
      <div class="auth-number-grid">
        ${[15, 30, 45, 60].map((value) => `<button type="button" data-profile-minutes="${value}" class="${Number(p.minutes) === value ? "is-active" : ""}"><b>${value}</b><span>min</span></button>`).join("")}
      </div>
      <div class="auth-profile-summary">
        <span><small>OBJETIVO</small><strong>${esc(GOALS.find(([v]) => v === p.goal)?.[1] || p.goal)}</strong></span>
        <span><small>RITMO</small><strong>${esc(String(p.frequency))} días · ${esc(String(p.minutes))} min</strong></span>
      </div>
      ${messageHtml()}
      <div class="auth-step-actions"><button class="auth-secondary" type="button" data-profile-back>ATRÁS</button><button class="auth-primary" type="button" data-profile-finish ${state.busy ? "disabled" : ""}>${state.busy ? "CREANDO TU ESPACIO…" : "ENTRAR A BAYONA"}</button></div>
      <p class="auth-progressive-note">Después te pediremos seguridad, permisos o datos de salud solo cuando una función realmente los necesite.</p>
    </section>`;
}

function coachProfileView() {
  return `
    <section class="auth-card">
      ${authHeader("COACH STUDIO", "Crea tu perfil profesional.", "Tu nombre identificará tu espacio y tus futuras invitaciones de clientes.")}
      <label class="auth-field"><span>Nombre profesional</span><input id="coach-profile-name" autocomplete="name" maxlength="40" value="${esc(state.profile.name)}" placeholder="Tu nombre"></label>
      ${messageHtml()}
      <button class="auth-primary" type="button" data-coach-finish ${state.busy ? "disabled" : ""}>${state.busy ? "CREANDO STUDIO…" : "ABRIR COACH STUDIO"}</button>
    </section>`;
}

function migrateView() {
  const legacy = legacyProgress();
  const name = legacy?.profile?.name || "Perfil anterior";
  const workouts = Number(legacy?.stats?.workouts || 0);
  const xp = Number(legacy?.xp || 0);
  return `
    <section class="auth-card auth-center">
      <div class="auth-big-mark">↗</div>
      ${authHeader("PROGRESO ENCONTRADO", "¿Este progreso es tuyo?", "Encontramos una versión de BAYONA usada antes de crear esta cuenta. No la vincularemos sin tu permiso.")}
      <div class="auth-legacy-summary">
        <span><small>PERFIL</small><strong>${esc(name)}</strong></span>
        <span><small>ENTRENOS</small><strong>${esc(String(workouts))}</strong></span>
        <span><small>XP</small><strong>${esc(String(xp))}</strong></span>
      </div>
      <button class="auth-primary" type="button" data-auth-action="migrate" ${state.busy ? "disabled" : ""}>SÍ, USAR MI PROGRESO</button>
      <button class="auth-secondary" type="button" data-auth-action="fresh">NO, CREAR PERFIL NUEVO</button>
      <p class="auth-progressive-note">El original se conserva como copia local; importar no lo destruye.</p>
    </section>`;
}

async function migrateLegacyProgress() {
  const legacy = legacyProgress();
  const user = currentUser();
  if (!legacy || !user?.id) return;
  state.busy = true;
  render();
  try {
    importLegacyUserDataToActive();
    const role = await verifyCoachRole();
    try {
      await saveCoreProfile(user, legacy.profile?.name || displayNameFromUser(user), role, legacy.profile || null);
    } catch {
      marcarPendiente("migración de perfil local");
    }
    await enterProduct({ roleOverride: role });
  } catch (error) {
    state.busy = false;
    setMessage(errorText(error), "error");
  }
}

async function startFreshProfile() {
  const user = currentUser();
  const row = await cloudProfile(user);
  prepareProfileState({ user, row });
  state.mode = "profile";
  state.message = "";
  render();
}

function offlineView() {
  return `
    <section class="auth-card auth-center">
      <div class="auth-big-mark">⌁</div>
      ${authHeader("SIN CONEXIÓN", "BAYONA sigue aquí.", "No pudimos contactar con la nube. Si ya tienes progreso en este teléfono puedes continuar; para crear una cuenta necesitamos conexión.")}
      ${legacyProgress() ? '<button class="auth-primary" type="button" data-auth-action="local">CONTINUAR EN ESTE DISPOSITIVO</button>' : ""}
      <button class="auth-secondary" type="button" data-auth-action="retry">REINTENTAR</button>
    </section>`;
}

function splashView() {
  return `
    <div class="auth-splash" aria-label="BAYONA">
      <div class="auth-splash-mark"><i></i><span>◈</span></div>
      <strong>BAYONA</strong>
      <small>DONDE LA CIENCIA SE ENCUENTRA CON EL MOVIMIENTO</small>
    </div>`;
}

function shell(content) {
  return `
    <div class="auth-shell">
      <div class="auth-brand"><span>◈</span><strong>BAYONA</strong><small>${esc(surface)}</small></div>
      <main class="auth-stage">${content}</main>
      <footer class="auth-footer"><span>UNA CUENTA · TU PROGRESO</span><span>PRIVACIDAD POR DISEÑO</span></footer>
    </div>`;
}

function render() {
  if (!root) return;
  let content = "";
  if (state.mode === "splash") content = splashView();
  else if (state.mode === "verify") content = verifyView();
  else if (state.mode === "reset") content = resetView();
  else if (state.mode === "profile") content = profileView();
  else if (state.mode === "coach-profile") content = coachProfileView();
  else if (state.mode === "migrate") content = migrateView();
  else if (state.mode === "offline") content = offlineView();
  else content = authForm();
  root.innerHTML = state.mode === "splash" ? content : shell(content);
  wire();
}

async function submitAuth(event) {
  event.preventDefault();
  if (state.busy) return;

  const signup = state.mode === "signup";
  const email = root.querySelector("#auth-email")?.value.trim() || "";
  const password = root.querySelector("#auth-password")?.value || "";
  const confirm = root.querySelector("#auth-confirm")?.value || "";
  const name = root.querySelector("#auth-name")?.value.trim() || state.pendingName;

  state.pendingEmail = email;
  state.pendingPassword = password;
  state.pendingName = name;

  if (!emailValid(email)) return setMessage("Escribe un email válido.", "error");
  if (password.length < 8) return setMessage("La contraseña debe tener al menos 8 caracteres.", "error");
  if (signup && !name) return setMessage("Dinos cómo quieres que te llamemos.", "error");
  if (signup && password !== confirm) return setMessage("Las contraseñas no coinciden.", "error");

  state.busy = true;
  state.message = "";
  render();

  try {
    if (signup) {
      const result = await signUpWithPassword(email, password, "athlete", {
        display_name: name,
      });
      if (!result?.access_token) {
        state.mode = "verify";
        state.busy = false;
        render();
        return;
      }
      await afterAuthenticated();
      return;
    }

    await signInWithPassword(email, password);
    await afterAuthenticated();
  } catch (error) {
    state.busy = false;
    setMessage(errorText(error), "error");
  }
}

async function finishAthleteProfile() {
  if (state.busy) return;
  const name = root.querySelector("#profile-name")?.value.trim() || state.profile.name;
  if (name) state.profile.name = name;
  if (!state.profile.name) return setMessage("Escribe tu nombre para continuar.", "error");

  state.busy = true;
  state.message = "";
  render();

  try {
    const profile = makeProfile();
    const user = currentUser();
    // Local primero: crear el perfil no depende de que la red aguante justo este
    // segundo. Si cloud falla, account.js consumirá el outbox al reconectar.
    await persistLocalProfile(profile);
    try {
      await saveCoreProfile(user, profile.name, "athlete", profile);
    } catch {
      marcarPendiente("perfil inicial");
    }
    await enterProduct({ roleOverride: "athlete" });
  } catch (error) {
    state.busy = false;
    setMessage(errorText(error), "error");
  }
}

async function finishCoachProfile() {
  if (state.busy) return;
  const name = root.querySelector("#coach-profile-name")?.value.trim() || "";
  if (!name) return setMessage("Escribe el nombre que verán tus clientes.", "error");

  state.busy = true;
  state.message = "";
  render();
  try {
    const localProfile = validateProfile({
      name,
      goalPrimary: "BIENESTAR Y ADHERENCIA",
      goals: ["BIENESTAR Y ADHERENCIA"],
      experience: "ALGO DE EXPERIENCIA",
      trainingPlaces: ["GIMNASIO"],
      weeklyAvailability: { days: ["L", "X", "V"], preferredWindows: [], difficultDays: [] },
      sessionMinutes: 45,
      onboardingVersion: 4,
      onboardingCompletedAt: new Date().toISOString(),
    });
    await persistLocalProfile(localProfile);
    try {
      await saveCoreProfile(currentUser(), name, "coach", localProfile);
    } catch {
      marcarPendiente("perfil coach inicial");
    }
    await enterProduct({ roleOverride: "coach" });
  } catch (error) {
    state.busy = false;
    setMessage(errorText(error), "error");
  }
}

async function forgotPassword() {
  const email = root.querySelector("#auth-email")?.value.trim() || state.pendingEmail;
  if (!emailValid(email)) return setMessage("Escribe primero el email de tu cuenta.", "error");
  state.pendingEmail = email;
  state.busy = true;
  render();
  try {
    await requestPasswordReset(email, APP_URL);
    state.busy = false;
    setMessage("Te enviamos un enlace para recuperar tu contraseña.", "ok");
  } catch (error) {
    state.busy = false;
    setMessage(errorText(error), "error");
  }
}

async function confirmedEmail() {
  if (!state.pendingEmail || !state.pendingPassword) {
    state.mode = "login";
    state.busy = false;
    state.message = "Entra con el email que acabas de confirmar.";
    state.tone = "ok";
    render();
    return;
  }
  state.busy = true;
  render();
  try {
    await signInWithPassword(state.pendingEmail, state.pendingPassword);
    await afterAuthenticated();
  } catch (error) {
    state.busy = false;
    setMessage(errorText(error), "error");
  }
}

async function saveNewPassword(event) {
  event.preventDefault();
  const pass = root.querySelector("#auth-new-password")?.value || "";
  const confirm = root.querySelector("#auth-new-confirm")?.value || "";
  if (pass.length < 8) return setMessage("Usa al menos 8 caracteres.", "error");
  if (pass !== confirm) return setMessage("Las contraseñas no coinciden.", "error");
  state.busy = true;
  render();
  try {
    await updatePassword(pass);
    state.busy = false;
    state.message = "Contraseña actualizada.";
    state.tone = "ok";
    await afterAuthenticated();
  } catch (error) {
    state.busy = false;
    setMessage(errorText(error), "error");
  }
}

function wire() {
  root?.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.onclick = () => {
      state.mode = button.dataset.authMode;
      state.message = "";
      state.busy = false;
      render();
    };
  });

  root?.querySelector("#auth-form")?.addEventListener("submit", submitAuth);
  root?.querySelector('[data-auth-action="google"]')?.addEventListener("click", startGoogle);
  root?.querySelector("#auth-reset-form")?.addEventListener("submit", saveNewPassword);

  root?.querySelector('[data-auth-action="forgot"]')?.addEventListener("click", forgotPassword);
  root?.querySelector('[data-auth-action="confirmed"]')?.addEventListener("click", confirmedEmail);
  root?.querySelector('[data-auth-action="local"]')?.addEventListener("click", () => enterProduct({ guest: true }));
  root?.querySelector('[data-auth-action="retry"]')?.addEventListener("click", () => bootstrap());
  root?.querySelector('[data-auth-action="migrate"]')?.addEventListener("click", migrateLegacyProgress);
  root?.querySelector('[data-auth-action="fresh"]')?.addEventListener("click", startFreshProfile);

  root?.querySelectorAll("[data-profile-goal]").forEach((button) => {
    button.onclick = () => {
      state.profile.goal = button.dataset.profileGoal;
      const input = root.querySelector("#profile-name");
      if (input) state.profile.name = input.value.trim();
      render();
    };
  });
  root?.querySelectorAll("[data-profile-experience]").forEach((button) => {
    button.onclick = () => { state.profile.experience = button.dataset.profileExperience; render(); };
  });
  root?.querySelectorAll("[data-profile-place]").forEach((button) => {
    button.onclick = () => { state.profile.place = button.dataset.profilePlace; render(); };
  });
  root?.querySelectorAll("[data-profile-frequency]").forEach((button) => {
    button.onclick = () => { state.profile.frequency = Number(button.dataset.profileFrequency); render(); };
  });
  root?.querySelectorAll("[data-profile-minutes]").forEach((button) => {
    button.onclick = () => { state.profile.minutes = Number(button.dataset.profileMinutes); render(); };
  });

  root?.querySelector("[data-profile-next]")?.addEventListener("click", () => {
    const input = root.querySelector("#profile-name");
    if (input) {
      state.profile.name = input.value.trim();
      if (!state.profile.name) return setMessage("Escribe tu nombre para continuar.", "error");
    }
    state.message = "";
    state.profileStep = Math.min(2, state.profileStep + 1);
    render();
  });
  root?.querySelector("[data-profile-back]")?.addEventListener("click", () => {
    state.message = "";
    state.profileStep = Math.max(0, state.profileStep - 1);
    render();
  });
  root?.querySelector("[data-profile-finish]")?.addEventListener("click", finishAthleteProfile);
  root?.querySelector("[data-coach-finish]")?.addEventListener("click", finishCoachProfile);
}

async function bootstrap() {
  if (!root) return;
  state.mode = "splash";
  state.busy = false;
  state.message = "";
  render();

  const splashStarted = performance.now();
  const hashParams = new URLSearchParams((location.hash || "").replace(/^#/, ""));
  const recovery = hashParams.get("type") === "recovery";
  const pendingOAuth = sessionStorage.getItem("bayona.oauth.attempt.v1");
  const hasOAuthResponse = Boolean(hashParams.get("access_token") && new URL(location.href).searchParams.get("auth_state"));
  if (hasOAuthResponse && (!pendingOAuth || !verifyOAuthAttempt(new URL(location.href)))) {
    state.mode = "login";
    state.busy = false;
    return setMessage("No pudimos verificar el retorno de Google. Inténtalo de nuevo.", "error");
  }
  const hashSession = hasOAuthResponse || !hashParams.get("access_token") ? completeAuthFromHash() : null;

  let health = null;
  if (isConfigured()) health = await probeBackend({ timeoutMs: 3200 }).catch(() => null);
  state.cloud = health;

  const elapsed = performance.now() - splashStarted;
  if (elapsed < 620) await new Promise((resolve) => setTimeout(resolve, 620 - elapsed));

  if (hashSession) {
    await refreshUser().catch(() => null);
    if (recovery) {
      state.mode = "reset";
      render();
      return;
    }
  }

  const existing = currentSession();
  if (existing) {
    await ensureFreshSession().catch(() => existing);
    const user = await refreshUser().catch(() => null) || currentUser();
    if (user?.id) {
      await afterAuthenticated();
      return;
    }
    if (hasUserLocalState(existing?.user)) {
      await enterProduct({ roleOverride: "athlete" });
      return;
    }
  }

  if (health?.ok === false && !legacyProgress()) {
    state.mode = "offline";
    render();
    return;
  }

  state.mode = "login";
  render();
}

export async function launchAuthGate({ platform = "APP" } = {}) {
  if (booted && root) return;
  booted = true;
  surface = String(platform || "APP").toUpperCase();
  document.body.classList.add("auth-gate-active");

  root = document.getElementById("bayona-auth-gate");
  if (!root) {
    root = document.createElement("div");
    root.id = "bayona-auth-gate";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "Acceso a BAYONA");
    document.body.appendChild(root);
  }

  await bootstrap();
  if (root && globalThis.Capacitor?.Plugins?.LifeOS?.consumeAuthCallback) {
    if (!googlePolling) googlePolling = setInterval(consumeGoogleCallback, 750);
    consumeGoogleCallback();
  }
}
