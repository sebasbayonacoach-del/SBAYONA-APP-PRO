// ============================================================
// BAYONA — PERSISTENT AVATAR
// Procedural humanoid: rig + pose system + modular equipment.
// El personaje viaja contigo por toda la aplicación.
// ============================================================
import * as THREE from "three";

const SKIN_TONES = ["#e0e0e0", "#c9c9c9", "#a6a6a6", "#808080", "#5c5c5c", "#3a3a3a"];
const CAP = 1.6; // radians blend cap

function damp(cur, target, lambda, dt) {
  return THREE.MathUtils.damp(cur, target, lambda, dt);
}

// ------------------------------------------------------------
// POSES — every pose returns { boneName: [rx, ry, rz], _root: {y, rx} }
// Bones point DOWN (-Y) except spine/chest/neck/head (up).
// ------------------------------------------------------------
const POSES = {
  idle: (t) => ({
    spine: [0.02 + Math.sin(t * 1.5) * 0.015, 0, 0],
    chest: [0.02, Math.sin(t * 0.7) * 0.03, 0],
    head: [0.02, Math.sin(t * 0.5) * 0.12, 0],
    upArmL: [0.05, 0, 0.14], upArmR: [0.05, 0, -0.14],
    foreArmL: [-0.18, 0, 0], foreArmR: [-0.18, 0, 0],
    thighL: [0, 0, 0.03], thighR: [0, 0, -0.03],
    shinL: [0.04, 0, 0], shinR: [0.04, 0, 0],
    _root: { y: 0, rx: 0 },
  }),

  walk: (t) => {
    const w = t * 3.4;
    const s = Math.sin(w);
    return {
      spine: [0.06, s * 0.05, 0],
      head: [0.04, 0, 0],
      upArmL: [s * 0.4, 0, 0.16], upArmR: [-s * 0.4, 0, -0.16],
      foreArmL: [-0.35 - Math.max(0, s) * 0.3, 0, 0], foreArmR: [-0.35 - Math.max(0, -s) * 0.3, 0, 0],
      thighL: [-s * 0.55, 0, 0.02], thighR: [s * 0.55, 0, -0.02],
      shinL: [Math.max(0, s) * 0.8, 0, 0], shinR: [Math.max(0, -s) * 0.8, 0, 0],
      footL: [0.1, 0, 0], footR: [0.1, 0, 0],
      _root: { y: Math.abs(Math.sin(w)) * 0.03, rx: 0 },
    };
  },

  squat: (t) => {
    const c = (Math.sin(t * 1.8) + 1) / 2;
    return {
      spine: [0.32 * c, 0, 0], chest: [0.08 * c, 0, 0],
      head: [-0.2 * c, 0, 0],
      upArmL: [-1.15 * c, 0, 0.3], upArmR: [-1.15 * c, 0, -0.3],
      foreArmL: [-0.3, 0, 0], foreArmR: [-0.3, 0, 0],
      thighL: [-1.25 * c, 0, 0.1], thighR: [-1.25 * c, 0, -0.1],
      shinL: [1.55 * c, 0, 0], shinR: [1.55 * c, 0, 0],
      footL: [-0.3 * c, 0, 0], footR: [-0.3 * c, 0, 0],
      _root: { y: -0.34 * c, rx: 0 },
    };
  },

  bench: (t) => { // press banca / press de pecho: empuje horizontal
    const c = (Math.sin(t * 1.7) + 1) / 2;
    return {
      spine: [0.05, 0, 0], chest: [0.05, 0, 0],
      head: [0.1, 0, 0],
      upArmL: [-0.7 - 0.55 * c, 0, 0.85], upArmR: [-0.7 - 0.55 * c, 0, -0.85],
      foreArmL: [-0.5 - 0.9 * c, 0, 0], foreArmR: [-0.5 - 0.9 * c, 0, 0],
      thighL: [-0.9, 0, 0.12], thighR: [-0.9, 0, -0.12],
      shinL: [1.4, 0, 0], shinR: [1.4, 0, 0],
      footL: [-0.3, 0, 0], footR: [-0.3, 0, 0],
      _root: { y: -0.3, rx: 0 },
    };
  },

  press: (t) => { // press militar
    const c = (Math.sin(t * 1.6) + 1) / 2;
    return {
      spine: [0.02, 0, 0], head: [0.1 * c, 0, 0],
      upArmL: [-2.4 + 0.5 * c, 0, 0.35], upArmR: [-2.4 + 0.5 * c, 0, -0.35],
      foreArmL: [-0.5 + 0.4 * c, 0, 0], foreArmR: [-0.5 + 0.4 * c, 0, 0],
      thighL: [0, 0, 0.04], thighR: [0, 0, -0.04],
      shinL: [0.06, 0, 0], shinR: [0.06, 0, 0],
      _root: { y: -0.02 * c, rx: 0 },
    };
  },

  row: (t) => { // remado / peso muerto (bisagra + tirón)
    const c = (Math.sin(t * 1.6) + 1) / 2;
    return {
      spine: [0.55 - 0.1 * c, 0, 0], chest: [0.15, 0, 0], head: [-0.35, 0, 0],
      upArmL: [0.35 - 0.7 * c, 0, 0.22], upArmR: [0.35 - 0.7 * c, 0, -0.22],
      foreArmL: [-1.2 + 0.9 * c, 0, 0], foreArmR: [-1.2 + 0.9 * c, 0, 0],
      thighL: [-0.25, 0, 0.05], thighR: [-0.25, 0, -0.05],
      shinL: [0.35, 0, 0], shinR: [0.35, 0, 0],
      _root: { y: -0.1, rx: 0 },
    };
  },

  pullup: (t) => {
    const c = (Math.sin(t * 1.5) + 1) / 2;
    return {
      spine: [0.04, 0, 0], head: [0.25 * c, 0, 0],
      upArmL: [-2.85 + 0.25 * c, 0, 0.42], upArmR: [-2.85 + 0.25 * c, 0, -0.42],
      foreArmL: [-0.25 - 0.85 * c, 0, 0], foreArmR: [-0.25 - 0.85 * c, 0, 0],
      thighL: [-0.3 - 0.2 * c, 0, 0.1], thighR: [-0.3 - 0.2 * c, 0, -0.1],
      shinL: [0.75, 0, 0], shinR: [0.75, 0, 0],
      _root: { y: 0.22 * c, rx: 0 },
    };
  },

  lunge: (t) => {
    const c = Math.sin(t * 1.5);
    return {
      spine: [0.1, 0, 0], head: [-0.05, 0, 0],
      upArmL: [c * 0.4, 0, 0.18], upArmR: [-c * 0.4, 0, -0.18],
      foreArmL: [-0.6, 0, 0], foreArmR: [-0.6, 0, 0],
      thighL: [-0.75 - 0.5 * c, 0, 0.06], thighR: [-0.75 + 0.5 * c, 0, -0.06],
      shinL: [0.85 + 0.5 * c, 0, 0], shinR: [0.85 - 0.5 * c, 0, 0],
      _root: { y: -0.16 - 0.05 * Math.abs(c), rx: 0 },
    };
  },

  curl: (t) => {
    const c = (Math.sin(t * 1.7) + 1) / 2;
    return {
      spine: [0.03, 0, 0], head: [0.08, 0, 0],
      upArmL: [0.1, 0, 0.2], upArmR: [0.1, 0, -0.2],
      foreArmL: [-2.0 * c - 0.15, 0, 0], foreArmR: [-2.0 * c - 0.15, 0, 0],
      thighL: [0, 0, 0.04], thighR: [0, 0, -0.04],
      shinL: [0.05, 0, 0], shinR: [0.05, 0, 0],
      _root: { y: 0, rx: 0 },
    };
  },

  plank: (t) => ({
    spine: [0.02, 0, 0], head: [0.5, 0, 0],
    upArmL: [-1.5, 0, 0.12], upArmR: [-1.5, 0, -0.12],
    foreArmL: [-0.05, 0, 0], foreArmR: [-0.05, 0, 0],
    thighL: [0.05, 0, 0.04], thighR: [0.05, 0, -0.04],
    shinL: [0.08, 0, 0], shinR: [0.08, 0, 0],
    _root: { y: -0.62 + Math.sin(t * 1.8) * 0.006, rx: 1.42 },
  }),

  stretch: (t) => {
    const s = Math.sin(t * 0.9);
    return {
      spine: [0.05 + s * 0.16, 0, s * 0.1], chest: [0.04, 0, s * 0.05],
      head: [-0.1, s * 0.15, 0],
      upArmL: [-2.6 - s * 0.3, 0, 0.35 + s * 0.15], upArmR: [-2.6 + s * 0.3, 0, -0.35 + s * 0.15],
      foreArmL: [-0.2, 0, 0], foreArmR: [-0.2, 0, 0],
      thighL: [0, 0, 0.06], thighR: [0, 0, -0.06],
      _root: { y: 0, rx: 0 },
    };
  },

  meditate: (t) => ({
    spine: [-0.03, 0, 0], chest: [0.02, 0, 0], head: [0.06, 0, 0],
    upArmL: [0.35, 0, 0.42], upArmR: [0.35, 0, -0.42],
    foreArmL: [-1.3, 0.4, 0], foreArmR: [-1.3, -0.4, 0],
    thighL: [-1.35, 0.25, 0.55], thighR: [-1.35, -0.25, -0.55],
    shinL: [1.9, 0, 0], shinR: [1.9, 0, 0],
    _root: { y: -0.42 + Math.sin(t * 1.1) * 0.008, rx: 0 },
  }),

  sit: (t) => ({
    spine: [0.14 + Math.sin(t * 1.3) * 0.01, 0, 0], chest: [0.08, 0, 0], head: [-0.1, 0, 0],
    upArmL: [-0.5, 0, 0.2], upArmR: [-0.5, 0, -0.2],
    foreArmL: [-1.1, 0.1, 0], foreArmR: [-1.1, -0.1, 0],
    thighL: [-1.5, 0, 0.1], thighR: [-1.5, 0, -0.1],
    shinL: [1.4, 0, 0], shinR: [1.4, 0, 0],
    footL: [-0.2, 0, 0], footR: [-0.2, 0, 0],
    _root: { y: -0.38, rx: 0 },
  }),

  eat: (t) => {
    const c = (Math.sin(t * 2.2) + 1) / 2;
    return {
      spine: [0.1, 0, 0], head: [-0.08 + c * 0.06, 0.1, 0],
      upArmL: [-0.5, 0, 0.2], upArmR: [-0.55 - 0.2 * c, 0, -0.35],
      foreArmL: [-1.1, 0.1, 0], foreArmR: [-1.35 - 0.65 * c, -0.3, 0],
      thighL: [-1.5, 0, 0.1], thighR: [-1.5, 0, -0.1],
      shinL: [1.4, 0, 0], shinR: [1.4, 0, 0],
      _root: { y: -0.38, rx: 0 },
    };
  },

  drink: (t) => {
    const c = (Math.sin(t * 1.2) + 1) / 2;
    return {
      spine: [0.05, 0, 0], head: [-0.3 * c, 0, 0],
      upArmL: [0.05, 0, 0.15], upArmR: [-0.6 - 0.3 * c, 0, -0.35],
      foreArmL: [-0.2, 0, 0], foreArmR: [-1.7 - 0.5 * c, -0.25, 0],
      thighL: [0, 0, 0.03], thighR: [0, 0, -0.03],
      _root: { y: 0, rx: 0 },
    };
  },

  celebrate: (t) => {
    const s = Math.sin(t * 6);
    return {
      spine: [-0.06, s * 0.08, 0], chest: [-0.05, 0, 0], head: [-0.15, 0, 0],
      upArmL: [-2.9 + s * 0.15, 0, 0.5], upArmR: [-2.9 - s * 0.15, 0, -0.5],
      foreArmL: [-0.3, 0, 0], foreArmR: [-0.3, 0, 0],
      thighL: [s * 0.15, 0, 0.05], thighR: [-s * 0.15, 0, -0.05],
      shinL: [0.15 + Math.max(0, s) * 0.3, 0, 0], shinR: [0.15 + Math.max(0, -s) * 0.3, 0, 0],
      _root: { y: Math.abs(s) * 0.1, rx: 0 },
    };
  },

  wave: (t) => {
    const s = Math.sin(t * 4);
    return {
      spine: [0.02, 0, 0], head: [0.02, 0.1, 0],
      upArmL: [0.05, 0, 0.15], upArmR: [-2.6, 0, -0.35 + s * 0.12],
      foreArmL: [-0.2, 0, 0], foreArmR: [-0.45 + s * 0.3, 0, 0],
      thighL: [0, 0, 0.03], thighR: [0, 0, -0.03],
      _root: { y: 0, rx: 0 },
    };
  },

  sleep: (t) => ({
    spine: [0.02 + Math.sin(t * 1.0) * 0.02, 0, 0], head: [0.15, 0.5, 0],
    upArmL: [0.3, 0, 0.25], upArmR: [0.2, 0, -0.2],
    foreArmL: [-0.7, 0, 0], foreArmR: [-0.5, 0, 0],
    thighL: [-0.35, 0, 0.06], thighR: [-0.2, 0, -0.06],
    shinL: [0.45, 0, 0], shinR: [0.3, 0, 0],
    _root: { y: -0.72, rx: 1.5 },
  }),
};

// ------------------------------------------------------------
export class Avatar {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = "PersistentAvatar";
    this.bones = {};
    this.cur = {};        // bone -> [x,y,z]
    this.curRoot = { y: 0, rx: 0 };
    this.action = "idle";
    this.time = 0;
    this.equipParts = {};
    this.skinTone = SKIN_TONES[0];
    this.build();
    this.setSkin(this.skinTone);
    this.setOutfit({ top: "core_tee", bottom: "core_pants", shoes: "core_runners", head: "sage_wrap" }, {});
  }

  // ---------- RIG ----------
  build() {
    const B = this.bones;
    const mk = (parent, name, pos) => {
      const o = new THREE.Object3D();
      o.name = name; o.position.set(pos[0], pos[1], pos[2]);
      parent.add(o); B[name] = o; return o;
    };
    this.root = new THREE.Group();
    this.group.add(this.root);

    B.hips = mk(this.root, "hips", [0, 0.94, 0]);
    B.spine = mk(B.hips, "spine", [0, 0.1, 0]);
    B.chest = mk(B.spine, "chest", [0, 0.24, 0]);
    B.neck = mk(B.chest, "neck", [0, 0.2, 0]);
    B.head = mk(B.neck, "head", [0, 0.1, 0]);

    B.clavL = mk(B.chest, "clavL", [-0.08, 0.15, 0]);
    B.upArmL = mk(B.clavL, "upArmL", [-0.08, 0, 0]);
    B.foreArmL = mk(B.upArmL, "foreArmL", [0, -0.3, 0]);
    B.handL = mk(B.foreArmL, "handL", [0, -0.28, 0]);
    B.clavR = mk(B.chest, "clavR", [0.08, 0.15, 0]);
    B.upArmR = mk(B.clavR, "upArmR", [0.08, 0, 0]);
    B.foreArmR = mk(B.upArmR, "foreArmR", [0, -0.3, 0]);
    B.handR = mk(B.foreArmR, "handR", [0, -0.28, 0]);

    B.thighL = mk(B.hips, "thighL", [-0.11, -0.04, 0]);
    B.shinL = mk(B.thighL, "shinL", [0, -0.44, 0]);
    B.footL = mk(B.shinL, "footL", [0, -0.42, 0]);
    B.thighR = mk(B.hips, "thighR", [0.11, -0.04, 0]);
    B.shinR = mk(B.thighR, "shinR", [0, -0.44, 0]);
    B.footR = mk(B.shinR, "footR", [0, -0.42, 0]);

    // --- body meshes (skin) ---
    this.bodyMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.65, metalness: 0.02 });
    this.darkMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5, metalness: 0.1 });

    const seg = (parent, r, len, yOff, mat, x = 0) => {
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 12), mat || this.bodyMat);
      m.position.set(x, yOff, 0); m.castShadow = true; parent.add(m); return m;
    };

    // radios de piel SIEMPRE por debajo de la ropa (margen ≥18mm):
    // si la piel es más gruesa que la tela en cualquier eje, asoma la
    // mancha clara del torso (piel mono sobre camiseta negra).
    seg(B.hips, 0.132, 0.1, 0.02);                    // pelvis
    seg(B.spine, 0.148, 0.14, 0.12);                 // abdomen
    this.chestMesh = seg(B.chest, 0.175, 0.14, 0.06); // chest
    seg(B.neck, 0.05, 0.06, 0.02);
    // head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.135, 24, 20), this.bodyMat);
    head.scale.set(1, 1.12, 1.02); head.position.y = 0.08; head.castShadow = true; B.head.add(head);
    // pelo: casco corto (el maniquí calvo era lo "feo"; gorras y cascos van encima)
    this.hairMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.85, metalness: 0 });
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.142, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2.15), this.hairMat);
    hair.scale.set(1.02, 1.05, 1.04); hair.position.set(0, 0.098, -0.012); hair.rotation.x = -0.22;
    hair.castShadow = true; B.head.add(hair);
    this.hairMesh = hair;
    // eyes (se ocultan cuando hay foto real)
    const eyeG = new THREE.SphereGeometry(0.018, 10, 8);
    this.eyeMeshes = [];
    for (const sx of [-1, 1]) {
      const e = new THREE.Mesh(eyeG, this.darkMat);
      e.position.set(sx * 0.05, 0.1, 0.12); B.head.add(e);
      this.eyeMeshes.push(e);
    }
    // arms
    seg(B.upArmL, 0.052, 0.22, -0.03); seg(B.foreArmL, 0.045, 0.2, -0.02);
    seg(B.handL, 0.05, 0.04, -0.02);
    seg(B.upArmR, 0.052, 0.22, -0.03); seg(B.foreArmR, 0.045, 0.2, -0.02);
    seg(B.handR, 0.05, 0.04, -0.02);
    // legs
    seg(B.thighL, 0.075, 0.3, -0.06); seg(B.shinL, 0.058, 0.3, -0.05);
    seg(B.thighR, 0.075, 0.3, -0.06); seg(B.shinR, 0.058, 0.3, -0.05);
    // feet (dark base)
    for (const side of ["L", "R"]) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.24), this.darkMat);
      f.position.set(0, -0.03, 0.05); f.castShadow = true;
      B["foot" + side].add(f);
      B["footMesh" + side] = f;
    }

    // Sombra de contacto SUAVE: mancha con gradiente radial.
    // Ojo: antes era un CircleGeometry (abanico de triángulos) a la MISMA
    // altura que el parche/alfombra del suelo → z-fighting = «abanico de
    // púas». Ahora: plano con degradado + depthWrite:false + polygonOffset
    // + altura desacoplada del suelo (alfombra 0.011, parche gym 0.012).
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, opacity: 0.35,
      depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    });
    if (typeof document !== "undefined" && document.createElement) {
      const c = document.createElement("canvas");
      c.width = c.height = 128;
      const g2d = c.getContext("2d");
      const grd = g2d.createRadialGradient(64, 64, 4, 64, 64, 62);
      grd.addColorStop(0, "rgba(0,0,0,0.95)");
      grd.addColorStop(0.55, "rgba(0,0,0,0.55)");
      grd.addColorStop(1, "rgba(0,0,0,0)");
      g2d.fillStyle = grd;
      g2d.fillRect(0, 0, 128, 128);
      shadowMat.map = new THREE.CanvasTexture(c);
      shadowMat.needsUpdate = true;
    }
    const disc = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMat);
    disc.rotation.x = -Math.PI / 2; disc.position.y = 0.03; disc.renderOrder = 1;
    this.group.add(disc);
    this.shadowDisc = disc;
  }

  setSkin(hex) {
    this.skinTone = hex;
    this.bodyMat.color.set(hex);
    this.bodyMat.needsUpdate = true;
  }

  // ---- CARA REAL DEL USUARIO (foto → textura) ----
  setFace(dataURL) {
    this.faceData = dataURL || null;
    if (this.faceMesh) {
      this.bones.head.remove(this.faceMesh);
      this.faceMesh = null;
    }
    for (const e of this.eyeMeshes || []) e.visible = !dataURL;
    if (!dataURL) return;
    const img = new Image();
    img.onload = () => {
      const tex = new THREE.Texture(img);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
      const geo = new THREE.PlaneGeometry(0.23, 0.26);
      const m = new THREE.Mesh(geo, mat);
      m.position.set(0, 0.075, 0.105);
      m.name = "facePhoto";
      this.bones.head.add(m);
      this.faceMesh = m;
    };
    img.src = dataURL;
  }

  // ---------- EQUIPMENT (modular layers) ----------
  clearEquip() {
    for (const k of Object.keys(this.equipParts)) {
      const p = this.equipParts[k];
      (Array.isArray(p) ? p : [p]).forEach((m) => m && m.parent && m.parent.remove(m));
    }
    this.equipParts = {};
  }

  setOutfit(equipped, itemsById) {
    this.clearEquip();
    const B = this.bones;
    this.styleInfo = {
      top: equipped.top && itemsById[equipped.top] ? itemsById[equipped.top].vis : { kind: "tee", color: "#141416", accent: "#F4A261" },
      bottom: equipped.bottom && itemsById[equipped.bottom] ? itemsById[equipped.bottom].vis : { kind: "long", color: "#050505" },
      shoes: equipped.shoes && itemsById[equipped.shoes] ? itemsById[equipped.shoes].vis : { color: "#FFFFFF" },
      head: equipped.head && itemsById[equipped.head] ? itemsById[equipped.head].vis : null,
      effects: equipped.effects && itemsById[equipped.effects] ? itemsById[equipped.effects].vis : null,
    };
    const mat = (color, opts = {}) =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(color), roughness: opts.rough ?? 0.6, metalness: opts.metal ?? 0.08,
        emissive: new THREE.Color(opts.glow ? color : "#000000"), emissiveIntensity: opts.glow ? 0.5 : 0,
      });

    // ---- TOP ----
    const top = equipped.top && itemsById[equipped.top]?.vis ? itemsById[equipped.top].vis : { kind: "tee", color: "#141416", accent: "#F4A261" };
    {
      const m = mat(top.color, { metal: 0.06 });
      // la camiseta envuelve el torso en TODOS los ejes (sin aplastar en z:
      // aplastar dejaba la piel fuera = mancha blanca del torso)
      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.195, 0.2, 4, 14), m);
      torso.position.y = 0.1; B.chest.add(torso);
      const belly = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.12, 4, 14), m);
      belly.position.y = 0.1; B.spine.add(belly);
      const parts = [torso, belly];
      // accent stripe
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.32), mat(top.accent, { metal: 0.3 }));
      stripe.position.y = 0.04; B.chest.add(stripe); parts.push(stripe);
      const sleeveLen = top.kind === "jacket" ? 0.26 : 0.1;
      for (const s of ["L", "R"]) {
        const sl = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, sleeveLen, 4, 12), m);
        sl.position.y = -0.08 - (top.kind === "jacket" ? 0.08 : 0);
        B["upArm" + s].add(sl); parts.push(sl);
        if (top.kind === "jacket") {
          const sl2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.058, 0.2, 4, 12), m);
          sl2.position.y = -0.02; B["foreArm" + s].add(sl2); parts.push(sl2);
        }
      }
      if (top.kind === "jacket") {
        const hood = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 12, 0, Math.PI * 2, 0, Math.PI / 2), m);
        hood.position.set(0, 0.12, -0.1); hood.rotation.x = Math.PI / 2.4; B.neck.add(hood); parts.push(hood);
      }
      this.equipParts.top = parts;
    }

    // ---- BOTTOM ----
    const bot = equipped.bottom && itemsById[equipped.bottom]?.vis ? itemsById[equipped.bottom].vis : { kind: "long", color: "#050505" };
    {
      const m = mat(bot.color, { metal: 0.05 });
      const parts = [];
      for (const s of ["L", "R"]) {
        const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.088, 0.28, 4, 12), m);
        th.position.y = -0.07; B["thigh" + s].add(th); parts.push(th);
        if (bot.kind === "long") {
          const sh = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.3, 4, 12), m);
          sh.position.y = -0.05; B["shin" + s].add(sh); parts.push(sh);
        }
      }
      const waist = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.08, 4, 14), m);
      waist.position.y = 0.0; B.hips.add(waist); parts.push(waist);
      this.equipParts.bottom = parts;
    }

    // ---- SHOES ----
    const sh = equipped.shoes && itemsById[equipped.shoes]?.vis ? itemsById[equipped.shoes].vis : { color: "#FFFFFF", accent: "#141416" };
    {
      const parts = [];
      for (const s of ["L", "R"]) {
        const f = B["footMesh" + s];
        f.material = mat(sh.color, { metal: 0.05, glow: sh.glow });
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.02, 0.1), mat(sh.accent || "#141416"));
        stripe.position.set(0, 0.0, 0.02); f.add(stripe); parts.push(stripe);
      }
      this.equipParts.shoes = parts;
    }

    // ---- HEAD ----
    const hd = equipped.head && itemsById[equipped.head]?.vis ? itemsById[equipped.head].vis : null;
    if (hd) {
      const m = mat(hd.color, { metal: 0.15 });
      const parts = [];
      if (hd.kind === "cap") {
        const crown = new THREE.Mesh(new THREE.SphereGeometry(0.145, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2.1), m);
        crown.position.y = 0.08; B.head.add(crown); parts.push(crown);
        const brim = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.14), mat(hd.accent || "#141416"));
        brim.position.set(0, 0.1, 0.14); B.head.add(brim); parts.push(brim);
      } else if (hd.kind === "headphones") {
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.018, 8, 20, Math.PI), m);
        band.position.y = 0.08; band.rotation.y = Math.PI / 2; B.head.add(band); parts.push(band);
        for (const sx of [-1, 1]) {
          const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.035, 14), mat(hd.accent, { glow: true, metal: 0.3 }));
          cup.rotation.z = Math.PI / 2; cup.position.set(sx * 0.14, 0.06, 0); B.head.add(cup); parts.push(cup);
        }
      } else if (hd.kind === "headband") {
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.022, 8, 22), m);
        band.position.y = 0.12; band.rotation.x = Math.PI / 2; B.head.add(band); parts.push(band);
      }
      this.equipParts.head = parts;
    }

    // ---- WRIST ----
    const wr = equipped.wrist && itemsById[equipped.wrist]?.vis ? itemsById[equipped.wrist].vis : null;
    if (wr) {
      const parts = [];
      for (const s of ["L", "R"]) {
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.014, 8, 18), mat(wr.color, { metal: 0.25, glow: false }));
        band.position.y = -0.2; band.rotation.x = Math.PI / 2;
        B["foreArm" + s].add(band); parts.push(band);
      }
      this.equipParts.wrist = parts;
    }

    // ---- BACK ----
    const bk = equipped.back && itemsById[equipped.back]?.vis ? itemsById[equipped.back].vis : null;
    if (bk) {
      const pack = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.3, 0.12), mat(bk.color, { metal: 0.1, glow: bk.glow }));
      pack.position.set(0, 0.05, -0.22); B.chest.add(pack);
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.3), mat(bk.accent || "#141414"));
      strap.position.y = 0.1; B.chest.add(strap);
      this.equipParts.back = [pack, strap];
    }

    // ---- EFFECTS (aura ring) ----
    const fx = equipped.effects && itemsById[equipped.effects]?.vis ? itemsById[equipped.effects].vis : null;
    if (fx) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.55, 0.012, 8, 40),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(fx.color), transparent: true, opacity: 0.8 })
      );
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.05;
      this.group.add(ring);
      const glow = new THREE.Mesh(
        new THREE.CircleGeometry(0.5, 32),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(fx.color), transparent: true, opacity: 0.14 })
      );
      glow.rotation.x = -Math.PI / 2; glow.position.y = 0.02;
      this.group.add(glow);
      this.equipParts.effects = [ring, glow];
      this.aura = ring;
    } else this.aura = null;
  }

  // ---------- ANIMATION ----------
  setAction(name) {
    if (POSES[name]) this.action = name;
    else this.action = "idle";
  }

  update(dt, reducedMotion) {
    this.time += dt * (reducedMotion ? 0.25 : 1);
    const pose = POSES[this.action] ? POSES[this.action](this.time) : POSES.idle(this.time);
    for (const name of Object.keys(this.bones)) {
      const target = pose[name];
      if (!target) continue;
      let cur = this.cur[name];
      if (!cur) { cur = this.cur[name] = [0, 0, 0]; }
      const lam = this.action === "celebrate" ? 10 : 7;
      for (let i = 0; i < 3; i++) cur[i] = damp(cur[i], THREE.MathUtils.clamp(target[i], -CAP, CAP), lam, dt);
      this.bones[name].rotation.set(cur[0], cur[1], cur[2]);
    }
    const r = pose._root || { y: 0, rx: 0 };
    this.curRoot.y = damp(this.curRoot.y, r.y, 8, dt);
    this.curRoot.rx = damp(this.curRoot.rx, r.rx, 6, dt);
    this.root.position.y = this.curRoot.y;
    this.root.rotation.x = this.curRoot.rx;
    this.shadowDisc.material.opacity = 0.35 - Math.max(0, this.curRoot.y) * 0.5;
    if (this.aura) {
      this.aura.rotation.z += dt * 0.8;
      this.aura.position.y = 0.05 + Math.sin(this.time * 1.4) * 0.03;
    }
  }
}

export { SKIN_TONES };

// Snapshot determinista de pose — usado por el pipeline de media (shoot.js)
export function poseSnapshot(action, t) {
  return POSES[action] ? POSES[action](t) : POSES.idle(t);
}
