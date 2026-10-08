import { strict as assert } from "node:assert";
import { createHmac } from "node:crypto";
import {
  verifyStripeSignature,normalizeStripeSubscription,subscriptionActive,PAID_PLANS,
} from "../api/_billing.js";

let pass=0;
const ok=(cond,msg)=>{assert.ok(cond,msg);pass++;console.log("  ✅ "+msg);};

console.log("\nPRODUCTION BILLING\n");

ok(PAID_PLANS.join(",")==="raiz,performance,elite","planes de pago canónicos");

const raw=JSON.stringify({id:"evt_test",type:"customer.subscription.updated"});
const secret="whsec_test_only";
const ts=Math.floor(Date.now()/1000);
const sig=createHmac("sha256",secret).update(`${ts}.${raw}`).digest("hex");
ok(verifyStripeSignature(raw,`t=${ts},v1=${sig}`,secret),"firma Stripe válida se acepta");
ok(!verifyStripeSignature(raw,`t=${ts},v1=deadbeef`,secret),"firma incorrecta se rechaza");
const old=ts-1000;
const oldSig=createHmac("sha256",secret).update(`${old}.${raw}`).digest("hex");
ok(!verifyStripeSignature(raw,`t=${old},v1=${oldSig}`,secret),"firma fuera de tolerancia se rechaza");

const row=normalizeStripeSubscription({
  id:"sub_123",customer:"cus_123",status:"active",
  current_period_end:ts+3600,cancel_at_period_end:false,
  metadata:{user_id:"11111111-1111-1111-1111-111111111111",plan:"performance"},
  items:{data:[]},
});
ok(row?.plan==="performance"&&row.user_id.startsWith("1111"),"suscripción conserva usuario y plan");
ok(row?.subscription_id==="sub_123"&&row.customer_id==="cus_123","IDs Stripe quedan separados");
ok(subscriptionActive(row),"active habilita entitlement");
ok(subscriptionActive({...row,status:"trialing"}),"trialing habilita entitlement");
ok(!subscriptionActive({...row,status:"past_due"}),"past_due no se presenta como activo");
ok(normalizeStripeSubscription({id:"sub",status:"active",metadata:{plan:"elite"}})===null,"sin user_id no se fabrica entitlement");

console.log(`\nRESULTADO: ${pass} pass · 0 fail\n`);
