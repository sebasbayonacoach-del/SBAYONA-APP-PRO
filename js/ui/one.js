// BAYONA ONE · shell + Coach Studio v11
// Una app, dos contextos. Reutiliza el dominio oficial; no crea un backend paralelo.
import { S, on, todayKey } from "../state.js";
import { t, esc } from "../i18n.js";
import { WORKOUTS, MACRO } from "../data.js";
import {
  CLIENTES_DEMO, fichaLocal, alertasDe, resumenCartera, coreCoach,
  planificacion, validaAsignacion,
} from "../coachos.js";
import {
  openSection, BUILDERS, showModal, hideModal, toast, $, elT,
} from "./shared.js";

const COACH_SECTIONS = new Set([
  "coachos","centro","socios","cuotas","agenda","acceso","portal","informes"
]);

const icon = (path) =>
  '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" ' +
  'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="' +
  path + '"/></svg>';

function n(tag, cls, text) {
  const x = document.createElement(tag);
  if (cls) x.className = cls;
  if (text !== undefined) x.textContent = String(text);
  return x;
}

function btn(label, cls, action) {
  const b = n("button", cls || "btn", label);
  b.type = "button";
  if (action) b.addEventListener("click", action);
  return b;
}

function makeButton(label, mode, svgPath) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "one-context-btn";
  b.dataset.oneContext = mode;
  b.setAttribute("aria-label", t("one.context.switch", { mode:label }));
  b.innerHTML = icon(svgPath) + "<span>" + label + "</span>";
  return b;
}

function ensureContextSwitch() {
  const topbar = document.getElementById("topbar");
  if (!topbar || document.getElementById("one-context-switch")) return;
  const group = document.createElement("div");
  group.id = "one-context-switch";
  group.className = "one-context-switch";
  group.setAttribute("role", "group");
  group.setAttribute("aria-label", t("one.context.label"));

  const athlete = makeButton("AFILIADO","athlete","M5 19V5m14 14V5M5 12h14");
  const coach = makeButton("COACH","coach","M4 20V8l8-4 8 4v12M9 20v-7h6v7");
  athlete.addEventListener("click", () => openSection("hoy"));
  coach.addEventListener("click", () => openSection("coachos"));
  group.append(athlete, coach);

  const command = document.getElementById("cmd-chip");
  if (command) command.insertAdjacentElement("afterend", group);
  else topbar.append(group);
}

function ensureEditionMark() {
  const brand = document.querySelector("#topbar .brand");
  if (!brand || brand.querySelector(".one-edition")) return;
  const mark = n("span", "one-edition", "ONE");
  mark.title = "BAYONA ONE · sistema integrado";
  brand.append(mark);
}

function ensureCoachRailButton() {
  const nav = document.getElementById("panel-nav");
  if (!nav || nav.querySelector('[data-go="coachos"]')) return;
  const b = document.createElement("button");
  b.className = "rail-btn one-coach-launch";
  b.dataset.go = "coachos";
  b.innerHTML = icon("M5 20h14M7 20V9l5-3 5 3v11M9 13h6") + "<span>Coach</span>";
  b.addEventListener("click", () => openSection("coachos"));
  nav.append(b);
}

function sync(section) {
  section = section || document.getElementById("drawer")?.dataset.section || "hoy";
  const coachMode = COACH_SECTIONS.has(section);
  const drawerBody = document.getElementById("drawer-body");
  if (section !== "coachos") drawerBody?.classList.remove("one-coach-body");
  document.body.classList.toggle("one-coach-mode", coachMode);
  document.body.classList.toggle("one-athlete-mode", !coachMode);
  document.body.dataset.oneContext = coachMode ? "coach" : "athlete";

  document.querySelectorAll("[data-one-context]").forEach((node) => {
    const active = node.dataset.oneContext === (coachMode ? "coach" : "athlete");
    node.classList.toggle("active", active);
    node.setAttribute("aria-pressed", String(active));
  });

  const edition = document.querySelector(".one-edition");
  if (edition) edition.textContent = coachMode ? "COACH ONE" : "ONE";

  const foot = document.getElementById("foot-hint");
  if (foot && coachMode) foot.textContent = t("one.foot.coach");
  else if (foot) foot.textContent = t("one.foot.athlete");
}

function installObserver() {
  const drawer = document.getElementById("drawer");
  if (!drawer) return;
  const obs = new MutationObserver(() => sync(drawer.dataset.section));
  obs.observe(drawer, { attributes:true, attributeFilter:["data-section"] });
  sync(drawer.dataset.section);
}

function installKeyboard() {
  addEventListener("keydown", (event) => {
    if (event.defaultPrevented || !event.altKey) return;
    const tag = event.target?.tagName;
    if (["INPUT","TEXTAREA","SELECT"].includes(tag)) return;
    if (event.key === "1") { event.preventDefault(); openSection("hoy"); }
    if (event.key === "2") { event.preventDefault(); openSection("coachos"); }
  });
}

function decorateProfile() {
  const name = S.data?.profile?.name || "Atleta";
  document.body.dataset.onePerson = String(name).slice(0,18);
}

function coachClients() {
  return [fichaLocal(S), ...CLIENTES_DEMO];
}

function metric(label, value, note) {
  const card = n("article", "one-metric");
  card.append(n("span", "one-metric-label", label));
  card.append(n("strong", "one-metric-value", value));
  card.append(n("small", "one-metric-note", note));
  return card;
}

function tag(text, kind) {
  return n("span", "one-tag " + (kind || ""), text);
}

function commandAction(label, section, kind) {
  return btn(label, "one-action " + (kind || ""), () => openSection(section));
}

function progress(value, tone) {
  const wrap = n("div", "one-progress " + (tone || ""));
  const fill = n("i");
  fill.style.width = Math.max(0, Math.min(100, Number(value) || 0)) + "%";
  wrap.append(fill);
  return wrap;
}

function renderCoachHero(body, clients) {
  const kpi = resumenCartera(clients);
  const hero = n("section", "one-coach-hero");

  const copy = n("div", "one-coach-hero-copy");
  copy.append(n("span", "one-kicker", "BAYONA / COACH STUDIO 360"));
  copy.append(n("h3", "", "Dirige la próxima adaptación."));
  copy.append(n("p", "", "Cartera, alertas y periodización en una sola superficie. CORE prioriza; el entrenador decide."));
  const actions = n("div", "one-actions");
  actions.append(
    btn("PLANIFICAR","one-action primary",() => renderCoachClient(body, clients[0])),
    commandAction("CENTRO","centro"),
    commandAction("AGENDA","agenda"),
    commandAction("INFORMES","informes")
  );
  copy.append(actions);

  const pulse = n("div", "one-coach-pulse");
  pulse.append(n("span", "one-kicker", "PULSO DE CARTERA"));
  pulse.append(n("strong", "", kpi.adherenciaMedia + "%"));
  pulse.append(n("small", "", "adherencia media"));
  pulse.append(progress(kpi.adherenciaMedia, kpi.adherenciaMedia < 60 ? "danger" : "ok"));
  hero.append(copy, pulse);
  body.append(hero);

  const metrics = n("div", "one-metrics");
  metrics.append(
    metric("CLIENTES", kpi.activos, "1 local + cartera demo"),
    metric("SESIONES HOY", kpi.sesionesHoy, "programadas"),
    metric("ALERTAS", kpi.alertas, kpi.alertas ? "requieren revisión" : "sin incidencias"),
    metric("ADHERENCIA", kpi.adherenciaMedia + "%", "media de cartera")
  );
  body.append(metrics);
}

function renderCorePriorities(body, clients) {
  const shell = n("section", "one-core-board");
  const head = n("div", "one-section-head");
  const text = n("div");
  text.append(n("span", "one-kicker", "CORE COACH / EXPLICABLE"));
  text.append(n("h4", "", "Prioridades de hoy"));
  head.append(text, tag("REGLAS LOCALES","copper"));
  shell.append(head);

  const list = n("div", "one-priority-list");
  coreCoach(clients, S).forEach((message, index) => {
    const row = n("div", "one-priority");
    row.append(n("span", "one-priority-index", String(index + 1).padStart(2,"0")));
    row.append(n("p", "", message));
    list.append(row);
  });
  shell.append(list);
  shell.append(n("small", "one-disclaimer", "Sin IA fingida ni diagnóstico. Las reglas ordenan información deportiva; tú tomas la decisión."));
  body.append(shell);
}

function readinessTone(value) {
  if (value == null) return "";
  if (value < 40) return "danger";
  if (value < 70) return "warn";
  return "ok";
}

function clientRow(c, body) {
  const alerts = alertasDe(c);
  const row = n("article", "one-client-row");
  const identity = n("div", "one-client-id");
  identity.append(n("span", "one-client-time", c.hora));
  const who = n("div");
  who.append(n("strong", "", c.nombre));
  who.append(n("small", "", c.objetivo + " · N" + c.nivel));
  identity.append(who);

  const session = n("div", "one-client-session");
  session.append(n("strong", "", c.sesionHoy));
  session.append(n("small", "", c.min + " min · " + c.rango));

  const ready = n("div", "one-client-score");
  ready.append(n("span", "", "PREPARACIÓN"));
  ready.append(n("strong", "", c.preparacion == null ? "—" : c.preparacion + "%"));
  ready.append(progress(c.preparacion || 0, readinessTone(c.preparacion)));

  const adherence = n("div", "one-client-score");
  adherence.append(n("span", "", "ADHERENCIA"));
  adherence.append(n("strong", "", c.adherencia + "%"));
  adherence.append(progress(c.adherencia, c.adherencia < 60 ? "danger" : "ok"));

  const state = n("div", "one-client-state");
  state.append(tag(c.demo ? "DEMO" : "LOCAL", c.demo ? "" : "copper"));
  if (alerts.length) state.append(tag(alerts.length + " ALERTA" + (alerts.length > 1 ? "S" : ""), "danger"));
  else state.append(tag("ESTABLE","ok"));

  const open = btn("ABRIR →", "one-row-open", () => renderCoachClient(body, c));
  row.append(identity, session, ready, adherence, state, open);
  return row;
}

function renderRoster(body, clients) {
  const section = n("section", "one-roster");
  const head = n("div", "one-section-head");
  const title = n("div");
  title.append(n("span", "one-kicker", "CARTERA / HOY"));
  title.append(n("h4", "", "Clientes y contexto"));
  head.append(title, tag("DEMO IDENTIFICADA"));
  section.append(head);

  const labels = n("div", "one-roster-labels");
  ["CLIENTE","SESIÓN","PREPARACIÓN","ADHERENCIA","ESTADO",""].forEach((x) => labels.append(n("span","",x)));
  section.append(labels);
  clients.forEach((c) => section.append(clientRow(c, body)));
  body.append(section);
}

function phaseRail(plan) {
  const rail = n("div", "one-phase-rail");
  plan.fases.forEach((phase) => {
    const cell = n("div", "one-phase " + phase.estado);
    cell.append(n("span", "", phase.estado === "actual" ? "AHORA" : "S" + phase.from + "–" + phase.to));
    cell.append(n("strong", "", phase.name));
    cell.append(n("small", "", "VOL " + Math.round(phase.vol * 100) + "% · INT " + Math.round(phase.int * 100) + "%"));
    rail.append(cell);
  });
  return rail;
}

function renderMacroPreview(body) {
  const p = planificacion(S);
  const box = n("section", "one-macro-preview");
  const head = n("div", "one-section-head");
  const title = n("div");
  title.append(n("span", "one-kicker", "PERIODIZACIÓN / 24 SEMANAS"));
  title.append(n("h4", "", "Macrociclo · semana " + p.semana + "/" + p.totalSemanas));
  head.append(title, tag(p.fase.name,"copper"));
  box.append(head);
  box.append(phaseRail(p));

  const now = n("div", "one-macro-now");
  now.append(
    metric("SESIÓN", p.hoy.sesion, "hoy"),
    metric("VOLUMEN", p.hoy.volumenPct + "%", "objetivo"),
    metric("INTENSIDAD", p.hoy.intensidadPct + "%", "objetivo")
  );
  box.append(now);
  body.append(box);
}

function renderCoachStudio(body) {
  body.textContent = "";
  body.classList.add("one-coach-body");
  const clients = coachClients();
  renderCoachHero(body, clients);
  renderCorePriorities(body, clients);
  renderRoster(body, clients);
  renderMacroPreview(body);
  body.append(n("p", "one-footnote", "La ficha LOCAL deriva de este dispositivo. Paola, Diego y Carlos son demostración y nunca deben confundirse con clientes reales."));
}

function profileHeader(c) {
  const head = n("section", "one-profile-head");
  const avatar = n("div", "one-profile-monogram", (c.nombre || "B").trim().slice(0,2).toUpperCase());
  const copy = n("div", "one-profile-copy");
  copy.append(n("span", "one-kicker", c.demo ? "PERFIL DEMO" : "PERFIL LOCAL"));
  copy.append(n("h3", "", c.nombre));
  copy.append(n("p", "", c.objetivo + " · " + c.rango));
  const tags = n("div", "one-profile-tags");
  tags.append(tag("NIVEL " + c.nivel), tag(c.antiguedadMeses + " MESES"));
  if (c.preparacion != null) tags.append(tag("READY " + c.preparacion + "%", readinessTone(c.preparacion)));
  copy.append(tags);
  head.append(avatar, copy);
  return head;
}

function dataTile(label, value, note) {
  const x = n("div", "one-data-tile");
  x.append(n("span", "", label), n("strong", "", value), n("small", "", note || ""));
  return x;
}

function renderAlerts(c) {
  const box = n("section", "one-profile-panel");
  const head = n("div", "one-section-head");
  const titleBox = n("div");
  titleBox.append(n("span", "one-kicker", "ALERTAS"));
  titleBox.append(n("h4", "", "Lo que revisar antes de entrenar"));
  head.append(titleBox);
  box.append(head);
  const alerts = alertasDe(c);
  if (!alerts.length) box.append(n("div", "one-empty", "Sin alertas deportivas declaradas."));
  alerts.forEach((a) => {
    const row = n("div", "one-alert-row " + (a.nivel === "alta" ? "danger" : "warn"));
    row.append(n("span", "", a.nivel === "alta" ? "▲" : "◇"), n("p", "", a.texto));
    box.append(row);
  });
  return box;
}

function renderPlanCard(c, body) {
  const box = n("section", "one-profile-panel");
  const head = n("div", "one-section-head");
  const titleBox = n("div");
  titleBox.append(n("span", "one-kicker", "SESIÓN"));
  titleBox.append(n("h4", "", c.sesionHoy));
  head.append(titleBox, tag(c.min + " MIN"));
  box.append(head);
  box.append(n("p", "one-panel-copy", "Preparación, contexto y planificación viven en la misma versión que ejecuta el atleta."));
  if (!c.demo) {
    box.append(btn("PLANIFICAR SESIÓN →","one-action primary",() => planSessionModal(c, body)));
    const pending = S.asignacionesDe("local").filter((a) => a.estado === "pendiente");
    pending.forEach((a) => {
      const row = n("div", "one-assignment");
      row.append(n("span", "", a.dia), n("strong", "", WORKOUTS[a.workoutId]?.name || a.workoutId));
      if (a.nota) row.append(n("small", "", a.nota));
      box.append(row);
    });
  } else {
    box.append(n("div", "one-empty", "Perfil de demostración: las acciones que cambiarían un plan están deshabilitadas."));
  }
  return box;
}

function weeklyEditor(body, c) {
  if (c.demo) return;
  const box = n("section", "one-week-editor");
  const head = n("div", "one-section-head");
  const titleBox = n("div");
  titleBox.append(n("span", "one-kicker", "MICROCICLO / SEMANA"));
  titleBox.append(n("h4", "", "Plan semanal escribible"));
  head.append(titleBox, tag("UNA SOLA VERDAD","copper"));
  box.append(head);

  const grid = n("div", "one-week-grid");
  const custom = S.data.plan.custom || {};
  MACRO.dayNames.forEach((dayName, dow) => {
    const card = n("label", "one-day-editor");
    card.append(n("span", "", dayName.toUpperCase()));
    const select = document.createElement("select");
    select.setAttribute("aria-label", t("one.week.planLabel", { day:dayName }));
    const standard = MACRO.dayPlan[dow];
    const current = custom[dow] ?? "";
    const options = [
      ["", "ESTÁNDAR · " + (WORKOUTS[standard]?.name || "DESCANSO")],
      ["-", "DESCANSO"],
      ...Object.entries(WORKOUTS).map(([id,w]) => [id,w.name]),
    ];
    options.forEach(([value,label]) => {
      const o = new Option(label,value);
      o.selected = current === value;
      select.add(o);
    });
    select.addEventListener("change", () => {
      S.setPlanDia(dow, select.value === "-" ? null : select.value);
      toast("PLAN ACTUALIZADO", dayName + ": la app del atleta ya usa este plan.");
    });
    card.append(select);
    grid.append(card);
  });
  box.append(grid);
  box.append(btn("RESTABLECER PLAN ESTÁNDAR","one-action",() => {
    S.restaurarPlanEstandar();
    toast("PLAN RESTABLECIDO","Vuelve el macrociclo estándar.");
    renderCoachClient(body, fichaLocal(S));
  }));
  body.append(box);
}

function renderCoachClient(body, c) {
  body.textContent = "";
  body.classList.add("one-coach-body");
  body.append(btn("← CARTERA","one-back",() => renderCoachStudio(body)));
  body.append(profileHeader(c));

  const data = n("div", "one-profile-kpis");
  data.append(
    dataTile("PREPARACIÓN", c.preparacion == null ? "—" : c.preparacion + "%", "hoy"),
    dataTile("ADHERENCIA", c.adherencia + "%", c.adherenciaDias ? c.adherenciaDias + " días" : "periodo demo"),
    dataTile("SUEÑO", c.dormir == null ? "—" : c.dormir + " h", "último registro"),
    dataTile("PESO", c.peso == null ? "—" : c.peso + " kg", "solo si registrado")
  );
  body.append(data);

  const split = n("div", "one-profile-grid");
  split.append(renderPlanCard(c,body), renderAlerts(c));
  body.append(split);

  const p = planificacion(S);
  const macro = n("section", "one-macro-preview");
  const mh = n("div", "one-section-head");
  const mt = n("div");
  mt.append(n("span", "one-kicker", "MACROCICLO"));
  mt.append(n("h4", "", "Semana " + p.semana + "/" + p.totalSemanas));
  mh.append(mt, tag(p.fase.name,"copper"));
  macro.append(mh, phaseRail(p));
  body.append(macro);

  const change = n("section", "one-profile-panel");
  const ch = n("div", "one-section-head");
  const ct = n("div");
  ct.append(n("span", "one-kicker", "ÚLTIMO CAMBIO"));
  ct.append(n("h4", "", c.ultimoCambio));
  ch.append(ct);
  change.append(ch);
  change.append(n("p", "one-panel-copy", "Información deportiva organizada. No sustituye diagnóstico ni evaluación sanitaria."));
  body.append(change);

  weeklyEditor(body,c);
}

function planSessionModal(c, body) {
  const dates = [0,1,2].map((i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return [todayKey(d), i === 0 ? "HOY" : i === 1 ? "MAÑANA" : "PASADO MAÑANA"];
  });
  let workoutOptions = "";
  Object.entries(WORKOUTS).forEach(([id,w]) => {
    workoutOptions += '<option value="' + esc(id) + '">' + esc(w.name) + " · " + esc(w.min) + " min</option>";
  });
  let dayOptions = "";
  dates.forEach(([key,label]) => {
    dayOptions += '<option value="' + key + '">' + label + " · " + key + "</option>";
  });
  const html =
    '<div class="one-modal-kicker">COACH STUDIO · ASIGNAR</div>' +
    '<div class="cine-title">Sesión para ' + esc(c.nombre) + '</div>' +
    '<div class="cine-sub">La misma sesión aparecerá en HOY. El entrenador conserva la decisión final.</div>' +
    '<div class="checkin-grid">' +
    '<label class="checkin-row"><span>ENTRENAMIENTO</span><select id="one-as-w">' + workoutOptions + '</select></label>' +
    '<label class="checkin-row"><span>DÍA</span><select id="one-as-d">' + dayOptions + '</select></label>' +
    '<label class="checkin-row"><span>NOTA</span><input id="one-as-n" maxlength="200" placeholder="Contexto técnico opcional"></label>' +
    '</div><button class="btn btn-primary btn-block" id="one-as-save">ASIGNAR SESIÓN</button>' +
    '<button class="btn btn-block" id="one-as-cancel">CANCELAR</button>';

  showModal(html, () => {
    $("#one-as-cancel").onclick = hideModal;
    $("#one-as-save").onclick = () => {
      const assignment = {
        clienteId:"local",
        workoutId:$("#one-as-w").value,
        dia:$("#one-as-d").value,
        nota:$("#one-as-n").value.trim(),
        origen:"coachos",
        autor:"Coach Studio",
      };
      const valid = validaAsignacion(assignment);
      hideModal();
      if (!valid.ok) return toast("NO ASIGNADA",valid.error,"danger");
      S.addAsignacion(assignment);
      toast("SESIÓN ASIGNADA",(WORKOUTS[assignment.workoutId]?.name || assignment.workoutId) + " → " + assignment.dia + ".");
      renderCoachClient(body,c);
    };
  });
}

function installCoachStudio() {
  BUILDERS.coachos = renderCoachStudio;
  on("today", () => {
    if (document.getElementById("drawer")?.dataset.section === "coachos" &&
        document.getElementById("drawer")?.classList.contains("open")) {
      renderCoachStudio(document.getElementById("drawer-body"));
    }
  });
}

export function installOneShell() {
  document.body.dataset.one = "v11";
  ensureEditionMark();
  ensureContextSwitch();
  ensureCoachRailButton();
  installCoachStudio();
  installObserver();
  installKeyboard();
  decorateProfile();
}
