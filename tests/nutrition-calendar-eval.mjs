import { strict as assert } from "node:assert";
import {
  NUTRITION_FEELINGS, DEFAULT_NUTRITION_GOALS, localDateKey, localClock,
  weekDates, normalizeNutritionPreferences, normalizeNutritionGoals,
  normalizeMealPlanEntry, normalizeWeeklyPlan, mealAtFromLocal,
  lastMealInfo, hydrationSnapshot, weeklyNutritionSnapshot, nutritionContext,
} from "../js/nutrition-calendar.js";

let pass=0;
const ok=(cond,msg)=>{assert.ok(cond,msg);pass++;console.log("  ✅ "+msg);};
console.log("\n🥗 NUTRITION CALENDAR · DOMINIO\n");

const now=new Date("2026-10-07T15:30:00+02:00");
ok(localDateKey(now)==="2026-10-07","fecha nutricional usa día local");
ok(typeof localClock(now)==="string","hora actual se deriva, no se guarda");
const week=weekDates(now);
ok(week.length===7&&week[0].date.getDay()===1,"semana empieza en lunes");

const prefs=normalizeNutritionPreferences({
  allergies:[" cacahuete ","cacahuete","huevo"],
  intolerances:["lactosa"],
  notes:"  declarado por mí   ",
});
ok(prefs.allergies.length===2&&prefs.notes==="declarado por mí","preferencias declaradas se normalizan");

const goals=normalizeNutritionGoals({kcal:2600,water:3000,configured:true,source:"coach"});
ok(goals.kcal===2600&&goals.water===3000&&goals.configured&&goals.source==="coach","objetivos configurados conservan fuente");
ok(DEFAULT_NUTRITION_GOALS.configured===false,"objetivo base no se presenta como personalizado");

const entry=normalizeMealPlanEntry({slot:"ALMUERZO",time:"13:45",name:"Arroz y pollo",kcal:650});
ok(entry.slot==="ALMUERZO"&&entry.time==="13:45"&&entry.kcal===650,"entrada de plan semanal válida");
ok(normalizeMealPlanEntry({slot:"x",time:"99:99"}).slot==="OTRO","slot/hora inválidos caen seguro");
ok(normalizeWeeklyPlan({0:[entry]} )[0].length===1,"plan semanal normalizado");

const at=mealAtFromLocal("2026-10-07","13:00");
ok(typeof at==="string"&&new Date(at).getHours()===13,"hora elegida se convierte a instante local");
ok(mealAtFromLocal("2026-10-07","99:00")===null,"hora inválida no se guarda");

const meals=[
  {name:"Desayuno",at:new Date("2026-10-07T08:00:00+02:00").toISOString()},
  {name:"Almuerzo",at:new Date("2026-10-07T13:00:00+02:00").toISOString()},
];
const last=lastMealInfo(meals,now);
ok(last.meal.name==="Almuerzo"&&last.gapMinutes===150,"última comida y tiempo transcurrido son reales");
ok(lastMealInfo([],now).meal===null,"sin comida no inventa una última ingesta");

const hyd=hydrationSnapshot(1250,2500,250);
ok(hyd.glasses===5&&hyd.targetGlasses===10&&hyd.pct===50,"vasos e hidratación calculados");

const weekly=weeklyNutritionSnapshot({
  today:{meals:[{name:"x"}],water:1000,kcal:500},
  history:[],
  nutrition:{weeklyPlan:{2:[entry]}},
  now,
});
ok(weekly.length===7&&weekly.find(x=>x.isToday).recordedMeals===1,"calendario refleja registros de hoy");
ok(weekly[2].plannedMeals===1,"calendario refleja plan del miércoles");

const ctx=nutritionContext({today:{meals,water:1250,nutritionFeeling:"hungry"},nutrition:{goals},now});
ok(ctx.now&&ctx.lastMeal.meal&&ctx.hydration.pct===42&&ctx.feeling==="hungry","contexto diario combina tiempo, comida, agua y sensación");
ok(NUTRITION_FEELINGS.length===5,"sensaciones nutricionales cerradas");

console.log(`\n📊 RESULTADO: ${pass} pass · 0 fail\n`);
