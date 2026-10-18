import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const src = readFileSync(new URL("../js/ui/auth-gate.js", import.meta.url),"utf8");
for (const item of ['goal: ""','experience: ""','place: ""','frequency: null','minutes: null']) {
 assert.ok(src.includes(item), "No silent exercise preferences: "+item);
}
for (const validation of [
 'Selecciona un objetivo principal para continuar.',
 'Selecciona tu experiencia entrenando.',
 'Elige dónde sueles entrenar.',
 'Selecciona cuántos días quieres entrenar.',
 'Selecciona cuánto tiempo tienes para entrenar.',
 'Completa los pasos anteriores para crear tu espacio.',
 'Lee y confirma la información de privacidad antes de continuar.'
]) {
 assert.ok(src.includes(validation),"Missing obligatory step: "+validation);
}
assert.ok(src.includes('if (!GOALS.some(([v]) => v === state.profile.goal)'),"Completion validates goals again");
assert.ok(src.includes('if (state.profileStep === 2 && !FREQUENCIES.some'),"Step 3 checks training days");
assert.ok((src.match(/\$\{messageHtml\(\)\}/g)||[]).length>=5,"Errors are shown in required steps");
console.log("BAYONA mandatory explicit onboarding choices: 15 assertions passed.");
