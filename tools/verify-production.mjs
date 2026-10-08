#!/usr/bin/env node
// BAYONA · Production static verifier
// Sin dependencias externas: sintaxis, secretos obvios y contratos de despliegue.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";
import { spawnSync } from "node:child_process";

const root=process.cwd();
const errors=[];
const notes=[];
const fail=(m)=>errors.push(m);

function walk(dir,out=[]){
  let entries=[];
  try{entries=readdirSync(join(root,dir),{withFileTypes:true});}catch{return out;}
  for(const e of entries){
    const p=join(dir,e.name);
    if(e.isDirectory()){
      if(["node_modules",".git","vendor","mobile"].includes(e.name))continue;
      walk(p,out);
    }else out.push(p);
  }
  return out;
}

const code=walk("js").concat(walk("api"),walk("tests"),walk("tools"))
  .filter((p)=>[".js",".mjs",".cjs"].includes(extname(p)));

for(const p of code){
  const r=spawnSync(process.execPath,["--check",p],{cwd:root,encoding:"utf8"});
  if(r.status!==0)fail(`syntax ${p}: ${(r.stderr||r.stdout||"").trim().split("\n").slice(-2).join(" ")}`);
}

const clientFiles=walk("js").filter((p)=>[".js",".mjs"].includes(extname(p)));
for(const p of clientFiles){
  const txt=readFileSync(join(root,p),"utf8");
  if(/["'`]sk_(?:live|test)_[A-Za-z0-9_-]{8,}/.test(txt))fail(`Stripe secret literal in client: ${p}`);
  if(/SUPABASE_SERVICE_ROLE_KEY\s*[:=]/.test(txt))fail(`service_role credential assignment in client: ${p}`);
  if(/OPENAI_API_KEY\s*[:=]/.test(txt))fail(`OpenAI secret assignment in client: ${p}`);
  if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(txt))fail(`private key in client: ${p}`);
}

for(const p of walk("api").filter((x)=>x.endsWith(".js"))){
  const txt=readFileSync(join(root,p),"utf8");
  if(/access-control-allow-origin["']?\s*,\s*["']\*["']/i.test(txt))fail(`wildcard CORS in API: ${p}`);
}

const syncCfg=readFileSync(join(root,"js/sync/config.js"),"utf8");
if(/https:\/\/[a-z0-9-]+\.supabase\.co/i.test(syncCfg))fail("Supabase URL is hardcoded in js/sync/config.js");
if(/sb_publishable_[A-Za-z0-9_-]+/.test(syncCfg))fail("Supabase publishable key is hardcoded in js/sync/config.js");

const runtime=readFileSync(join(root,"api/runtime-config.js"),"utf8");
if(/FALLBACK_(URL|KEY)/.test(runtime))fail("runtime-config still has cloud fallback");
if(!/publicSupabaseEnv/.test(runtime))fail("runtime-config must use server env helper");

const coach=readFileSync(join(root,"api/coach.js"),"utf8");
if(!/verifySupabaseUser/.test(coach))fail("cloud Coach must verify BAYONA session");
if(!/applyCors/.test(coach))fail("cloud Coach must use origin-aware CORS");

try{
  JSON.parse(readFileSync(join(root,"package.json"),"utf8"));
  JSON.parse(readFileSync(join(root,"vercel.json"),"utf8"));
}catch(e){fail(`invalid JSON config: ${e.message}`);}

if(errors.length){
  console.error("\nPRODUCTION VERIFY FAILED");
  errors.forEach((e)=>console.error(" -",e));
  process.exit(1);
}
notes.push(`${code.length} JS files parse correctly`);
notes.push("no client secret literals detected");
notes.push("no wildcard CORS in API");
console.log("PRODUCTION VERIFY OK · "+notes.join(" · "));
