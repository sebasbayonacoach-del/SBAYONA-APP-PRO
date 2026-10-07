// ============================================================
// BAYONA — LOW-END FALLBACK (spec §57)
// Si WebGL no está disponible el personaje NO desaparece:
// se renderiza en 2.5D desde el MISMO rig y las MISMAS poses.
// ============================================================
import * as THREE from "three";

const JOINTS = [
  ["hips", "spine", 0.16], ["spine", "chest", 0.17], ["chest", "neck", 0.15],
  ["neck", "head", 0.06],
  ["chest", "clavL", 0.07], ["clavL", "upArmL", 0.06], ["upArmL", "foreArmL", 0.05],
  ["foreArmL", "handL", 0.045],
  ["chest", "clavR", 0.07], ["clavR", "upArmR", 0.06], ["upArmR", "foreArmR", 0.05],
  ["foreArmR", "handR", 0.045],
  ["hips", "thighL", 0.08], ["thighL", "shinL", 0.07], ["shinL", "footL", 0.06],
  ["hips", "thighR", 0.08], ["thighR", "shinR", 0.07], ["shinR", "footR", 0.06],
];

const ENV_ART = {
  home:     { top: "#ffffff", bottom: "#e8e8e8", glow: "#F4A261", deco: "window" },
  gym:      { top: "#f0f0f0", bottom: "#dcdcdc", glow: "#F4A261", deco: "neon" },
  kitchen:  { top: "#ffffff", bottom: "#ececec", glow: "#F4A261", deco: "counter" },
  recovery: { top: "#f0f0f0", bottom: "#e0e0e0", glow: "#F4A261", deco: "panels" },
  mind:     { top: "#fafafa", bottom: "#ececec", glow: "#F4A261", deco: "halo" },
  lab:      { top: "#f0f0f0", bottom: "#e4e4e4", glow: "#F4A261", deco: "charts" },
  locker:   { top: "#ececec", bottom: "#dcdcdc", glow: "#F4A261", deco: "lockers" },
};

export class Fallback2D {
  constructor(oldCanvas, avatar) {
    this.avatar = avatar;
    this.canvas = document.createElement("canvas");
    this.canvas.id = "scene";
    oldCanvas.replaceWith(this.canvas);
    this.ctx = this.canvas.getContext("2d");
    this.env = "home";
    this.coreScreen = { x: 0, y: 0 };
    this.lastCore = null;
    this.reducedMotion = false;
    this.resize();
    addEventListener("resize", () => this.resize());
  }

  resize() {
    this.canvas.width = innerWidth * Math.min(devicePixelRatio, 2);
    this.canvas.height = innerHeight * Math.min(devicePixelRatio, 2);
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
  }

  project(v, cx, cy, s) {
    const persp = 3.4 / (3.4 + v.z);
    return { x: cx + v.x * s * persp, y: cy - v.y * s * persp, p: persp };
  }

  draw(t, core) {
    const ctx = this.ctx;
    const dpr = Math.min(devicePixelRatio, 2);
    const w = this.canvas.width / dpr, h = this.canvas.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // ---- environment art ----
    const E = ENV_ART[this.env] || ENV_ART.home;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, E.top); g.addColorStop(1, E.bottom);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h * 0.72, s = Math.min(w, h) * 0.34;

    // ambient glow
    const rg = ctx.createRadialGradient(cx, cy - s * 0.6, 10, cx, cy - s * 0.6, s * 2.2);
    rg.addColorStop(0, E.glow + "18"); rg.addColorStop(1, "transparent");
    ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(22,19,15,0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, cy + 6); ctx.lineTo(w, cy + 6); ctx.stroke();
    this.deco(ctx, E.deco, w, h, s, cx, cy, t);

    // ---- avatar from the same rig ----
    this.avatar.group.updateWorldMatrix(true, true);
    const P = {};
    const V = new THREE.Vector3();
    for (const name of Object.keys(this.avatar.bones)) {
      this.avatar.bones[name].getWorldPosition(V);
      P[name] = this.project(V, cx, cy, s);
    }
    const style = this.avatar.styleInfo || {};
    const skin = this.avatar.skinTone || "#c9c9c9";
    const topCol = style.top?.color || "#111111";
    const botCol = style.bottom?.color || "#0a0a0a";
    const shoeCol = style.shoes?.color || "#f5f5f5";

    // ground shadow
    const hip = P.hips;
    ctx.fillStyle = "rgba(22,19,15,0.16)";
    ctx.beginPath();
    ctx.ellipse(hip.x, cy + 4, s * 0.3, s * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();

    const seg = (a, b, r, col) => {
      if (!P[a] || !P[b]) return;
      ctx.strokeStyle = col; ctx.lineCap = "round";
      ctx.lineWidth = r * 2 * s * ((P[a].p + P[b].p) / 2);
      ctx.beginPath(); ctx.moveTo(P[a].x, P[a].y); ctx.lineTo(P[b].x, P[b].y); ctx.stroke();
    };

    // back limbs (darker)
    const dk = (col) => {
      const c = document.createElement("canvas").getContext("2d");
      c.fillStyle = col; c.fillRect(0, 0, 1, 1);
      return col;
    };
    // legs
    const legCol = style.bottom?.kind === "short" ? skin : botCol;
    seg("thighR", "shinR", 0.075, legCol); seg("shinR", "footR", 0.058, style.bottom?.kind === "short" ? skin : botCol);
    seg("hips", "thighR", 0.085, botCol);
    // right arm behind torso
    const sleeve = style.top?.kind === "jacket" ? topCol : skin;
    seg("upArmR", "foreArmR", 0.05, sleeve); seg("foreArmR", "handR", 0.044, style.top?.kind === "jacket" ? topCol : skin);

    // torso
    seg("hips", "spine", 0.15, botCol);
    seg("spine", "chest", 0.175, topCol);
    seg("chest", "neck", 0.14, topCol);
    // accent stripe
    seg("spine", "chest", 0.03, style.top?.accent || "#F4A261");

    // head + cara real del usuario
    if (P.head) {
      const fr = s * 0.15 * P.head.p;
      ctx.fillStyle = skin;
      ctx.beginPath(); ctx.arc(P.head.x, P.head.y - s * 0.06 * P.head.p, s * 0.13 * P.head.p, 0, Math.PI * 2); ctx.fill();
      if (this.avatar.faceImg) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(P.head.x, P.head.y - s * 0.06 * P.head.p, s * 0.125 * P.head.p, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(this.avatar.faceImg, P.head.x - fr, P.head.y - s * 0.06 * P.head.p - fr, fr * 2, fr * 2);
        ctx.restore();
      }
      if (style.head?.kind === "cap") {
        ctx.fillStyle = style.head.color || "#111111";
        ctx.beginPath(); ctx.arc(P.head.x, P.head.y - s * 0.09 * P.head.p, s * 0.13 * P.head.p, Math.PI, 0); ctx.fill();
      } else if (style.head?.kind === "headphones") {
        ctx.strokeStyle = style.head.color || "#2b2b2b"; ctx.lineWidth = s * 0.03;
        ctx.beginPath(); ctx.arc(P.head.x, P.head.y - s * 0.06 * P.head.p, s * 0.15 * P.head.p, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      }
    }

    // front leg + arm
    seg("hips", "thighL", 0.085, botCol);
    seg("thighL", "shinL", 0.075, legCol); seg("shinL", "footL", 0.058, style.bottom?.kind === "short" ? skin : botCol);
    seg("upArmL", "foreArmL", 0.05, sleeve); seg("foreArmL", "handL", 0.044, style.top?.kind === "jacket" ? topCol : skin);

    // shoes
    for (const sd of ["L", "R"]) {
      const f = P["foot" + sd];
      if (!f) continue;
      ctx.fillStyle = shoeCol;
      ctx.beginPath(); ctx.ellipse(f.x, f.y + s * 0.02, s * 0.07, s * 0.035, 0, 0, Math.PI * 2); ctx.fill();
    }

    // effects aura
    if (style.effects) {
      ctx.strokeStyle = style.effects.color + "cc"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(hip.x, cy, s * 0.42, s * 0.09, 0, 0, Math.PI * 2); ctx.stroke();
    }

    // ---- CORE companion ----
    if (core) {
      const cp = this.project(core.group.position, cx, cy, s);
      this.coreScreen = cp;
      const mood = core.mood === "alert" ? "#F4A261" : core.mood === "gold" ? "#F4A261" : "#111111";
      const puls = 1 + Math.sin(t * 2.4) * 0.1;
      const gg = ctx.createRadialGradient(cp.x, cp.y, 1, cp.x, cp.y, s * 0.14 * puls);
      gg.addColorStop(0, mood); gg.addColorStop(0.35, mood + "66"); gg.addColorStop(1, "transparent");
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.arc(cp.x, cp.y, s * 0.14 * puls, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(cp.x, cp.y, s * 0.03, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#F4A261"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(cp.x, cp.y, s * 0.09, s * 0.03, t, 0, Math.PI * 2); ctx.stroke();
    }
  }

  deco(ctx, kind, w, h, s, cx, cy, t) {
    ctx.save();
    if (kind === "window") {
      ctx.fillStyle = "rgba(255,207,138,0.35)";
      ctx.fillRect(w * 0.12, h * 0.18, w * 0.14, h * 0.3);
    } else if (kind === "neon") {
      ctx.fillStyle = "rgba(232,80,10,0.85)";
      ctx.fillRect(w * 0.1, h * 0.2, w * 0.8, 2);
      ctx.strokeStyle = "rgba(22,19,15,0.1)";
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(w * 0.85, cy - s * 0.3, s * (0.1 + i * 0.05), 0, Math.PI * 2); ctx.stroke(); }
    } else if (kind === "counter") {
      ctx.fillStyle = "rgba(22,19,15,0.06)";
      ctx.fillRect(w * 0.05, cy - s * 0.5, w * 0.3, s * 0.5);
    } else if (kind === "panels") {
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = "rgba(22,19,15,0.07)";
        ctx.fillRect(w * (0.15 + i * 0.28), h * 0.2, w * 0.12, h * 0.22);
      }
    } else if (kind === "halo") {
      ctx.strokeStyle = "rgba(232,80,10,0.25)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy - s * 0.7, s * 0.9, 0, Math.PI * 2); ctx.stroke();
    } else if (kind === "charts") {
      for (let i = 0; i < 12; i++) {
        const bh = s * (0.1 + Math.abs(Math.sin(i * 1.7 + t * 0.4)) * 0.35);
        ctx.fillStyle = i % 3 === 0 ? "rgba(232,80,10,0.75)" : "rgba(22,19,15,0.5)";
        ctx.fillRect(w * 0.08 + i * w * 0.075, cy - s * 0.9 + (s * 0.5 - bh), w * 0.03, bh);
      }
    } else if (kind === "lockers") {
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = i % 2 ? "rgba(22,19,15,0.08)" : "rgba(22,19,15,0.14)";
        ctx.fillRect(w * 0.05 + i * w * 0.115, h * 0.16, w * 0.1, h * 0.34);
      }
    }
    ctx.restore();
  }

  coreHit(x, y) {
    const dx = x - this.coreScreen.x, dy = y - this.coreScreen.y;
    return Math.sqrt(dx * dx + dy * dy) < 50;
  }
}
