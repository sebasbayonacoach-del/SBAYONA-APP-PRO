// ============================================================
// BAYONA — PROGRESO (MI HISTORIA): métricas, analítica, fotos privadas
// Las fotos son PRIVADAS por defecto: solo en tu dispositivo, sin publicación.
// ============================================================
import { S } from "../state.js";
import { EXERCISES } from "../data.js";
import { recoveryScore, trend1RM, project1RM, volumeStatus } from "../engine.js";
import { isGranted, setConsent } from "../consents.js";
import { CAMPOS, normalizaMedida, deltas, proyeccion, proximaMedicion, serie } from "../medidas.js";
import { lineaDelTiempo } from "../timeline.js";
import { esc, fmtDate, fmtInt } from "../i18n.js";
import {
  UI, $, el, showModal, hideModal, toast, BUILDERS,
} from "./shared.js";

BUILDERS.progress = (body) => {
  body = body || $("#drawer-body");
  const d = S.data;
  body.textContent = "";
  body.appendChild(el("div", "sec-label", "BÓVEDA DE PROGRESO · PRIVADA"));
  const grid = el("div", "stat-grid");
  const L = S.level();
  [
    ["NIVEL", L.lvl, S.rank()],
    ["DÍA", S.dayNumber(), "DE TU HISTORIA"],
    ["ENTRENOS", d.stats.workouts, "SESIONES"],
    ["RÉCORDS", d.stats.prs, "PRs"],
    ["SERIES", d.stats.sets, "REGISTRADAS"],
    ["DISTANCIA", d.stats.km, "KM"],
  ].forEach(([k, v, s]) => {
    grid.appendChild(el("div", "stat-cell", `<div class="k">${k}</div><div class="v">${fmtInt(v)} <small>${esc(s)}</small></div>`));
  });
  body.appendChild(grid);

  medidasBlock(body);
  body.appendChild(el("div", "sec-label", "ANALÍTICA DE RENDIMIENTO"));
  body.appendChild(analyticsBlock());

  body.appendChild(el("div", "sec-label", "HABILIDADES"));
  const SK = { strength: "FUERZA", cardio: "RESISTENCIA", mobility: "MOVILIDAD", recovery: "RECUPERACIÓN", discipline: "DISCIPLINA", mind: "MENTE" };
  Object.entries(SK).forEach(([k, label]) => {
    const v = d.skills[k];
    const m = el("div", "macro");
    m.innerHTML = `<div class="top"><span>${label}</span><span class="mono">${esc(v)}</span></div>
      <div class="mbar"><i style="width:${Math.min(100, v)}%;background:linear-gradient(90deg,var(--blue),var(--cyan))"></i></div>`;
    body.appendChild(m);
  });

  body.appendChild(el("div", "sec-label", "RÉCORDS PERSONALES"));
  const prKeys = Object.keys(d.prs);
  if (!prKeys.length) body.appendChild(el("div", "card", `<div class="sub">Aún no hay récords. El primero te espera en el GIMNASIO.</div>`));
  prKeys.forEach((k) => {
    const p = d.prs[k];
    body.appendChild(el("div", "card", `<div class="card-row"><h4>${esc(EXERCISES[k]?.name || k)}</h4><span class="pill gold">${esc(p.kg)} kg × ${esc(p.reps)}</span></div>
      <div class="sub mono">1RM estimado ${esc(p.e1)} kg · ${esc(fmtDate(p.date))}</div>`));
  });

  body.appendChild(el("div", "sec-label", "TU HISTORIA · ANTES → AHORA (TODO EN UNA LÍNEA)"));
  const tl = el("div", "tl");
  const evs = lineaDelTiempo({
    medidas: d.medidas || [], fotos: d.photos || [],
    history: d.history || [], journey: d.journey || [],
  });
  const TIPO_TAG = { medicion: "MEDICIÓN", foto: "FOTO", pr: "RÉCORD", hito: "HITO" };
  if (!evs.length) tl.appendChild(el("div", "tl-item", `<div class="tl-txt">Día 1. Todo empieza con una primera misión.</div>`));
  evs.forEach((e) => {
    tl.appendChild(el("div", "tl-item" + (e.tipo === "pr" ? " pr" : ""),
      `<div class="tl-day">${esc(fmtDate(e.fecha))} · ${esc(TIPO_TAG[e.tipo] || "HITO")}</div><div class="tl-txt">${esc(e.texto)}</div>${e.xp ? `<div class="tl-xp">+${esc(e.xp)} XP</div>` : ""}`));
  });
  body.appendChild(tl);

  photosBlock(body);
};

// ---------------- ANALÍTICA ----------------
function analyticsBlock() {
  const box = el("div");
  const rec = recoveryScore();
  const strain = S.data.today.strain || 0;
  const g = el("div", "stat-grid");
  g.innerHTML = `
    <div class="stat-cell"><div class="k">RECUPERACIÓN</div><div class="v" style="color:${rec == null ? "var(--mute)" : rec > 70 ? "var(--ok)" : rec > 45 ? "var(--orange)" : "var(--danger)"}">${rec == null ? "—" : rec + "%"}</div></div>
    <div class="stat-cell"><div class="k">CARGA HOY</div><div class="v">${esc(strain)}<small>/21</small></div></div>`;
  box.appendChild(g);
  box.appendChild(el("div", "media-caption",
    "RECUPERACIÓN = estimación con tus registros (sueño × molestia × energía × carga). CARGA = esfuerzo muscular del día (Epley + RIR). Sin diagnóstico."));

  box.appendChild(el("div", "sec-label", "TENDENCIA 1RM"));
  ["squat", "bench", "deadlift"].forEach((ex) => {
    const pts = trend1RM(ex);
    const cur = S.data.prs[ex];
    const c = el("div", "card");
    c.innerHTML = `<div class="card-row"><h4>${esc(EXERCISES[ex].name)}</h4><span class="pill gold">${cur ? esc(cur.e1) + " kg" : "sin datos"}</span></div>`;
    if (pts.length >= 1) {
      const max = Math.max(...pts.map((p) => p.e1), 60);
      const w2 = 320, h2 = 46;
      const coords = pts.map((p, i) => `${(i / Math.max(1, pts.length - 1)) * w2},${h2 - (p.e1 / max) * (h2 - 6)}`).join(" ");
      const svg = el("div");
      svg.innerHTML = `<svg viewBox="0 0 ${w2} ${h2}" style="width:100%;height:46px;margin-top:8px" role="img" aria-label="Curva de 1RM">
        <polyline points="${coords}" fill="none" stroke="#e8500a" stroke-width="2" />
        ${pts.map((p, i) => `<circle cx="${(i / Math.max(1, pts.length - 1)) * w2}" cy="${h2 - (p.e1 / max) * (h2 - 6)}" r="2.5" fill="#16130f" />`).join("")}
      </svg>`;
      c.appendChild(svg);
      const proj = project1RM(ex, Math.round(((cur?.e1 || 60) * 1.15) / 5) * 5);
      c.appendChild(el("div", "media-caption", proj
        ? `PROYECCIÓN · +${proj.rate} kg/sem · objetivo en ~${proj.weeks} semanas (estimación con tus datos)`
        : "Sin datos suficientes para proyectar."));
    } else {
      c.appendChild(el("div", "media-caption", "Completa sesiones para trazar tu curva real."));
    }
    box.appendChild(c);
  });

  box.appendChild(el("div", "sec-label", "VOLUMEN OBJETIVO · SEMANA"));
  ["PECHO", "ESPALDA", "PIERNA", "HOMBRO", "BRAZO", "CORE"].forEach((m) => {
    const v = volumeStatus(m);
    const row = el("div", "macro");
    row.innerHTML = `<div class="top"><span>${m}</span><span class="mono">${esc(v.sets)}/${esc(v.mrv)} series · ${esc(v.zone)}</span></div>
      <div class="mbar"><i style="width:${v.pct}%;background:${v.zone.includes("MRV") ? "var(--danger)" : v.zone === "ÓPTIMO" ? "var(--ok)" : "var(--ink)"}"></i></div>`;
    box.appendChild(row);
  });
  return box;
}

// ---------------- FOTOS DE PROGRESO (privadas por defecto) ----------------
const VIEWS = [["front", "FRONTAL"], ["side", "LATERAL"], ["back", "POSTERIOR"]];

function photosBlock(body) {
  body.appendChild(el("div", "sec-label", "FOTOS DE PROGRESO · PRIVADAS POR DEFECTO"));
  const ph = el("div", "card");
  ph.innerHTML = `<h4>FOTOS DE PROGRESO</h4>
    <div class="sub">Frontal · Lateral · Posterior. Se guardan <b>solo en este dispositivo</b> y nunca se publican sin tu acción explícita. Cada foto lleva fecha.</div>`;
  const row = el("div", "card-row");
  row.style.marginTop = "10px";
  VIEWS.forEach(([key, label]) => {
    const b = el("button", "btn grow", `＋ ${label}`);
    b.onclick = () => addPhoto(key, label);
    row.appendChild(b);
  });
  ph.appendChild(row);
  const bCmp = el("button", "btn btn-block", "COMPARADOR ANTES / AHORA");
  bCmp.style.marginTop = "10px";
  bCmp.onclick = comparator;
  ph.appendChild(bCmp);
  const photos = S.data.photos || [];
  if (photos.length) {
    const list = el("div", "items");
    photos.slice(0, 6).forEach((p) => {
      const c = el("div", "item");
      c.innerHTML = `<img src="${esc(p.dataUrl)}" alt="Foto ${esc(p.view)} ${esc(fmtDate(p.at))}" style="width:100%;border-radius:8px" />
        <div class="nm">${esc(VIEWS.find((v) => v[0] === p.view)?.[1] || p.view)} · ${esc(fmtDate(p.at))}</div>
        <div class="dual"><span class="on">PRIVADA ✓</span></div>`;
      list.appendChild(c);
    });
    ph.appendChild(list);
    const del = el("button", "btn btn-danger btn-block", "ELIMINAR MIS FOTOS");
    del.style.marginTop = "10px";
    del.onclick = () => {
      if (confirm("¿Eliminar todas tus fotos de progreso de este dispositivo?")) {
        S.data.photos = []; S.save(); BUILDERS.progress();
        toast("FOTOS ELIMINADAS", "No queda ninguna copia en este dispositivo.");
      }
    };
    ph.appendChild(del);
  }
  body.appendChild(ph);
}

/** Guarda la foto reducida (≈512 px) para no llenar el almacenamiento local. */
function addPhoto(view, label) {
  const go = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const f = input.files && input.files[0];
      if (!f) return;
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 512 / Math.max(img.width, img.height));
        const cv = document.createElement("canvas");
        cv.width = Math.round(img.width * scale);
        cv.height = Math.round(img.height * scale);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        const dataUrl = cv.toDataURL("image/jpeg", 0.7);
        S.data.photos = S.data.photos || [];
        S.data.photos.unshift({ view, at: new Date().toISOString(), dataUrl });
        S.data.photos = S.data.photos.slice(0, 12);
        S.save();
        toast("FOTO GUARDADA", `${label} · privada en este dispositivo`);
        BUILDERS.progress();
      };
      img.src = URL.createObjectURL(f);
    };
    input.click();
  };
  if (isGranted("photos")) return go();
  showModal(`
    <div class="cine-tag">PERMISO DE FOTOS</div>
    <div class="cine-title" style="font-size:20px">FOTOS PRIVADAS</div>
    <div class="sub">Las fotos de progreso son <b>privadas por defecto</b>: se guardan reducidas en este dispositivo, nunca se publican ni se envían a servicios externos.</div>
    <div style="display:flex;gap:8px">
      <button class="btn grow" id="p-no">AHORA NO</button>
      <button class="btn btn-primary grow" id="p-yes">ENTENDIDO, AÑADIR</button>
    </div>`, () => {
    $("#p-no").onclick = hideModal;
    $("#p-yes").onclick = () => { setConsent("photos", true); hideModal(); go(); };
  });
}

function comparator() {
  const photos = S.data.photos || [];
  if (photos.length < 2) return toast("COMPARADOR", "Necesitas al menos dos fotos (ANTES y AHORA).", "danger");
  const opts = photos.map((p, i) => `<option value="${i}">${esc(VIEWS.find((v) => v[0] === p.view)?.[1] || p.view)} · ${esc(fmtDate(p.at))}</option>`).join("");
  showModal(`
    <div class="cine-tag">COMPARADOR</div>
    <div class="cine-title" style="font-size:20px">ANTES / AHORA</div>
    <div class="cmp-wrap" style="position:relative;overflow:hidden;border-radius:12px;margin:10px 0">
      <img id="cmp-b" src="${photos[1].dataUrl}" style="width:100%;display:block" alt="Ahora" />
      <img id="cmp-a" src="${photos[0].dataUrl}" style="position:absolute;inset:0;width:100%;clip-path:inset(0 50% 0 0)" alt="Antes" />
    </div>
    <input id="cmp-range" type="range" min="0" max="100" value="50" style="width:100%" aria-label="Deslizador antes y ahora" />
    <div style="display:flex;gap:8px;margin-top:8px">
      <select id="cmp-ia" style="flex:1">${opts}</select>
      <select id="cmp-ib" style="flex:1">${opts}</select>
    </div>
    <div class="sub">ANTES (izquierda) · AHORA (derecha). Las imágenes no se deforman.</div>
    <button class="btn btn-block" id="cmp-ok">CERRAR</button>
  `, () => {
    const a = $("#cmp-a"), b = $("#cmp-b");
    $("#cmp-range").oninput = (e) => { a.style.clipPath = `inset(0 ${100 - e.target.value}% 0 0)`; };
    $("#cmp-ia").onchange = (e) => { a.src = photos[+e.target.value].dataUrl; };
    $("#cmp-ib").onchange = (e) => { b.src = photos[+e.target.value].dataUrl; };
    $("#cmp-ok").onclick = hideModal;
  });
}
