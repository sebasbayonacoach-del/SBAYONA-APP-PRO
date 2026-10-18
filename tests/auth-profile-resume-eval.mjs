import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const src = readFileSync(new URL("../js/ui/auth-gate.js", import.meta.url), "utf8");
const profileFields = [
  "onboarding_version", "onboarding_completed_at", "privacy_notice_ack_at",
  "onboarding_goal", "onboarding_experience", "onboarding_place",
  "onboarding_frequency", "onboarding_minutes",
];
for (const field of profileFields) {
  assert.match(src, new RegExp('["\\']' + field + '["\\']'), "Missing persisted field in profile query: " + field);
}
assert.ok(src.includes('select: PROFILE_FIELDS'), "Full onboarding projection is used by cloudProfile");
assert.ok(!src.includes('select: "id,display_name,role,goals"'), "No truncated profile projection remains");
assert.ok(src.includes("row?.onboarding_version >= 5") && src.includes("row?.privacy_notice_ack_at"), "Entry still requires server-side completion");
assert.ok(src.includes('await afterAuthenticated();') && src.includes('setMessage(errorText(error), "error")'), "Bootstrap reports profile fetch failures without bypassing the auth gate");
assert.ok(src.includes('marcarPendiente("metadatos portables del perfil")'), "Optional metadata failure cannot invalidate verified onboarding");
assert.ok(src.includes("await saveCoreProfile(user, profile.name, \"athlete\", profile)"), "Completion still writes authoritative server profile");
console.log("BAYONA resumable authenticated onboarding: 14 regression checks passed.");
