import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFileSync, symlinkSync, unlinkSync } from "node:fs";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const serverFile=join(root,"tools/serve.mjs");
const port=await new Promise((resolve,reject)=>{
  const socket=createServer();
  socket.on("error",reject);
  socket.listen(0,"127.0.0.1",()=>{const n=socket.address().port;socket.close(()=>resolve(n));});
});
const env={...process.env,PORT:String(port)};
delete env.BAYONA_HOST;
delete env.BAYONA_COACH_API_KEY;
delete env.OPENAI_API_KEY;
const server=spawn(process.execPath,[serverFile],{cwd:root,env,stdio:"ignore"});
let checks=0;
const check=(condition,label)=>{assert.ok(condition,label);checks++;console.log("  PASS "+label);};
const head=async(path)=>fetch(`http://127.0.0.1:${port}${path}`,{method:"HEAD",signal:AbortSignal.timeout(1500)}).then(r=>r.status);
try {
  let ready=false;
  for(let i=0;i<45;i++){
    if(server.exitCode!==null)throw Error("Servidor terminó antes de arrancar");
    try { ready=(await head("/"))===200; if(ready)break; } catch {}
    await new Promise(r=>setTimeout(r,100));
  }
  check(ready,"servidor de prueba inicia en loopback");
  const publicPaths=[
    "/","/index.html","/sw.js","/manifest.webmanifest","/icon-192.png",
    "/js/coach-lab.js","/css/fitness.css","/trainingym/catalog.json",
  ];
  for(const p of publicPaths)check((await head(p))===200,"recurso público disponible: "+p);
  const privatePaths=[
    "/.git/config","/.env.example","/.gitignore","/.github/workflows/e2e.yml",
    "/tools/serve.mjs","/tests/run.mjs","/docs/MASTER_PLAN_BAYONA_ONE_2026-10-07.md",
    "/api/coach.js","/private-trainingym/","/package.json","/%2Egit/config",
    "/js/%2E%2E/.env.example","/js/%00hidden",
  ];
  for(const p of privatePaths)check((await head(p))!==200,"recurso privado rechazado: "+p);
  if(process.platform!=="win32"){
    const link=join(root,"js","__security-test-hidden__.js");
    symlinkSync(join(root,".env.example"),link);
    try { check((await head("/js/__security-test-hidden__.js"))!==200,"symlink a archivo privado bloqueado"); }
    finally { unlinkSync(link); }
  }
  check(readFileSync(serverFile,"utf8").includes('process.env.BAYONA_HOST || "127.0.0.1"'),"bind de red por defecto limitado a loopback");
  console.log("\nRESULTADO: "+checks+" comprobaciones · 0 fallos\n");
}finally{
  server.kill("SIGTERM");
}
