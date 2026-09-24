#!/usr/bin/env node
// ============================================================
// BAYONA · setup-recursos — trae los binarios desde su fuente oficial
// ------------------------------------------------------------------
// Por qué existe: los .wasm y los .task son binarios opacos y las
// heurísticas de antivirus los marcan dentro de un .zip. En vez de
// maquillar el fichero para engañar al análisis, el paquete NO lleva
// binarios: este script los descarga de la fuente original (Google /
// npm) y comprueba su SHA-256 contra los valores auditados.
//
// USO:   node setup-recursos.mjs     (o: npm run setup)
// Sale con código 1 si algún hash no coincide. NUNCA usa un fichero
// cuyo hash no sea el esperado.
// ============================================================
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync, existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));

/** Fuente oficial + SHA-256 esperado (auditado contra la fuente). */
const RECURSOS = [
  {
    dest: "vendor/three.module.js",
    url: "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
    sha256: "76dea8151bc9352aef3528b4262e249b2604f62543828328db978d060d61a495",
    autor: "MIT · mrdoob/three.js",
  },
  {
    dest: "vendor/mediapipe/vision_bundle.mjs",
    url: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs",
    sha256: "e77f281f9619150d937023c355bae170e9120e3b9e43f1e23a2a7bee07197669",
    autor: "Apache-2.0 · google-ai-edge/mediapipe",
  },
  {
    dest: "vendor/mediapipe/wasm/vision_wasm_internal.js",
    url: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm/vision_wasm_internal.js",
    sha256: "9440cf0cc0cea21800e31581ec32aeedcc5fbf9df4509796bbc7d3f99e52ab9c",
    autor: "Apache-2.0 · google-ai-edge/mediapipe",
  },
  {
    dest: "vendor/mediapipe/wasm/vision_wasm_internal.wasm",
    url: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm/vision_wasm_internal.wasm",
    sha256: "f82a8e6c05e08a44cc9f9e7ec5f845935bcbb1b1500ebe8c2f4812fb4e2917dc",
    autor: "Apache-2.0 · google-ai-edge/mediapipe",
  },
  {
    dest: "vendor/mediapipe/wasm/vision_wasm_nosimd_internal.js",
    url: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm/vision_wasm_nosimd_internal.js",
    sha256: "abe9b6fbeaf86fcb53a5edce3926c82ccb0619e18fed4d9d9ce561ee7f55e054",
    autor: "Apache-2.0 · google-ai-edge/mediapipe",
  },
  {
    dest: "vendor/mediapipe/wasm/vision_wasm_nosimd_internal.wasm",
    url: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm/vision_wasm_nosimd_internal.wasm",
    sha256: "38b61feab2fd7934e05cbe9f68baa308978a5e3b7f85c1913bb8ae89b8ef8b97",
    autor: "Apache-2.0 · google-ai-edge/mediapipe",
  },
  {
    dest: "vendor/mediapipe/pose_landmarker_lite.task",
    url: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
    sha256: "59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a",
    autor: "Apache-2.0 · Google MediaPipe",
  },
  {
    dest: "vendor/GLTFLoader.js",
    url: "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js",
    sha256: "d073b438e6a07e1359741dd5d6c76c953420cc0d4fd84eb1bdde94315540e6a3",
    autor: "MIT · mrdoob/three.js (avatar 3D)",
  },
  {
    dest: "vendor/utils/BufferGeometryUtils.js",
    url: "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/utils/BufferGeometryUtils.js",
    sha256: "9be041e96308775d00e2695cc607645b9a9b64fd7c0e759dd8f7c00a8d92becb",
    autor: "MIT · mrdoob/three.js (avatar 3D)",
  },
  {
    dest: "vendor/avaturn-sdk.js",
    url: "https://cdn.jsdelivr.net/npm/@avaturn/sdk/dist/index.js",
    sha256: "db9aed4f3a8b47c7c2ff89b70db6dc864765163eff36be59ecebf36eb0066754",
    autor: "Avaturn SDK v1.1.4 (avatar 3D, embed gratis)",
  },
];

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

async function traer(rec) {
  const destino = join(ROOT, rec.dest);
  if (existsSync(destino)) {
    const buf = await import("node:fs").then((m) => m.readFileSync(destino));
    const h = sha256(buf);
    if (h === rec.sha256) {
      console.log(`  ✅ ${rec.dest}  (ya presente y verificado)`);
      return true;
    }
    console.log(`  ⚠️  ${rec.dest} existe pero su hash NO coincide. Se descarga de nuevo.`);
  }
  console.log(`  ⬇  ${rec.dest}`);
  console.log(`     ${rec.url}`);
  const res = await fetch(rec.url);
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${rec.url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const h = sha256(buf);
  if (h !== rec.sha256) {
    console.error(`  ❌ HASH DISTINTO en ${rec.dest}`);
    console.error(`     esperado ${rec.sha256}`);
    console.error(`     obtenido ${h}`);
    console.error(`     El fichero NO se ha escrito. Revisa la URL o avisa al autor.`);
    return false;
  }
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, buf);
  console.log(`  ✅ ${rec.dest}  ${(buf.length / 1e6).toFixed(2)} MB · sha256 verificado`);
  return true;
}

console.log("\nBAYONA · descargando recursos desde sus fuentes oficiales\n");
let todo = true;
for (const rec of RECURSOS) {
  try {
    if (!(await traer(rec))) todo = false;
  } catch (e) {
    console.error(`  ❌ ${rec.dest}: ${e.message}`);
    todo = false;
  }
}
console.log(
  todo
    ? "\n✅ Todo verificado. Ya puedes ejecutar:  ./run.sh   →  http://localhost:8080\n"
    : "\n❌ Algún recurso no ha pasado la verificación. No se usa nada que no esté auditado.\n",
);
process.exit(todo ? 0 : 1);
