// GEMELO-1 · boot.js — UI de cámara autocontenida (inyecta estilos, acoplamiento ~0).
// PRIVACIDAD: 0 frames fuera del dispositivo. Solo resúmenes de reps se encolan localmente.
import { PoseTracker } from './pose.js';
import { RepCounter, EXERCISE_SPECS } from './repCounter.js';
import { jointAngles, scoreSet, cameraView } from './formScore.js';
import { AvatarRetarget } from './retarget.js';
import { KeyEMA, visible, LM } from './angles.js';
import { isGranted, setConsent, revokeConsent, migrateLegacyConsents } from '../consents.js';

migrateLegacyConsents(); // consentimientos centralizados (incluye claves legadas)
// fases del contador → texto mostrado al usuario
const PHASE_ES = { top: 'ARRIBA', descending: 'BAJANDO', bottom: 'ABAJO', ascending: 'SUBIENDO' };
const QUEUE_KEY = 'bayona.sets_queue_v1';
const EXOS = [['squat', 'SENTADILLA'], ['press', 'PRESS MILITAR'], ['pullup', 'DOMINADAS']];

const state = {
  running: false, tracker: null, video: null, canvas: null, ctx: null,
  exercise: 'squat', counter: null, retarget: null, smooth: new KeyEMA(0.4),
  frames: [], reps: [], cueAt: new Map(), raf: 0, lastScore: null,
};

/* ---------------- estilos inyectados (sin tocar css/style.css) ---------------- */
const css = `
#bv-launch{position:fixed;right:12px;top:42%;z-index:44;
  border:1px solid var(--hair);border-radius:999px;background:var(--paper-2);color:var(--ink);
  font:600 12px/1 Manrope,system-ui;padding:11px 14px;cursor:pointer;box-shadow:0 6px 20px #00000066}
#bv-panel{position:fixed;right:12px;bottom:calc(72px + env(safe-area-inset-bottom));z-index:70;width:min(320px,92vw);
  background:var(--paper-2);border:1px solid var(--hair);border-radius:14px;box-shadow:0 12px 40px #00000088;
  padding:12px;font:14px/1.4 Manrope,system-ui;color:var(--ink)}
#bv-panel h3{margin:0 0 6px;font:800 13px/1 Archivo Black,Arial;letter-spacing:.04em}
#bv-panel .bv-row{display:flex;gap:6px;margin:6px 0}
#bv-panel button{flex:1;border:1px solid var(--hair-strong);border-radius:8px;background:var(--panel);color:var(--ink);
  font:700 11px/1 Manrope;padding:8px;cursor:pointer}
#bv-panel button.on{background:var(--acc-2);color:var(--paper-2);border-color:var(--acc-2)}
#bv-panel button.big{background:var(--ink);color:var(--paper-2);font-size:12px;padding:10px}
#bv-panel video{width:100%;border-radius:10px;transform:scaleX(-1);background:#000;display:block}
#bv-panel canvas{width:100%;border-radius:10px;margin-top:-100%;pointer-events:none}
#bv-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:8px;text-align:center}
#bv-stats b{display:block;font:700 16px/1.2 "Space Mono",monospace}
#bv-stats span{font-size:9px;letter-spacing:.08em;opacity:.65}
#bv-note{font-size:10px;opacity:.65;margin-top:6px}
`;

/* ---------------- utilidades ---------------- */
function speak(text, cueKey) {
  const now = performance.now();
  if (state.cueAt.get(cueKey) && now - state.cueAt.get(cueKey) < 8000) return;
  state.cueAt.set(cueKey, now);
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-ES'; u.rate = 1.05;
    speechSynthesis.speak(u);
  } catch { /* sin voz disponible */ }
}

/** Aviso global de fallo de almacenamiento (lo escucha la UI de privacidad/estado). */
function notifyStorageError() {
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bayona:storage-error', { detail: { module: 'vision' } }));
    }
  } catch { /* sin DOM */ }
}

/** Encola el resumen en la cola local (misma clave y forma de item que js/data/offlineQueue.js).
 *  @returns {boolean} false si no se pudo guardar (se avisa; el resumen viaja igual en el evento). */
function queueSet(summary) {
  try {
    const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    q.push({ ...summary, _key: `cam:${summary.exercise}:${summary.ts}`, _queuedAt: new Date().toISOString(), _attempts: 0 });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
    return true;
  } catch {
    // error de almacenamiento NUNCA en silencio: se avisa y el resumen viaja en el evento
    notifyStorageError();
    return false;
  }
}

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstChild;
}

/* ---------------- dibujo del esqueleto ---------------- */
const CONNS = [[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],
  [23,25],[25,27],[24,26],[26,28],[11,0],[12,0]];

/* color del aura actual (los canvas no leen variables CSS por sí solos) */
function cssVar(name, fallback) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  } catch (e) { return fallback; }
}

function drawPose(lm) {
  const { ctx, canvas, video } = state;
  if (!ctx || !video) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!lm) return;
  ctx.strokeStyle = cssVar('--acc-2', 'var(--acc-2)'); ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (const [a, b] of CONNS) {
    if (!visible(lm[a], 0.5) || !visible(lm[b], 0.5)) continue;
    ctx.beginPath();
    ctx.moveTo(lm[a].x * canvas.width, lm[a].y * canvas.height);
    ctx.lineTo(lm[b].x * canvas.width, lm[b].y * canvas.height);
    ctx.stroke();
  }
  ctx.fillStyle = cssVar('--acc-ink', 'var(--acc-ink)');
  for (const p of lm) {
    if (!visible(p, 0.6)) continue;
    ctx.beginPath();
    ctx.arc(p.x * canvas.width, p.y * canvas.height, 3, 0, 7);
    ctx.fill();
  }
}

/* ---------------- bucle principal ---------------- */
function tick() {
  if (!state.running) return;
  const t = performance.now();
  let lm = null;
  try { lm = state.tracker.detect(state.video, t); } catch { /* frame saltado */ }
  drawPose(lm);

  if (lm && visible(lm[LM.L_KNEE]) && visible(lm[LM.L_HIP])) {
    const a = state.smooth.push(jointAngles(lm));
    const ctrl = state.exercise === 'squat' ? a.knee : a.elbow;
    const r = state.counter.push(ctrl, t);
    state.retarget.apply(lm);
    state.frames.push(lm);

    if (r.rep) {
      const frames = state.frames;
      const verdict = scoreSet(state.exercise, frames, { descentMs: Math.round(r.rep.durMs / 2) });
      r.rep.score = verdict.score;
      r.rep.cues = verdict.cues;
      state.reps.push(r.rep);
      state.frames = [];
      state.lastScore = verdict.score;
      if (verdict.cues[0] && verdict.score < 85) speak(verdict.cues[0], verdict.cues[0]);
      else if (r.rep.n % 5 === 0) speak(`${r.rep.n} repeticiones`, 'count');
    }
    updateHUD(r.phase);
  } else {
    updateHUD('—');
  }
  state.raf = requestAnimationFrame(tick);
}

function updateHUD(phase) {
  const $ = (id) => document.getElementById(id);
  if ($('bv-reps')) $('bv-reps').textContent = state.reps.length;
  if ($('bv-phase')) $('bv-phase').textContent = PHASE_ES[phase] ?? String(phase).toUpperCase();
  if ($('bv-score')) $('bv-score').textContent = state.lastScore ?? '--';
  if ($('bv-rir')) $('bv-rir').textContent = state.reps.length ? `~${state.counter.rirEstimate}` : '--';
}

/* ---------------- arranque / parada ---------------- */
async function start() {
  if (!isGranted('vision')) return showConsent();
  const panel = document.getElementById('bv-panel');
  state.video = panel.querySelector('video');
  state.canvas = panel.querySelector('canvas');
  state.ctx = state.canvas.getContext('2d');

  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' }, audio: false,
    });
  } catch {
    alert('No se pudo acceder a la cámara. Revisa permisos del navegador.');
    return;
  }
  state.video.srcObject = state.stream;
  await state.video.play();
  state.canvas.width = state.video.videoWidth || 640;
  state.canvas.height = state.video.videoHeight || 480;

  if (!state.tracker) state.tracker = await new PoseTracker().init();
  state.counter = new RepCounter(state.exercise);
  state.retarget = new AvatarRetarget(window.BAYONA?.avatarRig ?? null);
  state.reps = []; state.frames = []; state.lastScore = null;
  state.running = true;
  panel.querySelector('#bv-start').textContent = '⏹ TERMINAR SERIE';
  speak('Serie iniciada', 'start');
  tick();
}

function stop() {
  state.running = false;
  cancelAnimationFrame(state.raf);
  state.stream?.getTracks().forEach((tk) => tk.stop());
  const summary = {
    exercise: state.exercise,
    ts: new Date().toISOString(),
    reps: state.reps.length,
    formScore: state.reps.length
      ? Math.round(state.reps.reduce((s, r) => s + (r.score ?? 0), 0) / state.reps.length)
      : null,
    fatiguePct: state.counter?.fatiguePct ?? 0,
    rirEstimate: state.counter?.rirEstimate ?? null,
    repDetail: state.reps.map(({ n, romDeg, durMs, velocityLossPct, score }) =>
      ({ n, romDeg, durMs, velocityLossPct, score })),
    view: state.frames.length ? cameraView(state.frames.at(-1)) : null,
  };
  const saved = queueSet(summary);
  window.dispatchEvent(new CustomEvent('bayona:set-complete', { detail: summary }));
  window.BAYONA_VISION = { lastSet: summary };
  document.querySelector('#bv-start').textContent = '▶ INICIAR SERIE';
  // honestidad: el avatar solo "ejecuta" si hay un rig realmente vinculado (bones reconocidos)
  const driven = !!(state.retarget && Object.keys(state.retarget.bones || {}).length);
  const avatarLine = driven
    ? 'Tu avatar ejecutó las repeticiones con tu movimiento (captura procesada solo en tu dispositivo).'
    : 'Avatar con rig no conectado: se han registrado solo las métricas de la serie.';
  if (saved) {
    speak(`Serie guardada: ${summary.reps} repeticiones`, 'stop');
    alert(`Serie guardada ✅\n${summary.reps} reps · técnica ${summary.formScore ?? '--'}/100\n${avatarLine}`);
  } else {
    // estado honesto: no se pudo guardar en este dispositivo
    speak(`Serie registrada: ${summary.reps} repeticiones. No se pudo guardar en este dispositivo.`, 'stop');
    alert(`Serie registrada, pero NO pudimos guardarla en este dispositivo.\n` +
      `${summary.reps} reps · técnica ${summary.formScore ?? '--'}/100\n` +
      `El resumen está en el diario mientras esta pestaña siga abierta.\n${avatarLine}`);
  }
}

/* ---------------- consentimiento (GDPR art. 9) ---------------- */
function showConsent() {
  const m = el(`<div id="bv-consent" style="position:fixed;inset:0;z-index:99;background: color-mix(in srgb, var(--paper) 53%, transparent);
    display:flex;align-items:center;justify-content:center;padding:16px">
    <div style="background: var(--paper-2); color: var(--ink); border: 1px solid var(--hair); border-radius:14px;max-width:340px;padding:18px;font:14px/1.5 Manrope">
      <h3 style="margin:0 0 8px;font:800 15px/1 Archivo Black">CÁMARA + MOVIMIENTO</h3>
      <p style="margin:0 0 10px">BAYONA analiza tu postura <b>100% en tu dispositivo</b> para contar
      repeticiones y conducir tu personaje con tu movimiento.</p>
      <ul style="margin:0 0 12px;padding-left:18px;font-size:12px">
        <li>Ningún vídeo ni foto sale de tu dispositivo</li>
        <li>Solo se guardan números (reps, ángulos, puntuación)</li>
        <li>Puedes revocarlo cuando quieras en PRIVACIDAD</li>
      </ul>
      <div style="display:flex;gap:8px">
        <button id="bv-ok" style="flex:1;background: var(--acc-2); color: var(--acc-ink); border:0;border-radius:8px;padding:10px;font-weight:700">ACEPTO Y EMPEZAMOS</button>
        <button id="bv-no" style="flex:1;background: transparent; color: var(--ink); border:1px solid var(--hair-strong);border-radius:8px;padding:10px">AHORA NO</button>
      </div>
    </div></div>`);
  document.body.appendChild(m);
  m.querySelector('#bv-ok').onclick = () => {
    // consentimiento centralizado y revocable en PRIVACIDAD; si el guardado falla, se avisa
    if (!setConsent('vision', true)) {
      notifyStorageError();
      alert('Aceptaste, pero no pudimos guardar tu permiso en este dispositivo: te lo volveremos a preguntar la próxima vez.');
    }
    m.remove();
    start();
  };
  m.querySelector('#bv-no').onclick = () => {
    revokeConsent('vision'); // denegación explícita, registrada en consents.js
    m.remove();
  };
}

/* ---------------- construcción de UI ---------------- */
function buildUI() {
  const s = el(`<style>${css}</style>`);
  document.head.appendChild(s);

  const launch = el(`<button id="bv-launch" title="GEMELO-1 · cámara">◎ CÁMARA</button>`);
  document.body.appendChild(launch);

  const panel = el(`<div id="bv-panel" hidden>
    <h3>GEMELO-1 · CONTEO CON CÁMARA</h3>
    <div class="bv-row">${EXOS.map(([id, label]) =>
      `<button data-ex="${id}" class="${id === state.exercise ? 'on' : ''}">${label}</button>`).join('')}</div>
    <div style="position:relative">
      <video playsinline muted></video>
      <canvas></canvas>
    </div>
    <div id="bv-stats">
      <div><b id="bv-reps">0</b><span>REPS</span></div>
      <div><b id="bv-phase">--</b><span>FASE</span></div>
      <div><b id="bv-score">--</b><span>TÉCNICA</span></div>
      <div><b id="bv-rir">--</b><span>RIR~</span></div>
    </div>
    <div class="bv-row"><button class="big" id="bv-start">▶ INICIAR SERIE</button></div>
    <div class="bv-row"><button id="bv-close">CERRAR</button></div>
    <div id="bv-note">🔒 Procesado local · ningún vídeo ni imagen sale de tu dispositivo (ADR-003)</div>
  </div>`);
  document.body.appendChild(panel);

  launch.onclick = () => { panel.hidden = !panel.hidden; };
  panel.querySelector('#bv-close').onclick = () => {
    if (state.running) stop();
    panel.hidden = true;
  };
  panel.querySelector('#bv-start').onclick = () => (state.running ? stop() : start());
  panel.querySelectorAll('[data-ex]').forEach((b) => {
    b.onclick = () => {
      if (state.running) return;
      state.exercise = b.dataset.ex;
      panel.querySelectorAll('[data-ex]').forEach((x) => x.classList.toggle('on', x === b));
    };
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildUI);
  else buildUI();
}

export { state as __state };
export const EXERCISE_LIST = EXOS;
export { EXERCISE_SPECS };
