#!/usr/bin/env node
// Regression: the original BAYONA orange must survive brand and auth layers.
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const rules = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

const index = read("index.html");
const brand = rules(read("css/bayona-brand.css"));
const auth = rules(read("css/auth.css"));
const pro = read("css/pro.css");
const sw = read("sw.js");

assert.match(pro, /--fit-accent:\s*#ff6a00/i, "Product's original accent must be orange");
assert.match(brand, /--fit-accent:\s*#ff6a00/i, "Brand must not replace product accent with the web's muted orange");
assert.match(brand, /--orange:\s*#ff6a00/i, "Product alias must retain original accent");
assert.match(auth, /\.auth-primary[\s\S]*?background:\s*#ff6a00/i, "Authentication CTA must match product");
assert.match(auth, /rgba\(255,\s*106,\s*0,/i, "Authentication ambient tint must match product");
assert.doesNotMatch(brand, /#f4a261/i, "Legacy web orange cannot override product palette");
assert.doesNotMatch(auth, /#f4a261/i, "Auth cannot disagree with product orange");
assert.match(index, /css\/bayona-brand\.css\?v=2/);
assert.match(index, /css\/auth\.css\?v=2/);
assert.match(sw, /bayona-shell-v45/, "Installed PWA must refresh its theme shell");
assert.match(sw, /\.\/css\/bayona-brand\.css/, "PWA must cache brand layer");
assert.match(sw, /\.\/css\/auth\.css/, "PWA must cache auth layer");

console.log("BAYONA: palette and installed PWA visual contract pass (12 checks).");
