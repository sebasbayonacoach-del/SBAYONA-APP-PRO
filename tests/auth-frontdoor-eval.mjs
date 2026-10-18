import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  activeIdentity, clearActiveIdentity, clearActiveUserData, hasScopedState,
  importLegacyUserDataToActive, scopedKey, scopedStorage, setActiveIdentity,
} from "../js/sync/identity.js";
import { portableProfile } from "../js/sync/profile.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
let ok = 0;
const check = (condition, message) => {
  assert(condition, message);
  ok++;
  console.log("  ✅", message);
};

console.log("\n🔐 BAYONA · FRONT DOOR / MULTIUSUARIO");

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(String(key), String(value)); }
  removeItem(key) { this.map.delete(String(key)); }
  key(index) { return [...this.map.keys()][index] ?? null; }
  get length() { return this.map.size; }
}

const store = new MemoryStorage();
check(activeIdentity(store) === "", "sin cuenta activa conserva namespace legado");
check(scopedKey("bayona.save.v2", store) === "bayona.save.v2", "guest usa la clave histórica y mantiene compatibilidad");

setActiveIdentity("user_alpha-123", store);
const alphaKey = scopedKey("bayona.save.v2", store);
check(alphaKey === "bayona.user.user_alpha-123::bayona.save.v2", "la cuenta A recibe namespace propio");
const scopedA = scopedStorage(store);
scopedA.setItem("bayona.save.v2", JSON.stringify({ profile: { name: "Alpha" } }));

setActiveIdentity("user_beta-456", store);
const betaKey = scopedKey("bayona.save.v2", store);
check(betaKey !== alphaKey, "dos cuentas del mismo teléfono nunca comparten clave principal");
check(scopedStorage(store).getItem("bayona.save.v2") === null, "la cuenta B no puede leer el estado local de A");
check(hasScopedState("user_alpha-123", "bayona.save.v2", store), "el estado de A sigue disponible al volver a su cuenta");
store.setItem("bayona.diary.v1", JSON.stringify([{ id: "legacy-diary" }]));
setActiveIdentity("user_gamma-789", store);
const imported = importLegacyUserDataToActive(store);
check(imported >= 1 && scopedStorage(store).getItem("bayona.diary.v1")?.includes("legacy-diary"), "migración confirmada copia también diario/consentimientos y datos auxiliares");
setActiveIdentity("user_alpha-123", store);
store.setItem("bayona.user.user_alpha-123::bayona.healthmap_v1", "salud-a");
store.setItem("bayona.user.user_beta-456::bayona.healthmap_v1", "salud-b");
store.setItem("bayona.theme.v1", "dark");
const removedForA = clearActiveUserData(store);
check(removedForA >= 2 && store.getItem(alphaKey) === null, "borrar datos vacía todo el namespace de la cuenta activa");
check(store.getItem("bayona.user.user_beta-456::bayona.healthmap_v1") === "salud-b", "borrado de A no toca datos de la cuenta B");
check(store.getItem("bayona.theme.v1") === "dark", "borrado personal conserva preferencias del dispositivo");
clearActiveIdentity(store);
check(activeIdentity(store) === "", "cerrar sesión vuelve al namespace invitado");

const portable = portableProfile({
  name: "Persona",
  goal: "FUERZA Y POTENCIA",
  goals: ["FUERZA Y POTENCIA"],
  trainingPlaces: ["GIMNASIO"],
  weeklyAvailability: { days: ["L", "X", "V"] },
  sessionMinutes: 45,
  onboarded: true,
  currentInjuries: "NO DEBE SALIR",
  healthContext: { currentPain: "NO DEBE SALIR", medications: "NO DEBE SALIR" },
  physiologySex: "female",
  weightKg: 70,
});
const serializedPortable = JSON.stringify(portable);
check(!/currentInjuries|currentPain|medications|physiologySex|weightKg/.test(serializedPortable), "metadata portable excluye salud y otros datos sensibles");
check(portable.name === "Persona" && portable.onboarded === true, "metadata portable conserva preferencias de bootstrap");

const authGate = readFileSync(resolve(root, "js/ui/auth-gate.js"), "utf8");
check(authGate.includes("auth-splash") && authGate.includes("Crea tu BAYONA"), "Front Door incluye splash y registro");
check(authGate.includes("He olvidado mi contraseña") && authGate.includes("updatePassword"), "recuperación y cambio de contraseña forman parte del flujo");
check(authGate.includes('state.mode = "profile"') && authGate.includes("PASO \${step + 1} DE \${total}"), "una cuenta nueva crea perfil antes de entrar");
check(authGate.includes('state.mode = "migrate"') && authGate.includes("¿Este progreso es tuyo?"), "progreso legado exige confirmación antes de vincularse");
check(authGate.includes("SÍ, USAR MI PROGRESO") && authGate.includes("NO, CREAR PERFIL NUEVO"), "la migración local es explícita y reversible");
check(!authGate.includes("Soy coach") && authGate.includes("Continuar con Google") &&
  authGate.includes('signUpWithPassword(email, password, "athlete"'),
  "registro público siempre usuario normal con Google opcional");
check(authGate.includes("Tus datos permanecen asociados a tu cuenta") && !authGate.includes("cifrado local garantizado"), "la UI comunica protección sin afirmar cifrado local inexistente");
check(authGate.includes("Esta confirmación no autoriza el tratamiento de datos de salud") && authGate.includes("auth-privacy-ack"), "onboarding exige lectura de privacidad y separa consentimientos sensibles");

const landing = readFileSync(resolve(root, "js/ui/landing-boot.js"), "utf8");
check(landing.includes('import("./auth-gate.js")') && landing.includes("if (appShell || nativeShell)"), "APK/PWA instalada abre Front Door antes del producto");
check(!landing.includes('import { launchAuthGate } from "./auth-gate.js"'), "web pública no descarga autenticación de forma eager");

const stateSource = readFileSync(resolve(root, "js/state.js"), "utf8");
check(stateSource.includes("scopedStorage()") && stateSource.includes("guardarSeguro(this.data, store, KEY)"), "progreso principal se guarda por identidad");

const outbox = readFileSync(resolve(root, "js/sync/outbox.js"), "utf8");
check(outbox.includes('import { scopedStorage } from "./identity.js"') && outbox.includes("return scopedStorage();"), "cola cloud queda aislada por cuenta");

for (const [file, label] of [
  ["js/consents.js", "consentimientos"],
  ["js/sync/coaching.js", "cola de coaching"],
  ["js/ui/core.js", "chat Coach"],
  ["js/health/healthUI.js", "Health Map"],
  ["js/vision/boot.js", "resúmenes de visión"],
  ["js/gym/store.js", "Coach Studio"],
  ["js/cycle.js", "ciclo"],
  ["js/data/offlineQueue.js", "cola de series"],
  ["js/diary/sessionDiary.js", "diario"],
  ["js/backup.js", "backups"],
]) {
  const source = readFileSync(resolve(root, file), "utf8");
  check(source.includes("scopedStorage"), label + " usa almacenamiento por identidad");
}

const avatar = readFileSync(resolve(root, "js/avatar3d.js"), "utf8");
check(avatar.includes("avatarCacheName") && avatar.includes("activeIdentity"), "avatar 3D usa CacheStorage separado por identidad");
check(avatar.includes("clearActiveAvatarCache") && avatar.includes("deleteAvatarBytes"), "avatar 3D puede eliminar bytes de la cuenta activa");
const appearance = readFileSync(resolve(root, "js/ui/appearance.js"), "utf8");
check(appearance.includes("deleteAvatarBytes") && appearance.includes("await deleteAvatarBytes"), "quitar avatar elimina su binario del namespace activo");
const deleteSource = readFileSync(resolve(root, "js/state.js"), "utf8");
check(deleteSource.includes("clearActiveUserData()") && deleteSource.includes("clearActiveAvatarCache"), "Eliminar datos vacía namespace personal y caché 3D");

const supabase = readFileSync(resolve(root, "js/sync/supabase.js"), "utf8");
check(supabase.includes("requestPasswordReset") && supabase.includes("updatePassword") && supabase.includes("updateUserMetadata"), "cliente Auth cubre registro, recuperación y perfil");
check(supabase.includes("if (e?.status === 400 || e?.status === 401 || e?.status === 403)") && supabase.includes("return session;"), "un corte de red no expulsa al usuario offline");
check(supabase.includes("setActiveIdentity") && supabase.includes("clearActiveIdentity"), "login/logout actualizan namespace local");

const account = readFileSync(resolve(root, "js/sync/account.js"), "utf8");
check((account.match(/location\.reload\(\)/g) || []).length >= 2, "cambiar o cerrar cuenta reinicia estado en memoria");
check(account.includes('on("profile", sincroSuave)'), "cambios de perfil entran en cola de sincronización");

const index = readFileSync(resolve(root, "index.html"), "utf8");
check(/href="css\/auth\.css\?v=\d+"/.test(index), "estilos Front Door forman parte del documento");
const authCss = readFileSync(resolve(root, "css/auth.css"), "utf8");
const authGateSource = readFileSync(resolve(root, "js/ui/auth-gate.js"), "utf8");
check(authCss.includes("#bayona-auth-gate .auth-field input") && authCss.includes("height: 48px"), "inputs del acceso conservan objetivo táctil de 48 px");
check(authCss.includes("#bayona-auth-gate .auth-text-button") && authCss.includes("min-height: 44px"), "recuperar contraseña conserva objetivo táctil de 44 px");
check(authGateSource.includes('class="auth-editorial"') && authGateSource.includes("ENTRENA.<br>REGISTRA."), "Front Door de escritorio conserva narrativa editorial BAYONA");
check(authCss.includes(".auth-body") && authCss.includes("minmax(440px, 520px)"), "Front Door conserva composición editorial de dos columnas");
check(authCss.includes("@media (max-width: 900px)") && authCss.includes(".auth-editorial"), "móvil conserva una única columna de acceso");

const sw = readFileSync(resolve(root, "sw.js"), "utf8");
check(/bayona-shell-v(?:4[4-9]|[5-9][0-9])/.test(sw) && sw.includes('"./js/ui/auth-gate.js"') && sw.includes('"./js/sync/identity.js"'), "PWA cachea puerta e identidad multiusuario");

const gradle = readFileSync(resolve(root, "mobile/android/app/build.gradle"), "utf8");
check(gradle.includes("versionCode 12") && gradle.includes('versionName "1.0.11-beta"'), "Android queda versionado como 1.0.11-beta");

console.log("\n📊 RESULTADO: " + ok + " comprobaciones · 0 fallos\n");
