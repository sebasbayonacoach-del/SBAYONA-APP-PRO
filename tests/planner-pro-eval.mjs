import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { S } from "../js/state.js";
import {
  addPlannerItem, completePlannerItem, datePlusDays, normalizeLifeOS,
  plannerItemsForDate, plannerItemsForRange, plannerPendingItems,
  reprogramPlannerItem, removePlannerItem, togglePlannerSubtask, updatePlannerItem,
} from "../js/planner.js";

let count = 0;
function check(value, description) {
  assert.ok(value, description);
  count++;
  console.log("  ✅ " + description);
}

console.log("\nBAYONA · MI DÍA 2.0 · regresión\n");
S.init();
S.reset(true);
let life = normalizeLifeOS({});
const baseline = S.data.xp;
const saved = addPlannerItem(life, {
  title:"Leer y aplicar", date:"2026-10-12", area:"mind",
  recurrence:"daily", repeatUntil:"2026-10-17",
  subtasks:[{id:"read",title:"Leer 15 minutos"},{id:"apply",title:"Aplicar lo aprendido"}],
  priority:"high", allDay:false,
}, {id:"repeat_read"});
life = saved.life;
check(life.planner.items.length===1, "la repetición se guarda como una sola plantilla");
check(life.planner.items[0].subtasks.length===2, "subtareas normalizadas y preservadas");
check(plannerItemsForDate(life,"2026-10-13")[0].id==="repeat_read~2026-10-13", "cada repetición tiene ID estable");
check(plannerItemsForDate(life,"2026-10-11").length===0, "no se inventan días anteriores");
check(plannerItemsForDate(life,"2026-10-18").length===0, "respeta fecha fin de repetición");

let result=togglePlannerSubtask(life,"repeat_read~2026-10-13","read");
life=result.life;
check(result.changed && plannerItemsForDate(life,"2026-10-13")[0].subtasks[0].done, "marcar subtarea cambia solo la aparición seleccionada");
check(!plannerItemsForDate(life,"2026-10-14")[0].subtasks[0].done, "subtarea de mañana queda independiente");
result=completePlannerItem(life,"repeat_read~2026-10-13",true);
life=result.life;
check(plannerItemsForDate(life,"2026-10-13")[0].status==="done", "día completado guarda estado");
check(plannerItemsForDate(life,"2026-10-14")[0].status==="planned", "no completa todos los días de golpe");
life=completePlannerItem(life,"repeat_read~2026-10-13",false).life;
check(plannerItemsForDate(life,"2026-10-13")[0].status==="planned", "deshacer se aplica a un solo día");

const move=reprogramPlannerItem(life,"repeat_read~2026-10-15","2026-10-16");
life=move.life;
check(move.changed && plannerItemsForDate(life,"2026-10-15").length===0,"reprogramar no deja duplicada la aparición original");
check(plannerItemsForDate(life,"2026-10-16").length===2,"reprogramar crea aparición desplazada sin alterar la del día de destino");
life=removePlannerItem(life,"repeat_read~2026-10-14").life;
check(plannerItemsForDate(life,"2026-10-14").length===0,"descartar una aparición no elimina la serie");
check(plannerItemsForDate(life,"2026-10-17").length===1,"serie futura continúa tras el descarte");
check(normalizeLifeOS(life).planner.items[0].exceptions["2026-10-15"].date==="2026-10-16","excepciones sobreviven a normalización");
check(plannerItemsForRange(life,"2026-10-12",7).length===5,"vista Semana genera instancias reales y desplazadas");
check(plannerPendingItems(life,"2026-10-12").every((x)=>x.status==="planned"),"Pendientes excluye hechos y cancelados");
check(plannerPendingItems(life,"2026-10-12").filter((x)=>x.seriesId==="repeat_read").length===1,"Pendientes muestra solo una aparición por serie");


let weekdays=addPlannerItem(life,{title:"Bloque de enfoque",date:"2026-10-12",type:"focus",recurrence:"weekdays"}, {id:"weekdays"});
life=weekdays.life;
check(plannerItemsForDate(life,"2026-10-17").every((x)=>x.id!=="weekdays~2026-10-17"),"repetición laboral omite sábados");
check(plannerItemsForDate(life,"2026-10-19").some((x)=>x.id==="weekdays~2026-10-19"),"repetición laboral regresa el lunes");
const weekly=addPlannerItem(life,{title:"Resumen semanal",date:"2026-10-12",recurrence:"weekly"}, {id:"weekly"});
life=weekly.life;
check(plannerItemsForDate(life,"2026-10-19").some((x)=>x.id==="weekly~2026-10-19"),"semanal conserva día de la semana");
check(plannerItemsForDate(life,"2026-10-20").every((x)=>x.id!=="weekly~2026-10-20"),"semanal no aparece días incorrectos");

const external=addPlannerItem(life,{title:"Evento sincronizado",date:"2026-10-12",source:"device_calendar",externalId:"abc"},{id:"external"});
life=external.life;
check(!completePlannerItem(life,"external",true).changed,"el calendario externo no se marca manualmente");
check(!updatePlannerItem(life,"external",{title:"Manipulado"}).changed,"el calendario externo no se sobrescribe");
check(removePlannerItem(life,"external").removed===0,"el calendario externo no se borra desde Mi Día");
check(life.planner.items.find((x)=>x.id==="external").title==="Evento sincronizado","origen externo intacto");
check(S.data.xp===baseline,"completar tareas y subtareas no crea XP sin reglas verificadas");
check(datePlusDays("2026-10-31",1)==="2026-11-01","cambio de mes sigue correcto");

const ui=readFileSync(new URL("../js/ui/planner.js", import.meta.url),"utf8");
check(ui.includes("planner-view-tabs") && ui.includes("togglePlannerSubtask"),"UI conectada a semana, pendientes y subtareas");
check(ui.includes("planner-quick-add") && ui.includes('persist(result.life, "quick-add")'),"Mi Día permite registrar una tarea en un solo paso");
const migration=readFileSync(new URL("../api/supabase/migrations/0008_planner_pro.sql",import.meta.url),"utf8");
check(migration.includes("recurrence_exceptions") && migration.includes("subtasks jsonb"),"SQL aditivo preparado para nube");
console.log("\n" + count + " comprobaciones · 0 fallos\n");
