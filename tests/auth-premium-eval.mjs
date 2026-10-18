import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

const source = read("js/ui/auth-gate.js");
const css = read("css/auth.css");
const html = read("index.html");
const sw = read("sw.js");
const beforeForm = source.indexOf('<form id="auth-form"');
const google = source.indexOf('data-auth-action="google"');

assert.ok(google > 0 && google < beforeForm, "Google sign-in appears above the email form");
assert.ok(source.includes('<svg class="auth-google-logo"'), "Official Google multicolor mark is inline");
assert.ok(source.includes('aria-describedby="auth-google-hint"'), "Google sign-in has explanatory status");
assert.ok(source.includes("probeBackend({ force: true"), "Click rechecks backend health");
assert.ok(source.includes('if (!accountCreationReady())'), "OAuth blocks unsafe registration");
assert.ok(!source.includes('state.busy || !canRegister ? "disabled"'), "Google action must allow safe retry while blocked");
assert.ok(source.includes('data-auth-action="reveal-password"'), "Password visibility is controllable");
assert.ok(source.includes('input.type = showing ? "text" : "password"'), "Visibility control changes input type");
assert.ok(source.includes('role="${state.tone === "error" ? "alert" : "status"}"'), "Errors are accessible");
assert.ok(css.includes("BAYONA ACCESS 2.0"), "Premium design layer is installed");
assert.ok(css.includes("grid-template-columns: minmax(0, 1fr) minmax(410px, 475px)"), "Desktop layout is controlled");
assert.ok(css.includes("@media (max-width: 900px)") && css.includes(".auth-editorial"), "Phone layout collapses");
assert.ok(css.includes("#f4a261") && !css.includes("#ff6a00"), "WEB palette is retained in front door");
assert.ok(html.includes('href="css/auth.css?v=2"'), "HTML does not reuse old stylesheet cache");
assert.ok(sw.includes('bayona-shell-v47'), "PWA shell cache changes for the new design");
console.log("BAYONA premium auth: 15 regression checks passed.");
