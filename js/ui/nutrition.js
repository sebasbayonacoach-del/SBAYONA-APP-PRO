// ============================================================
// BAYONA — COCINA: nutrición e hidratación (registro real)
// El usuario come/bebe en la vida real y lo registra: el avatar reacciona.
// Nada de comida virtual sin comer.
// ============================================================
import { S } from "../state.js";
import { MEALS } from "../data.js";
import { adherenciaPlan, RECETAS } from "../nutricion.js";
import { esc, fmtDec, fmtInt, t } from "../i18n.js";
import {
  UI, $, el, elT, showModal, hideModal, toast, BUILDERS,
} from "./shared.js";

const GOALS = { kcal: 2400, p: 150, c: 240, f: 70, fib: 30, water: 2500 };
const MEAL_SLOTS = ["DESAYUNO", "ALMUERZO", "CENA", "SNACK", "OTRO"];

BUILDERS.nutrition = (body) => {
  body = body || $("#drawer-body");
  const td = S.data.today;
  body.textContent = "";
  body.appendChild(el("div", "card shine", `
    <div class="card-row"><h4>COCINA BAYONA</h4><span class="pill gold">AUTOCUIDADO</span></div>
    <div class="mc-title" style="margin-top:8px">COMIDA REAL PARA UNA VIDA EXTRAORDINARIA</div>
    <div class="mc-sub">Estás cuidando tu cuerpo y a tu personaje. Registra solo lo que comes de verdad: nada de comida virtual.</div>`));
  body.appendChild(el("div", "sec-label", "NUTRICIÓN DIARIA · OBJETIVO DIARIO"));
  const macros = [
    ["ENERGÍA", td.kcal, GOALS.kcal, "kcal", "#ff7a3c"],
    ["PROTEÍNAS", td.p, GOALS.p, "g", "#59e0ff"],
    ["CARBOHIDRATOS", td.c, GOALS.c, "g", "#4a86ff"],
    ["GRASAS", td.f, GOALS.f, "g", "#d8b26a"],
    ["FIBRA", td.fib || 0, GOALS.fib, "g", "#4fd18b"],
  ];
  macros.forEach(([k, v, g, u, col]) => {
    const m = el("div", "macro");
    m.innerHTML = `<div class="top"><span>${k}</span><span class="mono">${fmtInt(v)} / ${fmtInt(g)} ${u}</span></div>
      <div class="mbar"><i style="width:${Math.min(100, (v / g) * 100)}%;background:${col}"></i></div>`;
    body.appendChild(m);
  });
  if (!td.meals.length) body.appendChild(el("div", "card", `<div class="sub">${esc(t("state.notLogged"))} · registra tu primera comida real de hoy.</div>`));

  // ---------- HIDRATACIÓN ----------
  body.appendChild(el("div", "sec-label", "HIDRATACIÓN"));
  const hyd = el("div", "card");
  hyd.innerHTML = `<div class="card-row"><h4>${fmtInt(td.water)} ml / ${fmtInt(GOALS.water)} ml</h4><span class="pill blue">${S.hydrationPct()}%</span></div>`;
  const hydRow = el("div", "card-row");
  hydRow.style.marginTop = "10px";
  [250, 500].forEach((ml) => {
    const b = el("button", "btn grow", `+${ml} ml`);
    b.addEventListener("click", () => drinkAndReact(ml));
    hydRow.appendChild(b);
  });
  const bC = el("button", "btn grow", "PERSONALIZADO");
  bC.addEventListener("click", customWater);
  hydRow.appendChild(bC);
  hyd.appendChild(hydRow);
  body.appendChild(hyd);

  // ---------- COMIDAS ----------
  // ---------- ADHERENCIA AL PLAN ----------
  body.appendChild(el("div", "sec-label", "ADHERENCIA AL PLAN"));
  const adh = adherenciaPlan(td);
  const adhCard = el("div", "card shine");
  adhCard.innerHTML = `
    <div class="card-row"><h4>${esc(adh.cumplidas)}/${esc(adh.total)} COMIDAS DEL PLAN</h4><span class="pill gold">${esc(adh.pct)} %</span></div>
    ${adh.detalle.map((d) => `<div class="kv"><span class="k">${d.hecha ? "✓" : "○"} ${esc(d.nombre)}</span><span class="v">${d.hecha ? "REGISTRADA" : "PENDIENTE"}</span></div>`).join("")}
    ${adh.extra ? `<div class="media-caption">Además has registrado ${esc(adh.extra)} comida(s) fuera del plan: cuentan para tus macros, no para la adherencia.</div>` : ""}`;
  body.appendChild(adhCard);

  // ---------- RECETAS ----------
  body.appendChild(el("div", "sec-label", "RECETAS · COMIDA REAL"));
  const recBox = el("div", "card");
  recBox.innerHTML = `<div class="mc-sub">Sencillas, reales y con macros claros. Cocinar también forma parte del juego.</div>`;
  RECETAS.forEach((r) => {
    const b = el("button", "btn btn-block", `${r.nombre} · ${r.kcal} kcal`);
    b.style.marginTop = "8px";
    b.addEventListener("click", () => recetaModal(r));
    recBox.appendChild(b);
  });
  body.appendChild(recBox);

  body.appendChild(el("div", "sec-label", "REGISTRAR COMIDA"));
  const bAdd = el("button", "btn btn-block", "＋ AÑADIR ALIMENTO (cantidad, unidad y hora)");
  bAdd.style.marginBottom = "10px";
  bAdd.addEventListener("click", customMeal);
  body.appendChild(bAdd);

  MEALS.forEach((meal) => {
    const already = td.meals.some((x) => x.id === meal.id);
    const c = el("div", "card");
    c.innerHTML = `<div class="card-row">
      <div class="grow"><h4>${meal.icon} ${esc(meal.name)}</h4>
      <div class="sub mono">${esc(meal.kcal)} kcal · P${esc(meal.p)} · C${esc(meal.c)} · F${esc(meal.f)}</div></div>
      ${already ? '<span class="pill green">REGISTRADA</span>' : ""}</div>`;
    if (!already) {
      const b = el("button", "btn btn-primary btn-block", "REGISTRAR · TU AVATAR COME CONTIGO");
      b.style.marginTop = "10px";
      b.addEventListener("click", () => {
        const r = S.eat(meal);
        if (!r) return;
        UI.W?.avatar.setAction("eat");
        toast("COMIDA REGISTRADA", `${meal.name} · +${r.xp} XP`);
        setTimeout(() => UI.W?.avatar.setAction("sit"), 2600);
        BUILDERS.nutrition();
      });
      c.appendChild(b);
    }
    body.appendChild(c);
  });

  body.appendChild(el("div", "sec-label", "COMIDAS DE HOY"));
  const list = el("div", "card");
  if (!td.meals.length) list.innerHTML = `<div class="sub">Todavía no has registrado comidas hoy.</div>`;
  else {
    list.innerHTML = td.meals.map((m) =>
      `<div class="kv"><span class="k">${esc(m.name)}${m.at ? " · " + new Date(m.at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : ""}</span><span class="v">${esc(m.kcal)} kcal · P${esc(m.p)} · C${esc(m.c)} · F${esc(m.f)}</span></div>`
    ).join("");
  }
  body.appendChild(list);
};

function drinkAndReact(ml) {
  const r = S.drink(ml);
  UI.W?.avatar.setAction("drink");
  toast("HIDRATACIÓN REGISTRADA", `+${ml} ml bebidos · +${r.xp} XP`);
  setTimeout(() => UI.W?.avatar.setAction("sit"), 2200);
  BUILDERS.nutrition();
}

function customWater() {
  showModal(`
    <div class="cine-tag">HIDRATACIÓN</div>
    <div class="cine-title" style="font-size:22px">¿CUÁNTO HAS BEBIDO?</div>
    <div class="sub">Registra el agua real que acabas de tomar.</div>
    <input id="w-ml" type="number" inputmode="numeric" min="1" max="2000" placeholder="ml (p. ej. 330)" />
    <div style="height:10px"></div>
    <button class="btn btn-primary btn-block" id="w-ok">REGISTRAR</button>
  `, () => {
    $("#w-ok").onclick = () => {
      const ml = Math.round(+$("#w-ml").value);
      if (!ml || ml < 1) return toast("REVISA", "Indica los mililitros bebidos.", "danger");
      hideModal();
      drinkAndReact(Math.min(2000, ml));
    };
  });
}

function customMeal() {
  showModal(`
    <div class="cine-tag">REGISTRAR COMIDA</div>
    <div class="cine-title" style="font-size:22px">AÑADIR ALIMENTO</div>
    <div class="sf-row">
      <label>NOMBRE<input id="cm-name" maxlength="40" placeholder="p. ej. pollo con arroz" /></label>
      <label>CANTIDAD<input id="cm-qty" type="number" inputmode="decimal" min="0" placeholder="250" /></label>
      <label>UNIDAD
        <select id="cm-unit"><option>g</option><option>ml</option><option>ud.</option><option>ración</option></select>
      </label>
    </div>
    <div class="sf-row">
      <label>COMIDA
        <select id="cm-slot">${MEAL_SLOTS.map((s) => `<option>${s}</option>`).join("")}</select>
      </label>
      <label>HORA<input id="cm-time" type="time" value="${new Date().toTimeString().slice(0, 5)}" /></label>
      <label>KCAL<input id="cm-kcal" type="number" inputmode="numeric" min="0" placeholder="420" /></label>
    </div>
    <div class="sf-row">
      <label>PROTEÍNAS (g)<input id="cm-p" type="number" inputmode="decimal" min="0" placeholder="30" /></label>
      <label>CARBOS (g)<input id="cm-c" type="number" inputmode="decimal" min="0" placeholder="45" /></label>
      <label>GRASAS (g)<input id="cm-f" type="number" inputmode="decimal" min="0" placeholder="12" /></label>
      <label>FIBRA (g)<input id="cm-fib" type="number" inputmode="decimal" min="0" placeholder="6" /></label>
    </div>
    <button class="btn btn-primary btn-block" id="cm-ok">GUARDAR COMIDA</button>
  `, () => {
    $("#cm-ok").onclick = () => {
      const name = $("#cm-name").value.trim();
      const kcal = +$("#cm-kcal").value || 0;
      if (!name) return toast("REVISA", "Ponle nombre al alimento.", "danger");
      if (!kcal) return toast("REVISA", "Indica las kilocalorías aproximadas.", "danger");
      const qty = +$("#cm-qty").value || null;
      const unit = $("#cm-unit").value;
      const slot = $("#cm-slot").value;
      const time = $("#cm-time").value;
      const r = S.eat({
        custom: true,
        name: `${name}${qty ? ` · ${fmtDec(qty)} ${unit}` : ""} (${slot} ${time})`,
        kcal, p: +$("#cm-p").value || 0, c: +$("#cm-c").value || 0,
        f: +$("#cm-f").value || 0, fib: +$("#cm-fib").value || 0,
      });
      hideModal();
      if (!r) return toast("ERROR", "No se pudo registrar la comida.", "danger");
      UI.W?.avatar.setAction("eat");
      toast("COMIDA REGISTRADA", `${name} · +${r.xp} XP`);
      setTimeout(() => UI.W?.avatar.setAction("sit"), 2600);
      BUILDERS.nutrition();
    };
  });
}

// ---------- RECETA (detalle + registro real) ----------
function recetaModal(r) {
  showModal(`
    <div class="cine-tag">RECETA · ${esc(r.tipo)}</div>
    <div class="cine-title" style="font-size:20px">${esc(r.nombre)}</div>
    <div class="cine-sub">${esc(r.kcal)} kcal · P ${esc(r.p)} g · C ${esc(r.c)} g · F ${esc(r.f)} g</div>
    <div class="sec-label">INGREDIENTES</div>
    ${r.ingredientes.map((i) => `<div class="kv"><span class="v" style="font-family:inherit">· ${esc(i)}</span></div>`).join("")}
    <div class="sec-label">PREPARACIÓN</div>
    ${r.pasos.map((p, i) => `<div class="kv"><span class="k">${i + 1}</span><span class="v" style="font-family:inherit">${esc(p)}</span></div>`).join("")}
    <div style="height:12px"></div>
    <button class="btn btn-primary btn-block" id="rc-eat">LA HE COCINADO · REGISTRAR</button>
    <div style="height:8px"></div>
    <button class="btn btn-block" id="rc-close">CERRAR</button>
  `, () => {
    $("#rc-close").onclick = hideModal;
    $("#rc-eat").onclick = () => {
      hideModal();
      const res = S.eat({ custom: true, name: r.nombre, kcal: r.kcal, p: r.p, c: r.c, f: r.f });
      toast("COMIDA REGISTRADA", res ? `${r.nombre} · +${res.xp} XP` : `${r.nombre}`);
      UI.W?.avatar.setAction("eat");
      setTimeout(() => UI.W?.avatar.setAction("idle"), 2200);
      BUILDERS.nutrition();
    };
  });
}
