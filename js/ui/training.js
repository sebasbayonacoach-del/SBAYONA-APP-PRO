import { rhythmTrainingCard } from "./personal.js";
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
import { esc, fmtDec, fmtInt, fmtDate, t } from "../i18n.js";
import {
  UI, $, el, elT, openDrawer, openSection, showModal, hideModal, toast,
  haptic, playTone, enterHome, BUILDERS,
} from "./shared.js";
import { confirmEarlyFinish } from "./cinematics.js";
import {
  SET_FEELINGS, normalizeSetFeedback, sessionPhase, sessionCompletion,
  sessionPath, completionDelta,
} from "../session-live.js";
import {
  supportsLocalRecording, preferredVideoMime, putExerciseVideo,
  latestExerciseVideo, deleteExerciseVideo, videoObjectUrl,
  MAX_RECORDING_MS,
} from "../media-vault.js";
import { isGranted, setConsent } from "../consents.js";
import { weekView, weekDayDate } from "../training-calendar.js";

const EXACT_POSE = { squat: 1, bench: 1, ohp: 1, pullup: 1, row: 1, lunge: 1, curl: 1, plank: 1 };
const AVATAR_ACTION = {
  squat: "squat", bench: "bench", deadlift: "row", ohp: "press", pullup: "pullup",
  row: "row", lunge: "lunge", curl: "curl", plank: "plank", pushup: "plank",
  hipthrust: "sit", burpee: "squat", mobility: "stretch", breathing: "meditate",
};
let personalVideoUrl = null;

const phaseText = (phase) => ({
  initial:[t("session.phase.initial"),t("session.phase.prep")],
  central:[t("session.phase.central"),t("session.phase.work")],
  final:[t("session.phase.final"),t("session.phase.close")],
}[phase.id] || [phase.label,phase.title]);

function livePhaseCard(session) {
  const path=sessionPath(session);
  const phase=sessionPhase(session);
  const [label,title]=phaseText(phase);
  const card=el("section","fit-live-phase");
  card.innerHTML=`
    <div><small>${esc(label)}</small><strong>${esc(title)}</strong></div>
    <span>${path.progress}%</span>
    <i><em style="width:${path.progress}%"></em></i>
    <div class="fit-live-phase-dots">
      <b class="${phase.id==='initial'?'on':path.progress>0?'done':''}">1</b>
      <b class="${phase.id==='central'?'on':phase.id==='final'?'done':''}">2</b>
      <b class="${phase.id==='final'?'on':''}">3</b>
    </div>`;
  return card;
}

function ensureRecordingConsent() {
  if (isGranted("recordings")) return Promise.resolve(true);
  return new Promise((resolve)=>{
    showModal(`
      <div class="cine-tag">${esc(t("session.video.localOnly"))}</div>
      <div class="cine-title" style="font-size:22px">${esc(t("session.video.consentTitle"))}</div>
      <div class="cine-sub">${esc(t("session.video.consentBody"))}</div>
      <div style="display:flex;gap:8px">
        <button class="btn grow" id="m-rec-no">${esc(t("session.video.cancel"))}</button>
        <button class="btn btn-primary grow" id="m-rec-yes">${esc(t("session.video.accept"))}</button>
      </div>`,()=>{
        $("#m-rec-no").onclick=()=>{hideModal();resolve(false);};
        $("#m-rec-yes").onclick=()=>{
          const saved=setConsent("recordings",true);
          hideModal();
          if(!saved) toast("PRIVACIDAD","No se pudo guardar el consentimiento. No se abrirá la cámara.","danger");
          resolve(Boolean(saved));
        };
      });
  });
}

async function recordExerciseVideo(exKey) {
  if (!supportsLocalRecording()) return toast("VÍDEO",t("session.video.unsupported"),"danger");
  if (!(await ensureRecordingConsent())) return;
  let stream=null;
  try {
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user",width:{ideal:720}},audio:false});
  } catch {
    return toast("CÁMARA","No se pudo abrir la cámara. Revisa el permiso del navegador.","danger");
  }

  showModal(`
    <div class="cine-tag">${esc(t("session.video.localOnly"))}</div>
    <div class="cine-title" style="font-size:20px">${esc(exerciseDef({ex:exKey}).name)}</div>
    <video id="m-rec-preview" autoplay muted playsinline class="fit-record-preview"></video>
    <div class="fit-record-status" id="m-rec-status">${esc(t("session.video.start"))} · máx. 60 s</div>
    <div style="display:flex;gap:8px">
      <button class="btn grow" id="m-rec-cancel">${esc(t("session.video.cancel"))}</button>
      <button class="btn btn-primary grow" id="m-rec-toggle">${esc(t("session.video.start"))}</button>
    </div>`,()=>{
      const video=$("#m-rec-preview"),toggle=$("#m-rec-toggle"),cancel=$("#m-rec-cancel"),status=$("#m-rec-status");
      video.srcObject=stream;
      const mime=preferredVideoMime();
      const chunks=[];
      let recorder=null,startedAt=0,timer=0,discarded=false;

      const stopTracks=()=>stream?.getTracks().forEach((track)=>track.stop());
      const close=()=>{clearTimeout(timer);stopTracks();hideModal();};

      cancel.onclick=()=>{
        discarded=true; // CANCELAR nunca significa guardar la grabación.
        if(recorder?.state==="recording") recorder.stop();
        close();
      };
      toggle.onclick=()=>{
        if(recorder?.state==="recording"){recorder.stop();return;}
        try{
          recorder=new MediaRecorder(stream,mime?{mimeType:mime,videoBitsPerSecond:900000}:{videoBitsPerSecond:900000});
        }catch{
          close();toast("VÍDEO",t("session.video.unsupported"),"danger");return;
        }
        discarded=false;
        chunks.length=0;
        recorder.ondataavailable=(event)=>{if(event.data?.size)chunks.push(event.data);};
        recorder.onstop=async()=>{
          clearTimeout(timer);
          if(discarded){stopTracks();return;}
          const durationMs=Date.now()-startedAt;
          const blob=new Blob(chunks,{type:recorder.mimeType||"video/webm"});
          stopTracks();
          try{
            const meta=await putExerciseVideo(exKey,blob,{durationMs});
            if(UI.session){
              UI.session.pendingEvidence={exKey,evidenceId:`local:${exKey}`,createdAt:meta.createdAt};
              persist(); // la referencia de vídeo también sobrevive a recargar
            }
            hideModal();
            toast("VÍDEO",t("session.video.saved"),"gold");
            if(UI.session) renderSession();
          }catch{
            hideModal();toast("VÍDEO","No pudimos guardar el vídeo local. Puede faltar espacio.","danger");
          }
        };
        recorder.start(250);
        startedAt=Date.now();
        status.textContent=t("session.video.recording");
        toggle.textContent=t("session.video.stop");
        timer=setTimeout(()=>{if(recorder?.state==="recording")recorder.stop();},MAX_RECORDING_MS);
      };
    });
}

async function appendLatestUserVideo(parent,exKey) {
  try{
    const record=await latestExerciseVideo(exKey);
    if(!record||!parent?.isConnected)return;
    if(personalVideoUrl) URL.revokeObjectURL(personalVideoUrl);
    personalVideoUrl=videoObjectUrl(record);
    if(!personalVideoUrl)return;
    const box=el("div","fit-personal-video");
    box.innerHTML=`
      <div><span>${esc(t("session.video.latest"))}</span><small>${new Date(record.createdAt).toLocaleDateString("es-ES")}</small></div>
      <video src="${personalVideoUrl}" controls muted playsinline preload="metadata"></video>
      <button type="button" class="btn btn-block">${esc(t("session.video.delete"))}</button>`;
    box.querySelector("button").onclick=async()=>{
      await deleteExerciseVideo(exKey);
      if(personalVideoUrl){URL.revokeObjectURL(personalVideoUrl);personalVideoUrl=null;}
      box.remove();
      toast("VÍDEO",t("session.video.deleteDone"));
    };
    parent.appendChild(box);
  }catch{/* vault opcional */}
}

const timedOf = (e) => !!(e.timed || e.ex === "plank" || e.ex === "mobility" || e.ex === "breathing");
const schemeText = (e) => {
  const load = e.kg ? `${fmtDec(e.kg)} kg` : "PESO CORPORAL";
  const rest = Number.isFinite(Number(e.rest)) ? ` · ${Math.max(0, Math.round(Number(e.rest)))} s descanso` : "";
  return `${e.sets} × ${timedOf(e) ? `${e.reps} s` : `${e.reps} reps`} · ${load} · RIR ${e.rir}${rest}`;
};

function exerciseDef(e) {
  return EXERCISES[e.ex] || {
    name: e.name || "EJERCICIO PROPLAYER",
    muscle: e.muscle || "FULL",
    demo: "idle",
    timed: !!e.timed,
  };
}

function sessionVideoFor(e) {
  if (e.videoUrl) return e.videoUrl;
  const local = ["localhost", "127.0.0.1", "::1"].includes(globalThis.location?.hostname || "");
  if (local && e.videoFile) return "./private-trainingym/media/" + encodeURIComponent(e.videoFile);
  return videoFor(e.ex);
}

function sessionPosterFor(e) {
  return EXERCISES[e.ex] ? posterFor(e.ex) : "";
}

function sessionTip(e) {
  if (EXERCISES[e.ex]) return tipFor(e.ex);
  return "Ejercicio PROPLAYER seleccionado por el Coach. Sigue la demostración y los parámetros de la rutina asignada.";
}

// ============================================================
// CATÁLOGO DEL DÍA
// ============================================================
BUILDERS.training = (body) => {
  document.body.classList.remove("modo-sesion"); // catálogo → fuera del foco de sesión
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
  const rhythm = rhythmTrainingCard();
  if (rhythm) body.appendChild(rhythm);

  // En una app de entrenamiento, HOY manda. La biblioteca técnica queda
  // disponible después de la acción principal, no compite con ella.
  const goal = S.data.profile.goal;
  body.appendChild(el("div", "sec-label", t("training.personalPlan", { goal: esc(goal) })));
  const w = S.todayWorkout();
  if (!w) {
    const recovery = el("div", "card today-recovery-card", `<h4>DÍA DE RECUPERACIÓN</h4><div class="sub">Hoy no hay sesión de fuerza programada. La fase actual prioriza recuperación activa.</div>`);
    body.appendChild(recovery);
    body.appendChild(workoutCard(WORKOUTS.mobility_flow, true));
  } else {
    body.appendChild(workoutCard(w, true));
  }

  body.appendChild(proplayerGateway());
  body.appendChild(el("div", "sec-label", t("training.weekCalendar")));
  body.appendChild(weekCalendar());
  body.appendChild(el("div", "sec-label", t("training.catalog")));
  const label = el("label", "fit-search-label", t("training.searchLabel"));
  label.htmlFor = "workout-search";
  const search = el("input", "fit-search"); search.id = "workout-search"; search.type = "search"; search.placeholder = t("training.searchPlaceholder");
  const results = el("div", "fit-catalog-grid");
  const renderResults = () => {
    results.textContent = "";
    const term = search.value.trim().toLocaleLowerCase("es");
    const found = Object.values(WORKOUTS).filter(x => `${x.name} ${x.tag} ${x.desc} ${x.exercises.map(e=>EXERCISES[e.ex]?.muscle).join(" ")}`.toLocaleLowerCase("es").includes(term));
    for (const x of found) results.append(workoutCard(x));
    if (!found.length) results.append(el("p", "fit-catalog-empty", t("training.searchEmpty")));
  };
  search.addEventListener("input", renderResults);body.append(label, search, results);renderResults();
};

function proplayerGateway() {
  const card = el("section", "proplayer-gateway");
  const copy = el("div", "proplayer-gateway-copy");
  copy.append(
    elT("span", "proplayer-kicker", "BAYONA / PROPLAYER"),
    elT("h3", "", "Biblioteca técnica · 3.141 ejercicios"),
    elT("p", "", "Fuerza, movilidad y cardio. 2.255 fichas reproducibles usando 1.607 MP4 únicos, sin cargar la biblioteca completa en memoria.")
  );
  const stats = el("div", "proplayer-gateway-stats");
  [["3.141","EJERCICIOS"],["2.255","CON VÍDEO"],["1.607","MP4 ÚNICOS"]].forEach(([value,label]) => {
    const item = el("span");
    item.append(elT("strong", "", value), elT("small", "", label));
    stats.append(item);
  });
  const open = elT("button", "btn btn-primary", "ABRIR PROPLAYER");
  open.type = "button";
  open.addEventListener("click", () => openSection("library"));
  card.append(copy, stats, open);
  return card;
}

function resumeCard(act) {
  const c = el("div", "card");
  c.style.borderColor = "var(--orange)";
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

function openSessionExerciseDetail(e) {
  if (EXERCISES[e.ex]) return openExerciseDetail(e.ex);
  const E = exerciseDef(e);
  const vid = sessionVideoFor(e);
  const media = vid
    ? `<div class="media-hero" style="margin-top:14px"><span class="badge demo">PROPLAYER</span><video src="${vid}" autoplay loop muted playsinline></video></div><div class="media-caption">Demostración PROPLAYER · propiedad BAYONA</div>`
    : `<div class="media-hero missing" style="margin-top:14px"><span class="badge demo">SIN VÍDEO</span><div class="media-missing">La ficha no tiene MP4 asociado.</div></div>`;
  showModal(`
    <div class="cine-tag">PROPLAYER · ${esc(E.muscle)}</div>
    <div class="cine-title" style="font-size:22px">${esc(E.name)}</div>
    ${media}
    <div class="cine-sub" style="text-align:left">${esc(sessionTip(e))}</div>
    <div class="reward-line"><span>PAUTA</span><b>${esc(schemeText(e))}</b></div>
    <button class="btn btn-primary btn-block btn-big" id="m-ok" style="margin-top:16px">ENTENDIDO</button>
  `, () => { $("#m-ok").onclick = hideModal; });
}

// ---------------- CALENDARIO SEMANAL ----------------
let calWeekOffset = 0;
function weekCalendar() {
  const wrap = el("div");
  const view = weekView(S.data.plan.week, calWeekOffset);
  calWeekOffset = view.offset; // entre semana 1 y 24, nunca fuera del macrociclo
  const week = view.week;
  const phase = view.phase; // la fase corresponde a la semana que se ve
  const today = new Date();
  const dow = (today.getDay() + 6) % 7;

  const head = el("div", "cal-head");
  head.innerHTML = `<div class="cal-title">SEMANA ${esc(week)}/24 · ${esc(phase.name)}</div>`;
  const nav = el("div", "cal-nav");
  const prev = el("button", "", "←");
  const next = el("button", "", "→");
  prev.setAttribute("aria-label", "Semana anterior");
  next.setAttribute("aria-label", "Semana siguiente");
  prev.disabled = !view.canPrevious;
  next.disabled = !view.canNext;
  prev.addEventListener("click", () => { calWeekOffset--; openSection("training"); });
  next.addEventListener("click", () => { calWeekOffset++; openSection("training"); });
  nav.append(prev, next);
  head.appendChild(nav);
  wrap.appendChild(head);
  wrap.appendChild(el("div", "week-phase", `<span>VOLUMEN OBJETIVO <b>${Math.round(phase.vol * 100)}%</b></span><span>INTENSIDAD <b>${Math.round(phase.int * 100)}% 1RM</b></span>`));

  const grid = el("div", "cal-grid");
  grid.setAttribute("role", "group");
  grid.setAttribute("aria-label", t("training.weekAria"));
  const dayPlan = MACRO_DAYPLAN();
  dayPlan.forEach((wid, i) => {
    const date = weekDayDate(today, view.offset, i);
    const done = S.data.today.trained && i === dow && week === S.data.plan.week;
    const isToday = date.toDateString() === today.toDateString();
    // Un botón real permite navegar con Tab / Enter / Espacio y expresa la selección.
    const cell = el("button", `cal-day ${isToday ? "today" : ""} ${done ? "done" : ""} ${wid ? "" : "rest"}`);
    cell.type = "button";
    cell.setAttribute("aria-label", t("training.dayAria", {
      date: date.toLocaleDateString("es-ES", {weekday:"long",day:"numeric",month:"long"}),
      session: wid ? WORKOUTS[wid].name : t("training.restDay"),
    }));
    cell.setAttribute("aria-pressed", "false");
    cell.innerHTML = `
      <div class="cal-d-name">${DAY_NAMES()[i]}</div>
      <div class="cal-d-num">${date.getDate()}</div>
      <div class="cal-d-emoji">${DAY_ICONS[wid || "rest"]}</div>
      <div class="cal-d-tag">${wid ? esc(WORKOUTS[wid].name.replace("OPERACIÓN: ", "")) : "DESCANSO"}</div>`;
    cell.addEventListener("click", () => showDayDetail(wid, date, cell, grid));
    grid.appendChild(cell);
  });
  wrap.appendChild(grid);
  wrap.appendChild(elT("p", "cal-scroll-hint", t("training.weekScrollHint")));
  const detail = el("div", "cal-detail");
  detail.id = "cal-detail";
  wrap.appendChild(detail);
  const previewDate = weekDayDate(today, view.offset, dow);
  queueMicrotask(() => {
    // No escribir el detalle de una vista que el usuario ya abandonó.
    if (grid.isConnected) showDayDetail(dayPlan[dow], previewDate, grid.children[dow], grid);
  });
  return wrap;
}

// Acceso directo al plan semanal guardado (no se modifica la programación).
const MACRO_DAYPLAN = () => S.weekPlan();
const DAY_NAMES = () => MACRO.dayNames;

function showDayDetail(wid, date, cell, grid) {
  if (grid) grid.querySelectorAll(".cal-day").forEach((c) => {
    c.classList.remove("sel");
    c.setAttribute("aria-pressed", String(c === cell));
  });
  if (cell) cell.classList.add("sel");
  const box = document.getElementById("cal-detail");
  if (!box) return;
  box.textContent = "";
  const dstr = date.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
  if (!wid) {
    box.appendChild(el("div", "card", `<h4>☾ ${esc(dstr.toUpperCase())}</h4><div class="sub">Día de descanso programado. El crecimiento ocurre mientras recuperas: sueño, hidratación y movilidad ligera.</div>`));
    return;
  }
  const w = WORKOUTS[wid];
  const c = el("div", "card");
  c.innerHTML = `<h4>${DAY_ICONS[wid]} ${esc(w.name.replace(/^OPERACIÓN:\s*/, ""))}</h4><div class="sub">${esc(dstr)} · ${esc(w.min)} min · ${esc(w.desc)}</div>`;
  const b = el("button", "btn btn-primary btn-block", "EMPEZAR SESIÓN");
  b.style.marginTop = "12px";
  b.addEventListener("click", () => startWorkout(w));
  c.appendChild(b);
  box.appendChild(c);
  w.exercises.forEach((s) => {
    const E = EXERCISES[s.ex];
    const row = el("button", "ex-media-row");
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

function workoutCard(w, featured = false) {
  const done = S.data.today.workoutDone === w.id;
  const auto = todaysSession();
  const isToday = auto && auto.workout.id === w.id;
  const prev = previewWorkoutXP(w);
  const bonus = workoutCompleteReward({ minutes: w.min });
  const c = el("div", "card workout-card");
  if (featured) c.classList.add("today-workout-card");
  c.innerHTML = `
    <div class="card-row">
      <div class="grow">
        <h4>${esc(w.name.replace(/^OPERACIÓN:\s*/, ""))}</h4>
        <div class="sub">${esc(w.desc)}</div>
      </div>
    </div>
    <div class="card-row" style="margin-top:10px">
      <span class="pill blue">${esc(w.tag)}</span>
      <span class="pill">${esc(w.min)} MIN</span>
      <span class="pill">${w.exercises.length} EJERCICIOS</span>
      ${done ? '<span class="pill green">COMPLETADO HOY</span>' : ""}
    </div>`;
  if (isToday && auto.applied) {
    c.appendChild(el("div", "sub", `<div class="autoreg">AUTORREGULADO · ${esc(auto.adjusted)}/${esc(auto.original)} series (se aplica al empezar)<br>${esc(auto.note)}</div>`));
  }
  const btn = el("button", "btn btn-primary btn-block", done ? "REPETIR SESIÓN" : isToday ? "EMPEZAR ENTRENAMIENTO" : "EMPEZAR");
  btn.style.marginTop = "12px";
  if (done) btn.title = "Repetir registra series reales, pero el bono de finalización diario ya se usó.";
  btn.addEventListener("click", () => startWorkout(w));
  c.appendChild(btn);
  return c;
}

// ---------------- MOTOR DE SESIÓN ----------------
function startWorkout(w) {
  // Entradas desde Coach, catálogo y accesos directos no pueden pisar un
  // entrenamiento persistido (ni sus series ni sus puntos).
  const active = UI.session || S.getActiveSession();
  if (active && active.status !== "completada" && active.status !== "abandonada") {
    toast("SESIÓN YA GUARDADA", "Reanuda o abandona explícitamente la sesión pendiente antes de empezar otra.");
    return resumeSession();
  }
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
    phase: "prep",
    preparation: {
      energy: S.data.today.energy ?? null,
      discomfort: 0,
      objective: "",
      warmupDone: false,
    },
    closure: null,
    earlyFinish: false,
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
  document.body.classList.add("modo-sesion"); // MODO SESIÓN: gimnasio, sudor, una mano
  const session = UI.session;
  if (!session) return BUILDERS.training();
  const { exIdx, setIdx } = session;
  const body = openDrawer(session.name, `SESIÓN ${session.status.toUpperCase()} · ${session.minutes} MIN`);
  document.querySelectorAll(".rail-btn").forEach((x) => x.classList.toggle("active", x.dataset.go === "training"));

  const prog = el("div", "card");
  prog.innerHTML = `<div class="card-row"><span class="pill gold">${esc(session.logged)} / ${esc(session.plannedSets)} SERIES REGISTRADAS</span><span class="pill">EJERCICIO ${Math.min(session.exIdx+1,session.exercises.length)} DE ${session.exercises.length}</span></div><div class="fit-session-progress" role="progressbar" aria-label="Series registradas" aria-valuemin="0" aria-valuemax="${session.plannedSets}" aria-valuenow="${session.logged}"><i style="width:${session.logged/Math.max(1,session.plannedSets)*100}%"></i></div>`;
  body.appendChild(prog);
  body.appendChild(livePhaseCard(session));

  const libraryQuick = el("div", "fit-session-library");
  const libraryButton = elT("button", "btn", "BIBLIOTECA 3.141");
  libraryButton.type = "button";
  libraryButton.addEventListener("click", () => openSection("library"));
  libraryQuick.append(elT("span", "", "¿Necesitas consultar otra técnica?"), libraryButton);
  body.appendChild(libraryQuick);

  if (exIdx >= session.exercises.length) return renderSessionClose(body);

  const s = session.exercises[exIdx];
  const E = exerciseDef(s);
  // ORDEN DE SESIÓN: primero lo accionable (el formulario se ve sin scroll en móvil)
  const hero = el("div", "set-hero");
  hero.innerHTML = `
    <div class="lbl">EJERCICIO ACTUAL</div>
    <div class="big">${esc(E.name)}</div>
    <div class="scheme">SERIE ${setIdx + 1}/${s.sets} · ${esc(schemeText(s))}</div>`;
  body.appendChild(hero);

  const sug = s.kg > 0 ? nextLoad(s.ex, s.kg, s.reps, s.rir) : 0;
  body.appendChild(setForm(s, setIdx, sug));
  const technique = el("details", "fit-technique");
  technique.append(el("summary", "", "Técnica e instrucciones"));
  appendLatestUserVideo(technique,s.ex);
  const vid = sessionVideoFor(s);
  if (vid) {
    technique.append(el("div", "media-hero", `<video src="${vid}" controls muted playsinline preload="none" poster="${sessionPosterFor(s)}"></video>`));
    technique.append(el("div", "media-caption", s.videoUrl ? t("training.video.online") : t("training.video.local")));
  }
  technique.append(el("p", "media-caption", esc(sessionTip(s))));
  body.append(technique);

  // ---- MOTOR DE RENDIMIENTO: la carga sugerida SE USA en el registro ----
  const sug2 = sug;
  const last = S.data.prs[s.ex];
  const pro = el("div", "card");
  const performanceHtml = `
    <div class="sec-label" style="margin-top:0">MOTOR DE RENDIMIENTO</div>
    <div class="kv"><span class="k">ÚLTIMO RÉCORD</span><span class="v">${last ? `${esc(last.kg)} kg × ${esc(last.reps)} · 1RM ${esc(last.e1)}` : "— el primero es hoy —"}</span></div>
    ${s.kg > 0 ? `<div class="kv"><span class="k">CARGA SUGERIDA HOY</span><span class="v" style="color:var(--orange)">${fmtDec(sug2)} kg (base ${fmtDec(s.kg)})</span></div>` : ""}`;
  pro.innerHTML = performanceHtml;
  const warm = warmupSets(sug2 || s.kg);
  if (warm.length) {
    pro.appendChild(el("div", "kv", `<span class="k">CALENTAMIENTO</span><span class="v">${warm.map((x) => `${fmtDec(x.kg)}×${x.reps}`).join(" · ")}</span>`));
    const plates = plateMath(sug2 || s.kg);
    if (plates.length) pro.appendChild(el("div", "kv", `<span class="k">DISCOS POR LADO</span><span class="v">${plates.map((p) => fmtDec(p)).join(" · ")} kg</span>`));
  }
  body.appendChild(pro);

  // ---- PLAN DE HOY (lista completa al final: no empuja el registro hacia abajo) ----
  const coachBtn = el("button", "btn btn-block", "PREGUNTA AL COACH");
  coachBtn.style.marginTop = "10px";
  coachBtn.addEventListener("click", () =>
    UI.actions.openCoachAsk?.(`Estoy en la sesión «${session.name}», en ${E.name}. ¿Consejo de técnica o de ritmo para esta serie?`));
  body.appendChild(coachBtn);
  body.appendChild(el("div", "media-caption", "CORE es tu coach local (sin nube, no clínico). Al preguntar, la sesión se pausa y puedes reanudarla sin perder nada."));
  body.appendChild(el("div", "sec-label", `PLAN DE HOY · ${session.exercises.length} EJERCICIOS`));
  session.exercises.forEach((sx, i) => {
    const E2 = exerciseDef(sx);
    const row = el("button", "ex-media-row");
    let dots = "";
    for (let k = 0; k < sx.sets; k++) dots += `<span class="set-dot ${i < exIdx || (i === exIdx && k < setIdx) ? "done" : ""}"></span>`;
    const thumbUrl = sessionPosterFor(sx);
    const thumb = thumbUrl ? `<img src="${thumbUrl}" alt="${esc(E2.name)}" loading="lazy" />` : `<div class="no-thumb">${sx.videoFile ? "▶" : "—"}</div>`;
    row.innerHTML = `
      <div class="ex-thumb">${thumb}</div>
      <div>
        <div class="ex-name">${String(i + 1).padStart(2, "0")} · ${esc(E2.name)}</div>
        <div class="ex-scheme">${esc(schemeText(sx))}</div>
        <div class="ex-tip">${esc(sessionTip(sx))}</div>
        <div style="display:flex;gap:4px;margin-top:8px">${dots}</div>
      </div>`;
    row.addEventListener("click", () => openSessionExerciseDetail(sx));
    body.appendChild(row);
  });

  const rowBtns = el("div", "card-row");
  const manualRest = Math.max(0, Math.round(Number(s.rest ?? 90)));
  const bRest = el("button", "btn grow", "DESCANSO " + manualRest + " s");
  bRest.addEventListener("click", () => manualRest > 0 ? startRest(manualRest) : toast("SIN DESCANSO PROGRAMADO", "Este ejercicio tiene 0 s de descanso."));
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
  bPause.addEventListener("click", () => { pauseSession("Sesión pausada"); openSection("hoy"); });
  const bEnd = el("button", "btn btn-danger grow", "FINALIZAR SESIÓN");
  bEnd.addEventListener("click", async () => {
    const ok = await confirmEarlyFinish({ loggedSets: session.logged, plannedSets: session.plannedSets, minutes: session.minutes });
    if (ok) finishWorkout({ early:true });
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

function renderSessionClose(body) {
  const session=UI.session;
  if(!session)return BUILDERS.training();
  const completion=sessionCompletion(session);
  const card=el("section","fit-session-close");
  card.innerHTML=`
    <div class="sec-label" style="margin-top:0">${esc(t("session.close.kicker"))}</div>
    <h3>${esc(t("session.close.title"))}</h3>
    <p>${esc(t("session.close.body"))}</p>
    <div class="fit-session-close-stats">
      <span><small>SERIES</small><b>${session.logged} / ${session.plannedSets}</b></span>
      <span><small>PROGRESO</small><b>${completion.pct}%</b></span>
      <span><small>XP EN SERIES</small><b>+${fmtInt(session.xpAcc||0)}</b></span>
    </div>
    <label class="fit-session-note"><span>${esc(t("session.feedback.note"))}</span><textarea maxlength="180" placeholder="${esc(t("session.feedback.notePlaceholder"))}">${esc(session.closeNote||"")}</textarea></label>
    <button type="button" class="btn ${completion.complete?"btn-gold":"btn-primary"} btn-block btn-big">${esc(completion.complete?t("session.close.complete"):t("session.close.partial"))}</button>`;
  const note=card.querySelector("textarea");
  note.oninput=()=>{session.closeNote=note.value.slice(0,180);persist();};
  card.querySelector("button").onclick=async()=>{
    if(completion.complete)return finishWorkout();
    const ok=await confirmEarlyFinish({loggedSets:session.logged,plannedSets:session.plannedSets,minutes:session.minutes});
    if(ok)finishWorkout({early:true});
  };
  body.appendChild(card);
  UI.W?.avatar.setAction("idle");
}

function setForm(s, setIdx, sug) {
  const timed = timedOf(s);
  const wrap = el("div", "card set-form");
  const kgVal = s.kg > 0 ? (sug || s.kg) : 0;
  const repVal = s.reps;
  const hasEvidence = UI.session?.pendingEvidence?.exKey === s.ex;
  const feelingKey = {
    smooth:"session.feedback.smooth",
    solid:"session.feedback.solid",
    hard:"session.feedback.hard",
    very_hard:"session.feedback.veryHard",
    pain:"session.feedback.pain",
  };
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
    <div class="fit-set-feedback">
      <label>${esc(t("session.feedback.label"))}
        <select id="sf-feeling">
          <option value="">${esc(t("session.feedback.none"))}</option>
          ${SET_FEELINGS.map((x)=>`<option value="${x.id}">${esc(t(feelingKey[x.id]))}</option>`).join("")}
        </select>
      </label>
      <label>${esc(t("session.feedback.effort"))}
        <select id="sf-effort">
          <option value="">—</option>
          ${[1,2,3,4,5].map((x)=>`<option value="${x}">${x}/5</option>`).join("")}
        </select>
      </label>
      <label class="fit-set-note">${esc(t("session.feedback.note"))}
        <textarea id="sf-note" maxlength="180" placeholder="${esc(t("session.feedback.notePlaceholder"))}"></textarea>
      </label>
    </div>
    <div class="fit-set-media">
      <button type="button" class="btn" id="sf-record">${hasEvidence?"✓ "+esc(t("session.video.saved")):esc(t("session.video.record"))}</button>
      <span>${esc(t("session.video.localOnly"))}</span>
    </div>
    <div class="sub">Edita los valores reales antes de confirmar. RIR = repeticiones que te quedaban en reserva.</div>
    <button class="btn btn-primary btn-block btn-big" id="sf-ok">REGISTRAR SERIE</button>`;
  wrap.querySelector("#sf-record").addEventListener("click", () => recordExerciseVideo(s.ex));
  wrap.querySelector("#sf-ok").addEventListener("click", () => {
    const kg = s.kg > 0 ? Number(wrap.querySelector("#sf-kg").value) : 0;
    const reps = parseInt(wrap.querySelector("#sf-reps").value, 10) || 0;
    const rir = parseInt(wrap.querySelector("#sf-rir").value, 10);
    const feedback = normalizeSetFeedback({
      feeling:wrap.querySelector("#sf-feeling").value,
      effort:wrap.querySelector("#sf-effort").value,
      note:wrap.querySelector("#sf-note").value,
    });
    const evidenceId = UI.session?.pendingEvidence?.exKey === s.ex ? UI.session.pendingEvidence.evidenceId : null;
    if (reps <= 0) return toast("REVISA LA SERIE", timed ? "Indica los segundos realizados." : "Indica las repeticiones realizadas.", "danger");
    if (!Number.isFinite(kg) || kg < 0 || !Number.isInteger(rir) || rir < 0 || rir > 4) return toast("REVISA LA SERIE", "La carga debe ser cero o positiva y el RIR debe estar entre 0 y 4.", "danger");
    logCurrentSet({ kg, reps, rir, ...feedback, evidenceId });
  });
  return wrap;
}

function persist() {
  if (UI.session) { UI.session.updatedAt = Date.now(); S.setActiveSession({ ...UI.session }); }
}

function logCurrentSet({ kg, reps, rir, feeling = null, effort = null, note = "", evidenceId = null }) {
  const session = UI.session;
  const s = session.exercises[session.exIdx];
  const timed = timedOf(s);
  const idKey = `${session.id}:${session.exIdx}:${session.setIdx}`;
  const previousPR = S.data.prs[s.ex] ? { ...S.data.prs[s.ex] } : null;
  const res = S.logSet(s.ex, session.setIdx, kg, reps, rir, {
    idKey,
    seconds: timed ? reps : 0,
    formScore: null,
  });
  if (!res) return toast("SERIE YA REGISTRADA", "Esa serie ya estaba guardada (sin XP duplicado).");
  const E = exerciseDef(s);
  const restSec = Math.max(0, Math.round(Number(s.rest ?? 90)));
  const meta={feeling,effort,note,evidenceId,idKey};
  archiveSet(s.ex, kg, reps, rir, E.muscle, meta);
  session.setsDone.push({
    idKey, exKey:s.ex, exIdx:session.exIdx, setIdx:session.setIdx,
    kg,reps,rir,seconds:timed?reps:0,xp:res.xp,pr:res.pr,skill:res.skill,
    skillGain:res.skillGain,previousPR,
    feeling,effort,note,evidenceId,ts:Date.now(),
  });
  session.logged++;
  session.xpAcc = (session.xpAcc || 0) + res.xp;
  if(session.pendingEvidence?.exKey===s.ex) session.pendingEvidence=null;
  haptic(20);
  UI.W?.avatar.setAction("celebrate");
  setTimeout(() => UI.W?.avatar.setAction(AVATAR_ACTION[s.ex] || "idle"), 900);
  if (session.setIdx + 1 >= s.sets) { session.exIdx++; session.setIdx = 0; }
  else session.setIdx++;
  const hasNext=session.exIdx<session.exercises.length;
  persist();
  renderSession();
  if (feeling==="pain") toast("SERIE REGISTRADA",t("session.pain.notice"),"danger");
  if (UI.session && hasNext && restSec > 0) startRest(restSec);
}

function undoLastSet() {
  endRest();
  const session = UI.session;
  const r = session.setsDone.pop();
  if (!r) return;
  if (!S.undoSet(r)) {
    session.setsDone.push(r);
    return toast("CORRECCIÓN NO DISPONIBLE", "El registro ya fue corregido o no coincide con esta sesión.", "danger");
  }
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
  if (!UI.session) return;
  const restingSessionId = UI.session.id;
  if (UI.restTimer) { clearInterval(UI.restTimer.t); UI.restTimer = null; }
  const body = openDrawer("DESCANSO", "RECUPERACIÓN ENTRE SERIES");
  let left = sec, paused = false;
  const wrap = el("div", "breath-wrap");
  wrap.innerHTML = `<div class="breath-circle big" id="rest-circle">${left} s</div><div class="mono" style="color:var(--mute);font-size:11px">RECUPERA EL ALIENTO. LA SIGUIENTE SERIE TE ESPERA.</div>`;
  body.appendChild(wrap);
  const next = UI.session.exercises[UI.session.exIdx];
  if (next) body.append(el("p", "fit-rest-next", `Después: ${esc(exerciseDef(next).name)} · serie ${UI.session.setIdx + 1}/${next.sets}`));
  UI.W?.avatar.setAction("idle");
  const row = el("div", "card-row");
  const bPause = el("button", "btn grow", "PAUSA");
  bPause.id = "rest-pause";
  const bSkip = el("button", "btn grow", "SALTAR DESCANSO");
  bSkip.id = "rest-skip";
  row.append(bPause, bSkip);
  body.appendChild(row);
  const tick = () => {
    if (!UI.session || UI.session.id !== restingSessionId || $("#drawer").dataset.section !== "training") { endRest(); return; }
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
  endRest();
  if (!UI.session) return;
  UI.session.status = "pausada";
  persist();
  S.data.activeSession = UI.session;
  S.save();
  UI.session = null;
  document.body.classList.remove("modo-sesion");
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
      endRest();
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
function finishWorkout({ early = false } = {}) {
  endRest();
  const session = UI.session;
  if (!session) return BUILDERS.training();
  document.body.classList.remove("modo-sesion");

  const completion=sessionCompletion(session);
  const profile=S.data.profile||{};
  const face=profile.face
    ? `<img src="${esc(profile.face)}" alt="${esc(t("session.summary.faceAlt"))}">`
    : `<span>${esc((profile.name&&profile.name!=="TÚ"?profile.name:"B").slice(0,1).toUpperCase())}</span>`;

  if (!completion.complete) {
    S.closePartialWorkout(session.workoutId,{
      loggedSets:session.logged,
      plannedSets:session.plannedSets,
      minutes:session.minutes,
    });
    session.status="cerrada parcial";
    UI.session=null;
    UI.W?.avatar.setAction("idle");
    UI.W?.setCoreMood("calm");
    haptic(24);
    showModal(`
      <div class="fit-session-summary partial">
        <div class="fit-session-summary-person">${face}<div><small>SESIÓN REGISTRADA</small><strong>${esc(t("session.summary.partial"))}</strong></div></div>
        <div class="cine-sub">${esc(session.name)}<br>${session.logged}/${session.plannedSets} series · ${completion.pct}% del plan</div>
        <div class="reward-line"><span>${esc(t("session.summary.seriesXp"))}</span><b>+${fmtInt(session.xpAcc||0)} XP</b></div>
        <div class="reward-line"><span>${esc(t("session.summary.finishXp"))}</span><b>+0 XP</b></div>
        <div class="sub">${esc(t("session.summary.noBonus"))}</div>
        ${session.closeNote?`<div class="fit-session-summary-note">${esc(session.closeNote)}</div>`:""}
        <button class="btn btn-primary btn-block btn-big" id="m-ok">CONTINUAR</button>
      </div>`,()=>{
        $("#m-ok").onclick=()=>{hideModal();enterHome();};
      });
    return;
  }

  const beforeLevel=S.level();
  const before={level:beforeLevel.lvl,credits:S.data.credits,points:S.data.points};
  const reward = S.completeWorkout(session.workoutId, {
    loggedSets: session.logged,
    plannedSets: session.plannedSets,
    minutes: session.minutes,
  });
  const afterLevel=S.level();
  const after={level:afterLevel.lvl,credits:S.data.credits,points:S.data.points};
  const delta=completionDelta(before,after,reward);
  session.status="completada";

  if(session.closeNote) S.logJourney("workout",`Cierre de sesión · ${session.closeNote}`,0);

  UI.W?.avatar.setAction("celebrate");
  UI.W?.setCoreMood("gold");
  haptic(60);

  let choices = [];
  if (reward && S.data.stats.workouts % 3 === 0) {
    choices = ITEMS.filter((i) => !S.isOwned(i.id) && i.rarity !== "MYTHIC").slice(0, 2);
  }

  const title=reward?t("session.summary.complete"):"SESIÓN CERRADA";
  const xpPct=Math.min(100,Math.round((afterLevel.cur/Math.max(1,afterLevel.need))*100));
  UI.session = null;
  showModal(`
    <div class="fit-session-summary complete">
      <div class="fit-session-summary-person">${face}<div><small>SESIÓN REGISTRADA</small><strong>${esc(title)}</strong><em>${esc(session.name)}</em></div></div>
      <div class="fit-session-level">
        <span><small>${esc(t("session.summary.level"))}</small><b>${afterLevel.lvl}</b>${delta.leveledUp?"<i>SUBISTE DE NIVEL</i>":""}</span>
        <span><small>${esc(t("session.summary.fitcoins"))}</small><b>✦ ${delta.fitCoinsTotal}</b><i>+${delta.fitCoinsGained} esta sesión</i></span>
      </div>
      <div class="fit-session-xp"><span><small>${esc(t("session.summary.progress"))}</small><b>${afterLevel.cur} / ${afterLevel.need} XP</b></span><i><em style="width:${xpPct}%"></em></i></div>
      <div class="cine-sub">${session.logged}/${session.plannedSets} series · ${session.minutes} min · 100% del plan</div>
      <div class="reward-line"><span>${esc(t("session.summary.seriesXp"))}</span><b>+${fmtInt(session.xpAcc||0)} XP</b></div>
      <div class="reward-line"><span>${esc(t("session.summary.finishXp"))}</span><b>+${reward?fmtInt(reward.xp):0} XP</b></div>
      <div class="reward-line"><span>${esc(t("session.summary.points"))}</span><b>+${delta.pointsGained} ◆</b></div>
      ${session.closeNote?`<div class="fit-session-summary-note">${esc(session.closeNote)}</div>`:""}
      ${choices.length ? `<div class="sub" style="margin-top:10px">Hito alcanzado: elige tu recompensa</div>
        <div style="display:flex;gap:8px">${choices.map((c,i)=>`<button class="btn grow pick-r" data-i="${i}">${esc(c.name)}</button>`).join("")}</div>` : ""}
      <div style="height:14px"></div>
      <button class="btn btn-gold btn-block btn-big" id="m-ok">${choices.length?"CONTINUAR SIN ELEGIR":"CONTINUAR"}</button>
    </div>
  `, () => {
    const pick=(i)=>{
      const it=choices[i];
      if(it){S.grantItem(it.id);S.equip(it.id);hideModal();openSection("armory");}
    };
    $("#modal-box").querySelectorAll(".pick-r").forEach((button)=>(button.onclick=()=>pick(+button.dataset.i)));
    $("#m-ok").onclick=()=>{
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
