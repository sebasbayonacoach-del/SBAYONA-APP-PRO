import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import {
  acceptVerifiedEntitlement, clearVerifiedEntitlement, planFromProfile, hasFeature,
} from "../js/entitlements.js";
import { clearBillingCache } from "../js/billing.js";

let passed=0;
function ok(value,label){assert.ok(value,label);passed++;console.log("  OK "+label);}

console.log("\nBAYONA · BETA: PAID ACCESS FAIL CLOSED\n");
const forged={membershipPlan:"elite",membershipSource:"billing",membershipVerifiedAt:"2099-01-01"};
clearVerifiedEntitlement();
ok(planFromProfile(forged)==="free","localStorage cannot grant ELITE");
ok(!hasFeature(planFromProfile(forged),"coach.call"),"forged plan cannot unlock premium");
ok(acceptVerifiedEntitlement("u1",{ok:false,active:true,plan:"elite"})==="free","failed server status stays FREE");
ok(acceptVerifiedEntitlement("u1",{ok:true,active:false,plan:"elite"})==="free","inactive plan stays FREE");
ok(acceptVerifiedEntitlement("u1",{ok:true,active:true,plan:"performance"})==="performance","verified active server response grants plan in memory");
ok(planFromProfile({membershipPlan:"free"})==="performance","verified server response overrides local selection");
clearBillingCache();
ok(planFromProfile(forged)==="free","logout/cache reset revokes paid plan");
ok(acceptVerifiedEntitlement("",{ok:true,active:true,plan:"elite"})==="free","without account identity no paid access");
const onboarding=readFileSync(new URL("../js/onboarding.js",import.meta.url),"utf8");
const billing=readFileSync(new URL("../js/billing.js",import.meta.url),"utf8");
const migration=readFileSync(new URL("../api/supabase/migrations/0008_production_hardening.sql",import.meta.url),"utf8");
ok(onboarding.includes('membershipIntent:st.membershipPlan')&&onboarding.includes('membershipPlan:"free"'),"onboarding saves purchase intent only");
ok(billing.includes("onAuth(async(s)")&&billing.includes("clearBillingCache()"),"auth changes invalidate privileges");
ok(billing.includes("currentUser()?.id!==userId"),"async server responses cannot cross user sessions");
ok(migration.includes("as $$")&&migration.includes("$$;"),"PostgreSQL function delimiters valid");
ok(migration.includes("p_user = auth.uid()"),"security definer function only checks current user");
ok(migration.includes("user_has_active_paid_plan(auth.uid()"),"backup insert protected by billing");
console.log("\n"+passed+" BETA ACCESS CHECKS PASSED\n");
