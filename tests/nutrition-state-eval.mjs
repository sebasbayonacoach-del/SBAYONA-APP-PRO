import { strict as assert } from "node:assert";
import { S, SCHEMA, todayKey } from "../js/state.js";

let pass=0;
const ok=(cond,msg)=>{assert.ok(cond,msg);pass++;console.log("  ✅ "+msg);};

console.log("\n🥗 NUTRITION CALENDAR · ESTADO\n");

S.init();
S.reset(true);

ok(SCHEMA===6,"schema actualizado a 6");
ok(S.data.nutrition?.goals?.configured===false,"objetivos base no fingen personalización");
ok(S.data.today.nutritionFeeling===null,"sensación nutricional empieza sin registrar");

ok(S.setNutritionFeeling("hungry")==="hungry","sensación válida se guarda");
ok(S.data.today.nutritionFeeling==="hungry","sensación queda en el día");
ok(S.setNutritionFeeling("inventado")===null,"sensación inválida cae a null");

const prefs=S.updateNutritionPreferences({
  allergies:["cacahuete"," cacahuete ","huevo"],
  intolerances:["lactosa"],
  preferred:["arroz"],
  notes:"declarado por la persona",
});
ok(prefs.allergies.length===2&&prefs.intolerances[0]==="lactosa","preferencias se normalizan y deduplican");

const goals=S.updateNutritionGoals({kcal:2600,p:170,water:3000},"coach");
ok(goals.kcal===2600&&goals.p===170&&goals.water===3000,"objetivos configurados se guardan");
ok(goals.source==="coach"&&goals.configured===true,"se conserva quién configuró los objetivos");

const plan=S.setNutritionDayPlan(2,[
  {slot:"DESAYUNO",time:"08:00",name:"Avena",kcal:420},
  {slot:"ALMUERZO",time:"13:30",name:"Arroz y pollo",kcal:680},
]);
ok(Array.isArray(plan)&&plan.length===2,"plan del día se guarda");
ok(S.data.nutrition.weeklyPlan[2][1].time==="13:30","hora del plan persiste");
ok(S.setNutritionDayPlan(9,[])===false,"día fuera de 0..6 se rechaza");

const now=new Date();
const p=(n)=>String(n).padStart(2,"0");
const localAt=new Date(now.getFullYear(),now.getMonth(),now.getDate(),Math.max(0,now.getHours()-1),15,0,0);
const r=S.eat({
  custom:true,
  name:"Pollo con arroz",
  kcal:620,p:45,c:70,f:15,fib:8,
  at:localAt.toISOString(),
  slot:"ALMUERZO",
  feeling:"satisfied",
  note:"me sentó bien",
  qty:350,
  unit:"g",
});
ok(r&&r.xp>0,"comida real sigue premiando una sola acción");
const meal=S.data.today.meals.at(-1);
ok(meal.name==="Pollo con arroz"&&meal.slot==="ALMUERZO","comida conserva nombre y slot separados");
ok(meal.at===localAt.toISOString(),"hora real elegida se conserva");
ok(meal.fib===8&&S.data.today.fib===8,"fibra se conserva en comida y total");
ok(meal.feeling==="satisfied"&&meal.note==="me sentó bien","contexto subjetivo queda junto a la comida");
ok(meal.qty===350&&meal.unit==="g","cantidad y unidad se guardan como campos");

const yesterday=new Date(Date.now()-864e5);
S.data.today.date=todayKey(yesterday);
S.data.today.meals=[meal];
S.data.today.kcal=meal.kcal;
S.data.today.water=900;
S.rollDay();
const hist=S.data.history.at(-1);
ok(Array.isArray(hist.meals)&&hist.meals.length===1,"rollover conserva resumen de comidas para calendario");
ok(hist.meals[0].slot==="ALMUERZO"&&hist.water===900,"historial conserva contexto nutricional mínimo");

console.log(`\n📊 RESULTADO: ${pass} pass · 0 fail\n`);
