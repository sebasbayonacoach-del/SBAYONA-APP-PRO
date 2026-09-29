// ============================================================
// BAYONA · DASHBOARD DE ESCRITORIO
// ------------------------------------------------------------
// En el shell de escritorio el mundo 3D estaba oculto y la app se
// leía como un informe. Esto pone al personaje en el centro y
// coloca alrededor lo que de verdad importa en un gimnasio:
// preparación, sesión de hoy, nivel, macros, hidratación y CORE.
//
// REGLAS que este módulo no rompe:
//   1. Solo datos REALES. Si algo no está registrado, se dice
//      («sin registrar»), nunca se estima.
//   2. Las tarjetas son atajos de navegación, no un segundo sitio
//      donde editar. Quien edita, sigue siendo la columna derecha.
//   3. Por debajo de 1100 px no existe tablero: la app vuelve a
//      documento, que es lo que funciona en móvil.
// ============================================================
import { S, on } from "../state.js";
import { UI, el, elT, openSection } from "./shared.js";
import { fmtInt, t } from "../i18n.js";

const BREAKPOINT = 1100;
const GOALS = { kcal: 2400, p: 150, water: 2500 };

/** ¿Cabe el tablero? Mismo criterio que el CSS. */
export function dashboardActivo() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia(`(min-width: ${BREAKPOINT}px)`).matches &&
    document.body.classList.contains("fitness-app")
  );
}

/* ---------- piezas ---------- */

const card = (slot, extra = "") => el("div", `dash-card dash-slot-${slot} ${extra}`.trim());

function anillo(pct, texto, caption) {
  const R = 22, C = 2 * Math.PI * R;
  const p = Math.max(0, Math.min(100, pct ?? 0));
  const wrap = el("div", "dash-ring");
  wrap.innerHTML = `
    <svg viewBox="0 0 52 52" aria-hidden="true">
      <circle class="track" cx="26" cy="26" r="${R}" fill="none" stroke-width="5"/>
      <circle class="fill" cx="26" cy="26" r="${R}" fill="none" stroke-width="5"
              stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - p / 100)).toFixed(1)}"/>
    </svg>
    <div><div class="val">${texto}</div><div class="cap">${caption}</div></div>`;
  return wrap;
}

const linea = (k, v) => {
  const row = el("div", "dash-macro-row");
  row.append(elT("span", "", k), elT("span", "mono", v));
  return row;
};

/* ============================================================
   CONSTRUCCIÓN
   ============================================================ */
function construir() {
  const hud = document.getElementById("dash-hud");
  if (!hud) return;
  hud.textContent = "";

  /* --- arriba izq: preparación --- */
  const cPrep = card("tl");
  cPrep.append(elT("div", "dash-lbl", t("dash.prepLabel")));
  const ringBox = el("div", "", "");
  ringBox.style.marginTop = "10px";
  cPrep.appendChild(ringBox);

  /* --- arriba der: nivel --- */
  const cLvl = card("tr");
  cLvl.append(elT("div", "dash-lbl", t("dash.levelLabel")));
  const lvlBox = el("div", "", "");
  cLvl.appendChild(lvlBox);

  /* --- medio izq: sesión de hoy --- */
  const cSes = card("ml");
  cSes.style.maxWidth = "232px";
  cSes.append(elT("div", "dash-lbl", t("dash.sessionLabel")));
  const sesBox = el("div", "", "");
  sesBox.style.marginTop = "9px";
  cSes.appendChild(sesBox);
  const ctaSes = el("button", "dash-cta", "");
  cSes.appendChild(ctaSes);

  /* --- medio der: nutrición --- */
  const cNut = card("mr");
  cNut.append(elT("div", "dash-lbl", t("dash.macrosLabel")));
  const nutBox = el("div", "", "");
  nutBox.style.marginTop = "10px";
  cNut.appendChild(nutBox);

  /* --- abajo izq: hidratación --- */
  const cAgua = card("bl");
  cAgua.append(elT("div", "dash-lbl", t("dash.waterLabel")));
  const aguaBox = el("div", "", "");
  aguaBox.style.marginTop = "9px";
  cAgua.appendChild(aguaBox);

  /* --- abajo der: racha y stats --- */
  const cRacha = card("br");
  cRacha.append(elT("div", "dash-lbl", t("dash.streakLabel")));
  const rachaBox = el("div", "", "");
  rachaBox.style.marginTop = "9px";
  cRacha.appendChild(rachaBox);

  /* --- abajo, centrado: CORE --- */
  const coach = el("div", "dash-coach");
  const cCoach = el("div", "dash-card");
  cCoach.appendChild(el("div", "dash-coach-face", "◈"));
  const txt = el("div", "dash-coach-txt");
  txt.append(elT("strong", "", t("dash.coachTitle")), elT("p", "", ""));
  cCoach.appendChild(txt);
  const bCoach = el("button", "dash-cta ghost", t("dash.askCoach"));
  bCoach.style.marginTop = "0";
  bCoach.style.width = "auto";
  bCoach.style.padding = "0 16px";
  bCoach.onclick = () => openSection("core");
  cCoach.appendChild(bCoach);
  coach.appendChild(cCoach);

  hud.append(cPrep, cLvl, cSes, cNut, cAgua, cRacha, coach);

  /* --- enlaces --- */
  cPrep.onclick = () => openSection("recovery");
  cLvl.onclick = () => openSection("progress");
  cSes.onclick = () => openSection("training");
  cNut.onclick = () => openSection("nutrition");
  cAgua.onclick = () => openSection("nutrition");
  cRacha.onclick = () => openSection("progress");

  pintar({
    prep: ringBox, lvl: lvlBox, ses: sesBox, cta: cSes.querySelector(".dash-cta"),
    nut: nutBox, agua: aguaBox, racha: rachaBox, coach: txt.querySelector("p"),
    nivel: S.data?.profile?.name || "",
  });
}

/* ============================================================
   PINTADO — solo datos reales
   ============================================================ */
function pintar(t) {
  if (!t.prep) return;
  const d = S.data;
  if (!d) return;
  const today = d.today || {};

  /* --- preparación --- */
  const det = S.readinessDetail();
  const rd = det.score;
  t.prep.textContent = "";
  if (rd == null) {
    t.prep.append(elT("div", "dash-val", t("state.notLogged")));
    t.prep.append(elT("div", "dash-note", t("dash.prepNoData")));
  } else {
    t.prep.appendChild(anillo(rd, `${rd}<small>%</small>`, t("dash.ready")));
    // si el número se apoya en pocos registros, se dice: no aparenta
    // una precisión que no tenemos.
    if (det.estimated) t.prep.append(elT("div", "dash-note", t("dash.prepEstimated", { n: det.known })));
    else if (det.parts?.[0]?.note) t.prep.append(elT("div", "dash-note", det.parts[0].note));
  }

  /* --- nivel --- */
  const L = S.level();
  t.lvl.textContent = "";
  t.lvl.appendChild(elT("div", "dash-val", `NIVEL ${L.lvl}`));
  t.lvl.append(elT("div", "dash-sub", S.rank()));
  const bar = el("div", "dash-bar");
  const fill = el("i");
  fill.style.width = `${Math.min(100, Math.round((L.cur / L.need) * 100))}%`;
  bar.appendChild(fill);
  t.lvl.appendChild(bar);
  t.lvl.append(elT("div", "dash-note", `${fmtInt(L.cur)} / ${fmtInt(L.need)} XP`));

  /* --- sesión de hoy --- */
  const w = S.todayWorkout();
  const activa = S.getActiveSession();
  const pendiente = activa && !["completada", "abandonada"].includes(activa.status);
  t.ses.textContent = "";
  t.ses.append(elT("div", "dash-val", String(w ? w.name : t("dash.recoveryDay")), ""));
  t.ses.querySelector(".dash-val").style.fontSize = "15px";
  t.ses.append(elT("div", "dash-sub", w ? `${w.min} min · ${w.exercises.length} ejercicios` : t("dash.restSub")));
  if (w) {
    const pill = el("span", `dash-pill${pendiente ? "" : " quiet"}`, pendiente ? t("dash.resumed") : t("dash.planned"));
    t.ses.append(pill);
  }
  t.cta.textContent = pendiente ? t("dash.continue") : today.trained ? t("dash.toProgress") : t("dash.start");
  t.cta.className = `dash-cta${today.trained && !pendiente ? " ghost" : ""}`;
  t.cta.onclick = () => {
    if (pendiente) UI.actions.resumeSession?.();
    else if (today.trained) openSection("progress");
    else if (w) UI.actions.openTraining?.(w.id);
    else openSection("training");
  };

  /* --- macros --- */
  t.nut.textContent = "";
  t.nut.appendChild(linea(t("dash.kcal"), `${fmtInt(today.kcal)} / ${fmtInt(GOALS.kcal)}`));
  t.nut.appendChild(linea(t("dash.protein"), `${fmtInt(today.p)} / ${fmtInt(GOALS.p)} g`));
  const barN = el("div", "dash-bar");
  const fillN = el("i");
  fillN.style.width = `${Math.min(100, Math.round((today.kcal / GOALS.kcal) * 100))}%`;
  barN.appendChild(fillN);
  t.nut.appendChild(barN);

  /* --- hidratación --- */
  const pctAgua = S.hydrationPct();
  t.agua.textContent = "";
  t.agua.append(elT("div", "dash-val", `${fmtInt(today.water)}<small>ml</small>`));
  const drops = el("div", "dash-drops");
  const llenos = Math.round((pctAgua / 100) * 10);
  for (let i = 0; i < 10; i++) drops.appendChild(el("i", i < llenos ? "on" : ""));
  t.agua.appendChild(drops);
  t.agua.append(elT("div", "dash-note", `${pctAgua}% de ${fmtInt(GOALS.water)} ml`));

  /* --- racha --- */
  t.racha.textContent = "";
  t.racha.append(elT("div", "dash-val", `${d.streak || 0}<small>días</small>`));
  const st = d.stats || {};
  t.racha.append(elT("div", "dash-note", `${fmtInt(st.workouts || 0)} entrenamientos · ${fmtInt(st.prs || 0)} récords`));

  /* --- CORE --- */
  const sinDatos = today.sleep == null && today.energy == null;
  t.coach.textContent = sinDatos ? t("dash.coachNoData") : t("dash.coachTip");
}

/* ============================================================
   ARRANQUE
   ============================================================ */
let montado = false;

function activar() {
  if (!dashboardActivo()) { desactivar(); return; }
  document.body.classList.add("dash-pc");
  const hud = document.getElementById("dash-hud");
  if (hud) hud.hidden = false;
  if (!montado) { construir(); montado = true; }
  else pintar(cache());
  // el mundo acaba de aparecer: hay que volver a dimensionarlo
  UI.W?.resize?.();
  requestAnimationFrame(() => UI.W?.resize?.());
}

function desactivar() {
  document.body.classList.remove("dash-pc");
  const hud = document.getElementById("dash-hud");
  if (hud) hud.hidden = true;
  UI.W?.resize?.();
}

/** Guarda los nodos para poder repintar sin reconstruirlos. */
let cache = () => {
  const hud = document.getElementById("dash-hud");
  if (!hud || !hud.firstChild) return null;
  return {
    prep: hud.querySelector(".dash-slot-tl > :nth-child(2)"),
    lvl: hud.querySelector(".dash-slot-tr > :nth-child(2)"),
    ses: hud.querySelector(".dash-slot-ml > :nth-child(2)"),
    cta: hud.querySelector(".dash-slot-ml .dash-cta"),
    nut: hud.querySelector(".dash-slot-mr > :nth-child(2)"),
    agua: hud.querySelector(".dash-slot-bl > :nth-child(2)"),
    racha: hud.querySelector(".dash-slot-br > :nth-child(2)"),
    coach: hud.querySelector(".dash-coach-txt p"),
  };
};

export function installDashboard() {
  const wrap = document.createElement("div");
  wrap.id = "dash-hud";
  wrap.hidden = true;
  wrap.setAttribute("aria-label", t("dash.ariaLabel"));
  document.body.appendChild(wrap);

  // el estado manda, no un temporizador
  const refrescar = () => { if (dashboardActivo()) pintar(cache()); };
  ["today", "xp", "wallet", "session", "levelup", "outfit"].forEach((e) => on(e, refrescar));

  addEventListener("resize", () => {
    const activo = dashboardActivo();
    if (activo) activar(); else desactivar();
  });

  // al entrar en la app es cuando tiene sentido encender el tablero
  addEventListener("bayona:entered", activar);
  addEventListener("bayona:world-ready", activar);
  if (document.body.classList.contains("entered")) activar();
}
