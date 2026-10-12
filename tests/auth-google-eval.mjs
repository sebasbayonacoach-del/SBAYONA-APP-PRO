import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { accountRole, googleOAuthUrl, probeBackend } from "../js/sync/supabase.js";

let n=0;
function check(ok,label){assert.ok(ok,label);n++;console.log("  ✅ "+label);}
const read=(p)=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
console.log("\nBAYONA AUTH · GOOGLE + ÚNICO COACH\n");
check(accountRole()==="athlete","sin sesión validada jamás eres entrenador");

const oldSessionStorage=globalThis.sessionStorage;
globalThis.sessionStorage={
 m:new Map(), getItem(k){return this.m.get(k)||null},
 setItem(k,v){this.m.set(k,v)}, removeItem(k){this.m.delete(k)},
};
try{
 const native=new URL(googleOAuthUrl({native:true}));
 check(native.pathname==="/auth/v1/authorize" && native.searchParams.get("provider")==="google","Google usa OAuth de Supabase");
 const redirect=new URL(native.searchParams.get("redirect_to"));
 check(redirect.protocol==="bayonafit:" && redirect.host==="auth" && redirect.pathname==="/callback","Android usa deep-link dedicado");
 const nonce=globalThis.sessionStorage.getItem("bayona.oauth.attempt.v1");
 check(nonce?.length>20 && nonce===redirect.searchParams.get("auth_state"),"cada enlace tiene un estado local vinculado");
 const web=new URL(googleOAuthUrl({webOrigin:"https://bayona-app-one.vercel.app"}));
 check(web.searchParams.get("provider")==="google" && web.searchParams.get("redirect_to").startsWith("https://bayona-app-one.vercel.app/?source=pwa&auth_state="),
   "la PWA vuelve a su Front Door en el dominio oficial");
 const integrated=new URL(googleOAuthUrl({webOrigin:"https://bayona-jet.vercel.app/mi-app/"}));
 check(integrated.searchParams.get("redirect_to").startsWith("https://bayona-jet.vercel.app/mi-app/?source=pwa&auth_state="),
   "la app integrada conserva su subruta al volver de Google");
 const oldWindow=globalThis.window;
 const oldLocation=globalThis.location;
 globalThis.window={BAYONA_AUTH_ENTRY_URL:"/mi-app/index.html?source=pwa"};
 globalThis.location={origin:"https://bayona-jet.vercel.app",href:"https://bayona-jet.vercel.app/mi-app/index.html?source=pwa"};
 const explicit=new URL(googleOAuthUrl({webOrigin:"https://bayona-jet.vercel.app"}));
 check(explicit.searchParams.get("redirect_to").startsWith("https://bayona-jet.vercel.app/mi-app/index.html?source=pwa&auth_state="),
   "la integración puede fijar una entrada física estable para OAuth");
 globalThis.window=oldWindow;
 globalThis.location=oldLocation;
}finally{globalThis.sessionStorage=oldSessionStorage;}
const source=read("js/ui/auth-gate.js");
const backend=read("js/sync/supabase.js");
const main=read("js/main.js");
const shared=read("js/ui/shared.js");
const landing=read("js/ui/landing-boot.js");
const account=read("js/sync/account.js");
check(account.includes('if (failures.length) throw new Error("Sincronización parcial; pendientes: "') &&
  account.includes("outbox.registrarFallo(STATE.error)"),
  "los fallos de sincronización conservan el outbox y no confirman éxito");
const manifest=read("mobile/android/app/src/main/AndroidManifest.xml");
const plugin=read("mobile/android/app/src/main/java/app/bayona/fit/LifeOSPlugin.java");
const sql=read("api/supabase/migrations/0009_single_owner_google_auth.sql");
check(source.includes("Continuar con Google") && source.includes('data-auth-action="google"'),"Front Door muestra Google");
check(source.includes('signUpWithPassword(email, password, "athlete"') && source.includes("Nombre"),"registro público exige nombre y rol común");
check(!source.includes("Soy coach") && !source.includes("data-auth-role"),"nadie elige coach en un formulario");
check(source.includes("verifyCoachRole()") && source.includes("accountRole() === \"coach\""),"entrada a Coach depende de rol verificado");
check(backend.includes('return uid && uid === verifiedCoachId ? "coach" : "athlete"'),"metadatos mutables no autorizan Coach Studio");
check(backend.includes('bayona_role: "athlete"') && !backend.includes('return role === "coach"'),"un alta no envía rol coach");
check(source.includes("verifyOAuthAttempt") && source.includes('sessionStorage.removeItem("bayona.oauth.attempt.v1")'),"callback exige intento previo y consume su estado");
check(manifest.includes('android:scheme="bayonafit"') && manifest.includes('android:host="auth"'),"Android registra retorno OAuth");
check(plugin.includes("consumeAuthCallback") && plugin.includes("openOAuth") && plugin.includes("intent.setData(null)"),"Android consume enlace sin dejarlo en intent");
check(main.includes('role === "coach" && accountRole() === "coach"'),"botón coach antiguo no habilita modo coach");
check(main.includes('coach.hidden = accountRole() !== "coach"'),"tarjeta coach oculta para usuarios normales");
check(shared.includes('coachOnly.has(name) && accountRole() !== "coach"'),"rutas antiguas de gestión restringidas");
check(landing.includes('inferredRole === "coach" && accountRole() === "coach"'),"enlaces de marketing no dan privilegios");
check(account.includes("Escribe tu nombre para registrarte.") && !account.includes("bayona_role: accountRole()"),"registro legado pide nombre y no fija metadata privilegiada");
check(sql.includes("bayona_owner") && sql.includes("primary key") && sql.includes("is_bayona_coach"),"una sola identidad se autoriza desde Supabase");
check(sql.includes("enforce_bayona_profile_role") && sql.includes("before insert or update"),"trigger impide autoproclamación desde profiles");
check(sql.includes("sync_bayona_owner_role") && sql.includes("after insert or update or delete on public.bayona_owner"),"alta o revocación del propietario sincroniza automáticamente el rol");
check(sql.includes("enable row level security") && sql.includes("revoke all"),"tabla de propietarios no es consultable por usuarios");
check(sql.includes("as restrictive for insert") && sql.includes("as restrictive for update") && sql.includes("as restrictive for delete"),"RLS prohíbe escritura Coach fuera de la cuenta dueña");
check(!sql.includes("UUID_REAL_DEL_PROPIETARIO"),"no se ha inventado ni sembrado el UUID del dueño");
const originalFetch=globalThis.fetch;
try {
  globalThis.fetch=async(url)=>({status:String(url).includes("/rest/v1/profiles")?404:200});
  const missing=await probeBackend({force:true});
  check(missing.ok===true && missing.schemaReady===false && missing.schemaStatus===404,
    "Auth sano no oculta la ausencia de public.profiles");
  globalThis.fetch=async()=>({status:200});
  const ready=await probeBackend({force:true});
  check(ready.ok===true && ready.schemaReady===true,
    "RLS instalado desbloquea registros nuevos");
  globalThis.fetch=async(url)=>{
    if(String(url).includes("/rest/v1/"))throw new Error("network");
    return {status:200};
  };
  const degraded=await probeBackend({force:true});
  check(degraded.ok===true && degraded.schemaReady===false,
    "Auth existente sigue accesible si solo falla la comprobación REST");
}finally{globalThis.fetch=originalFetch;}

console.log("\n"+n+" comprobaciones · 0 fallos\n");
