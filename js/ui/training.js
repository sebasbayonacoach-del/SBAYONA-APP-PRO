// ============================================================
// BAYONA — GIMNASIO: sesión real, registro de series, descanso, PR
// Todo lo anunciado se aplica: el volumen autoregulado recorta de verdad,
// la carga sugerida se usa en el registro y la sesión persiste (recargable).
// ============================================================
import { S } from "../state.js";
import { WORKOUTS, EXERCISES, ITEMS, MACRO } from "../data.js";
import {
  nextLoad, warmupSets, plateMath, todaysSession, archiveSet,
} from "../engine.js";
import { previewWorkoutXP, workoutCompleteReward, setReward, prReward } from "../rewards.js";
import { videoFor, posterFor, tipFor, DAY_ICONS } from "../media.js";
import { esc, fmtDec, fmtInt, fmtDate } from "../i18n.js";
import {
  UI, $, el, elT, openDrawer, openSection, showModal, hideModal, toast,
  haptic, playTone, enterHome, BUILDERS,
} from "./shared.js";
import { confirmEarlyFinish } from "./cinematics.js";

const EXACT_POSE = { squat: 1, bench: 1, ohp: 1, pullup: 1, row: 1, lunge: 1, curl: 1, plank: 1 };
const AVATAR_ACTION = {
  squat: "squat", bench: "bench", deadlift: "row", ohp: "press", pullup: "pullup",
  row: "row", lunge: "lunge", curl: "curl", plank: "plank", pushup: "plank",
  hipthrust: "sit", burpee: "squat", mobility: "stretch", breathing: "meditate",
};
const timedOf = (e) => !!(e.timed || e.ex === "plank" || e.ex === "mobility" || e.ex === "breathing");
const schemeText = (e) => {
  const load = e.kg ? `${fmtDec(e.kg)} kg` : "PESO CORPORAL";
  return `${e.sets} × ${timedOf(e) ? `${e.reps} s` : `${e.reps} reps`} · ${load} · RIR ${e.rir}`;
};

// ============================================================
// CATÁLOGO DEL DÍA
// ============================================================
BUILDERS.training = (body) => {
  // si hay sesión activa, el GIMNASIO muestra SIEMPRE la sesión (nunca la pisa el catálogo)
  const act0 = UI.session || S.getActiveSession();
  if (act0 && act0.status !== "completada" && act0.status !== "abandonada") {
    if (!UI.session) UI.session = act0;
    return renderSession();
  }
  body = body || $("#drawer-body");
  body.textContent = "";
  const act = UI.session || S.getActiveSession();
  if (act && act.status !== "completada" && act.status !== "abandonada") {
    body.appendChild(resumeCard(act));
  }
  const goal = S.data.profile.goal;
  body.appendChild(el("div", "sec-label", `PLAN PERSONALIZADO · ${esc(goal)}`));
  const w = S.todayWorkout();
  if (!w) {
    body.appendChild(el("div", "card", `<h4>DÍA DE RECUPERACIÓN</h4><div class="sub">Hoy no hay sesión de fuerza programada. La fase actual prioriza recuperación activa.</div>`));
    body.appendChild(workoutCard(WORKOUTS.mobility_flow));
  } else {
    body.appendChild(workoutCard(w));
  }
  body.appendChild(el("div", "sec-label", "CALENDARIO DE LA SEMANA"));
  body.appendChild(weekCalendar());
  body.appendChild(el("div", "sec-label", "TODOS LOS PROTOCOLOS"));
  Object.values(WORKOUTS).forEach((x) => x !== w && body.appendChild(workoutCard(x)));
};

function resumeCard(act) {
  const c = el("div", "card");
  c.style.borderColor = "var(--gold)";
  c.innerHTML = `<h4>SESIÓN GUARDADA · ${esc(act.status.toUpperCase())}</h4>
    <div class="sub">${esc(act.name)} · ${esc(act.logged)}/${esc(act.plannedSets)} series · sobrevive a recargas y reinicios.</div>`;
  const row = el("div", "card-row");
  row.style.marginTop = "10px";
  const b1 = el("button", "btn btn-primary grow", "REANUDAR");
  b1.onclick = () => resumeSession();
  const b2 = el("button", "btn btn-danger grow", "ABANDONAR");
  b2.onclick = () => abandonSession();
  row.append(b1, b2);
  c.appendChild(row);
  return c;
}

// detalle de ejercicio: vídeo real (si existe) + cues honestos
function openExerciseDetail(exKey) {
  const E = EXERCISES[exKey];
  const vid = videoFor(exKey);
  const media = vid
    ? `<div class="media-hero" style="margin-top:14px">
        <span class="badge demo">DEMO PREGRABADA</span>
        <video src="${vid}" autoplay loop muted playsinline poster="${posterFor(exKey) || ""}"></video>
      </div>
      <div class="media-caption">Vídeo de demostración pregrabado · no es una transmisión en vivo</div>`
    : `<div class="media-hero missing" style="margin-top:14px"><span class="badge demo">SIN VÍDEO</span>
        <div class="media-missing">Sin demostración en vídeo para este ejercicio.<br>Sigue las instrucciones escritas.</div></div>`;
  showModal(`
    <div class="cine-tag">BIBLIOTECA DE EJERCICIOS · ${esc(E.muscle)}</div>
    <div class="cine-title" style="font-size:22px">${esc(E.name)}</div>
    ${media}
    <div class="cine-sub" style="text-align:left">${esc(tipFor(exKey))}</div>
    <div class="reward-line"><span>MÚSCULO</span><b>${esc(E.muscle)}</b></div>
    <div class="reward-line"><span>XP POR SERIE</span><b>~+${setReward({ reps: 8, exercise: exKey }).xp} XP (8 reps)</b></div>
    <button class="btn btn-primary btn-block btn-big" id="m-ok" style="margin-top:16px">ENTENDIDO</button>
  `, () => { $("#m-ok").onclick = hideModal; });
}

// ---------------- CALENDARIO SEMANAL ----------------
let calWeekOffset = 0;
function weekCalendar() {
  const wrap = el("div");
  const week = Math.min(MACRO_WEEKS(), S.data.plan.week + calWeekOffset);
  const phase = S.phase();
  const dow = (new Date().getDay() + 6) % 7;
  const today = new Date();
  const monday = new Date(today); monday.setDate(today.getDate() - dow + calWeekOffset * 7);

  const head = el("div", "cal-head");
  head.innerHTML = `<div class="cal-title">SEMANA ${esc(week)}/24 · ${esc(phase.name)}</div>`;
  const nav = el("div", "cal-nav");
  const prev = el("button", "", "←");
  const next = el("button", "", "→");
  prev.setAttribute("aria-label", "Semana anterior");
  next.setAttribute("aria-label", "Semana siguiente");
  prev.addEventListener("click", () => { calWeekOffset--; openSection("training"); });
  next.addEventListener("click", () => { calWeekOffset++; openSection("training"); });
  nav.append(prev, next);
  head.appendChild(nav);
  wrap.appendChild(head);
  wrap.appendChild(el("div", "week-phase", `<span>VOLUMEN OBJETIVO <b>${Math.round(phase.vol * 100)}%</b></span><span>INTENSIDAD <b>${Math.round(phase.int * 100)}% 1RM</b></span>`));

  const grid = el("div", "cal-grid");
  const dayPlan = MACRO_DAYPLAN();
  dayPlan.forEach((wid, i) => {
    const date = new Date(monday); date.setDate(monday.getDate() + i);
    const done = S.data.today.trained && i === dow && week === S.data.plan.week;
    const isToday = date.toDateString() === today.toDateString();
    const cell = el("div", `cal-day ${isToday ? "today" : ""} ${done ? "done" : ""} ${wid ? "" : "rest"}`);
    cell.innerHTML = `
      <div class="cal-d-name">${DAY_NAMES()[i]}</div>
      <div class="cal-d-num">${date.getDate()}</div>
      <div class="cal-d-emoji">${DAY_ICONS[wid || "rest"]}</div>
      <div class="cal-d-tag">${wid ? esc(WORKOUTS[wid].name.replace("OPERACIÓN: ", "")) : "DESCANSO"}</div>`;
    cell.addEventListener("click", () => showDayDetail(wid, date, cell, grid));
    grid.appendChild(cell);
  });
  wrap.appendChild(grid);
  const detail = el("div", "cal-detail");
  detail.id = "cal-detail";
  wrap.appendChild(detail);
  setTimeout(() => showDayDetail(dayPlan[dow], today, null, grid), 0);
  return wrap;
}

// acceso directo al ciclo de datos
const MACRO_WEEKS = () => MACRO.totalWeeks;
const MACRO_DAYPLAN = () => MACRO.dayPlan;
const DAY_NAMES = () => MACRO.dayNames;

function showDayDetail(wid, date, cell, grid) {
  if (grid) grid.querySelectorAll(".cal-day").forEach((c) => c.classList.remove("sel"));
  if (cell) cell.classList.add("sel");
  const box = document.getElementById("cal-detail");
  if (!box) return;
  box.textContent = "";
  const dstr = date.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
  if (!wid) {
    box.appendChild(el("div", "card", `<h4>🌙 ${esc(dstr.toUpperCase())}</h4><div class="sub">Día de descanso programado. El crecimiento ocurre mientras recuperas: sueño, hidratación y movilidad ligera.</div>`));
    return;
  }
  const w = WORKOUTS[wid];
  const c = el("div", "card");
  c.innerHTML = `<h4>${DAY_ICONS[wid]} ${esc(w.name)}</h4><div class="sub">${esc(dstr)} · ${esc(w.min)} min · ${esc(w.desc)}</div>`;
  const b = el("button", "btn btn-primary btn-block", "EMPEZAR SESIÓN");
  b.style.marginTop = "12px";
  b.addEventListener("click", () => startWorkout(w));
  c.appendChild(b);
  box.appendChild(c);
  w.exercises.forEach((s) => {
    const E = EXERCISES[s.ex];
    const row = el("div", "ex-media-row");
    const thumb = posterFor(s.ex)
      ? `<img src="${posterFor(s.ex)}" loading="lazy" alt="${esc(E.name)}" />`
      : `<div class="no-thumb">—</div>`;
    row.innerHTML = `
      <div class="ex-thumb">${thumb}</div>
      <div>
        <div class="ex-name">${esc(E.name)}</div>
        <div class="ex-scheme">${esc(schemeText(s))}</div>
        <div class="ex-tip">${esc(tipFor(s.ex))}</div>
      </div>`;
    row.addEventListener("click", () => openExerciseDetail(s.ex));
    box.appendChild(row);
  });
}

function workoutCard(w) {
  const done = S.data.today.workoutDone === w.id;
  const auto = todaysSession();
  const isToday = auto && auto.workout.id === w.id;
  const prev = previewWorkoutXP(w);
  const bonus = workoutCompleteReward({ minutes: w.min });
  const c = el("div", "card");
  c.innerHTML = `
    <div class="card-row">
      <div class="grow">
        <h4>${esc(w.name)}</h4>
        <div class="sub">${esc(w.desc)}</div>
      </div>
    </div>
    <div class="card-row" style="margin-top:10px">
      <span class="pill blue">${esc(w.tag)}</span>
      <span class="pill">${esc(w.min)} MIN</span>
      <span class="pill gold">~${fmtInt(prev.xp)} XP + ${bonus.xp} cierre</span>
      ${done ? '<span class="pill green">COMPLETADO HOY</span>' : ""}
    </div>`;
  if (isToday && auto.applied) {
    c.appendChild(el("div", "sub", `<div class="autoreg">AUTORREGULADO · ${esc(auto.adjusted)}/${esc(auto.original)} series (se aplica al empezar)<br>${esc(auto.note)}</div>`));
  }
  const btn = el("button", "btn btn-primary btn-block", done ? "REPETIR SESIÓN" : isToday ? "EMPEZAR MISIÓN" : "EMPEZAR");
  btn.style.marginTop = "12px";
  if (done) btn.title = "Repetir registra series reales, pero el bono de finalización diario ya se usó.";
  btn.addEventListener("click", () => startWorkout(w));
  c.appendChild(btn);
  return c;
}

// ---------------- MOTOR DE SESIÓN ----------------
function startWorkout(w) {
  // el volumen autoregulado anunciado se APLICA de verdad
  const auto = todaysSession();
  const plan = auto && auto.workout.id === w.id ? auto.workout : w;
  const plannedSets = plan.exercises.reduce((a, e) => a + e.sets, 0);
  const sess = {
    id: `s_${Date.now()}`,
    name: plan.name,
    workoutId: w.id,
    status: "en curso",
    exercises: plan.exercises,
    exIdx: 0, setIdx: 0, logged: 0, plannedSets,
    minutes: plan.min, xpAcc: 0,
    startedAt: Date.now(), updatedAt: Date.now(),
    setsDone: [],
  };
  UI.session = sess;
  S.setActiveSession(sess);
  UI.actions.pauseSession = pauseSession;
  UI.actions.resumeSession = resumeSession;
  openSection("training");
  // avisos de salud relevantes integrados donde empieza el entrenamiento
  const hf = S.data.healthFlags;
  if (hf && hf.redFlags?.length) {
    toast("AVISO DE SALUD", "Tus avisos del Mapa de Salud siguen activos: entrena adaptando la carga y ante dolor agudo, detente.", "danger");
  }
  renderSession();
}

function renderSession() {
  const session = UI.session;
  if (!session) return BUILDERS.training();
  const { exIdx, setIdx } = session;
  const body = openDrawer(session.name, `SESIÓN ${session.status.toUpperCase()} · ${session.minutes} MIN`);
  document.querySelectorAll(".rail-btn").forEach((x) => x.classList.toggle("active", x.dataset.go === "training"));

  const prog = el("div", "card");
  prog.innerHTML = `<div class="card-row"><span class="pill gold">MISIÓN ${esc(session.logged)}/${esc(session.plannedSets)} SERIES</span><span class="pill blue">XP ACUMULADO ${fmtInt(session.xpAcc || 0)}</span></div>`;
  body.appendChild(prog);

  if (exIdx >= session.exercises.length) return finishWorkout();

  const s = session.exercises[exIdx];
  const E = EXERCISES[s.ex];
  // ORDEN DE SESIÓN: primero lo accionable (el formulario se ve sin scroll en móvil)
  const hero = el("div", "set-hero");
  hero.innerHTML = `
    <div class="lbl">EJERCICIO ACTUAL</div>
    <div class="big">${esc(E.name)}</div>
    <div class="scheme">SERIE ${setIdx + 1}/${s.sets} · ${esc(schemeText(s))}</div>`;
  body.appendChild(hero);

  const vid = videoFor(s.ex);
  if (vid) {
    const mh = el("div", "media-hero");
    mh.innerHTML = `<span class="badge demo">DEMO PREGRABADA</span>
      <video src="${vid}" autoplay loop muted playsinline poster="${posterFor(s.ex) || ""}"></video>`;
    body.appendChild(mh);
    body.appendChild(el("div", "media-caption", `VÍDEO DE DEMOSTRACIÓN · TÉCNICA — ${tipFor(s.ex)}`));
  } else {
    body.appendChild(el("div", "media-hero missing",
      `<span class="badge demo">SIN VÍDEO</span><div class="media-missing">Sin demostración en vídeo para ${esc(E.name)}.<br>Sigue las instrucciones:</div>`));
    body.appendChild(el("div", "media-caption", esc(tipFor(s.ex))));
  }
  body.appendChild(el("div", "media-caption",
    EXACT_POSE[s.ex] ? "Tu avatar ejecuta el movimiento en el mundo." : "Animación orientativa del avatar (no es una captura tuya)."));

  // carga sugerida de hoy (se pre-llena y se USA realmente en el registro)
  const sug = s.kg > 0 ? nextLoad(s.ex, s.kg, s.reps, s.rir) : 0;
  // ---- REGISTRO DE SERIE (editable antes de confirmar) ----
  body.appendChild(setForm(s, setIdx, sug));

  // ---- MOTOR DE RENDIMIENTO: la carga sugerida SE USA en el registro ----
  const sug2 = sug;
  const last = S.data.prs[s.ex];
  const pro = el("div", "card");
  pro.innerHTML = `
    <div class="sec-label" style="margin-top:0">MOTOR DE RENDIMIENTO</div>
    <div class="kv"><span class="k">ÚLTIMO RÉCORD</span><span class="v">${last ? `${esc(last.kg)} kg × ${esc(last.reps)} · 1RM ${esc(last.e1)}` : "— el primero es hoy —"}</span></div>
    ${s.kg > 0 ? `<div class="kv"><span class="k">CARGA SUGERIDA HOY</span><span class="v" style="color:var(--orange)">${fmtDec(sug2)} kg (base ${fmtDec(s.kg)})</span></div>` : ""}`;
  const warm = warmupSets(sug2 || s.kg);
  if (warm.length) {
    pro.appendChild(el("div", "kv", `<span class="k">CALENTAMIENTO</span><span class="v">${warm.map((x) => `${fmtDec(x.kg)}×${x.reps}`).join(" · ")}</span>`));
    const plates = plateMath(sug2 || s.kg);
    if (plates.length) pro.appendChild(el("div", "kv", `<span class="k">DISCOS POR LADO</span><span class="v">${plates.map((p) => fmtDec(p)).join(" · ")} kg</span>`));
  }
  body.appendChild(pro);

  // ---- PLAN DE HOY (lista completa al final: no empuja el registro hacia abajo) ----
  body.appendChild(el("div", "sec-label", `PLAN DE HOY · ${session.exercises.length} EJERCICIOS`));
  session.exercises.forEach((sx, i) => {
    const E2 = EXERCISES[sx.ex];
    const row = el("div", "ex-media-row");
    let dots = "";
    for (let k = 0; k < sx.sets; k++) dots += `<span class="set-dot ${i < exIdx || (i === exIdx && k < setIdx) ? "done" : ""}"></span>`;
    const thumb = posterFor(sx.ex) ? `<img src="${posterFor(sx.ex)}" alt="${esc(E2.name)}" loading="lazy" />` : `<div class="no-thumb">—</div>`;
    row.innerHTML = `
      <div class="ex-thumb">${thumb}</div>
      <div>
        <div class="ex-name">${String(i + 1).padStart(2, "0")} · ${esc(E2.name)}</div>
        <div class="ex-scheme">${esc(schemeText(sx))}</div>
        <div class="ex-tip">${esc(tipFor(sx.ex))}</div>
        <div style="display:flex;gap:4px;margin-top:8px">${dots}</div>
      </div>`;
    row.addEventListener("click", () => openExerciseDetail(sx.ex));
    body.appendChild(row);
  });

  const rowBtns = el("div", "card-row");
  const bRest = el("button", "btn grow", "DESCANSO 90 s");
  bRest.addEventListener("click", () => startRest(90));
  const bSkip = el("button", "btn grow", "SALTAR EJERCICIO");
  bSkip.addEventListener("click", () => {
    S.logJourney("training", `Ejercicio ${E.name} saltado (queda constancia)`, 0);
    session.exIdx++; session.setIdx = 0;
    persist();
    renderSession();
  });
  rowBtns.append(bRest, bSkip);
  body.appendChild(rowBtns);

  const row2 = el("div", "card-row");
  const bPause = el("button", "btn grow", "PAUSAR");
  bPause.addEventListener("click", () => pauseSession("Sesión pausada"));
  const bEnd = el("button", "btn btn-danger grow", "FINALIZAR SESIÓN");
  bEnd.addEventListener("click", async () => {
    const ok = await confirmEarlyFinish({ loggedSets: session.logged, plannedSets: session.plannedSets, minutes: session.minutes });
    if (ok) finishWorkout();
  });
  row2.append(bPause, bEnd);
  body.appendChild(row2);
  if (session.setsDone.length) {
    const undo = el("button", "btn btn-block", "↺ CORREGIR ÚLTIMA SERIE");
    undo.style.marginTop = "10px";
    undo.addEventListener("click", undoLastSet);
    body.appendChild(undo);
  }

  UI.W?.avatar.setAction(AVATAR_ACTION[s.ex] || "idle");
}

function setForm(s, setIdx, sug) {
  const timed = timedOf(s);
  const wrap = el("div", "card set-form");
  const kgVal = s.kg > 0 ? (sug || s.kg) : 0;
  const repVal = s.reps;
  wrap.innerHTML = `
    <div class="sec-label" style="margin-top:0">REGISTRAR SERIE ${setIdx + 1}/${s.sets}</div>
    <div class="sf-row">
      ${s.kg > 0 ? `<label>CARGA (kg)<input id="sf-kg" type="number" inputmode="decimal" step="0.5" min="0" value="${kgVal}" /></label>` : ""}
      <label>${timed ? "TIEMPO (s)" : "REPS"}<input id="sf-reps" type="number" inputmode="numeric" step="${timed ? 5 : 1}" min="0" value="${repVal}" /></label>
      <label>RIR
        <select id="sf-rir">
          ${[0, 1, 2, 3, 4].map((r) => `<option value="${r}" ${r === s.rir ? "selected" : ""}>${r}${r === 0 ? " (al fallo)" : ""}</option>`).join("")}
        </select>
      </label>
    </div>
    <div class="sub">Edita los valores reales antes de confirmar. RIR = repeticiones que te quedaban en reserva.</div>
    <button class="btn btn-primary btn-block btn-big" id="sf-ok">REGISTRAR SERIE</button>`;
  wrap.querySelector("#sf-ok").addEventListener("click", () => {
    const kg = s.kg > 0 ? parseFloat(wrap.querySelector("#sf-kg").value) || 0 : 0;
    const reps = parseInt(wrap.querySelector("#sf-reps").value, 10) || 0;
    const rir = parseInt(wrap.querySelector("#sf-rir").value, 10);
    if (reps <= 0) return toast("REVISA LA SERIE", timed ? "Indica los segundos realizados." : "Indica las repeticiones realizadas.", "danger");
    logCurrentSet({ kg, reps, rir });
  });
  return wrap;
}

function persist() {
  if (UI.session) { UI.session.updatedAt = Date.now(); S.setActiveSession({ ...UI.session }); }
}

function logCurrentSet({ kg, reps, rir }) {
  const session = UI.session;
  const s = session.exercises[session.exIdx];
  const timed = timedOf(s);
  const idKey = `${session.id}:${session.exIdx}:${session.setIdx}`;
  const res = S.logSet(s.ex, session.setIdx, kg, reps, rir, {
    idKey,
    seconds: timed ? reps : 0,
    formScore: null,
  });
  if (!res) return toast("SERIE YA REGISTRADA", "Esa serie ya estaba guardada (sin XP duplicado).");
  archiveSet(s.ex, kg, reps, rir);
  session.setsDone.push({ idKey, exKey: s.ex, exIdx: session.exIdx, setIdx: session.setIdx, kg, reps, rir, seconds: timed ? reps : 0, xp: res.xp, pr: res.pr, skill: res.skill, ts: Date.now() });
  session.logged++;
  session.xpAcc = (session.xpAcc || 0) + res.xp;
  haptic(20);
  UI.W?.avatar.setAction("celebrate");
  setTimeout(() => UI.W?.avatar.setAction(AVATAR_ACTION[s.ex] || "idle"), 900);
  if (session.setIdx + 1 >= s.sets) { session.exIdx++; session.setIdx = 0; }
  else session.setIdx++;
  persist();
  renderSession();
  startRest(90);
}

function undoLastSet() {
  const session = UI.session;
  const r = session.setsDone.pop();
  if (!r) return;
  S.undoSet(r);
  session.logged = Math.max(0, session.logged - 1);
  session.xpAcc = Math.max(0, (session.xpAcc || 0) - r.xp);
  session.exIdx = r.exIdx;
  session.setIdx = r.setIdx;
  persist();
  toast("SERIE CORREGIDA", "Última serie deshecha (XP y registros ajustados).");
  renderSession();
}

// ---------------- DESCANSO (pausa · continuar · saltar) ----------------
function startRest(sec) {
  if (UI.restTimer) { clearInterval(UI.restTimer.t); UI.restTimer = null; }
  const body = openDrawer("DESCANSO", "RECUPERACIÓN ENTRE SERIES");
  let left = sec, paused = false;
  const wrap = el("div", "breath-wrap");
  wrap.innerHTML = `<div class="breath-circle big" id="rest-circle">${left} s</div><div class="mono" style="color:var(--mute);font-size:11px">RESPIRA · TU AVATAR DESCANSA CONTIGO</div>`;
  body.appendChild(wrap);
  UI.W?.avatar.setAction("idle");
  const row = el("div", "card-row");
  const bPause = el("button", "btn grow", "PAUSA");
  bPause.id = "rest-pause";
  const bSkip = el("button", "btn grow", "SALTAR DESCANSO");
  bSkip.id = "rest-skip";
  row.append(bPause, bSkip);
  body.appendChild(row);
  const tick = () => {
    left--;
    const c = $("#rest-circle");
    if (c) { c.textContent = `${left} s`; if (left <= 5) c.style.color = "var(--orange)"; }
    if (left <= 0) { endRest(); renderSession(); }
  };
  UI.restTimer = { t: setInterval(tick, 1000) };
  bPause.onclick = () => {
    paused = !paused;
    if (paused) { clearInterval(UI.restTimer.t); bPause.textContent = "CONTINUAR"; }
    else { UI.restTimer.t = setInterval(tick, 1000); bPause.textContent = "PAUSA"; }
  };
  bSkip.onclick = () => { endRest(); renderSession(); };
}
function endRest() {
  if (UI.restTimer) { clearInterval(UI.restTimer.t); UI.restTimer = null; }
  if (S.data?.settings.haptics && navigator.vibrate) navigator.vibrate([30, 40, 30]);
}

// ---------------- PAUSAR / REANUDAR / ABANDONAR ----------------
function pauseSession(reason = "Sesión pausada") {
  if (!UI.session) return;
  UI.session.status = "pausada";
  persist();
  S.data.activeSession = UI.session;
  S.save();
  UI.session = null;
  toast("SESIÓN PAUSADA", `${reason} · se guarda en este dispositivo y puedes reanudarla.`);
}
function resumeSession() {
  const act = UI.session || S.getActiveSession();
  if (!act) return toast("SIN SESIÓN GUARDADA", "No hay ninguna sesión pendiente de reanudar.");
  act.status = "en curso";
  UI.session = act;
  S.setActiveSession(act);
  openSection("training");
  renderSession();
}
function abandonSession() {
  const act = UI.session || S.getActiveSession();
  if (!act) return;
  showModal(`
    <div class="cine-tag">ABANDONAR SESIÓN</div>
    <div class="cine-title" style="font-size:22px">¿ABANDONAR?</div>
    <div class="cine-sub">Se conservan las <b>${esc(act.logged)}</b> series ya registradas con su XP. La sesión quedará como «abandonada»: sin bono de finalización y sin castigo.</div>
    <div style="display:flex;gap:8px">
      <button class="btn grow" id="m-keep">VOLVER</button>
      <button class="btn btn-danger grow" id="m-ab">CONSERVAR SERIES Y SALIR</button>
    </div>`, () => {
    $("#m-keep").onclick = hideModal;
    $("#m-ab").onclick = () => {
      hideModal();
      S.abandonWorkout(act.workoutId, { loggedSets: act.logged });
      act.status = "abandonada";
      UI.session = null;
      S.clearActiveSession();
      BUILDERS.training();
      toast("SESIÓN ABANDONADA", "Tus series quedan guardadas. Volver no castiga.");
    };
  });
}

// ---------------- FINALIZAR ----------------
function finishWorkout() {
  const session = UI.session;
  if (!session) return BUILDERS.training();
  const reward = S.completeWorkout(session.workoutId, {
    loggedSets: session.logged,
    plannedSets: session.plannedSets,
    minutes: session.minutes,
  });
  session.status = "completada";
  UI.W?.avatar.setAction("celebrate");
  UI.W?.setCoreMood("gold");
  haptic(60);

  // recompensa elegible por hito (determinista y elegible — sin azar de casino)
  let choices = [];
  if (S.data.stats.workouts % 3 === 0) {
    choices = ITEMS.filter((i) => !S.isOwned(i.id) && i.rarity !== "MYTHIC").slice(0, 2);
  }
  const rewardLines = reward
    ? `<div class="reward-line"><span>XP EN SERIES</span><b>+${fmtInt(session.xpAcc || 0)}</b></div>
       <div class="reward-line"><span>BONO DE FINALIZACIÓN</span><b>+${reward.xp} XP</b></div>
       <div class="reward-line"><span>PUNTOS BAYONA</span><b>+${reward.points} ◆</b></div>`
    : `<div class="reward-line"><span>XP EN SERIES</span><b>+${fmtInt(session.xpAcc || 0)}</b></div>
       <div class="sub">Esta sesión ya se había completado hoy: sin bono de finalización adicional (una acción nunca premia dos veces).</div>`;

  UI.session = null;
  showModal(`
    <div class="cine-tag">SESIÓN REGISTRADA</div>
    <div class="cine-title">${reward ? "MISIÓN COMPLETA" : "SESIÓN CERRADA"}</div>
    <div class="cine-sub">${esc(session.name)}<br>Series efectivas: ${esc(session.logged)}/${esc(session.plannedSets)} · ${esc(session.minutes)} min</div>
    ${rewardLines}
    ${choices.length ? `<div class="sub" style="margin-top:10px">Hito alcanzado: elige tu recompensa</div>
      <div style="display:flex;gap:8px">${choices.map((c, i) => `<button class="btn grow pick-r" data-i="${i}">${esc(c.name)}</button>`).join("")}</div>` : ""}
    <div style="height:14px"></div>
    <button class="btn btn-gold btn-block btn-big" id="m-ok">${choices.length ? "CONTINUAR SIN ELEGIR" : "CONTINUAR"}</button>
  `, () => {
    const pick = (i) => {
      const it = choices[i];
      if (it) { S.grantItem(it.id); S.equip(it.id); hideModal(); openSection("armory"); }
    };
    $("#modal-box").querySelectorAll(".pick-r").forEach((b) => (b.onclick = () => pick(+b.dataset.i)));
    $("#m-ok").onclick = () => {
      hideModal();
      UI.W?.setCoreMood("calm");
      enterHome();
    };
  });
}

UI.actions.openTraining = (workoutId) => {
  const w = WORKOUTS[workoutId];
  if (w) { openSection("training"); setTimeout(() => startWorkout(w), 250); }
};
UI.actions.startWorkout = startWorkout;
UI.actions.resumeSession = resumeSession;
UI.actions.pauseSession = pauseSession;
