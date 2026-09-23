// ============================================================
// BAYONA — UI LAYER (shell): HUD, misión, navegación
// WORLD-FIRST UI: el avatar es primero, los datos son HUD contextual.
// Cada sección es un LUGAR del mundo BAYONA (js/ui/*.js).
// ============================================================
import { S, on } from "./state.js";
import { WORKOUTS } from "./data.js";
import { previewWorkoutXP, workoutCompleteReward, stepsReward } from "./rewards.js";
import { esc, fmtInt, t } from "./i18n.js";
import { planDelDia } from "./hoy.js";
import { contextoDelDia } from "./contexto.js";
import {
  UI, $, el, elT, enterHome, closeDrawer, openSection, showModal, hideModal,
  toast, xpBurst, playTone, wireModalLayer,
} from "./ui/shared.js";
import { showDayRecap, showLevelUp, showPR } from "./ui/cinematics.js";

// mundos (imports con efecto: registran sus BUILDERS)
import "./ui/hoy.js";
import "./ui/trabajo.js";
import "./ui/training.js";
import "./ui/nutrition.js";
import "./ui/recovery.js";
import "./ui/mind.js";
import "./ui/plan.js";
import "./ui/coachos.js";
import "./ui/armory.js";
import "./ui/progress.js";
import "./ui/core.js";
import "./ui/more.js";
import "./ui/appearance.js";
import "./sync/account.js";

export function initUI(world) {
  UI.W = world;
  wireHud();
  wireModalLayer();
  on("xp", ({ amount }) => { refreshHud(); xpBurst(amount); });
  on("wallet", refreshHud);
  on("today", refreshHud);
  on("session", refreshHud);
  on("levelup", ({ lvl }) => showLevelUp(lvl));
  on("itemUnlock", ({ id }) => toast("OBJETO DESBLOQUEADO", S.item(id)?.name || id, "gold"));
  on("outfit", refreshHud);
  on("set", ({ pr, exKey }) => { if (pr) showPR(exKey, pr); });

  refreshHud();
  enterHome(true);
  // reanudación de sesión persistente (sobrevive a recargas)
  const act = S.getActiveSession();
  if (act && act.status !== "completada" && act.status !== "abandonada") {
    UI.session = act;
    toast("SESIÓN GUARDADA", `Tienes «${act.name}» ${act.status}. Puedes reanudarla en ENTRENAMIENTO.`);
  }
}

// ============================================================
// HUD
// ============================================================
export function refreshHud() {
  const L = S.level();
  $("#lvl-num").textContent = L.lvl;
  $("#rank-name").textContent = S.rank();
  $("#xp-fill").style.width = `${Math.round((L.cur / L.need) * 100)}%`;
  $("#xp-txt").textContent = `${fmtInt(L.cur)} / ${fmtInt(L.need)} XP`;
  $("#cur-points").textContent = fmtInt(S.data.points);
  $("#cur-credits").textContent = fmtInt(S.data.credits);
  const rd = S.readiness();
  $("#v-readiness").textContent = rd == null ? "—" : rd + "%";
  $("#b-readiness").style.width = (rd ?? 0) + "%";
  $("#m-readiness").title = rd == null ? t("state.notLogged") : "Preparación estimada con tus registros";
  $("#v-streak").textContent = S.data.streak + " D";
  $("#v-steps").textContent = fmtInt(S.data.today.steps);
  $("#v-water").textContent = fmtInt(S.data.today.water) + " ml";
  $("#b-water").style.width = S.hydrationPct() + "%";
  updateMissionCard();
}

function updateMissionCard() {
  const t2 = S.data.today;
  const day = S.dayNumber();
  const act = UI.session || S.getActiveSession();
  // contexto vivo del día: saludo + momento (un avatar, muchos contextos)
  const plan = planDelDia(S);
  const ctx = contextoDelDia({
    hora: new Date().getHours(),
    nombre: S.data.profile.name,
    siguiente: plan.siguiente,
    sesionEnCurso: !!(act && act.status !== "completada" && act.status !== "abandonada"),
    trained: t2.trained,
  });
  $("#mc-saludo").textContent = ctx.saludo;
  $("#mc-tag").textContent = `DÍA ${day} · ${ctx.etiqueta}`;
  const cta = $("#mc-cta");

  if (act && act.status !== "completada" && act.status !== "abandonada") {
    $("#mc-title").textContent = act.name;
    $("#mc-sub").textContent = `Sesión ${act.status} · ${act.logged}/${act.plannedSets} series · XP acumulado ${fmtInt(act.xpAcc || 0)}`;
    cta.textContent = act.status === "pausada" ? "REANUDAR SESIÓN" : "CONTINUAR SESIÓN";
    cta.dataset.mode = "resume";
    return;
  }
  cta.dataset.mode = "";
  const w = S.todayWorkout();
  const dayDone = t2.trained && t2.water >= 1500 && t2.mobility;
  $("#mc-hoy").textContent = `VER MI DÍA · ${plan.hechos}/${plan.total}`;
  if (dayDone) {
    $("#mc-title").textContent = "DÍA COMPLETADO";
    $("#mc-sub").textContent = "Has cerrado la misión diaria. El personaje descansa contigo.";
    cta.textContent = "RESUMEN DEL DÍA";
  } else if (w) {
    $("#mc-title").textContent = w.name;
    const bonus = workoutCompleteReward({ minutes: w.min, loggedSets: 0, plannedSets: 0 });
    const bits = [];
    if (!t2.trained) bits.push(`${w.min} min · ~${fmtInt(previewWorkoutXP(w).xp)} XP en series + ${bonus.xp} XP de cierre`);
    if (t2.trained) bits.push("Sesión completada hoy ✅");
    if (t2.water < 1500) bits.push(`hidratación ${fmtInt(t2.water)}/1.500 ml`);
    if (!t2.mobility) bits.push("movilidad pendiente");
    $("#mc-sub").textContent = bits.join(" · ");
    cta.textContent = t2.trained ? "VER PROGRESO" : "EMPEZAR SESIÓN DE HOY";
  } else {
    $("#mc-title").textContent = "DÍA DE RECUPERACIÓN";
    $("#mc-sub").textContent = "La disciplina también es parar. Movilidad + respiración.";
    cta.textContent = "FLUJO DE RECUPERACIÓN";
  }
}

function wireHud() {
  $("#mc-cta").addEventListener("click", () => {
    const mode = $("#mc-cta").dataset.mode;
    if (mode === "resume") return UI.actions.resumeSession?.();
    const t2 = S.data.today;
    if (t2.trained && t2.water >= 1500 && t2.mobility) return showDayRecap();
    const w = S.todayWorkout();
    if (w && !t2.trained) return UI.actions.openTraining?.(w.id);
    if (w) return openSection("progress");
    return UI.actions.openTraining?.("mobility_flow");
  });
  $("#level-chip").addEventListener("click", () => openSection("progress"));
  $("#mc-hoy").addEventListener("click", () => openSection("hoy"));
  $("#m-readiness").addEventListener("click", () => openSection("recovery"));
  $("#m-streak").addEventListener("click", () => openSection("more"));
  // registro manual HONESTO: el usuario declara actividad real, no agua virtual
  $("#m-steps").addEventListener("click", quickSteps);
  $("#m-hydration").addEventListener("click", () => {
    const r = S.drink(250);
    toast("HIDRATACIÓN REGISTRADA", `+250 ml (lo que acabas de beber) · +${r.xp} XP`);
    UI.W?.avatar.setAction("drink");
    setTimeout(() => UI.W?.avatar.setAction("idle"), 2200);
  });

  document.querySelectorAll(".rail-btn").forEach((b) =>
    b.addEventListener("click", () => {
      const go = b.dataset.go;
      if (go === "social") return toast("COMUNIDAD", "Fuera de esta versión: sin funciones sociales activas hasta estabilizar el recorrido principal.");
      openSection(go === "journey" ? "progress" : go);
    })
  );
  document.querySelectorAll(".nav-btn").forEach((b) =>
    b.addEventListener("click", () => {
      document.querySelectorAll(".nav-btn").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      const nav = b.dataset.nav;
      if (nav === "home") return enterHome();
      openSection(nav);
    })
  );
  $("#drawer-close").addEventListener("click", closeDrawer);
}

/** Registrar caminata/pasos: el usuario indica lo que REALMENTE ha hecho. */
function quickSteps() {
  showModal(`
    <div class="cine-tag">REGISTRAR MOVIMIENTO REAL</div>
    <div class="cine-title" style="font-size:22px">¿CUÁNTO HAS CAMINADO?</div>
    <div class="cine-sub">Registra actividad que hayas hecho de verdad. BAYONA no inventa pasos.</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn grow" data-n="1000">1.000 pasos</button>
      <button class="btn grow" data-n="3000">3.000 pasos</button>
      <button class="btn grow" data-n="6000">6.000 pasos</button>
    </div>
    <div style="height:10px"></div>
    <div style="display:flex;gap:8px">
      <input id="qs-custom" type="number" inputmode="numeric" min="1" max="40000" placeholder="otros…" style="flex:1" />
      <button class="btn btn-primary" id="qs-ok">REGISTRAR</button>
    </div>
    <div style="height:8px"></div>
    <button class="btn btn-block" id="qs-cancel">CANCELAR</button>
  `, () => {
    const doLog = (n) => {
      if (!n || n < 1) return;
      const r = S.addSteps(Math.min(40000, Math.round(n)));
      hideModal();
      toast("MOVIMIENTO REGISTRADO", `+${fmtInt(n)} pasos · +${r.xp} XP`);
      UI.W?.avatar.setAction("walk");
      setTimeout(() => UI.W?.avatar.setAction("idle"), 2500);
    };
    $("#modal-box").querySelectorAll("[data-n]").forEach((b) => (b.onclick = () => doLog(+b.dataset.n)));
    $("#qs-ok").onclick = () => doLog(+$("#qs-custom").value);
    $("#qs-cancel").onclick = hideModal;
  });
}

export { toast };
