// ============================================================
// BAYONA — SHOOT: render de media real (posters + demos en vídeo)
// El MISMO rig y las MISMAS poses de la app → media 100% coherente.
// ============================================================
import * as THREE from "three";
import { Avatar } from "./avatar.js";

const canvas = document.getElementById("shoot");
const ctx = canvas.getContext("2d");
const avatar = new Avatar();
avatar.group.updateWorldMatrix(true, true);

const itemsById = {};
// outfit por defecto con identidad BAYONA (naranja/negro)
avatar.setOutfit(
  { top: "ember_tee", bottom: "core_pants", shoes: "core_runners", head: null },
  {
    ember_tee: { vis: { kind: "tee", color: "#111111", accent: "#ff6a00" } },
    core_pants: { vis: { kind: "long", color: "#0a0a0a" } },
    core_runners: { vis: { color: "#f5f5f5", accent: "#ff6a00" } },
  }
);

function project(v, cx, cy, s) {
  const p = 3.4 / (3.4 + v.z);
  return { x: cx + v.x * s * p, y: cy - v.y * s * p, p };
}

function draw(t) {
  avatar.time = t;
  // evalúa la pose exacta del action actual (sin damping: determinista)
  const pose = POSE_SNAPSHOT(avatar.action, t);
  for (const name of Object.keys(avatar.bones)) {
    const tg = pose[name];
    if (tg) avatar.bones[name].rotation.set(tg[0], tg[1], tg[2]);
    else avatar.bones[name].rotation.set(0, 0, 0);
  }
  const r = pose._root || { y: 0, rx: 0 };
  avatar.root.position.y = r.y;
  avatar.root.rotation.x = r.rx;
  avatar.group.updateWorldMatrix(true, true);

  const W = canvas.width, H = canvas.height;
  // --- fondo estudio claro ---
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#ffffff"); g.addColorStop(1, "#e6e6e6");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // halo naranja suave
  const rg = ctx.createRadialGradient(W * 0.5, H * 0.55, 10, W * 0.5, H * 0.55, W * 0.5);
  rg.addColorStop(0, "rgba(255,90,0,0.10)"); rg.addColorStop(1, "rgba(255,90,0,0)");
  ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  // suelo
  ctx.strokeStyle = "rgba(20,18,16,0.15)"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(W * 0.1, H * 0.86); ctx.lineTo(W * 0.9, H * 0.86); ctx.stroke();

  const cx = W * 0.5, cy = H * 0.84, s = Math.min(W, H) * 0.42;
  const P = {}; const V = new THREE.Vector3();
  for (const name of Object.keys(avatar.bones)) {
    avatar.bones[name].getWorldPosition(V);
    P[name] = project(V, cx, cy, s);
  }

  // sombra
  ctx.fillStyle = "rgba(20,18,16,0.14)";
  ctx.beginPath(); ctx.ellipse(P.hips.x, cy + 4, s * 0.3, s * 0.05, 0, 0, Math.PI * 2); ctx.fill();

  const seg = (a, b, r, col) => {
    if (!P[a] || !P[b]) return;
    ctx.strokeStyle = col; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.lineWidth = r * 2 * s * ((P[a].p + P[b].p) / 2);
    ctx.beginPath(); ctx.moveTo(P[a].x, P[a].y); ctx.lineTo(P[b].x, P[b].y); ctx.stroke();
  };

  const skin = "#c9c9c9", top = "#111111", acc = "#ff6a00", pants = "#0a0a0a", shoe = "#f5f5f5";
  // pierna derecha (atrás)
  seg("thighR", "shinR", 0.075, pants); seg("shinR", "footR", 0.058, pants);
  seg("hips", "thighR", 0.085, pants);
  // brazo derecho (atrás)
  seg("upArmR", "foreArmR", 0.05, skin); seg("foreArmR", "handR", 0.044, skin);
  // torso
  seg("hips", "spine", 0.15, pants);
  seg("spine", "chest", 0.175, top);
  seg("chest", "neck", 0.14, top);
  seg("spine", "chest", 0.028, acc); // franja naranja
  // cabeza
  if (P.head) {
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.arc(P.head.x, P.head.y - s * 0.06 * P.head.p, s * 0.13 * P.head.p, 0, Math.PI * 2); ctx.fill();
  }
  // pierna izquierda (delante)
  seg("hips", "thighL", 0.085, pants);
  seg("thighL", "shinL", 0.075, pants); seg("shinL", "footL", 0.058, pants);
  // brazo izquierdo (delante)
  seg("upArmL", "foreArmL", 0.05, skin); seg("foreArmL", "handL", 0.044, skin);
  // zapatillas
  for (const sd of ["L", "R"]) {
    const f = P["foot" + sd]; if (!f) continue;
    ctx.fillStyle = shoe;
    ctx.beginPath(); ctx.ellipse(f.x, f.y + s * 0.02, s * 0.07, s * 0.034, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = acc;
    ctx.beginPath(); ctx.ellipse(f.x, f.y + s * 0.02, s * 0.07, s * 0.012, 0, 0, Math.PI * 2); ctx.fill();
  }
}

// snapshot determinista de pose (copiado del sistema POSES de avatar.js)
import { poseSnapshot } from "./avatar.js";
const POSE_SNAPSHOT = poseSnapshot;

// ---------- API ----------
window.SHOOT = {
  poster(action, phase = 0) {
    avatar.setAction(action);
    const cycle = 2 * Math.PI; // periodo estándar
    draw(phase * cycle);
    return canvas.toDataURL("image/png");
  },
  record(action, seconds = 2.4) {
    avatar.setAction(action);
    return new Promise((resolve) => {
      const stream = canvas.captureStream(30);
      const rec = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8", videoBitsPerSecond: 900000 });
      const chunks = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result.split(",")[1]);
        fr.readAsDataURL(blob);
      };
      rec.start();
      const t0 = performance.now();
      let simT = 0;
      const step = (now) => {
        const el = (now - t0) / 1000;
        simT = el;
        draw(simT * 1.8); // velocidad de la demo
        if (el < seconds) requestAnimationFrame(step);
        else { draw(0); setTimeout(() => rec.stop(), 120); }
      };
      requestAnimationFrame(step);
    });
  },
  // genera link de descarga para extraer el vídeo sin truncar base64
  async exportTo(filename, action, seconds = 2.4) {
    const b64 = await window.SHOOT.record(action, seconds);
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([arr], { type: "video/webm" }));
    const a = document.createElement("a");
    a.id = "dl"; a.href = url; a.download = filename;
    document.body.appendChild(a);
    window.DL_READY = true;
    return filename + ":" + arr.length;
  },
};

window.SHOOT_READY = true;
