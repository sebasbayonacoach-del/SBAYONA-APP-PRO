#!/usr/bin/env node
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join,dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=(p)=>readFileSync(join(root,p),"utf8");
let pass=0;
const ok=(cond,msg)=>{assert.ok(cond,msg);pass++;console.log("  ✅ "+msg);};

console.log("\n☁️ COMMUNITY · CLOUD + RLS\n");

const sql=read("api/supabase/migrations/0007_community_referrals.sql");
const sync=read("js/sync/community.js");
const ui=read("js/ui/community.js");

for(const table of ["community_posts","community_reactions","user_referral_codes","user_referrals"]){
  ok(sql.includes(`create table if not exists ${table}`),`${table} existe`);
  ok(sql.includes(`alter table ${table} enable row level security`),`${table} tiene RLS`);
}
ok(sql.includes("unique(user_id,evidence_id)"),"un progreso no se duplica por usuario");
ok(sql.includes("community_set_author_name"),"nombre público lo fija el servidor");
ok(sql.includes("new.verification := 'client_registered'"),"cliente no puede autoverificarse como servidor");
ok(sql.includes("for select to authenticated using (true)"),"feed solo se abre a usuarios autenticados");
ok(sql.includes("auth.uid()=user_id"),"escritura de post/reacción exige propietario");

ok(sql.includes("unique references auth.users(id)")&&sql.includes("referred_id"),"cada cuenta solo puede tener un referrer");
ok(sql.includes("self referral not allowed"),"RPC bloquea autorreferidos");
ok(sql.includes("create_user_referral_code"),"código de referido se crea en servidor");
ok(sql.includes("accept_user_referral_code"),"conversión se confirma por RPC");
ok(!sql.includes("grant insert on user_referrals"),"cliente no inserta conversiones directamente");

ok(sync.includes("loadCommunityFeed"),"cliente carga feed real");
ok(sync.includes("publishCommunityPost"),"cliente publica en tabla social");
ok(sync.includes("toggleCommunityReactionCloud"),"reacciones cloud son mutables");
ok(sync.includes("getOrCreateReferralCode"),"cliente usa RPC de código");
ok(sync.includes("acceptReferralCode"),"cliente usa RPC de aceptación");
ok(sync.includes("myReferralStats"),"cliente lee conversiones verificadas");
ok(sync.includes("currentUser()")&&sync.includes("currentSession()"),"cloud exige sesión autenticada");
ok(!/SUPABASE_SERVICE_ROLE_KEY|service_role\s*[:=]/i.test(sync),"cliente no usa credencial privilegiada");

ok(ui.includes("renderCloudFeed(body)"),"pantalla integra feed cloud");
ok(ui.includes("currentSession()"),"sin sesión se mantiene fallback local");
ok(ui.includes("community.cloud.localSafe"),"fallo cloud preserva publicación local");
ok(ui.includes("getOrCreateReferralCode()")&&ui.includes("myReferralStats()"),"referidos verificados llegan del backend");
ok(ui.includes("acceptReferralCode(input.value)"),"usuario puede vincular código recibido");
ok(!ui.includes("addCredits")&&!ui.includes("fitcoin bonus referral"),"referido no otorga FitCoins locales sin verificación autoritativa");

console.log(`\n📊 RESULTADO: ${pass} pass · 0 fail\n`);
