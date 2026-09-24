// Salud · healthUI.js — cuestionario MAPA DE SALUD autocontenido (inyecta estilos, acoplamiento ~0).
// Cribado (screening), NUNCA diagnóstico. Datos 100% locales; se guardan SOLO con consentimiento
// centralizado (js/consents.js). Todo texto aportado por el usuario se pinta escapado con esc().
import { PAR_Q_ITEMS, buildHealthMap } from './healthMap.js';
import { esc } from '../i18n.js';
import { isGranted, setConsent, revokeConsent, migrateLegacyConsents } from '../consents.js';

// Consentimientos centralizados: migra claves antiguas (incluida la clave rota '***') al arrancar.
migrateLegacyConsents();

const STORE_KEY = 'bayona.healthmap_v1';
const FREQ = ['Nada', 'Varios días', 'Más de la mitad de los días', 'Casi cada día'];
const ZONES = ['hombro', 'espalda baja', 'rodilla', 'cadera', 'codo', 'muñeca', 'tobillo', 'cuello'];
const SEV = ['sin dolor', 'leve', 'moderado', 'intenso'];
const GOALS = ['Fuerza', 'Hipertrofia', 'Pérdida de grasa', 'Resistencia', 'Movilidad', 'Salud general', 'Volver a entrenar'];

/* ===================== lógica pura (testeable en node) ===================== */

/**
 * Estado del formulario → entrada de buildHealthMap (defaults seguros).
 * @param {{parq?:object, phq2?:object, gad2?:object, pains?:Array, goals?:Array}} form
 */
export function formToInput(form = {}) {
  const pains = (form.pains || [])
    .filter((p) => p && p.zone && Number(p.severity) > 0)
    .map((p) => ({ zone: String(p.zone).trim(), severity: Math.max(0, Math.min(3, Number(p.severity) | 0)) }));
  return {
    parq: form.parq || {},
    phq2: { interest: 0, mood: 0, selfHarm: 0, ...(form.phq2 || {}) },
    gad2: { nervous: 0, worry: 0, ...(form.gad2 || {}) },
    pains,
    goals: (form.goals || []).map((g) => String(g).trim()).filter(Boolean),
  };
}

/**
 * Health Map → tarjeta de veredicto para la UI.
 * @param {object} hm salida de buildHealthMap
 * @returns {{tone:'ok'|'warn'|'stop', title:string, lines:string[], crisis:boolean}}
 */
export function verdict(hm = {}) {
  const flags = hm.redFlags || [];
  const crisis = flags.some((f) => f.domain === 'mental' && /ideaci|autoles/i.test(f.source || ''));
  let tone = 'ok', title = 'LISTO PARA EMPEZAR ✓';
  if (hm.clearance === 'refer_required') { tone = 'stop'; title = 'VALORACIÓN MÉDICA ANTES DE ENTRENAR ✕'; }
  else if (flags.length || hm.clearance === 'conditional') { tone = 'warn'; title = 'ENTRENAR CON MODIFICACIONES ▲'; }

  const lines = [];
  if (hm.parq?.note) lines.push(hm.parq.note);
  for (const f of flags) lines.push(`Bandera ${crisis && f.domain === 'mental' ? 'roja' : 'de seguimiento'} · ${DOMAIN_ES[f.domain] || f.domain}: ${f.source}`);
  for (const p of (hm.activePain || []).slice(0, 3)) lines.push(p.action);
  for (const p of (hm.priorities || []).slice(0, 4)) lines.push(p);
  return { tone, title, lines, crisis };
}

/** Validación por paso: true si el paso está completo. */
export function stepComplete(step, form = {}) {
  switch (step) {
    case 0: return PAR_Q_ITEMS.every((it) => typeof (form.parq || {})[it.id] === 'boolean');
    case 1: {
      const p = form.phq2 || {};
      return [p.interest, p.mood, p.selfHarm].every((v) => Number.isInteger(v) && v >= 0 && v <= 3);
    }
    case 2: {
      const g = form.gad2 || {};
      return [g.nervous, g.worry].every((v) => Number.isInteger(v) && v >= 0 && v <= 3);
    }
    case 3: return true; // body-map opcional: 0 zonas = sin dolor
    case 4: return true; // objetivos opcionales
    default: return false;
  }
}

/* ===================== UI autoinyectada ===================== */

const css = `
#bh-launch{position:fixed;right:22px;top:50%;z-index:44;
  border:1px solid var(--hair-strong);border-radius:2px;background:var(--paper-2);color:var(--ink);
  font:600 12px/1 Manrope,system-ui;padding:11px 14px;cursor:pointer;box-shadow:0 6px 20px #00000066}
#bh-panel{position:fixed;right:22px;bottom:calc(120px + env(safe-area-inset-bottom));z-index:70;width:min(360px,calc(100vw - 44px));
  max-height:min(78vh,640px);display:flex;flex-direction:column;
  background:var(--paper-2);border:1px solid var(--hair);border-radius:14px;box-shadow:0 12px 40px #00000088;
  padding:14px;font:14px/1.45 Manrope,system-ui;color:var(--ink)}
#bh-panel h3{margin:0 0 2px;font:800 14px/1.1 Archivo Black,Arial;letter-spacing:.04em}
#bh-panel .bh-sub{font-size:10px;letter-spacing:.08em;opacity:.6;margin-bottom:8px}
#bh-body{overflow:auto;flex:1;padding-right:2px}
#bh-q{margin:0 0 4px;font-weight:700;font-size:13px}
#bh-item{margin:0 0 12px}
#bh-panel .bh-row{display:flex;gap:5px;margin:5px 0;flex-wrap:wrap}
#bh-panel button{border:1px solid var(--hair-strong);border-radius:8px;background:var(--panel);color:var(--ink);
  font:700 11px/1 Manrope;padding:8px 9px;cursor:pointer}
#bh-panel button.on{background:var(--acc-2);color:var(--paper-2);border-color:var(--acc-2)}
#bh-panel button.big{background:var(--ink);color:var(--paper-2);font-size:12px;padding:10px}
#bh-panel button.ghost{background:transparent}
#bh-nav{display:flex;gap:6px;margin-top:10px}
#bh-nav button{flex:1;padding:10px}
#bh-note{font-size:10px;opacity:.65;margin-top:8px}
#bh-panel select,#bh-panel input[type=text]{width:100%;border:1px solid var(--hair);border-radius:2px;
  padding:7px;font:12px Manrope;background:var(--paper-2);margin-top:4px}
#bh-verdict{border:1px solid var(--hair);border-radius:2px;padding:10px;margin:6px 0;font-size:12px}
#bh-verdict.ok{background:var(--acc-soft);border-color:var(--acc-2)}
#bh-verdict.warn{background:var(--cream);border-color:var(--hair-strong)}
#bh-verdict.stop{background:var(--acc-2);border-color:var(--acc-2);color:var(--acc-ink)}
#bh-verdict ul{margin:6px 0 0;padding-left:16px}
#bh-crisis{background:var(--acc-2);color:var(--acc-ink);border-radius:2px;padding:10px;margin:6px 0;font-size:12px}
`;

const state = { step: 0, form: { parq: {}, phq2: {}, gad2: {}, pains: [], goals: [] }, result: null };
const STEPS = ['PAR-Q+', 'ÁNIMO (PHQ-2)', 'ANSIEDAD (GAD-2)', 'MAPA DE DOLOR', 'OBJETIVOS', 'RESULTADO'];

// dominios de bandera → texto mostrado (los valores internos no cambian)
const DOMAIN_ES = { mental: 'mente', ansiedad: 'ansiedad', 'cardio-metabolico': 'cardio-metabólico' };

/** Aviso global de fallo de localStorage (lo escucha la UI de privacidad/estado). */
function notifyStorageError() {
  if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bayona:storage-error', { detail: { module: 'health' } }));
  }
}

/**
 * Guarda el registro de salud SOLO con consentimiento (dominio 'health' de consents.js).
 * @returns {{ok:boolean, reason:null|'sin-permiso'|'error'}}
 */
function saveRecord(input) {
  if (!isGranted('health')) return { ok: false, reason: 'sin-permiso' };
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ ...input, savedAt: new Date().toISOString() }));
    return { ok: true, reason: null };
  } catch {
    // almacenamiento lleno/bloqueado: se avisa y se muestra estado honesto
    notifyStorageError();
    return { ok: false, reason: 'error' };
  }
}

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstChild;
}

function optRow(name, labels, value, onPick) {
  const row = el(`<div class="bh-row"></div>`);
  labels.forEach((lab, i) => {
    const b = el(`<button type="button">${esc(lab)}</button>`);
    if (value === i) b.classList.add('on');
    b.onclick = () => { onPick(i); render(); };
    row.appendChild(b);
  });
  return row;
}

function freqBlock(question, key, obj) {
  const wrap = el(`<div id="bh-item"><p id="bh-q">${esc(question)}</p></div>`);
  wrap.appendChild(optRow(key, FREQ.map((f, i) => `${i}·${f}`), obj[key], (v) => { obj[key] = v; }));
  return wrap;
}

/* ---------- pasos ---------- */
function stepParq() {
  const frag = document.createDocumentFragment();
  for (const it of PAR_Q_ITEMS) {
    const wrap = el(`<div id="bh-item"><p id="bh-q">${esc(it.q)}</p></div>`);
    const row = el(`<div class="bh-row"></div>`);
    for (const [lab, val] of [['NO', false], ['SÍ', true]]) {
      const b = el(`<button type="button">${lab}</button>`);
      if (state.form.parq[it.id] === val && state.form.parq[it.id] !== undefined) b.classList.add('on');
      b.onclick = () => { state.form.parq[it.id] = val; render(); };
      row.appendChild(b);
    }
    wrap.appendChild(row);
    frag.appendChild(wrap);
  }
  return frag;
}

function stepPhq2() {
  const frag = document.createDocumentFragment();
  frag.appendChild(freqBlock('Durante las últimas 2 semanas, ¿con qué frecuencia te ha costado el interés o el placer en las cosas?', 'interest', state.form.phq2));
  frag.appendChild(freqBlock('…¿te has sentido decaído/a, deprimido/a o sin esperanza?', 'mood', state.form.phq2));
  frag.appendChild(freqBlock('¿Has pensado en estarías mejor muerto/a o en hacerte daño? (seguridad)', 'selfHarm', state.form.phq2));
  frag.appendChild(el(`<p id="bh-note">Cualquier respuesta distinta de «Nada» en la última pregunta activa apoyo inmediato. Esto es un cribado, no un diagnóstico.</p>`));
  return frag;
}

function stepGad2() {
  const frag = document.createDocumentFragment();
  frag.appendChild(freqBlock('Durante las últimas 2 semanas, ¿con qué frecuencia te has sentido nervioso/a, ansioso/a o al límite?', 'nervous', state.form.gad2));
  frag.appendChild(freqBlock('…¿has sido incapaz de parar o controlar tus preocupaciones?', 'worry', state.form.gad2));
  return frag;
}

function stepPains() {
  const frag = document.createDocumentFragment();
  frag.appendChild(el(`<p id="bh-note">Marca el dolor ACTUAL por zona (0 = nada). Zona no listada: añádela abajo.</p>`));
  const all = [...ZONES, ...state.form.pains.map((p) => p.zone).filter((z) => !ZONES.includes(z))];
  for (const zone of all) {
    const cur = state.form.pains.find((p) => p.zone === zone);
    const wrap = el(`<div id="bh-item"><p id="bh-q">${esc(zone)}</p></div>`);
    wrap.appendChild(optRow(zone, SEV.map((s, i) => `${i}·${s}`), cur?.severity ?? 0, (v) => {
      state.form.pains = state.form.pains.filter((p) => p.zone !== zone);
      if (v > 0) state.form.pains.push({ zone, severity: v });
    }));
    frag.appendChild(wrap);
  }
  const add = el(`<div id="bh-item"><input type="text" id="bh-newzone" placeholder="+ otra zona (ej. codo derecho)"></div>`);
  add.querySelector('input').onchange = (e) => {
    const z = e.target.value.trim();
    if (z && !all.includes(z)) { state.form.pains.push({ zone: z, severity: 1 }); e.target.value = ''; render(); }
  };
  frag.appendChild(add);
  return frag;
}

function stepGoals() {
  const frag = document.createDocumentFragment();
  frag.appendChild(el(`<p id="bh-note">Elige tus objetivos principales (multiselección).</p>`));
  const row = el(`<div class="bh-row"></div>`);
  for (const g of GOALS) {
    const b = el(`<button type="button">${g}</button>`);
    if (state.form.goals.includes(g)) b.classList.add('on');
    b.onclick = () => {
      state.form.goals = state.form.goals.includes(g)
        ? state.form.goals.filter((x) => x !== g)
        : [...state.form.goals, g];
      render();
    };
    row.appendChild(b);
  }
  frag.appendChild(row);
  return frag;
}

function stepResult() {
  const input = formToInput(state.form);
  const hm = buildHealthMap(input);
  state.result = hm;
  const v = verdict(hm);
  const save = saveRecord(input); // SOLO con consentimiento 'health' centralizado
  if (typeof window !== 'undefined') {
    window.BAYONA_HEALTH = { map: hm, verdict: v };
    window.dispatchEvent(new CustomEvent('bayona:healthmap', { detail: hm }));
  }

  const frag = document.createDocumentFragment();
  if (v.crisis) {
    frag.appendChild(el(`<div id="bh-crisis"><b>NO ESTÁS SOLO/A.</b> Has marcado pensamientos de hacerte daño.
      Habla con alguien hoy: <b>024</b> (línea conducta suicida, 24 h, ES) o <b>112</b> emergencias.
      BAYONA no entrenará intensidad hasta que un profesional te acompañe.</div>`));
  }
  // OJO: v.title y v.lines contienen texto del usuario (zonas, objetivos) → siempre escapado
  const card = el(`<div id="bh-verdict" class="${esc(v.tone)}"><b>${esc(v.title)}</b><ul>${v.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></div>`);
  frag.appendChild(card);

  // estado honesto del guardado (sin tragarnos errores de almacenamiento)
  const note = document.createElement('p');
  note.id = 'bh-note';
  const setNote = () => {
    if (save.ok) {
      note.textContent = 'Cribado de salud · revisión recomendada cada trimestre o si cambia tu salud. Guardado solo en este dispositivo. «Repetir» reinicia el cuestionario.';
    } else if (save.reason === 'sin-permiso') {
      note.textContent = 'Tus respuestas NO se han guardado todavía: solo se guardan en este dispositivo con tu permiso.';
    } else {
      note.textContent = 'No pudimos guardar en este dispositivo. Tus respuestas viven solo en esta pestaña hasta que haya espacio.';
    }
  };
  setNote();
  frag.appendChild(note);

  const nav = el(`<div id="bh-nav"></div>`);
  if (!save.ok && save.reason === 'sin-permiso') {
    const allow = el(`<button type="button">GUARDAR EN ESTE DISPOSITIVO</button>`);
    allow.onclick = () => {
      if (!setConsent('health', true)) notifyStorageError(); // write falló → aviso global
      const retry = saveRecord(input);
      save.ok = retry.ok; save.reason = retry.reason;
      setNote();
      allow.remove();
    };
    nav.appendChild(allow);
  }
  const again = el(`<button class="big" type="button">REPETIR EVALUACIÓN</button>`);
  again.onclick = () => {
    state.form = { parq: {}, phq2: {}, gad2: {}, pains: [], goals: [] };
    state.step = 0; state.result = null; render();
  };
  nav.appendChild(again);
  const forget = el(`<button class="ghost" type="button">OLVIDAR MIS DATOS DE SALUD</button>`);
  forget.onclick = () => {
    revokeConsent('health');
    try {
      localStorage.removeItem(STORE_KEY);
    } catch {
      notifyStorageError();
    }
    save.ok = false; save.reason = 'sin-permiso';
    note.textContent = 'Tus datos de salud se han borrado de este dispositivo.';
  };
  nav.appendChild(forget);
  frag.appendChild(nav);
  return frag;
}

const RENDERERS = [stepParq, stepPhq2, stepGad2, stepPains, stepGoals, stepResult];

function render() {
  const body = document.getElementById('bh-body');
  const sub = document.getElementById('bh-sub');
  if (!body) return;
  sub.textContent = `PASO ${Math.min(state.step + 1, STEPS.length)}/${STEPS.length} · ${STEPS[state.step]}`;
  body.innerHTML = '';
  body.appendChild(RENDERERS[state.step]());

  let nav = document.getElementById('bh-nav');
  if (nav) nav.remove();
  if (state.step >= STEPS.length - 1) return;

  nav = el(`<div id="bh-nav"></div>`);
  if (state.step > 0) {
    const back = el(`<button class="ghost" type="button">← ATRÁS</button>`);
    back.onclick = () => { state.step--; render(); };
    nav.appendChild(back);
  }
  const next = el(`<button class="big" type="button">${state.step === STEPS.length - 2 ? 'VER RESULTADO →' : 'SIGUIENTE →'}</button>`);
  next.onclick = () => {
    if (!stepComplete(state.step, state.form)) {
      alert('Responde todas las preguntas de este paso para continuar.');
      return;
    }
    state.step++;
    render();
  };
  nav.appendChild(next);
  document.getElementById('bh-panel').appendChild(nav);
}

/* ---------- montaje ---------- */
function buildUI() {
  document.head.appendChild(el(`<style>${css}</style>`));
  const launch = el(`<button id="bh-launch" type="button">✚ MAPA DE SALUD</button>`);
  launch.onclick = () => {
    let panel = document.getElementById('bh-panel');
    if (panel) { panel.remove(); return; }
    panel = el(`<div id="bh-panel">
      <h3>MAPA DE SALUD</h3>
      <div class="bh-sub" id="bh-sub"></div>
      <div id="bh-body"></div>
    </div>`);
    document.body.appendChild(panel);
    render();
  };
  document.body.appendChild(launch);
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildUI, { once: true });
  else buildUI();
}
