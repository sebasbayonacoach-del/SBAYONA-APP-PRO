// BAYONA LIFE GAME · verifies fit against existing XP, planner, and state.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { S } from "../js/state.js";
import { RANKS } from "../js/data.js";
import { LIFE_RANKS, rankForLevel, rankProgress, xpForLevel } from "../js/game/ranks.js";
import { LIFE_AREAS, GROWTH_LIBRARY, growthSuggestions, areaSummary } from "../js/game/areas.js";
import { addPlannerItem, completePlannerItem, normalizeLifeOS, normalizePlannerItem, updatePlannerItem } from "../js/planner.js";
let count = 0;
function ok(condition, label) {
  assert.ok(condition, label);
  count++;
  console.log("  ✅", label);
}
console.log("\n◇ LIFE GAME · COMPATIBILIDAD CON BAYONA ACTUAL\n");

ok(RANKS === LIFE_RANKS, "los rangos del juego son la única lista leída por S.rank");
ok(RANKS.length >= 24, "la escalera es profunda, no siete insignias");
ok(RANKS[0].min === 1 && RANKS.every((r, i) => i === 0 || r.min > RANKS[i-1].min), "todos los umbrales son crecientes");
for (const [lvl, name] of [[1,"INICIADO"],[6,"ATLETA"],[14,"VANGUARDIA"],[25,"ÉLITE"],[40,"TITÁN"],[60,"ASCENDIENTE"],[85,"LEYENDA"]]) {
  ok(rankForLevel(lvl).name === name, "hito anterior conservado en nivel "+lvl);
}
ok(rankProgress(0).current.name === "INICIADO", "cero XP conserva rango inicial");
ok(rankProgress(xpForLevel(120)+200).current.name === "INFINITO", "rango máximo sin pasos extra ficticios");
ok(rankProgress(xpForLevel(5)).next.name === "ATLETA", "el siguiente rango usa XP real y escala existente");

S.init();
S.reset(true);
S.data.xp = xpForLevel(14);
ok(S.level().lvl === 14 && S.rank() === "VANGUARDIA", "la economía ya existente continúa determinando rango");
S.data.xp = xpForLevel(25)+120;
ok(S.rank() === "ÉLITE" && S.data.xp === xpForLevel(25)+120, "añadir rangos no reinicia ni modifica XP");

ok(LIFE_AREAS.length === 5 && GROWTH_LIBRARY.length === 10, "dos propuestas por cada una de cinco áreas");
ok(LIFE_AREAS.every((a)=>GROWTH_LIBRARY.filter((x)=>x.area===a.id).length===2), "todas las áreas reciben dos acciones concretas");
let life=normalizeLifeOS({});
let ideas=growthSuggestions({life,date:"2026-10-12"});
ok(ideas.length===10 && ideas.every((x)=>!x.existingId), "propuestas no se insertan automáticamente en la agenda");
ok(life.planner.items.length===0, "generar propuestas no modifica estado");
const entry=ideas[0];
let saved=addPlannerItem(life,{title:entry.title,type:entry.type,area:entry.area,date:"2026-10-12",allDay:false},{id:"pl-growth"});
life=saved.life;
ok(life.planner.items[0].area==="body", "área explícita queda guardada en planner actual");
ok(life.planner.items[0].allDay===false, "misión sin hora no se disfraza de evento de día entero");
ok(growthSuggestions({life,date:"2026-10-12"}).find((x)=>x.id===entry.id)?.existingId==="pl-growth", "la misma propuesta ya añadida no vuelve a sugerirse");
life=completePlannerItem(life,"pl-growth").life;
ok(areaSummary(life,"2026-10-12").find((x)=>x.id==="body").done===1, "progreso de área se deriva de tareas reales completadas");
ok(normalizeLifeOS(life).planner.items[0].area==="body", "migraciones/normalizaciones preservan el área");
life=updatePlannerItem(life,"pl-growth",{area:null}).life;
ok(life.planner.items[0].area===null, "el usuario puede quitar voluntariamente un área");
ok(normalizePlannerItem({title:"Reunión",date:"2026-10-12",type:"work"}).area==="work", "una tarea antigua se infiere sin alterar su tipo");
ok(normalizePlannerItem({title:"Traslado",date:"2026-10-12",type:"travel"}).area===null, "no se inventa área para desplazamientos");
ok(normalizePlannerItem({title:"Gratitud",date:"2026-10-12",type:"personal",area:"purpose"}).area==="purpose", "propósito puede elegirse explícitamente sin asumir religión");
ok(S.data.xp===xpForLevel(25)+120, "marcar tareas no crea XP sin regla de recompensas verificada");
const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
ok(sw.includes('"./js/game/areas.js"') && sw.includes('"./js/game/ranks.js"'), "los nuevos módulos se precachean para modo offline");
const sql = readFileSync(new URL("../api/supabase/migrations/0007_life_game_areas.sql", import.meta.url), "utf8");
ok(sql.includes("ADD COLUMN IF NOT EXISTS area") && sql.includes("planner_items_life_area_allowed"), "migración de área es aditiva y restringe valores");
console.log("\n📊 " + count + " comprobaciones · 0 fallos\n");
