// ============================================================
// BAYONA — MOVIMIENTO LIBRE DEL PERSONAJE
// "Que la persona pueda mover al personaje como quiera":
//   · CLIC / TOQUE en el suelo  → el personaje CAMINA ahí
//   · WASD / FLECHAS            → caminar relativo a la cámara (SHIFT = correr)
//   · ARRASTRAR                 → orbitar la cámara alrededor del personaje
//   · RUEDA                     → acercar / alejar
//   · JOYSTICK virtual (móvil)  → el mismo movimiento continuo
// El orbe CORE sigue siendo clicable (abre el chat).
// ============================================================
import { UI, openSection } from "./ui/shared.js";

const KEYMAP = {
  KeyW: [0, 1], ArrowUp: [0, 1],
  KeyS: [0, -1], ArrowDown: [0, -1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
};

let started = false;

function attach() {
  if (started) return true;
  const W = UI.W;
  const canvas = document.getElementById("scene");
  if (!W || !canvas) return false;
  started = true;

  // ---------- teclado ----------
  const held = new Set();
  const syncKeys = () => {
    let x = 0, z = 0;
    for (const code of held) {
      const v = KEYMAP[code];
      if (v) { x += v[0]; z += v[1]; }
    }
    W.speedRun = held.has("ShiftLeft") || held.has("ShiftRight");
    W.setInput(x, z);
    if (x || z) dimHint();
  };
  addEventListener("keydown", (e) => {
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
    if (!KEYMAP[e.code]) return;
    e.preventDefault();
    held.add(e.code);
    syncKeys();
  });
  addEventListener("keyup", (e) => {
    if (!KEYMAP[e.code]) return;
    held.delete(e.code);
    syncKeys();
  });
  addEventListener("blur", () => { held.clear(); syncKeys(); });

  // ---------- puntero: clic = caminar · arrastrar = cámara ----------
  let down = null, dragged = false;
  canvas.style.touchAction = "none";
  canvas.addEventListener("pointerdown", (e) => {
    down = { x: e.clientX, y: e.clientY, id: e.pointerId };
    dragged = false;
    canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!down) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (!dragged && Math.hypot(dx, dy) > 7) dragged = true;
    if (dragged) {
      W.orbitBy(-dx * 0.005, dy * 0.003);
      down.x = e.clientX; down.y = e.clientY;
      dimHint();
    }
  });
  canvas.addEventListener("pointerup", (e) => {
    const wasDrag = dragged;
    down = null; dragged = false;
    if (wasDrag) return;
    // ¿clic en el orbe CORE? → chat. Si no: camina al punto.
    const x = (e.clientX / innerWidth) * 2 - 1;
    const y = -(e.clientY / innerHeight) * 2 + 1;
    if (W.raycastNDC && W.raycastNDC(x, y, [W.core.group]).length) {
      openSection("core");
      return;
    }
    const hit = W.screenToFloor(e.clientX, e.clientY);
    if (hit) {
      W.moveTo(hit);
      marker(e.clientX, e.clientY);
      dimHint();
    }
  });
  canvas.addEventListener("pointercancel", () => { down = null; dragged = false; });

  // ---------- zoom ----------
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    W.zoomBy(1 + Math.sign(e.deltaY) * 0.08);
    dimHint();
  }, { passive: false });

  // ---------- joystick virtual ----------
  const stick = document.getElementById("stick");
  if (stick) {
    const nub = stick.querySelector("i");
    let sid = null;
    const setNub = (x, y) => { if (nub) nub.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`; };
    stick.addEventListener("pointerdown", (e) => {
      sid = e.pointerId;
      stick.setPointerCapture?.(sid);
    });
    stick.addEventListener("pointermove", (e) => {
      if (sid !== e.pointerId) return;
      const r = stick.getBoundingClientRect();
      let dx = e.clientX - (r.left + r.width / 2);
      let dy = e.clientY - (r.top + r.height / 2);
      const max = r.width * 0.34;
      const len = Math.hypot(dx, dy);
      if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max; }
      setNub(dx, dy);
      W.setInput(dx / max, -dy / max);
      W.speedRun = len > max * 0.92;
      dimHint();
    });
    const end = (e) => {
      if (sid !== e.pointerId) return;
      sid = null;
      setNub(0, 0);
      W.setInput(0, 0);
      W.speedRun = false;
    };
    stick.addEventListener("pointerup", end);
    stick.addEventListener("pointercancel", end);
  }

  console.log("%cBAYONA · MOVIMIENTO LIBRE ACTIVO", "color:#ff6a00");
  return true;
}

// anillo de destino en el punto exacto del clic
function marker(cx, cy) {
  const m = document.createElement("div");
  m.style.cssText = `position:fixed;z-index:12;pointer-events:none;left:${cx}px;top:${cy}px;width:26px;height:26px;
    margin:-13px 0 0 -13px;border-radius:50%;border:2px solid var(--acc-2,#ff6a00);
    transition:transform .5s cubic-bezier(.16,1,.3,1),opacity .6s ease;transform:scale(.4);opacity:.9`;
  document.body.appendChild(m);
  requestAnimationFrame(() => { m.style.transform = "scale(1.7)"; m.style.opacity = "0"; });
  setTimeout(() => m.remove(), 700);
}

// pista de controles: se apaga con el primer uso
let hintDimmed = false;
function dimHint() {
  if (hintDimmed) return;
  hintDimmed = true;
  document.getElementById("move-hint")?.classList.add("dim");
}

// arranque tolerante: se engancha en cuanto el mundo existe
(function boot() {
  if (attach()) return;
  let tries = 0;
  const tick = () => {
    if (attach()) return;
    if (tries++ < 200) setTimeout(tick, 100);
  };
  if (typeof window !== "undefined") {
    window.addEventListener("bayona:world-ready", () => attach());
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tick);
    else tick();
  }
})();

export { attach as attachMovement };
