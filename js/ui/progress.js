// ============================================================
// BAYONA — PROGRESO (MI HISTORIA): métricas, analítica, fotos privadas
// Las fotos son PRIVADAS por defecto: solo en tu dispositivo, sin publicación.
// ============================================================
import { S, todayKey } from "../state.js";
import { EXERCISES } from "../data.js";
import { recoveryScore, project1RM, volumeStatus } from "../engine.js";
import { isGranted, setConsent } from "../consents.js";
import { CAMPOS, normalizaMedida, deltas, proyeccion, proximaMedicion, serie } from "../medidas.js";
import { lineaDelTiempo } from "../timeline.js";
import {
  volumenPorSemana, constancia, progresoFuerza, exportarDatos, borrarCuenta, claveSemana,
} from "../progreso.js";
import {
  progressSnapshot, progressRecords, strengthRecords,
} from "../progress-visual.js";
import { hasFeature, planFromProfile, PLAN_META } from "../entitlements.js";
import { progressReviewStatus } from "../hub.js";
import { esc, fmtDate, fmtInt, t } from "../i18n.js";
import {
  UI, $, el, showModal, hideModal, toast, BUILDERS,
} from "./shared.js";

function progressHero(snapshot){
  const review=progressReviewStatus(S.data.profile||{},new Date());
  const reviewText=review.status==="unscheduled"
    ? t("hub.review.unscheduled")
    : review.status==="today"
      ? t("hub.review.today")
      : review.status==="overdue"
        ? t("hub.review.overdue")
        : t("hub.review.days",{days:review.days});
  const card=el("section","progress-hero");
  card.innerHTML=`
    <div class="progress-hero-copy">
      <small>${esc(t("progress.hero.kicker"))}</small>
      <h3>${esc(t("progress.hero.title"))}</h3>
      <p>${esc(t("progress.hero.sub"))}</p>
    </div>
    <div class="progress-hero-stats">
      <article><small>${esc(t("progress.hero.sessions"))}</small><strong>${snapshot.stats.workouts}</strong></article>
      <article><small>${esc(t("progress.hero.sets"))}</small><strong>${snapshot.stats.sets}</strong></article>
      <article><small>${esc(t("progress.hero.prs"))}</small><strong>${snapshot.stats.prs}</strong></article>
      <article><small>${esc(t("progress.hero.streak"))}</small><strong>${snapshot.stats.streak}</strong></article>
      <article><small>${esc(t("progress.hero.minutes"))}</small><strong>${fmtInt(snapshot.stats.sessionsMin)}</strong></article>
    </div>
    <div class="progress-review"><span><small>${esc(t("hub.review.label"))}</small><strong>${esc(reviewText)}</strong></span></div>`;
  return card;
}

function deltaChip(value,unit=""){
  if(value==null)return '<em>—</em>';
  if(value===0)return `<em>${esc(t("progress.delta.same"))}</em>`;
  const sign=value>0?"+":"";
  return `<em class="${value>0?"up":"down"}">${sign}${esc(value)}${unit}</em>`;
}

function periodCard(period){
  const card=el("section","progress-period");
  card.innerHTML=`
    <div class="progress-section-head">
      <span><small>${esc(t("progress.period.label"))}</small><strong>${esc(t("progress.period.compare"))}</strong></span>
      ${period.comparable?"":`<em>${esc(t("progress.period.noCompare"))}</em>`}
    </div>
    <div class="progress-period-grid">
      <article><small>${esc(t("progress.period.sessions"))}</small><strong>${period.current.sessions}</strong>${period.comparable?deltaChip(period.delta.sessions):"<em>—</em>"}</article>
      <article><small>${esc(t("progress.period.sets"))}</small><strong>${period.current.sets}</strong>${period.comparable?deltaChip(period.delta.sets):"<em>—</em>"}</article>
      <article><small>${esc(t("progress.period.active"))}</small><strong>${period.current.activeDays}</strong>${period.comparable?deltaChip(period.delta.activeDays):"<em>—</em>"}</article>
      <article><small>${esc(t("progress.period.volume"))}</small><strong>${period.current.volumeKg==null?"—":fmtInt(period.current.volumeKg)}</strong>${period.comparable?deltaChip(period.delta.volumeKg," kg"):"<em>—</em>"}</article>
      <article><small>${esc(t("progress.period.prs"))}</small><strong>${period.current.prs}</strong>${period.comparable?deltaChip(period.delta.prs):"<em>—</em>"}</article>
    </div>`;
  return card;
}

function strengthHighlights(snapshot){
  const wrap=el("section","progress-strength");
  wrap.innerHTML=`<div class="progress-section-head"><span><small>${esc(t("progress.strength.label"))}</small><strong>${esc(t("progress.strength.estimated"))}</strong></span></div><div class="progress-strength-grid"></div>`;
  const grid=wrap.querySelector(".progress-strength-grid");
  const leaders=snapshot.strength.slice(0,4);
  if(!leaders.length){
    grid.appendChild(el("div","progress-empty",esc(t("state.notLogged"))));
    return wrap;
  }
  leaders.forEach((row)=>{
    const name=EXERCISES[row.ejercicio]?.name||row.ejercicio;
    const delta=row.delta==null?t("progress.strength.noDelta"):t("progress.strength.delta",{value:(row.delta>0?"+":"")+row.delta});
    const card=el("article","");
    card.innerHTML=`<small>${esc(name)}</small><strong>${esc(row.last?.e1RM??"—")} <i>kg</i></strong><span>${esc(delta)}</span><em>${row.points} pts</em>`;
    grid.appendChild(card);
  });
  return wrap;
}

function measurementSummary(snapshot){
  const m=snapshot.measures;
  const card=el("section","progress-measure-summary");
  const latest=m.latest;
  card.innerHTML=`
    <div class="progress-section-head">
      <span><small>${esc(t("progress.measure.label"))}</small><strong>${latest?esc(t("progress.measure.latest")):esc(t("progress.measure.none"))}</strong></span>
      <em>${m.due?esc(m.due.motivo):""}</em>
    </div>
    <div class="progress-measure-grid">
      <article><small>PESO</small><strong>${latest?.pesoKg!=null?esc(latest.pesoKg)+" kg":"—"}</strong>${m.deltas.pesoKg?deltaChip(m.deltas.pesoKg.delta," kg"):"<em>—</em>"}</article>
      <article><small>CINTURA</small><strong>${latest?.cinturaCm!=null?esc(latest.cinturaCm)+" cm":"—"}</strong>${m.deltas.cinturaCm?deltaChip(m.deltas.cinturaCm.delta," cm"):"<em>—</em>"}</article>
      <article><small>CADERA</small><strong>${latest?.caderaCm!=null?esc(latest.caderaCm)+" cm":"—"}</strong>${m.deltas.caderaCm?deltaChip(m.deltas.caderaCm.delta," cm"):"<em>—</em>"}</article>
      <article><small>GRASA</small><strong>${latest?.grasaPct!=null?esc(latest.grasaPct)+" %":"—"}</strong>${m.deltas.grasaPct?deltaChip(m.deltas.grasaPct.delta," %"):"<em>—</em>"}</article>
    </div>`;
  return card;
}

function photosSummary(snapshot){
  const p=snapshot.photos;
  const card=el("section","progress-photos-summary");
  card.innerHTML=`
    <div class="progress-section-head">
      <span><small>${esc(t("progress.photos.label"))}</small><strong>${esc(t("progress.photos.count",{count:p.count}))}</strong></span>
      <em>${esc(p.comparable?t("progress.photos.compare"):t("progress.photos.needTwo"))}</em>
    </div>
    <div class="progress-photo-counts">
      <span><small>FRONTAL</small><b>${p.byView.front}</b></span>
      <span><small>LATERAL</small><b>${p.byView.side}</b></span>
      <span><small>POSTERIOR</small><b>${p.byView.back}</b></span>
    </div>`;
  return card;
}

function advancedProgressBlock(){
  const plan=planFromProfile(S.data.profile);
  if(hasFeature(plan,"progress.advanced")){
    const box=el("section","progress-advanced");
    box.innerHTML=`<div class="progress-section-head"><span><small>${esc(t("progress.advanced.kicker"))}</small><strong>${esc(t("progress.advanced.title"))}</strong></span></div><p>${esc(t("progress.advanced.body"))}</p>`;
    box.appendChild(analyticsBlock());
    return box;
  }
  const box=el("section","progress-advanced locked");
  box.innerHTML=`
    <div class="progress-section-head"><span><small>${esc(t("progress.advanced.kicker"))}</small><strong>${esc(t("progress.advanced.locked"))}</strong></span><b>${esc(PLAN_META.performance.label)}</b></div>
    <p>${esc(t("progress.advanced.preview"))}</p>`;
  return box;
}

BUILDERS.progress = (body) => {
  body = body || $("#drawer-body");
  const d=S.data;
  const snapshot=progressSnapshot(d,todayKey());
  body.textContent="";

  body.append(
    progressHero(snapshot),
    periodCard(snapshot.period28),
    strengthHighlights(snapshot)
  );

  body.appendChild(el("div","sec-label","PROGRESO HONESTO · SOLO TUS DATOS"));
  body.appendChild(progresoHonestoBlock());

  body.append(measurementSummary(snapshot));
  medidasBlock(body);

  body.append(photosSummary(snapshot));
  photosBlock(body);

  body.appendChild(advancedProgressBlock());

  body.appendChild(el("div","sec-label","HABILIDADES"));
  const SK={strength:"FUERZA",cardio:"RESISTENCIA",mobility:"MOVILIDAD",recovery:"RECUPERACIÓN",discipline:"DISCIPLINA",mind:"MENTE"};
  Object.entries(SK).forEach(([k,label])=>{
    const v=d.skills[k];
    const m=el("div","macro");
    m.innerHTML=`<div class="top"><span>${label}</span><span class="mono">${esc(v)}</span></div>
      <div class="mbar"><i style="width:${Math.min(100,v)}%;background:var(--orange)"></i></div>`;
    body.appendChild(m);
  });

  body.appendChild(el("div","sec-label","RÉCORDS PERSONALES"));
  const prKeys=Object.keys(d.prs);
  if(!prKeys.length) body.appendChild(el("div","card",`<div class="sub">${esc(t("state.notLogged"))}</div>`));
  prKeys.forEach((k)=>{
    const p=d.prs[k];
    body.appendChild(el("div","card",`<div class="card-row"><h4>${esc(EXERCISES[k]?.name||k)}</h4><span class="pill gold">${esc(p.kg)} kg × ${esc(p.reps)}</span></div>
      <div class="sub mono">1RM estimado ${esc(p.e1)} kg · ${esc(fmtDate(p.date))}</div>`));
  });

  body.appendChild(el("div","sec-label",t("progress.timeline.label")));
  const tl=el("div","tl");
  const TIPO_TAG={medicion:"MEDICIÓN",foto:"FOTO",pr:"RÉCORD",hito:"HITO"};
  if(!snapshot.timeline.length) tl.appendChild(el("div","tl-item",`<div class="tl-txt">${esc(t("progress.timeline.empty"))}</div>`));
  snapshot.timeline.forEach((event)=>{
    tl.appendChild(el("div","tl-item"+(event.tipo==="pr"?" pr":""),
      `<div class="tl-day">${esc(fmtDate(event.fecha))} · ${esc(TIPO_TAG[event.tipo]||"HITO")}</div><div class="tl-txt">${esc(event.texto)}</div>${event.xp?`<div class="tl-xp">+${esc(event.xp)} XP</div>`:""}`));
  });
  body.appendChild(tl);
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

  // (la curva de 1RM vive en el bloque PROGRESO HONESTO, con datos por serie)
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

// ---------------- PROGRESO HONESTO (P14) ----------------
// Las 3 gráficas salen SOLO de datos registrados (lógica probada en
// tests/progreso-eval.mjs). Sin registro no hay dato: los huecos se
// muestran como huecos. "Descansar es progreso": descansar no castiga.

/** Registros reales para las gráficas: series del histórico + hoy.
 *  Día con algo registrado pero sin detalle de series → marca `actividad`
 *  (viene de lo que la persona registró de verdad: sesión, agua…). */
function registrosDeProgreso() {
  return progressRecords(S.data);
}

/** Registros de fuerza: series reales + récords ya registrados (e1RM guardado). */
function registrosFuerza() {
  return strengthRecords(S.data);
}

function progresoHonestoBlock() {
  const box = el("div");
  const rows = registrosDeProgreso();

  // 1 · VOLUMEN POR SEMANA
  const c1 = el("div", "card");
  c1.innerHTML = `<h4>VOLUMEN POR SEMANA</h4><div class="sub">Kilos × repeticiones que registraste. Las semanas sin datos se quedan vacías: <b>aquí no se rellena con ceros</b>.</div>`;
  c1.appendChild(svgVolumen(volumenPorSemana(rows)));
  box.appendChild(c1);

  // 2 · CONSTANCIA
  const cst = constancia(rows);
  const c2 = el("div", "card");
  c2.innerHTML = `<h4>CONSTANCIA</h4>
    <div class="card-row"><span class="pill gold">RACHA ${esc(cst.rachaActual)} DÍAS</span><span class="pill">MEJOR ${esc(cst.mejorRacha)}</span><span class="pill">ACTIVOS ${esc(cst.diasActivos)}</span></div>
    <div class="sub"><b>Descansar es progreso:</b> un día de descanso no borra tu racha. Solo una ausencia de más de 2 días empieza una racha nueva.</div>`;
  c2.appendChild(svgConstancia(rows));
  box.appendChild(c2);

  // 3 · FUERZA · 1RM ESTIMADO
  const c3 = el("div", "card");
  c3.innerHTML = `<h4>FUERZA · 1RM ESTIMADO</h4><div class="sub">Estimación de Epley (carga × (1 + reps/30)) sobre tus series reales. Es una <b>estimación</b>, no una medición.</div>`;
  c3.appendChild(svgFuerza(registrosFuerza()));
  box.appendChild(c3);

  // 4 · TUS DATOS (GDPR)
  box.appendChild(datosBlock());
  return box;
}

function svgVolumen(rows) {
  const wrap = el("div");
  const datos = rows.filter((r) => r.volumen_kg != null);
  if (!datos.length) {
    wrap.appendChild(el("div", "media-caption", "Aún no hay series con carga registrada. Tu primer entrenamiento dibujará la primera barra."));
    return wrap;
  }
  const W = 320, H = 108, base = H - 16;
  const max = Math.max(...datos.map((r) => r.volumen_kg));
  const paso = W / rows.length;
  const bw = Math.max(5, Math.min(26, paso - 6));
  const bars = rows.map((r, i) => {
    const x = i * paso + (paso - bw) / 2;
    if (r.volumen_kg == null) {
      return `<text x="${x + bw / 2}" y="${base - 4}" font-size="8" text-anchor="middle" fill="var(--mute)">—</text>`;
    }
    const bh = Math.max(3, (r.volumen_kg / max) * (base - 18));
    return `<rect x="${x}" y="${base - bh}" width="${bw}" height="${bh}" rx="3" fill="var(--orange)"><title>${r.semana} · ${Math.round(r.volumen_kg)} kg</title></rect>
      <text x="${x + bw / 2}" y="${base - bh - 3}" font-size="7" text-anchor="middle" fill="var(--mute)">${Math.round(r.volumen_kg)}</text>`;
  }).join("");
  const labels = rows.map((r, i) => `<text x="${i * paso + paso / 2}" y="${H - 3}" font-size="7" text-anchor="middle" fill="var(--mute)">${r.semana.slice(5)}</text>`).join("");
  const svg = el("div");
  svg.innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:108px" role="img" aria-label="Volumen de entrenamiento por semana">${bars}${labels}</svg>`;
  wrap.appendChild(svg);
  return wrap;
}

function svgConstancia(rows) {
  const wrap = el("div");
  const porSemana = new Map();
  for (const r of rows) {
    const k = claveSemana(r.fecha);
    if (!k) continue;
    porSemana.set(k, (porSemana.get(k) || 0) + 1);
  }
  if (!porSemana.size) {
    wrap.appendChild(el("div", "media-caption", "Sin días registrados todavía. Aquí verás tus días activos por semana."));
    return wrap;
  }
  const claves = [...porSemana.keys()].sort();
  const semanas = [];
  const ini = Date.parse(claves[0] + "T00:00:00Z"), fin = Date.parse(claves[claves.length - 1] + "T00:00:00Z");
  for (let t = ini; t <= fin; t += 7 * 864e5) semanas.push(new Date(t).toISOString().slice(0, 10));
  const W = 320, H = 78, base = H - 14;
  const paso = W / semanas.length;
  const bw = Math.max(5, Math.min(26, paso - 6));
  const bars = semanas.map((k, i) => {
    const n = porSemana.get(k) || 0; // 0 días ACTIVOS registrados (hecho, no estimación)
    const x = i * paso + (paso - bw) / 2;
    const bh = n ? Math.max(4, (n / 7) * (base - 12)) : 2;
    return `<rect x="${x}" y="${base - bh}" width="${bw}" height="${bh}" rx="3" fill="${n ? "var(--orange)" : "var(--mute)"}"><title>${k} · ${n} días activos</title></rect>`;
  }).join("");
  const labels = semanas.map((k, i) => `<text x="${i * paso + paso / 2}" y="${H - 3}" font-size="7" text-anchor="middle" fill="var(--mute)">${k.slice(5)}</text>`).join("");
  const svg = el("div");
  svg.innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:78px" role="img" aria-label="Días activos por semana">${bars}${labels}</svg>`;
  wrap.appendChild(svg);
  wrap.appendChild(el("div", "media-caption", "Una barra corta = semana con pocos días registrados. Ninguna cifra se estima: solo se cuenta lo que registraste."));
  return wrap;
}

function svgFuerza(rows) {
  const wrap = el("div");
  const f = progresoFuerza(rows).filter((x) => x.puntos.length >= 1).slice(0, 3);
  if (!f.length) {
    wrap.appendChild(el("div", "media-caption", "Sin series cargadas todavía. Cuando registres cargas, aquí verás tu curva real de 1RM estimado."));
    return wrap;
  }
  const W = 320, H = 112;
  const all = f.flatMap((x) => x.puntos.map((p) => p.e1RM));
  const max = Math.max(...all), min = Math.min(...all);
  const yy = (v) => H - 16 - ((v - min) / Math.max(1, max - min)) * (H - 34);
  const xx = (n, i) => 10 + (i / Math.max(1, n - 1)) * (W - 20);
  const COLORS = ["var(--orange)", "var(--ink)", "var(--mute)"];
  const g = f.map((ex, k) => {
    const pts = ex.puntos.map((p, i) => `${xx(ex.puntos.length, i)},${yy(p.e1RM)}`).join(" ");
    const dots = ex.puntos.map((p, i) => `<circle cx="${xx(ex.puntos.length, i)}" cy="${yy(p.e1RM)}" r="2.5" fill="${COLORS[k]}"><title>${p.fecha} · ${p.e1RM} kg (estimado)</title></circle>`).join("");
    return `<polyline points="${pts}" fill="none" stroke="${COLORS[k]}" stroke-width="2" />${dots}`;
  }).join("");
  const svg = el("div");
  svg.innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:112px" role="img" aria-label="Progreso de 1RM estimado por ejercicio">${g}</svg>`;
  wrap.appendChild(svg);
  f.forEach((ex, k) => {
    const last = ex.puntos[ex.puntos.length - 1];
    const cur = S.data.prs[ex.ejercicio];
    const proj = project1RM(ex.ejercicio, Math.round(((cur?.e1 || last.e1RM) * 1.15) / 5) * 5);
    wrap.appendChild(el("div", "sub", `<span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${COLORS[k]};margin-right:6px"></span>${esc(EXERCISES[ex.ejercicio]?.name || ex.ejercicio)} · ${esc(last.e1RM)} kg e1RM${proj ? ` · proyección +${esc(proj.rate)} kg/sem (~${esc(proj.weeks)} sem)` : ""}`));
  });
  return wrap;
}

function datosBlock() {
  const box = el("div", "card");
  box.innerHTML = `<h4>TUS DATOS</h4><div class="sub">Tus datos son tuyos: puedes descargarlos en JSON y borrar la cuenta cuando quieras. El borrado deja un <b>acuse</b> con qué se borró y cuándo.</div>`;
  const b1 = el("button", "btn btn-block", "EXPORTAR MIS DATOS (JSON)");
  b1.style.marginTop = "10px";
  b1.onclick = () => {
    descargar(`bayona-mis-datos-${new Date().toISOString().slice(0, 10)}.json`, exportarDatos(S.exportAll()));
    toast("DATOS EXPORTADOS", "Copia JSON completa de todo lo registrado. Nada se queda fuera.");
  };
  const b2 = el("button", "btn btn-danger btn-block", "BORRAR MI CUENTA");
  b2.style.marginTop = "8px";
  b2.onclick = flujoBorrado;
  box.appendChild(b1);
  box.appendChild(b2);
  return box;
}

function flujoBorrado() {
  showModal(`
    <div class="cine-tag">BORRAR CUENTA</div>
    <div class="cine-title" style="font-size:20px">¿BORRAR TODO?</div>
    <div class="sub">Se borran <b>tus datos de este dispositivo</b>: perfil, entrenos, medidas, fotos, diario y récords. No se puede deshacer.<br/>Antes de borrar se descarga un <b>acuse</b> con qué se borró y cuándo.</div>
    <label style="display:block;margin:10px 0">MOTIVO (OPCIONAL)<input id="del-motivo" type="text" maxlength="120" placeholder="por ejemplo: cambio de app" /></label>
    <div style="display:flex;gap:8px">
      <button class="btn grow" id="del-cancel">VOLVER</button>
      <button class="btn btn-danger grow" id="del-ok">BORRAR MI CUENTA</button>
    </div>`, () => {
    $("#del-cancel").onclick = hideModal;
    $("#del-ok").onclick = () => {
      const motivo = ($("#del-motivo").value || "").trim() || null;
      const acuse = borrarCuenta(S.data, motivo); // acuse ANTES de borrar (qué existía)
      descargar(`bayona-acuse-borrado-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(acuse, null, 2));
      S.deleteAll();
      UI.session = null;
      hideModal();
      BUILDERS.progress();
      toast("CUENTA BORRADA", "Datos eliminados de este dispositivo. El acuse de borrado se ha descargado.");
    };
  });
}

function descargar(nombre, texto) {
  const blob = new Blob([texto], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// The domain existed, but its panel was missing and crashed all progress views.
function medidasBlock(body) {
  const card = el("form", "card personal-form");
  card.appendChild(el("h4", "", esc(t("measure.title"))));
  card.appendChild(el("p", "personal-note", esc(t("measure.note"))));
  const latest = S.medidasList().find(m => m.fecha === todayKey()) || {};
  for (const c of CAMPOS) {
    const label = el("label"); label.htmlFor = `measure-${c.k}`;
    label.textContent = `${c.label} (${c.unidad})${c.estimado ? " · ESTIMACIÓN" : ""}`;
    const input = el("input"); input.id = label.htmlFor; input.name = c.k; input.type = "number";
    input.min = c.min; input.max = c.max; input.step = "0.1"; input.inputMode = "decimal";
    input.value = latest[c.k] ?? "";
    card.append(label,input);
  }
  const result = el("p", "personal-note"); result.setAttribute("role","status");
  const save = el("button", "btn btn-primary btn-block", esc(t("measure.save"))); save.type="submit";
  card.append(save,result);
  card.onsubmit = e => {
    e.preventDefault();
    const m = normalizaMedida({ ...Object.fromEntries(new FormData(card)), fecha: todayKey() });
    if (!m) { result.textContent = t("measure.empty"); return; }
    const old = JSON.parse(JSON.stringify(S.data));
    S.addMedida(m);
    if (S.storageFailed) { S.data = old; result.textContent = t("measure.failed"); return; }
    BUILDERS.progress(body);
    toast(t("measure.saved"), t("measure.savedNote"));
  };
  const diff = deltas(S.medidasList());
  for (const c of CAMPOS) if (diff[c.k]) {
    const d = diff[c.k];
    card.appendChild(el("div", "kv", `<span class="k">${esc(c.label)}</span><span class="v">${esc(d.actual)} ${esc(c.unidad)} · ${d.puntos > 1 ? `${d.delta > 0 ? "+" : ""}${esc(d.delta)} desde el inicio` : "Primer registro"}</span>`));
  }
  body.append(card);
}
