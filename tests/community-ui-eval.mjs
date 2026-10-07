#!/usr/bin/env node
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join,dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=(p)=>readFileSync(join(root,p),"utf8");
let pass=0;
const ok=(cond,msg)=>{assert.ok(cond,msg);pass++;console.log("  ✅ "+msg);};

console.log("\n🤝 COMMUNITY + FITCOINS · CONTRATO UI\n");

const ui=read("js/ui/community.js");
const shell=read("js/ui.js");
const shared=read("js/ui/shared.js");
const state=read("js/state.js");
const domain=read("js/community.js");
const rewards=read("js/rewards.js");
const css=read("css/pro.css");
const sw=read("sw.js");

ok(ui.includes("BUILDERS.social"),"ruta social tiene builder real");
ok(shell.includes('import "./ui/community.js"'),"shell carga Comunidad");
ok(!shell.includes("Fuera de esta versión: sin funciones sociales"),"Comunidad ya no está bloqueada por toast");
ok(shared.includes('social:    { env: "home"'),"Comunidad tiene escena registrada");
ok(shared.includes('social:    [t("community.title")'),"título de Comunidad usa i18n");

ok(ui.includes("S.progressShareCandidates()"),"modal solo ofrece progreso verificable");
ok(ui.includes("S.createProgressPost"),"publicación usa estado canónico");
ok(!ui.includes('type="text" id="manual-pr"'),"UI no permite fabricar PR manual");
ok(ui.includes('t("community.verified")'),"posts muestran origen registrado");
ok(ui.includes("S.toggleCommunityReaction"),"reacciones persisten en estado");

ok(ui.includes("FITCOIN_REWARDS"),"tienda usa catálogo FitCoin canónico");
ok(ui.includes("S.redeemFitCoinReward"),"canje usa transacción canónica");
ok(ui.includes("S.isOwned"),"tienda evita cobrar lo ya poseído");
ok(ui.includes("community.store.physicalBody"),"productos físicos declaran separación de comercio real");
ok(!ui.includes("checkout(")&&!ui.includes("processPayment")&&!ui.includes("chargeCard"),"UI no finge cobro físico");
ok(domain.includes('kind:"digital"'),"catálogo FitCoin solo canjea digital");

ok(ui.includes("S.referralCode()"),"referidos usan código estable");
ok(ui.includes("S.recordReferralShare"),"solo compartir registra invitación");
ok(ui.includes("navigator.share")&&ui.includes("navigator.clipboard"),"share usa capacidades reales del dispositivo");
ok(domain.includes("referralsVerified"),"resumen distingue compartidos de verificados");
ok(!domain.includes("referralsVerified:d.referralInvites.length"),"compartir no equivale a conversión");

ok(state.includes("fitCoinLedger()"),"estado expone ledger FitCoin");
ok(state.includes("redeemFitCoinReward(rewardId)"),"estado expone canje");
ok(state.includes("community: communityDefaults({}, 120)"),"perfil nuevo nace con apertura FitCoin");
ok(rewards.includes("fitcoins: 20"),"sesión completa tiene bono FitCoin limitado");

ok(css.includes("43 · COMMUNITY + FITCOINS"),"Comunidad tiene capa visual");
ok(css.includes(".community-store-grid")&&css.includes(".community-ledger-row"),"tienda y ledger tienen layout");
ok(css.includes("@media(max-width:520px)"),"Comunidad contempla móvil");

ok(sw.includes("./js/community.js")&&sw.includes("./js/ui/community.js"),"Comunidad funciona offline");
ok(/CACHE = "bayona-shell-v43"/.test(sw),"shell PWA subió a v43");

console.log(`\n📊 RESULTADO: ${pass} pass · 0 fail\n`);
