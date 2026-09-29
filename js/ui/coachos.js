// ============================================================
// BAYONA — UI/COACH OS · centro de mando profesional del entrenador
// ------------------------------------------------------------
// Evolución del Excel de Colombia a command center premium.
// CAPA 1 · operativa: clientes de hoy, ficha viva, alertas, adherencia.
// CAPA 2 · laboratorio: planificación por fases del macrociclo.
// CORE Coach: reglas locales explicables (sin IA fingida, sin nube).
// Honestidad: tu ficha = datos reales; cartera demo SIEMPRE marcada.
// ============================================================
import { S, on, todayKey } from "../state.js";
import {
  CLIENTES_DEMO, fichaLocal, alertasDe, resumenCartera, coreCoach, planificacion, validaAsignacion,
} from "../coachos.js";
import { WORKOUTS } from "../data.js";
import { esc, fmtInt, fmtDec } from "../i18n.js";
import {
  UI, $, el, elT, BUILDERS, showModal, hideModal, toast,
} from "./shared.js";

function cartera() { return [fichaLocal(S), ...CLIENTES_DEMO]; }

BUILDERS.coachos = (body) => renderCartera(body);

function renderCartera(body) {
  body = body || $("#drawer-body");
  body.textContent = "";
  const clientes = cartera();
  const kpi = resumenCartera(clientes);

  // ---------- CABECERA · COMMAND CENTER ----------
  const head = el("div", "card shine");
  head.innerHTML = `
    <div class="card-row">
      <h4>BAYONA COACH OS</h4>
      <span class="pill gold">CENTRO DE MANDO</span>
    </div>
    <div class="mc-title" style="margin-top:8px">${esc(kpi.activos)} CLIENTES ACTIVOS</div>
    <div class="mc-sub">${esc(kpi.sesionesHoy)} sesiones hoy · ${esc(kpi.alertas)} alertas · adherencia media ${esc(kpi.adherenciaMedia)} %</div>
    <div class="card-row" style="margin-top:10px">
      <span class="pill">CAPA 1 · OPERATIVA</span><span class="pill">CAPA 2 · LABORATORIO ↓</span>
    </div>`;
  body.appendChild(head);
  body.appendChild(el("div", "media-caption",
    "Tu ficha usa datos REALES de este dispositivo. La cartera es DEMOSTRACIÓN (sin backend todavía) y va marcada como tal."));

  // ---------- CORE COACH ----------
  body.appendChild(el("div", "sec-label", "CORE COACH · PRIORIDADES DE HOY"));
  const core = el("div", "card");
  core.innerHTML = `<div class="card-row"><h4>RESUMEN PARA TI</h4><span class="pill blue">REGLAS LOCALES</span></div>`;
  for (const m of coreCoach(clientes, S)) core.appendChild(el("div", "kv", `<span class="v" style="font-family:inherit">${esc(m)}</span>`));
  core.appendChild(el("div", "media-caption",
    "CORE Coach aplica reglas explicables sobre tus datos. No es una IA omnisciente: tú decides siempre."));
  body.appendChild(core);

  // ---------- CLIENTES DE HOY (CAPA 1) ----------
  body.appendChild(el("div", "sec-label", "CLIENTES DE HOY"));
  for (const c of clientes) {
    const al = alertasDe(c);
    const card = el("div", "card hoy-item");
    card.innerHTML = `
      <div class="card-row">
        <span class="pill ${c.demo ? "" : "gold"}">${c.demo ? "DEMO" : "TU FICHA"}</span>
        <span class="pill">${esc(c.hora)} · ${esc(c.min)} MIN</span>
      </div>
      <div class="hoy-titulo">${esc(c.nombre)} — ${esc(c.sesionHoy)}</div>
      <div class="mc-sub">Nivel ${esc(c.nivel)} · ${esc(c.rango)} · preparación ${c.preparacion == null ? "—" : esc(c.preparacion) + " %"} · adherencia ${esc(c.adherencia)} %</div>
      ${al.length ? `<div style="margin-top:8px">${al.map((a) => `<span class="pill ${a.nivel === "alta" ? "danger" : ""}" style="margin:2px 4px 0 0">▲ ${esc(a.texto)}</span>`).join("")}</div>` : ""}`;
    const b = el("button", "btn btn-block", "ABRIR FICHA");
    b.style.marginTop = "10px";
    b.addEventListener("click", () => renderFicha(body, c));
    card.appendChild(b);
    body.appendChild(card);
  }
}

// ---------- FICHA VIVA DEL CLIENTE (el Excel de Colombia, hecho producto) ----------
function renderFicha(body, c) {
  body.textContent = "";
  const al = alertasDe(c);
  const back = el("button", "btn btn-ghost btn-block", "← VOLVER A LA CARTERA");
  back.addEventListener("click", () => renderCartera(body));
  body.appendChild(back);

  body.appendChild(el("div", "sec-label", "PERFIL"));
  body.appendChild(el("div", "card", `
    <div class="mc-title">${esc(c.nombre)}</div>
    <div class="mc-sub">${c.edad == null ? "Edad " + esc("Todavía no lo has registrado") : esc(c.edad) + " años"} · Nivel ${esc(c.nivel)} · ${esc(c.rango)}</div>
    <div class="kv"><span class="k">OBJETIVO</span><span class="v">${esc(c.objetivo)}</span></div>
    <div class="kv"><span class="k">ANTIGÜEDAD</span><span class="v">${esc(c.antiguedadMeses)} meses</span></div>`));

  body.appendChild(el("div", "sec-label", "HOY"));
  body.appendChild(el("div", "card", `
    <div class="kv"><span class="k">SESIÓN</span><span class="v">${esc(c.sesionHoy)} · ${esc(c.min)} min</span></div>
    <div class="kv"><span class="k">PREPARACIÓN</span><span class="v">${c.preparacion == null ? esc("Todavía no lo has registrado") : esc(c.preparacion) + " %"}</span></div>
    <div class="kv"><span class="k">SUEÑO</span><span class="v">${c.dormir == null ? esc("Todavía no lo has registrado") : esc(c.dormir) + " h"}</span></div>`));

  // ---------- PLANIFICAR SESIÓN (Coach OS → app del cliente) ----------
  if (!c.demo) {
    body.appendChild(el("div", "sec-label", "PLANIFICACIÓN DIRECTA"));
    const planCard = el("div", "card");
    planCard.innerHTML = `<h4>ASIGNAR SESIÓN A ESTE CLIENTE</h4><div class="sub">Lo que asines aquí aparece en su HOY como «Plan de tu entrenador», con tu nota. Una sola verdad: la misma sesión que ve su app.</div>`;
    const bp = el("button", "btn btn-primary btn-block", "PLANIFICAR SESIÓN");
    bp.style.marginTop = "10px";
    bp.addEventListener("click", () => planificarModal(c, body));
    planCard.appendChild(bp);
    const pend = S.asignacionesDe("local").filter((a) => a.estado === "pendiente");
    for (const a of pend) {
      planCard.appendChild(el("div", "kv", `<span class="k">${esc(a.dia)}</span><span class="v">${esc(WORKOUTS[a.workoutId]?.name || a.workoutId)}${a.nota ? " · " + esc(a.nota) : ""}</span>`));
    }
    body.appendChild(planCard);
  }

  body.appendChild(el("div", "sec-label", "ALERTAS"));
  body.appendChild(el("div", "card", al.length
    ? al.map((a) => `<div class="kv"><span class="k">${a.nivel === "alta" ? "▲ ALTA" : "◇ MEDIA"}</span><span class="v" style="font-family:inherit">${esc(a.texto)}</span></div>`).join("")
    : `<div class="sub">Sin alertas declaradas. Información deportiva: nunca diagnóstico médico.</div>`));

  body.appendChild(el("div", "sec-label", "ESTADO FÍSICO Y ÚLTIMOS CAMBIOS"));
  body.appendChild(el("div", "card", `
    <div class="kv"><span class="k">PESO</span><span class="v">${c.peso == null ? esc("Todavía no lo has registrado") : esc(fmtDec(c.peso)) + " kg"}</span></div>
    <div class="kv"><span class="k">PESO (Δ)</span><span class="v">${c.pesoDelta == null ? "—" : esc(c.pesoDelta) + " kg"}</span></div>
    <div class="kv"><span class="k">FUERZA (Δ)</span><span class="v">${c.fuerzaDelta == null ? "—" : esc(c.fuerzaDelta) + " %"}</span></div>
    <div class="kv"><span class="k">CINTURA (Δ)</span><span class="v">${c.cinturaDelta == null ? "—" : esc(c.cinturaDelta) + " cm"}</span></div>
    <div class="kv"><span class="k">ADHERENCIA</span><span class="v">${esc(c.adherencia)} %${c.adherenciaDias ? ` · últimos ${esc(c.adherenciaDias)} días` : ""}</span></div>
    <div class="kv"><span class="k">ÚLTIMO CAMBIO</span><span class="v" style="font-family:inherit">${esc(c.ultimoCambio)}</span></div>`));

  // ---------- CAPA 2 · LABORATORIO ----------
  const p = planificacion(S);
  body.appendChild(el("div", "sec-label", "CAPA 2 · LABORATORIO — PLANIFICACIÓN"));
  const lab = el("div", "card");
  lab.innerHTML = `
    <div class="card-row"><h4>MACROCICLO · SEMANA ${esc(p.semana)}/${esc(p.totalSemanas)}</h4><span class="pill gold">${esc(p.fase.name)}</span></div>
    <div class="mc-sub">Hoy: ${esc(p.hoy.sesion)} · volumen objetivo ${esc(p.hoy.volumenPct)} % · intensidad objetivo ${esc(p.hoy.intensidadPct)} %</div>
    ${p.fases.map((f) => `<div class="kv"><span class="k">${f.estado === "actual" ? "●" : f.estado === "pasada" ? "✓" : "○"} ${esc(f.name)}</span><span class="v">S${esc(f.from)}–${esc(f.to)} · vol ${esc(Math.round(f.vol * 100))} % · int ${esc(Math.round(f.int * 100))} %</span></div>`).join("")}
    <div class="media-caption">La planificación completa de esta ficha vive en el macrociclo compartido con la app del cliente (una sola verdad).</div>`;
  body.appendChild(lab);

  // ---- PLAN SEMANAL ESCRIBIBLE (solo fichas reales) ----
  if (!c.demo) editorSemanal(body);
}

/** El entrenador reescribe la semana; el cliente la ejecuta como SU plan. */
function editorSemanal(body) {
  body.appendChild(el("div", "sec-label", "PLAN SEMANAL ESCRIBIBLE"));
  const box = el("div", "card");
  box.innerHTML = `<h4>REESCRIBIR LA SEMANA</h4><div class="sub">Lo que cambies aquí es lo que su app ejecuta («Plan de tu entrenador»). Descanso explícito incluido: la disciplina también es parar.</div>`;
  const custom = S.data.plan.custom || {};
  MACRO.dayNames.forEach((nombre, dow) => {
    const actual = custom[dow] ?? "";
    const estandarId = MACRO.dayPlan[dow];
    const sel = el("select");
    sel.style.cssText = "min-height:46px;padding:8px;margin-top:8px;width:100%";
    sel.setAttribute("aria-label", `Plan del ${nombre}`);
    sel.innerHTML = `
      <option value="">${nombre} · ESTÁNDAR (${esc(WORKOUTS[estandarId]?.name || "DESCANSO")})</option>
      <option value="-" ${actual === "-" ? "selected" : ""}>${nombre} · DESCANSO</option>
      ${Object.entries(WORKOUTS).map(([id, w]) => `<option value="${id}" ${actual === id ? "selected" : ""}>${nombre} · ${esc(w.name)}</option>`).join("")}`;
    sel.addEventListener("change", () => {
      S.setPlanDia(dow, sel.value === "-" ? null : sel.value);
      toast("PLAN ACTUALIZADO", `${nombre}: el cliente ya ve su nuevo plan.`);
    });
    box.appendChild(sel);
  });
  const reset = el("button", "btn btn-ghost btn-block", "RESTABLECER PLAN ESTÁNDAR");
  reset.style.marginTop = "12px";
  reset.addEventListener("click", () => {
    S.restaurarPlanEstandar();
    toast("PLAN RESTABLECIDO", "Vuelve el macrociclo estándar.");
    renderFicha(body, fichaLocal(S));
  });
  box.appendChild(reset);
  body.appendChild(box);
}

on("today", () => {
  const active = document.querySelector(".rail-btn.active")?.dataset.go;
  if (active === "coachos" && $("#drawer")?.classList.contains("open")) renderCartera();
});

// ---------- ASIGNAR SESIÓN (el loop Coach OS → cliente) ----------
function planificarModal(c, body) {
  const dias = [0, 1, 2].map((i) => {
    const d = new Date(Date.now() + i * 8.64e7);
    return [todayKey(d), i === 0 ? "HOY" : i === 1 ? "MAÑANA" : "PASADO MAÑANA"];
  });
  const opciones = Object.entries(WORKOUTS)
    .map(([id, w]) => `<option value="${id}">${w.name} · ${w.min} min</option>`).join("");
  showModal(`
    <div class="cine-tag">COACH OS · PLANIFICAR</div>
    <div class="cine-title" style="font-size:22px">SESIÓN PARA ${esc(c.nombre.toUpperCase())}</div>
    <div class="cine-sub">Aparecerá en su HOY como «Plan de tu entrenador». Tú decides: CORE solo aconseja.</div>
    <div class="checkin-grid">
      <label class="checkin-row" for="as-w"><span>ENTRENAMIENTO</span>
        <select id="as-w" style="min-height:48px;padding:10px">${opciones}</select></label>
      <label class="checkin-row" for="as-d"><span>DÍA</span>
        <select id="as-d" style="min-height:48px;padding:10px">
          ${dias.map(([k, label]) => `<option value="${k}">${label} · ${k}</option>`).join("")}
        </select></label>
      <label class="checkin-row" for="as-n"><span>NOTA PARA EL CLIENTE (OPCIONAL)</span>
        <input id="as-n" type="text" maxlength="200" placeholder="Ej.: énfasis en técnica, baja la carga si duele…" /></label>
    </div>
    <div style="height:10px"></div>
    <button class="btn btn-primary btn-block" id="as-save">ASIGNAR SESIÓN</button>
    <div style="height:8px"></div>
    <button class="btn btn-block" id="as-cancel">CANCELAR</button>
  `, () => {
    $("#as-cancel").onclick = hideModal;
    $("#as-save").onclick = () => {
      const a = {
        clienteId: "local", workoutId: $("#as-w").value,
        dia: $("#as-d").value, nota: $("#as-n").value.trim(),
        origen: "coachos", autor: "Coach OS",
      };
      const v = validaAsignacion(a);
      hideModal();
      if (!v.ok) return toast("NO ASIGNADA", v.error, "danger");
      S.addAsignacion(a);
      toast("SESIÓN ASIGNADA", `${WORKOUTS[a.workoutId].name} → ${a.dia}. Ya aparece en su HOY.`);
      renderFicha(body, c);
    };
  });
}
