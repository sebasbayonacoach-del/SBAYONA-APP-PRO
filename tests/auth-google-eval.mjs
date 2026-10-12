import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { accountRole, googleOAuthUrl } from "../js/sync/supabase.js";

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
}finally{globalThis.sessionStorage=oldSessionStorage;}
const source=read("js/ui/auth-gate.js");
const backend=read("js/sync/supabase.js");
const main=read("js/main.js");
const shared=read("js/ui/shared.js");
const landing=read("js/ui/landing-boot.js");
const account=read("js/sync/account.js");
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
check(sql.includes("enable row level security") && sql.includes("revoke all"),"tabla de propietarios no es consultable por usuarios");
check(sql.includes("as restrictive for insert") && sql.includes("as restrictive for update") && sql.includes("as restrictive for delete"),"RLS prohíbe escritura Coach fuera de la cuenta dueña");
check(!sql.includes("UUID_REAL_DEL_PROPIETARIO"),"no se ha inventado ni sembrado el UUID del dueño");
console.log("\n"+n+" comprobaciones · 0 fallos\n");
