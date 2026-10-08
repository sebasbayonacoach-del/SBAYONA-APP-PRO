#!/usr/bin/env node
// BAYONA · static performance budgets
// Protects the install shell from silently becoming multi-megabyte.

import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root=process.cwd();
const sw=readFileSync(join(root,"sw.js"),"utf8");
const shellBody=(sw.match(/const SHELL = \[([\s\S]*?)\];/)||[])[1]||"";
const entries=[...shellBody.matchAll(/["']\.\/([^"']+)["']/g)].map((m)=>m[1]);
const unique=[...new Set(entries)];
const errors=[];
let total=0;

for(const p of unique){
  try{total+=statSync(join(root,p)).size;}
  catch{errors.push(`missing shell asset: ${p}`);}
}

const heavyLazy=[
  "trainingym/catalog.json",
  "vendor/three.module.js",
  "vendor/mediapipe/wasm/vision_wasm_internal.wasm",
  "vendor/mediapipe/wasm/vision_wasm_nosimd_internal.wasm",
  "vendor/mediapipe/pose_landmarker_lite.task",
];
for(const p of heavyLazy){
  if(unique.includes(p))errors.push(`heavy lazy asset must not be precached: ${p}`);
}

const budgets={
  "css/pro.css":270_000,
  "js/state.js":80_000,
  "js/i18n.js":90_000,
  "trainingym/catalog.json":1_500_000,
};
for(const [p,max] of Object.entries(budgets)){
  const size=statSync(join(root,p)).size;
  if(size>max)errors.push(`${p} ${size} > budget ${max}`);
}

const SHELL_MAX=2_250_000;
if(total>SHELL_MAX)errors.push(`PWA shell ${total} > budget ${SHELL_MAX}`);

if(errors.length){
  console.error("\nPERF BUDGET FAILED");
  errors.forEach((e)=>console.error(" -",e));
  process.exit(1);
}
console.log(`PERF BUDGET OK · shell ${(total/1024/1024).toFixed(2)} MiB · ${unique.length} assets`);
