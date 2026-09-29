// ============================================================
// BAYONA — UI/HOY · centro de control del día
// ------------------------------------------------------------
// Panel «HOY»: la respuesta a «¿qué tengo que hacer hoy?», con la jerarquía
// del planificador (js/hoy.js) y accesos directos a cada acción.
// Incluye check-in rápido (15 s) y reclamo de misiones del día.
// ============================================================
import { S, on } from "../state.js";
import { planDelDia } from "../hoy.js";
import { esc, fmtInt } from "../i18n.js";
import {
  UI, $, el, elT, openSection, showModal, hideModal, toast, BUILDERS,
} from "./shared.js";

const PRI_TAG = {
  "CRÍTICO": "danger", "HOY": "gold", "RECOMENDADO": "blue", "OPCIONAL": "", "COMPLETADO": "ok",
};

export function renderHoy(body) {
  const plan = planDelDia(S);
  const day = S.dayNumber();
  const fase = S.phase();

  // ---- resumen del día ----
  const head = el("div", "card hoy-resumen");
  head.innerHTML = `
    <div class="card-row">
      <span class="pill gold">DÍA ${esc(day)} · ${esc(fase.name)}</span>
      <span class="pill">${esc(plan.hechos)}/${esc(plan.total)} HECHOS</span>
    </div>
    <div class="mc-title" style="margin-top:10px">${plan.siguiente ? esc(plan.siguiente.titulo) : "DÍA COMPLETADO"}</div>
    <div class="mc-sub">${plan.siguiente
      ? "Tu siguiente acción. Una cosa cada vez: esto es lo que importa hoy."
      : "Has cerrado todo lo de hoy. El personaje descansa contigo."}</div>
    <div class="m-bar" style="margin-top:12px"><i style="width:${Math.round((plan.hechos / Math.max(1, plan.total)) * 100)}%"></i></div>`;
  body.appendChild(head);

  if (plan.siguiente) {
    const goBtn = el("button", "btn btn-primary btn-block", plan.siguiente.cta || "IR");
    goBtn.addEventListener("click", () => accion(plan.siguiente));
    body.appendChild(goBtn);
    body.appendChild(el("div", "sec-label", "EL RESTO DEL DÍA · POR ORDEN DE PRIORIDAD"));
  }

  // ---- grupos por jerarquía ----
  for (const g of plan.grupos) {
    if (!plan.siguiente && g.pri === "COMPLETADO") {
      body.appendChild(el("div", "sec-label", "LO QUE HAS CERRADO HOY"));
    } else if (plan.siguiente) {
      body.appendChild(el("div", "sec-label", g.pri));
    }
    for (const it of g.items) {
      body.appendChild(itemCard(it));
    }
  }
}

function itemCard(it) {
  const card = el("div", "card hoy-item" + (it.done ? " done" : ""));
  const tag = PRI_TAG[it.done ? "COMPLETADO" : it.pri] ?? "";
  card.innerHTML = `
    <div class="card-row">
      <span class="pill ${tag}">${it.done ? "✓ COMPLETADO" : esc(it.pri)}</span>
      ${it.mision ? `<span class="pill">MISIÓN · +${esc(it.xp)} XP</span>` : ""}
    </div>
    <div class="hoy-titulo">${esc(it.titulo)}</div>
    <div class="mc-sub">${esc(it.sub)}</div>`;
  if (!it.done && it.cta) {
    const b = el("button", "btn btn-block", it.cta);
    b.addEventListener("click", () => accion(it));
    card.appendChild(b);
  } else if (it.done && it.cta) { // misión cumplida con bono pendiente
    const b = el("button", "btn btn-primary btn-block", it.cta);
    b.addEventListener("click", () => accion(it));
    card.appendChild(b);
  }
  return card;
}

/** desvía cada acción a su destino REAL (sin pantallas muertas). */
function accion(it) {
  if (it.action === "drink") {
    const r = S.drink(250);
    toast("HIDRATACIÓN REGISTRADA", `+250 ml (lo que acabas de beber) · +${r.xp} XP`);
    UI.W?.avatar.setAction("drink");
    setTimeout(() => UI.W?.avatar.setAction("idle"), 2200);
    return rerender();
  }
  if (it.action === "checkin") return checkInModal();
  if (it.action === "claim") {
    const r = S.claimMission(it.missionId);
    if (r) toast("MISIÓN RECLAMADA", `${r.text} · +${r.xp} XP`);
    return rerender();
  }
  if (it.workoutId) return UI.actions.openTraining?.(it.workoutId);
  if (it.go === "training") {
    const act = S.getActiveSession();
    if (act && act.status !== "completada" && act.status !== "abandonada") return UI.actions.resumeSession?.();
    return UI.actions.openTraining?.(S.data.today.trained ? undefined : (S.todayWorkout()?.id));
  }
  if (it.go) return openSection(it.go);
  rerender();
}

// ============================================================
// CHECK-IN RÁPIDO · 1 pantalla, 15 segundos (sin veinte pasos)
// ============================================================
export function checkInModal() {
  const t = S.data.today;
  showModal(`
    <div class="cine-tag">CHECK-IN DEL DÍA</div>
    <div class="cine-title" style="font-size:22px">¿CÓMO AMANECISTE?</div>
    <div class="cine-sub">Tus registros adaptan la misión de hoy. Sin datos, BAYONA no inventa nada.</div>
    <div class="checkin-grid">
      <label class="checkin-row" for="ck-sleep"><span>SUEÑO (HORAS)</span>
        <input id="ck-sleep" type="number" inputmode="decimal" min="0" max="14" step="0.5" value="${t.sleep ?? ""}" placeholder="—" /></label>
      <label class="checkin-row" for="ck-energy"><span>ENERGÍA <output id="ck-energy-o">${t.energy ?? "—"}</output>/10</span>
        <input id="ck-energy" type="range" min="0" max="10" value="${t.energy ?? 5}" /></label>
      <label class="checkin-row" for="ck-stress"><span>ESTRÉS <output id="ck-stress-o">${t.stress ?? "—"}</output>/10</span>
        <input id="ck-stress" type="range" min="0" max="10" value="${t.stress ?? 5}" /></label>
      <label class="checkin-row" for="ck-sore"><span>MOLESTIA MUSCULAR <output id="ck-sore-o">${t.soreness ?? "—"}</output>/10</span>
        <input id="ck-sore" type="range" min="0" max="10" value="${t.soreness ?? 0}" /></label>
    </div>
    <div style="height:10px"></div>
    <button class="btn btn-primary btn-block" id="ck-save">GUARDAR CHECK-IN</button>
    <div style="height:8px"></div>
    <button class="btn btn-block" id="ck-cancel">CANCELAR</button>
  `, () => {
    const box = $("#modal-box");
    for (const [id, out] of [["ck-energy", "ck-energy-o"], ["ck-stress", "ck-stress-o"], ["ck-sore", "ck-sore-o"]]) {
      const r = box.querySelector("#" + id);
      r.addEventListener("input", () => (box.querySelector("#" + out).textContent = r.value));
    }
    box.querySelector("#ck-save").onclick = () => {
      const v = (id) => box.querySelector("#" + id).value;
      const sleep = v("ck-sleep") === "" ? null : Math.max(0, Math.min(14, +v("ck-sleep")));
      if (sleep != null) S.logSleep(sleep);
      S.logEnergy(+v("ck-energy"));
      S.logStress(+v("ck-stress"));
      S.logSoreness(+v("ck-sore"));
      hideModal();
      toast("CHECK-IN REGISTRADO", "BAYONA adapta tu misión con lo que has registrado.");
      rerender();
    };
    box.querySelector("#ck-cancel").onclick = hideModal;
  });
}

function rerender() {
  const body = $("#drawer-body");
  if (!body) return;
  body.textContent = "";
  (BUILDERS[$("#drawer").dataset.section] || renderHoy)(body);
}

BUILDERS.hoy = (body) => renderHoy(body);
UI.actions.openHoy = () => openSection("hoy");
on("today", () => { if ($("#drawer").classList.contains("open") && ["hoy","daily"].includes($("#drawer").dataset.section)) rerender(); });
