// ============================================================
// BAYONA — LABORATORIO DE RECUPERACIÓN
// Preparación explicada (¿POR QUÉ?), sin caja negra y sin datos inventados:
// lo que no se ha registrado no aparece como medido.
// ============================================================
import { S } from "../state.js";
import { WORKOUTS } from "../data.js";
import { esc, fmtDec, t } from "../i18n.js";
import {
  UI, $, el, elT, BUILDERS,
} from "./shared.js";

BUILDERS.recovery = (body) => {
  body = body || $("#drawer-body");
  const td = S.data.today;
  body.textContent = "";

  // ---------- PREPARACIÓN + ¿POR QUÉ? ----------
  body.appendChild(el("div", "sec-label", "PUNTUACIÓN DE PREPARACIÓN"));
  const det = S.readinessDetail();
  const card = el("div", "card");
  const scoreTxt = det.score == null
    ? `<h4 style="font-size:26px;font-family:var(--mono)">—<small style="font-size:12px;color:var(--mute)">${esc(t("state.notLogged"))}</small></h4>`
    : `<h4 style="font-size:26px;font-family:var(--mono)">${det.score}<small style="font-size:12px;color:var(--mute)">%</small>${det.estimated ? ' <span class="pill">ESTIMADA</span>' : ""}</h4>`;
  card.innerHTML = `
    <div class="card-row">${scoreTxt}<span class="pill gold">¿POR QUÉ?</span></div>
    <div class="sub">Estimación basada SOLO en lo que has registrado. No es un diagnóstico médico.</div>`;
  const why = el("div", "breakdown");
  if (!det.parts.length) {
    why.appendChild(el("div", "sub", "Sin registros hoy: registra sueño, molestia y energía para calcular tu preparación."));
  } else {
    det.parts.forEach((p) => {
      why.appendChild(el("div", "kv",
        `<span class="k">${esc(p.k)}</span><span class="v">${p.delta >= 0 ? "+" : ""}${esc(p.delta)} pts · ${esc(p.note)} <small style="color:var(--mute)">(${esc(p.pts)}/${esc(p.max)})</small></span>`));
    });
    why.appendChild(el("div", "media-caption",
      `Base neutra 50 · cada dato registrado desvía la puntuación: sueño 40%, molestia 25%, energía 20%, carga reciente 15% (pesos renormalizados según lo disponible).`));
  }
  card.appendChild(why);
  body.appendChild(card);

  // ---------- REGISTROS DE HOY ----------
  body.appendChild(el("div", "sec-label", "ESTADO DE HOY"));
  const s1 = sliderRow("SUEÑO (h)", 3, 10, 0.5, td.sleep ?? 7.5, td.sleep == null, (v) => S.logSleep(v));
  const s2 = sliderRow("MOLESTIA MUSCULAR", 0, 10, 1, td.soreness ?? 3, td.soreness == null, (v) => S.logSoreness(v));
  const s3 = sliderRow("ENERGÍA", 0, 10, 1, td.energy ?? 6, td.energy == null, (v) => S.logEnergy(v));
  const s4 = sliderRow("ESTRÉS PERCIBIDO", 0, 10, 1, td.stress ?? 4, td.stress == null, (v) => S.logStress(v));
  body.append(s1, s2, s3, s4);

  // carga reciente REAL (últimos 7 días) + HRV solo con dato real
  body.appendChild(el("div", "sec-label", "CARGA RECIENTE Y DATOS EXTERNOS"));
  const strain7 = S.data.history.slice(-7).reduce((a, h) => a + (h.strain || 0), 0) + (td.strain || 0);
  const load = el("div", "card");
  load.innerHTML = `
    <div class="kv"><span class="k">CARGA (7 DÍAS)</span><span class="v">${fmtDec(strain7, 1)} / 21 · calculada con tus series reales</span></div>
    <div class="kv"><span class="k">HRV</span><span class="v">Sin dispositivo conectado</span></div>
    <div class="sub">La variabilidad cardíaca (HRV) solo aparece cuando exista un dato real de un dispositivo autorizado. No se simula.</div>`;
  body.appendChild(load);

  // avisos del Mapa de Salud conectados con el entrenamiento
  const hf = S.data.healthFlags;
  if (hf && (hf.redFlags?.length || hf.pain?.length)) {
    const warn = el("div", "card");
    warn.style.borderColor = "var(--orange)";
    warn.innerHTML = `<h4>AVISOS DE SALUD ACTIVOS</h4>
      <div class="sub">${(hf.redFlags || []).map((x) => esc(x)).join("<br>")}${(hf.pain || []).length ? `<br>Molestias declaradas: ${hf.pain.map((x) => esc(x)).join(", ")}` : ""}<br>Se muestran también al empezar el entrenamiento. Ante dolor agudo o síntomas de alarma: detente y consulta a un profesional.</div>`;
    body.appendChild(warn);
  }

  // ---------- RECUPERACIÓN LAB ----------
  body.appendChild(el("div", "sec-label", "LABORATORIO DE RECUPERACIÓN"));
  const mob = el("div", "card");
  mob.innerHTML = `<h4>FLUJO DE MOVILIDAD · 15 MIN</h4><div class="sub">Descarga muscular, movilidad de cadera y torácica. Tu avatar realiza la rutina contigo.</div>`;
  const b = el("button", "btn btn-primary btn-block", td.mobility ? "COMPLETADO HOY" : "EMPEZAR SESIÓN");
  b.style.marginTop = "12px";
  b.disabled = td.mobility;
  b.addEventListener("click", () => { UI.actions.startWorkout?.(WORKOUTS.mobility_flow); });
  mob.appendChild(b);
  body.appendChild(mob);

  if (S.data.streak > 2) {
    const fz = el("div", "card");
    fz.innerHTML = `<h4>CONGELAR RACHA</h4><div class="sub">Disponibles: ${esc(S.data.freeze)}. Un día duro no destruye tu historia. En BAYONA descansar bien también es progreso.</div>`;
    body.appendChild(fz);
  }
};

function sliderRow(label, min, max, step, val, untouched, cb) {
  const r = el("div", "slider-row");
  const vTxt = untouched ? `<b>${esc(val)} <small style="color:var(--orange)">${esc(t("state.notLogged"))}</small></b>` : `<b>${esc(val)}</b>`;
  r.innerHTML = `<label><span>${label}</span>${vTxt}</label>`;
  const input = el("input");
  input.type = "range"; input.min = min; input.max = max; input.step = step; input.value = val;
  input.setAttribute("aria-label", label);
  input.addEventListener("input", () => {
    r.querySelector("label").innerHTML = `<span>${label}</span><b>${esc(input.value)}</b>`;
    cb(parseFloat(input.value));
  });
  r.appendChild(input);
  return r;
}
