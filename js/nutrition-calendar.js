// BAYONA — Nutrition Calendar domain model.
// Registra y organiza datos reales; no diagnostica ni genera objetivos clínicos.

export const NUTRITION_FEELINGS = Object.freeze([
  "hungry","neutral","satisfied","heavy","low_energy"
]);

export const MEAL_SLOTS = Object.freeze([
  "DESAYUNO","ALMUERZO","CENA","SNACK","OTRO"
]);

export const DEFAULT_NUTRITION_GOALS = Object.freeze({
  kcal: 2400,
  p: 150,
  c: 240,
  f: 70,
  fib: 30,
  water: 2500,
  configured: false,
  source: "base",
});

export const DEFAULT_NUTRITION = Object.freeze({
  goals: DEFAULT_NUTRITION_GOALS,
  preferences: {
    allergies: [],
    intolerances: [],
    avoid: [],
    preferred: [],
    dietaryPattern: null,
    notes: "",
  },
  weeklyPlan: {},
});

const cleanText=(value,max=80)=>String(value||"").trim().replace(/\s+/g," ").slice(0,max);
const uniq=(arr,max=20)=>[...new Set((Array.isArray(arr)?arr:[]).map((x)=>cleanText(x,60)).filter(Boolean))].slice(0,max);
const num=(value,min,max)=>{
  const n=Number(value);
  return Number.isFinite(n)?Math.min(max,Math.max(min,n)):null;
};

export function localDateKey(date=new Date()){
  const d=date instanceof Date?date:new Date(date);
  if(Number.isNaN(d.getTime())) return null;
  const p=(n)=>String(n).padStart(2,"0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
}

export function localClock(date=new Date()){
  const d=date instanceof Date?date:new Date(date);
  if(Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"});
}

export function mondayIndex(date=new Date()){
  const d=date instanceof Date?date:new Date(date);
  if(Number.isNaN(d.getTime())) return 0;
  return (d.getDay()+6)%7;
}

export function weekDates(now=new Date()){
  const d=now instanceof Date?new Date(now):new Date(now);
  if(Number.isNaN(d.getTime())) return [];
  d.setHours(12,0,0,0);
  d.setDate(d.getDate()-mondayIndex(d));
  return Array.from({length:7},(_,i)=>{
    const x=new Date(d); x.setDate(d.getDate()+i);
    return { index:i, date:x, key:localDateKey(x) };
  });
}

export function normalizeNutritionPreferences(input={}){
  return {
    allergies:uniq(input.allergies),
    intolerances:uniq(input.intolerances),
    avoid:uniq(input.avoid),
    preferred:uniq(input.preferred),
    dietaryPattern:cleanText(input.dietaryPattern,40)||null,
    notes:cleanText(input.notes,240),
  };
}

export function normalizeNutritionGoals(input={}){
  const base={...DEFAULT_NUTRITION_GOALS};
  for(const [k,min,max] of [
    ["kcal",0,10000],["p",0,600],["c",0,1200],["f",0,500],["fib",0,200],["water",250,8000],
  ]){
    const v=num(input[k],min,max);
    if(v!==null) base[k]=Math.round(v*10)/10;
  }
  base.configured=Boolean(input.configured);
  base.source=["base","user","coach"].includes(input.source)?input.source:(base.configured?"user":"base");
  return base;
}

export function normalizeMealPlanEntry(input={}){
  const slot=MEAL_SLOTS.includes(input.slot)?input.slot:"OTRO";
  const time=/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(input.time||""))?String(input.time):null;
  const entry={
    id:cleanText(input.id,60)||`meal_${slot.toLowerCase()}_${time||"any"}`,
    slot,
    time,
    name:cleanText(input.name,80)||slot,
    kcal:num(input.kcal,0,5000),
    p:num(input.p,0,500),
    c:num(input.c,0,800),
    f:num(input.f,0,400),
    fib:num(input.fib,0,100),
    note:cleanText(input.note,180),
  };
  return entry;
}

export function normalizeWeeklyPlan(input={}){
  const out={};
  for(let i=0;i<7;i++){
    const rows=Array.isArray(input?.[i])?input[i]:Array.isArray(input?.[String(i)])?input[String(i)]:[];
    out[i]=rows.slice(0,10).map(normalizeMealPlanEntry);
  }
  return out;
}

export function nutritionDefaults(input={}){
  return {
    goals:normalizeNutritionGoals(input.goals||{}),
    preferences:normalizeNutritionPreferences(input.preferences||{}),
    weeklyPlan:normalizeWeeklyPlan(input.weeklyPlan||{}),
  };
}

export function mealAtFromLocal(dateKey,time){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey||""))||!(/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(time||"")))) return null;
  const d=new Date(`${dateKey}T${time}:00`);
  return Number.isNaN(d.getTime())?null:d.toISOString();
}

export function lastMealInfo(meals=[],now=new Date()){
  const n=now instanceof Date?now:new Date(now);
  if(Number.isNaN(n.getTime())) return { meal:null,gapMinutes:null };
  const candidates=(Array.isArray(meals)?meals:[])
    .map((meal)=>({meal,at:meal?.at?new Date(meal.at):null}))
    .filter((x)=>x.at&&!Number.isNaN(x.at.getTime())&&x.at<=n)
    .sort((a,b)=>b.at-a.at);
  if(!candidates.length) return {meal:null,gapMinutes:null};
  const first=candidates[0];
  return {meal:first.meal,gapMinutes:Math.max(0,Math.floor((n-first.at)/60000))};
}

export function hydrationSnapshot(waterMl=0,goalMl=2500,glassMl=250){
  const water=Math.max(0,Number(waterMl)||0);
  const goal=Math.max(250,Number(goalMl)||2500);
  const glass=Math.max(100,Number(glassMl)||250);
  return {
    waterMl:water,
    goalMl:goal,
    pct:Math.min(100,Math.round((water/goal)*100)),
    glasses:Math.floor(water/glass),
    targetGlasses:Math.ceil(goal/glass),
    glassMl:glass,
  };
}

export function weeklyNutritionSnapshot({today={},history=[],nutrition={},now=new Date()}={}){
  const plan=normalizeWeeklyPlan(nutrition.weeklyPlan||{});
  const days=weekDates(now);
  const hist=new Map((Array.isArray(history)?history:[]).map((x)=>[x.date,x]));
  const todayKey=localDateKey(now);
  return days.map((d)=>{
    const source=d.key===todayKey?today:hist.get(d.key)||{};
    const meals=Array.isArray(source.meals)?source.meals:[];
    const planned=plan[d.index]||[];
    return {
      ...d,
      isToday:d.key===todayKey,
      recordedMeals:meals.length,
      plannedMeals:planned.length,
      waterMl:Number(source.water)||0,
      kcal:Number(source.kcal)||0,
      plan:planned,
    };
  });
}

export function nutritionContext({today={},nutrition={},now=new Date()}={}){
  const goals=normalizeNutritionGoals(nutrition.goals||{});
  return {
    now:localClock(now),
    dateKey:localDateKey(now),
    lastMeal:lastMealInfo(today.meals||[],now),
    hydration:hydrationSnapshot(today.water,goals.water),
    feeling:NUTRITION_FEELINGS.includes(today.nutritionFeeling)?today.nutritionFeeling:null,
    goals,
  };
}
