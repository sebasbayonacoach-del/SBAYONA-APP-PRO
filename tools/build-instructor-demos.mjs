// BAYONA APP 7.0 — cero euros: publicar demostraciones originales aprobadas.
// Node.js >=22; sin servicios externos, modelos generativos ni dependencias.
import { readFileSync, writeFileSync, statSync, openSync, readSync, closeSync } from "node:fs";
import { resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const FLAGS = ["published", "identity_approved", "rights_clear", "technique_approved"];
const ROLES = new Set(["sebas", "profesora"]);

export function compileInstructorManifest(reviews, fileApproved) {
  if (!Array.isArray(reviews) || typeof fileApproved !== "function") {
    throw new Error("Se requieren reviews[] y una funcion de validacion de archivos");
  }
  const exercises = {};
  for (const [index, review] of reviews.entries()) {
    if (!review || typeof review !== "object" || Array.isArray(review)) {
      throw new Error("Revision " + index + ": formato invalido");
    }
    const id = String(review.exercise_id ?? "");
    if (!/^(?:0|[1-9][0-9]{0,4})$/.test(id)) throw new Error("Revision " + index + ": ID invalido");
    const role = review.instructor;
    if (!ROLES.has(role)) throw new Error("Revision " + index + ": instructor desconocido");
    const ext = review.extension;
    if (ext !== "mp4" && ext !== "webm") throw new Error("Revision " + index + ": extension no admitida");
    for (const flag of FLAGS) {
      if (review[flag] !== true) throw new Error("Revision " + index + ": falta aprobacion " + flag);
    }
    if (exercises[id]?.[role]) throw new Error("Revision " + index + ": demostracion duplicada");
    const url = "/media/instructors/" + role + "/" + id + "." + ext;
    if (fileApproved(url) !== true) throw new Error("Revision " + index + ": archivo ausente o invalido " + url);
    exercises[id] ??= {};
    exercises[id][role] = Object.fromEntries([["url", url], ...FLAGS.map(flag => [flag, true])]);
  }
  return {
    version: 1,
    notes: "Solo videos originales con autorizacion de identidad, derechos y revision tecnica individual.",
    instructors: {
      sebas: { name: "Sebastián Bayona", status: "in_production" },
      profesora: { name: "Profesora BAYONA", status: "in_production" }
    },
    exercises: Object.fromEntries(Object.entries(exercises).sort((a,b)=>Number(a[0])-Number(b[0])))
  };
}

function validLocalClip(url) {
  const path = resolve(root, "." + url);
  if (!path.startsWith(resolve(root, "media/instructors") + sep)) return false;
  let fd;
  try {
    const stats = statSync(path);
    if (!stats.isFile() || stats.size < 512) return false;
    fd = openSync(path, "r");
    const header = Buffer.alloc(16);
    if (readSync(fd, header, 0, 16, 0) < 16) return false;
    if (url.endsWith(".mp4")) return header.toString("ascii", 4, 8) === "ftyp";
    return header.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  } catch { return false; }
  finally { if (fd !== undefined) closeSync(fd); }
}

export function publishApprovedDemos({ write = false } = {}) {
  const reviewsPath = resolve(root, "media/instructor-reviews.json");
  const manifestPath = resolve(root, "media/instructor-demos.json");
  const reviewDoc = JSON.parse(readFileSync(reviewsPath, "utf8"));
  if (reviewDoc.version !== 1) throw new Error("Version de revisiones no admitida");
  const manifest = compileInstructorManifest(reviewDoc.reviews, validLocalClip);
  if (write) writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  return { total: Object.keys(manifest.exercises).length, videos: reviewDoc.reviews.length, write };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const result = publishApprovedDemos({ write: process.argv.includes("--write") });
    console.log(JSON.stringify(result) + (result.write ? " PUBLICADO" : " SIMULACION; usar --write para publicar"));
  } catch (error) {
    console.error("BAYONA: bloqueada la publicacion:", error.message);
    process.exitCode = 1;
  }
}
