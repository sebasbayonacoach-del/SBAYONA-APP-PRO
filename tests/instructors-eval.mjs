import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  INSTRUCTOR_CHOICES, EMPTY_INSTRUCTOR_MANIFEST,
  isInstructorMediaUrl, resolveInstructorVideo, instructorCoverage,
} from "../js/instructors.js";

const manifest = JSON.parse(readFileSync(new URL("../media/instructor-demos.json", import.meta.url), "utf8"));
assert.equal(manifest.version, 1);
assert.equal(Object.keys(manifest.exercises).length, 0, "No inventar videos finales del clon");
assert.deepEqual(INSTRUCTOR_CHOICES.map(x => x.id), ["reference", "sebas", "profesora"]);
const ex = { pos: 42, nombre: "Sentadilla" };
assert.equal(resolveInstructorVideo(manifest, ex, "sebas"), null);
assert.equal(resolveInstructorVideo(manifest, ex, "profesora"), null);
assert.equal(instructorCoverage(manifest, [ex], "sebas"), 0);
assert.equal(isInstructorMediaUrl("/media/instructors/sebas/42.mp4"), true);
assert.equal(isInstructorMediaUrl("./media/instructors/profesora/sentadilla.webm"), true);
for (const url of [
  "https://unlicensed.example.com/demostracion.mp4",
  "javascript:alert(1)",
  "/media/instructors/sebas/../otra.mp4",
  "/media/instructors/otro/42.mp4",
]) assert.equal(isInstructorMediaUrl(url), false, "Prohibir medios externos o rutas incorrectas");

const approved = {
  version: 1,
  exercises: {
    "42": {
      sebas: {
        url: "/media/instructors/sebas/42.mp4",
        published: true,
        identity_approved: true,
        rights_clear: true,
        technique_approved: true,
      },
    },
  },
};
assert.equal(resolveInstructorVideo(approved, ex, "sebas")?.url, "/media/instructors/sebas/42.mp4");
assert.equal(instructorCoverage(approved, [ex], "sebas"), 1);
assert.equal(resolveInstructorVideo(approved, ex, "profesora"), null);
for (const key of ["published", "identity_approved", "rights_clear", "technique_approved"]) {
  const copy = structuredClone(approved);
  copy.exercises["42"].sebas[key] = false;
  assert.equal(resolveInstructorVideo(copy, ex, "sebas"), null, "La aprobacion " + key + " es obligatoria");
}
const impersonation = structuredClone(approved);
impersonation.exercises["42"].profesora = impersonation.exercises["42"].sebas;
assert.equal(resolveInstructorVideo(impersonation, ex, "profesora"), null, "No usar contenido de Sebastian como profesora");
console.log("BAYONA APP 7.0: selector dual y barreras de publicacion de ejercicios verificadas.");
