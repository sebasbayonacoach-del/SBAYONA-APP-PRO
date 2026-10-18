#!/usr/bin/env node
// BAYONA APP must use exactly the established BAYONA WEB palette.
// Reference: sebascontigo/bayona/src/styles.css and src/styles/ds-tokens.css.
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(new URL("../" + file, import.meta.url), "utf8");
const brand = read("css/bayona-brand.css");
const pro = read("css/pro.css");
const luxe = read("css/luxe.css");
const auth = read("css/auth.css");
const appearance = read("js/ui/appearance.js");
const aurum = read("css/aurum.css");
const sw = read("sw.js");
const html = read("index.html");
const rule = (css, name, color) =>
  new RegExp("--" + name + ":\\s*" + color.replace("#", "#") + "\\s*[;}]","i").test(css);

assert.ok(rule(brand, "orange", "#f4a261"), "APP orange matches WEB #F4A261");
assert.ok(rule(brand, "black", "#050505"), "APP base matches WEB #050505");
assert.ok(rule(brand, "metal", "#e76f51"), "APP fire matches WEB #E76F51");
assert.ok(rule(brand, "orange-deep", "#d45d38"), "APP orange deep matches WEB #D45D38");
assert.ok(rule(pro, "fit-accent", "#f4a261"), "PRO layer must not reinstate the old orange");
assert.ok(rule(pro, "orange", "#f4a261"), "PRO alias matches WEB");
assert.ok(rule(luxe, "luxe-accent", "#f4a261"), "Luxury accent matches WEB");
assert.match(appearance, /\["NARANJA",\s*"#f4a261"\]/i, "Appearance swatch matches WEB");
assert.match(auth, /\.auth-primary[\s\S]*?background:\s*#f4a261/i, "Sign-in CTA matches WEB");
assert.doesNotMatch([pro,luxe,appearance,aurum].join(""), /#ff6a00|rgba\(255,\s*106,\s*0/i, "Old bright orange must not reappear");
assert.match(sw,/bayona-shell-v46/, "New service worker version refreshes the PWA");
assert.match(html,/css\/pro\.css\?v=4/, "PRO CSS cache bust");
assert.match(html,/css\/luxe\.css\?v=2/, "Luxury CSS cache bust");

console.log("BAYONA WEB / APP exact palette parity: 13 checks passed.");
