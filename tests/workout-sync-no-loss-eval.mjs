import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { workoutSyncPayload } from "../js/sync/workouts.js";
let n = 0, counter = 0;
const ok = (v, name) => { assert.ok(v, name); n++; };
const uuid = () => "00000000-0000-4000-8000-" + String(++counter).padStart(12, "0");

const dayOff = { date: "2026-11-17", workouts: 0, sets: 0, setLog: [] };
const dayTraining = {
  date: "2026-11-18", workouts: 1, sets: 3, setLog: [
    { ex: "squat", reps: 8, kg: 50 },
    { exKey: "squat", reps: 7, kg: 50 },
  ],
  privateNote: "No sincronizar",
  video: "blob:private-video",
};
const history = [dayOff, dayTraining];
const first = workoutSyncPayload("coach-test-user", history, uuid);
ok(first.changed === true, "genera identificadores persistibles para sesión y series");
ok(first.sessions.length === 1, "ignora los días sin sesión real");
ok(first.sets.length === 2, "history.sets numérico usa setLog real sin fallar");
ok(first.sessions[0].user_id === "coach-test-user", "sesión pertenece al usuario");
ok(first.sets.every((s) => s.session_id === first.sessions[0].id), "cada serie usa el ID de la sesión");
ok(first.sets.every((s) => /^[0-9a-f-]{36}$/i.test(s.client_id)), "IDs de serie válidos");
ok(first.sets[0].exercise_id === "squat" && first.sets[1].exercise_id === "squat", "id de ejercicio compatibilidad ex/exKey");
ok(first.sets[0].set_no === 1 && first.sets[1].set_no === 2, "orden de series determinista");
ok(!JSON.stringify(first).includes("No sincronizar") && !JSON.stringify(first).includes("private-video"), "nunca sube notas ni vídeo del usuario");
ok(!dayOff.sid, "un día de descanso no recibe sesión artificial");
ok(!!dayTraining.sid && !!dayTraining.setLog[0].clientId, "los IDs quedan fijados en la historia local");

const second = workoutSyncPayload("coach-test-user", history, uuid);
ok(second.changed === false, "reintento idempotente no cambia IDs");
ok(second.sessions[0].id === first.sessions[0].id, "sesión idéntica entre reintentos");
ok(second.sets[0].client_id === first.sets[0].client_id, "serie idéntica entre reintentos");
ok(counter === 3, "no crea nuevos UUID al reenviar");
dayTraining.setLog[0].reps = 9;
const edited = workoutSyncPayload("coach-test-user", history, uuid);
ok(edited.sets[0].reps === 9 && edited.sets[0].client_id === first.sets[0].client_id, "editar serie actualiza mismo registro");

const legacy = { workoutId: "sesion-real", sets: [{ ex: "pull-up", reps: 5, setIdx: 4 }] };
const old = workoutSyncPayload("athlete-test-user", [legacy], uuid);
ok(old.sessions.length === 1 && old.sets.length === 1, "compatibilidad con series en arreglo legacy");
ok(old.sets[0].set_no === 4, "conserva índice de serie conocido");
ok(workoutSyncPayload("athlete-test-user", [], uuid).sessions.length === 0, "historial vacío no provoca borrados");
ok(workoutSyncPayload("athlete-test-user", [null, "bad", {}], uuid).sessions.length === 0, "historial corrupto no inventa sesiones");
assert.throws(() => workoutSyncPayload("", history, uuid), /identidad/); n++;

const account = readFileSync(new URL("../js/sync/account.js", import.meta.url), "utf8");
const worker = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
ok(!account.includes('remove("workout_sessions"'), "elimina borrado global de sesiones");
ok(account.includes('on_conflict: "id"') && account.includes('on_conflict: "session_id,client_id"'), "upsert usa índices únicos reales");
ok(account.includes("payload.changed && !S.save()"), "el envío falla seguro si los IDs no se persisten");
ok(worker.includes("./js/sync/workouts.js"), "el módulo se precachea para modo offline");
console.log("APP 7.0 workout sync: " + n + " comprobaciones PASS");
