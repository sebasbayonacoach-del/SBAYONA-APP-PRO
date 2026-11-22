import assert from "node:assert/strict";
import { compileInstructorManifest, publishApprovedDemos } from "../tools/build-instructor-demos.mjs";
const none = compileInstructorManifest([], () => false);
assert.equal(none.version, 1);
assert.deepEqual(none.exercises, {});
assert.equal(publishApprovedDemos().videos, 0, "No publicar clones sin material aprobado");
const good = {
 exercise_id: 42, instructor: "sebas", extension: "mp4",
 published: true, identity_approved: true, rights_clear: true, technique_approved: true
};
const manifest = compileInstructorManifest([good], () => true);
assert.equal(manifest.exercises["42"].sebas.url, "/media/instructors/sebas/42.mp4");
assert.equal(manifest.exercises["42"].sebas.technique_approved, true);
assert.throws(() => compileInstructorManifest([good], () => false), /archivo ausente/);
assert.throws(() => compileInstructorManifest([{ ...good, exercise_id: "../42" }], () => true), /ID invalido/);
assert.throws(() => compileInstructorManifest([{ ...good, instructor: "otro" }], () => true), /instructor desconocido/);
assert.throws(() => compileInstructorManifest([{ ...good, extension: "mov" }], () => true), /extension/);
assert.throws(() => compileInstructorManifest([{ ...good }, { ...good }], () => true), /duplicada/);
for (const flag of ["published", "identity_approved", "rights_clear", "technique_approved"]) {
 assert.throws(() => compileInstructorManifest([{ ...good, [flag]: false }], () => true), new RegExp(flag));
}
assert.equal(compileInstructorManifest([{ ...good, instructor: "profesora", extension: "webm" }], () => true).exercises["42"].profesora.url, "/media/instructors/profesora/42.webm");
console.log("BAYONA: pipeline gratuito de videos aprobados, seguridad y modo sin escritura OK");
