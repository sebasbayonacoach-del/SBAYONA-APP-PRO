// ============================================================
// BAYONA — PLAN: macrociclo simple y vista LABORATORIO (hoja profesional)
// Datos reales del plan + adherencia real. Lo que es estimación se dice.
// ============================================================
import { S } from "../state.js";
import { MACRO, WORKOUTS, EXERCISES, phaseOfWeek } from "../data.js";
import { todaysSession, project1RM, trend1RM } from "../engine.js";
import { previewWorkoutXP, workoutCompleteReward } from "../rewards.js";
import { esc, fmtDec, fmtInt, fmtDate } from "../i18n.js";
import { $, el, openDrawer, BUILDERS } from "./shared.js";

BUILDERS.plan = (body) => {
  body = body || $("#drawer-body");
  body.textContent = "";
  let lab = false;
  const week = S.data.plan.week;
  const phase = phaseOfWeek(week);

  body.appendChild(el("div", "sec-label", "MACROCICLO · 24 SEMANAS"));
  const head = el("div", "card");
  head.innerHTML = `
    <div class="card-row">
      <div class="grow"><h4>FASE ACTUAL: ${esc(phase.name)}</h4><div class="sub">Semana ${esc(week)} / 24 · objetivo: ${esc(S.data.profile.goal)}</div></div>
      <span class="pill gold">${esc(phase.code)}</span>
    </div>`;
  const spark = el("div", "spark");
  for (let i = 1; i <= MACRO.totalWeeks; i++) {
    const p = phaseOfWeek(i);
    const bar = el("i");
    bar.style.height = `${Math.round(p.vol * 100)}%`;
    if (i === week) bar.style.background = "linear-gradient(to top,var(--gold),#fff)";
    spark.appendChild(bar);
  }
  head.appendChild(spark);
  head.appendChild(el("div", "sub mono", "VOLUMEN PREVISTO POR SEMANA (PLAN, NO MEDICIÓN)"));
  const toggle = el("button", "btn btn-block", "VISTA: SIMPLE");
  toggle.style.marginTop = "12px";
  head.appendChild(toggle);
  body.appendChild(head);

  const render = () => {
    document.querySelectorAll(".plan-detail").forEach((n) => n.remove());
    const wrap = el("div", "plan-detail");
    if (!lab) wrap.appendChild(simpleView(week, phase));
    else wrap.appendChild(labView(week));
    body.appendChild(wrap);
  };
  toggle.addEventListener("click", () => { lab = !lab; toggle.textContent = "VISTA: " + (lab ? "LABORATORIO" : "SIMPLE"); render(); });
  render();

  body.appendChild(el("div", "sec-label", "PROYECCIONES"));
  const proj = el("div", "card");
  const p = project1RM("squat", Math.round(((S.data.prs.squat?.e1 || 0) * 1.15) / 5) * 5);
  proj.innerHTML = p
    ? `<div class="sub">PROYECCIÓN 1RM SENTADILLA (según tus datos reales): +${esc(p.rate)} kg/semana · objetivo en ~${esc(p.weeks)} semanas si mantienes adherencia. Modelo lineal conservador; no es una promesa.</div>`
    : `<div class="sub">Sin datos suficientes para proyectar 1RM: hacen falta al menos dos puntos reales de progresión.</div>`;
  body.appendChild(proj);
};

function simpleView(week, phase) {
  const wrap = el("div");
  wrap.appendChild(el("div", "sec-label", "HOY"));
  const auto = todaysSession();
  const w = S.todayWorkout();
  const t2 = S.data.today;
  const card = el("div", "card");
  const bonus = workoutCompleteReward({ minutes: w?.min || 15 });
  card.innerHTML = `<h4>${w ? esc(w.name) : "DÍA DE RECUPERACIÓN"}</h4>
    <div class="sub">Fase ${esc(phase.name)} · semana ${esc(week)}/24 · intensidad objetivo ${Math.round(phase.int * 100)}% 1RM<br>
    ${w ? `Sesión prevista: ${esc(auto?.adjusted ?? "—")} de ${esc(auto?.original ?? "—")} series · ~${fmtInt(previewWorkoutXP(auto?.workout || w).xp)} XP en series + ${bonus.xp} XP de cierre` : "Movilidad + respiración programadas."}<br>
    Estado: ${t2.trained ? "sesión completada ✅" : t2.trainingSets > 0 ? `sesión iniciada (${t2.trainingSets} series)` : "pendiente"}</div>`;
  wrap.appendChild(card);
  wrap.appendChild(el("div", "sec-label", "MICROCICLO · SEMANA EN CURSO"));
  const micro = el("div", "card");
  MACRO.dayPlan.forEach((id, i) => {
    micro.appendChild(el("div", "kv",
      `<span class="k">${MACRO.dayNames[i]}</span><span class="v">${id ? esc(WORKOUTS[id].name.replace("OPERACIÓN: ", "")) : "DESCANSO"}</span>`));
  });
  wrap.appendChild(micro);
  if (auto?.applied) wrap.appendChild(el("div", "media-caption", `AUTORREGULACIÓN APLICADA: ${esc(auto.note)}`));
  return wrap;
}

function labView(week) {
  const wrap = el("div");
  wrap.appendChild(el("div", "sec-label", "LABORATORIO · HOJA DE PLANIFICACIÓN DEPORTIVA"));
  // adherencia real: sesiones completadas por semana del plan
  const done = S.data.plan.sessionsDone || {};
  const adherence = (wk) => {
    const planned = MACRO.dayPlan.filter(Boolean).length;
    let n = 0;
    for (const k of Object.keys(done)) if (k.startsWith(wk + "-")) n++;
    return planned ? Math.round((n / planned) * 100) : 0;
  };
  const tw = el("div", "tablewrap");
  let rows = "";
  for (let i = 1; i <= MACRO.totalWeeks; i++) {
    const p = phaseOfWeek(i);
    const volSets = Math.round(60 * p.vol);
    const tonnage = Math.round(volSets * 62 * p.int);
    const acwr = (0.8 + p.vol * 0.5).toFixed(2);
    const adh = adherence(i);
    rows += `<tr class="${i === week ? "current" : ""}">
      <td>SEM ${String(i).padStart(2, "0")}</td>
      <td>${esc(p.name)}</td>
      <td>${MACRO.dayPlan.filter(Boolean).length}</td>
      <td>${volSets}</td>
      <td>${(p.int * 100).toFixed(0)}%</td>
      <td>${fmtInt(tonnage)} kg</td>
      <td>${p.code === "DESCARGA" ? "—" : "RIR " + (p.int > 0.85 ? "1" : "2")}</td>
      <td>${p.code === "DESCARGA" ? "—" : `${Math.round(90 + p.int * 60)} s`}</td>
      <td>${acwr}</td>
      <td>${adh ? adh + "%" : i > week ? "—" : "0%"}</td>
    </tr>`;
  }
  tw.innerHTML = `<table class="lab">
    <thead><tr>
      <th>SEMANA</th><th>FASE</th><th>SESIONES</th><th>SERIES</th><th>INTENSIDAD</th>
      <th>TONELAJE EST.</th><th>RIR OBJ.</th><th>DESCANSO</th><th>ACWR PLAN</th><th>ADHERENCIA REAL</th>
    </tr></thead>
    <tbody>${rows}</tbody></table>`;
  wrap.appendChild(tw);
  wrap.appendChild(el("div", "media-caption",
    "Volumen, tonelaje y ACWR son VALORES DEL PLAN (estimación de programación). Adherencia y series: datos reales tuyos. RPE objetivo ≈ 10 − RIR."));

  // detalle por ejercicio de la sesión de hoy (tabla profesional)
  const w = S.todayWorkout();
  if (w) {
    wrap.appendChild(el("div", "sec-label", `SESIÓN DE HOY · ${w.name}`));
    const tw2 = el("div", "tablewrap");
    let r2 = "";
    for (const e of w.exercises) {
      const E = EXERCISES[e.ex];
      const timed = e.timed || ["plank", "mobility", "breathing"].includes(e.ex);
      const vol = timed ? `${e.sets * e.reps} s` : `${e.sets * e.reps} reps`;
      const ton = e.kg ? `${fmtInt(e.sets * e.reps * e.kg)} kg` : "—";
      r2 += `<tr>
        <td>${esc(MACRO.dayNames[(new Date().getDay() + 6) % 7])}</td>
        <td>${esc(w.name.replace("OPERACIÓN: ", ""))}</td>
        <td>${esc(E.name)}</td>
        <td>${esc(e.sets)}</td>
        <td>${timed ? esc(e.reps) + " s" : esc(e.reps)}</td>
        <td>${e.kg ? fmtDec(e.kg) + " kg" : "P. CORPORAL"}</td>
        <td>${esc(e.rir)}</td>
        <td>${10 - e.rir} est.</td>
        <td>${vol}</td>
        <td>${ton}</td>
        <td>${Math.round(90 + phaseOfWeek(S.data.plan.week).int * 60)} s</td>
        <td>—</td>
      </tr>`;
    }
    tw2.innerHTML = `<table class="lab">
      <thead><tr>
        <th>DÍA</th><th>SESIÓN</th><th>EJERCICIO</th><th>SERIES</th><th>REPS/TIEMPO</th><th>CARGA</th>
        <th>RIR</th><th>RPE EST.</th><th>VOLUMEN</th><th>TONELAJE</th><th>DESCANSO</th><th>TEMPO</th>
      </tr></thead>
      <tbody>${r2}</tbody></table>`;
    wrap.appendChild(tw2);
    wrap.appendChild(el("div", "media-caption", "Tempo: no programado en esta versión (—). RPE estimado a partir del RIR objetivo."));
  }
  return wrap;
}
