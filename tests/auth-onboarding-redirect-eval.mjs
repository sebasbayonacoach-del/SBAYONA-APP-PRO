import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const auth = source("js/ui/auth-gate.js");
const oauth = source("js/sync/supabase.js");
const db = source("api/supabase/migrations/0015_mandatory_athlete_onboarding.sql");
const gate = source("api/supabase/migrations/0016_server_enforced_onboarding_access.sql");

assert.ok(!oauth.includes("BAYONA_AUTH_ENTRY_URL"), "External presentation site cannot override APP OAuth destination");
assert.ok(oauth.includes('new URL("/?source=pwa", appOrigin)'), "OAuth ends in APP root for the initiating origin");
assert.ok(oauth.includes('callback.searchParams.set("auth_state", attempt)'), "OAuth state correlation is retained");
assert.ok(auth.includes('const total = 4'), "Athlete onboarding has four steps");
assert.ok(auth.includes('auth-privacy-ack'), "Privacy notice acknowledgement is explicit");
assert.ok(auth.includes('if (!state.profile.privacyAck)'), "Onboarding cannot finish without acknowledgement");
assert.ok(auth.includes('row?.onboarding_completed_at') && auth.includes('row?.onboarding_version >= 5'), "Server onboarding status, not browser metadata, controls entry");
assert.ok(!auth.includes('if (hasUserLocalState(user)) {\n    await enterProduct({ roleOverride: "athlete" });'), "Local progress does not bypass onboarding");
assert.ok(auth.includes('await saveCoreProfile(user, profile.name, "athlete", profile);'), "Server saves onboarding before entering app");
assert.ok(auth.includes('onboarding_completed_at: completedAt'), "Onboarding persisted in dedicated server columns");
assert.ok(auth.includes('privacy_notice_ack_at: completedAt'), "Privacy acknowledgement recorded on server");
assert.ok(auth.includes('await requestPasswordReset(email, APP_URL())'), "Recovery uses the initiating APP origin");
assert.ok(db.includes('CHECK (') && db.includes('onboarding_completed_at IS NULL'), "Incomplete profiles cannot assert valid completion");
assert.ok(db.includes('AFTER INSERT ON auth.users') && db.includes('ON CONFLICT (id) DO NOTHING'), "OAuth users get an idempotent minimal profile");
assert.ok(db.includes('bayona_create_profile_for_auth_user') && db.includes('SECURITY DEFINER SET search_path'), "Auth trigger is controlled");
assert.ok(gate.includes('public.bayona_may_use_product') && gate.includes('bayona_completed_onboarding_required'), "RLS blocks unonboarded users");
assert.ok(gate.includes('AS RESTRICTIVE FOR ALL TO authenticated'), "Policies are restrictive on reads and writes");
assert.ok(gate.includes("'coach_clients'") && gate.includes("'health_samples'") && gate.includes("'planner_items'"), "Coaching, health and planning are guarded");
console.log("BAYONA OAuth/app onboarding server contract: 18 checks passed.");
