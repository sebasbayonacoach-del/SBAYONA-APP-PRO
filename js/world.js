// ============================================================
// BAYONA — WORLD SCENE
// AppShell → WorldScene → PersistentAvatar → ContextEnvironment
// El usuario nunca cambia de "app": se mueve por el mundo.
// ============================================================
import * as THREE from "three";
import { Avatar } from "./avatar.js";
import { Fallback2D } from "./fallback2d.js";

const PALETTE = {
  blue: 0x9a9a9a, cyan: 0xffffff, gold: 0xff6a00, orange: 0xff6a00,
  warm: 0xf0f0f0, deep: 0x000000,
};

export class World {
  constructor(canvas) {
    this.canvas = canvas;
    this.fallback2d = null;
    this.renderer = null;
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
      this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.05;
    } catch (e) {
      // spec §57 LOW-END FALLBACK: el personaje nunca desaparece.
      console.warn("BAYONA: WebGL no disponible → fallback 2.5D", e);
    }

    this.scene = new THREE.Scene();
    this.mood = "cine";
    this.applyMoodColors("cine");

    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
    this.camTarget = new THREE.Vector3(0, 1.0, 0);
    this.camHome = new THREE.Vector3(0, 1.15, 3.4);
    this.camera.position.copy(this.camHome);

    // global lights — estudio claro
    this.hemi = new THREE.HemisphereLight(0xffffff, 0xe0e0e0, 0.9);
    this.scene.add(this.hemi);
    this.key = new THREE.DirectionalLight(0xffffff, 1.5);
    this.key.position.set(2.4, 4.2, 3);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(1024, 1024);
    this.key.shadow.camera.left = -3; this.key.shadow.camera.right = 3;
    this.key.shadow.camera.top = 4; this.key.shadow.camera.bottom = -1;
    this.scene.add(this.key);
    this.rim = new THREE.DirectionalLight(0xff6a00, 0.35);
    this.rim.position.set(-3, 2.4, -2.5);
    this.scene.add(this.rim);

    // persistent layers
    this.envGroup = new THREE.Group();
    this.scene.add(this.envGroup);
    this.avatar = new Avatar();
    this.scene.add(this.avatar.group);

    // CORE companion (persistent, follows the avatar)
    this.core = this.buildCore();
    this.scene.add(this.core.group);

    // dust motes
    this.scene.add(this.buildMotes());

    this.currentEnv = null;
    this.envCache = {};
    this.transitioning = false;
    this.reducedMotion = false;
    this.clock = new THREE.Clock();

    // ---- MOVIMIENTO LIBRE del personaje ----
    this.bounds = { x: 3.2, z: 2.8 };     // límites del escenario
    this.moveTarget = null;               // destino del clic (walk-to)
    this.inputVec = { x: 0, z: 0 };       // teclado / joystick
    this.idleAction = "idle";             // pose por defecto del lugar actual
    this.speedRun = false;
    // cámara orbital relativa al personaje (el encuadre viaja con él)
    this.camGoalOffset = new THREE.Vector3(0, 0.2, 3.3);
    this.camTgtOffset = new THREE.Vector3(0, 0.95, 0);
    this.camGoal = null;
    this.camTargetGoal = null;
    this.floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this.resize();
    addEventListener("resize", () => this.resize());
  }

  // ---------------- LUZ · CINE (blanco) / NOCHE (negro) ----------------
  applyMoodColors(mood) {
    const bg = mood === "noche" ? 0x070605 : 0xf1ede5;
    this.scene.background = new THREE.Color(bg);
    this.scene.fog = new THREE.Fog(bg, mood === "noche" ? 4 : 6, mood === "noche" ? 13 : 17);
  }

  setMood(mood) {
    const m = mood === "noche" ? "noche" : "cine";
    this.mood = m;
    this.applyMoodColors(m);
    if (m === "noche") {
      this.hemi.intensity = 0.22;
      this.hemi.color.setHex(0xbcd2ff); this.hemi.groundColor.setHex(0x0a0806);
      this.key.intensity = 0.55; this.key.color.setHex(0xdfe6ff);
      this.rim.intensity = 1.05;
      if (this.renderer) this.renderer.toneMappingExposure = 1.18;
    } else {
      this.hemi.intensity = 0.85;
      this.hemi.color.setHex(0xffffff); this.hemi.groundColor.setHex(0xe6ded2);
      this.key.intensity = 1.35; this.key.color.setHex(0xfff3e6);
      this.rim.intensity = 0.5;
      if (this.renderer) this.renderer.toneMappingExposure = 1.05;
    }
    this.motes.material.opacity = m === "noche" ? 0.5 : 0.28;
    // el escenario se reconstruye con la paleta del modo
    const name = (this.currentEnv && this.currentEnv.userData.name) || "home";
    this.envCache = {};
    if (this.currentEnv) this.envGroup.remove(this.currentEnv);
    this.currentEnv = this.envFor(name);
    this.envGroup.add(this.currentEnv);
    this.core.light.intensity = m === "noche" ? 1.4 : 0.8;
  }

  // ---------------- MOVIMIENTO LIBRE ----------------
  /** punto del suelo bajo un pixel de pantalla (clic = camina ahí) */
  screenToFloor(clientX, clientY) {
    const x = (clientX / innerWidth) * 2 - 1;
    const y = -(clientY / innerHeight) * 2 + 1;
    const rc = new THREE.Raycaster();
    rc.setFromCamera(new THREE.Vector2(x, y), this.camera);
    const hit = new THREE.Vector3();
    return rc.ray.intersectPlane(this.floorPlane, hit) ? hit : null;
  }

  /** destino de caminata (clic / toque) */
  moveTo(point) {
    if (!point) return;
    this.moveTarget = new THREE.Vector3(
      THREE.MathUtils.clamp(point.x, -this.bounds.x, this.bounds.x),
      0,
      THREE.MathUtils.clamp(point.z, -this.bounds.z, this.bounds.z)
    );
  }

  /** entrada continua (WASD / joystick) en ejes de cámara: x=lateral, z=adelante */
  setInput(x, z) {
    this.inputVec.x = THREE.MathUtils.clamp(x, -1, 1);
    this.inputVec.z = THREE.MathUtils.clamp(z, -1, 1);
    if (x || z) this.moveTarget = null;
  }

  /** órbita de cámara (arrastrar) */
  orbitBy(dAzim, dPitch) {
    const o = this.camGoalOffset;
    const cos = Math.cos(dAzim), sin = Math.sin(dAzim);
    const nx = o.x * cos + o.z * sin;
    const nz = -o.x * sin + o.z * cos;
    o.x = nx; o.z = nz;
    o.y = THREE.MathUtils.clamp(o.y + dPitch, -0.2, 1.6);
  }

  /** zoom (rueda / pinza) */
  zoomBy(f) {
    const o = this.camGoalOffset;
    const len = THREE.MathUtils.clamp(o.length() * f, 1.7, 6.2);
    o.setLength(len);
  }

  integrateMove(dt) {
    const A = this.avatar.group;
    const v = this.inputVec;
    if (v && (Math.abs(v.x) > 0.05 || Math.abs(v.z) > 0.05)) {
      // relativo a la cámara: “adelante” = adentro de la escena
      const fwd = new THREE.Vector3().subVectors(
        new THREE.Vector3().copy(A.position).add(this.camTgtOffset),
        this.camera.position
      );
      fwd.y = 0;
      if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, -1);
      fwd.normalize();
      const right = new THREE.Vector3(fwd.z, 0, -fwd.x);
      const dir = new THREE.Vector3().addScaledVector(fwd, v.z).addScaledVector(right, v.x);
      if (dir.lengthSq() > 1e-6) this.step(dir.normalize(), dt);
      return;
    }
    if (this.moveTarget) {
      const to = new THREE.Vector3().subVectors(this.moveTarget, A.position);
      to.y = 0;
      if (to.length() < 0.07) {
        this.moveTarget = null;
        this.avatar.setAction(this.idleAction || "idle");
        return;
      }
      this.step(to.normalize(), dt);
    }
  }

  step(dir, dt) {
    const A = this.avatar.group;
    const sp = (this.speedRun ? 2.7 : 1.6) * dt;
    A.position.x = THREE.MathUtils.clamp(A.position.x + dir.x * sp, -this.bounds.x, this.bounds.x);
    A.position.z = THREE.MathUtils.clamp(A.position.z + dir.z * sp, -this.bounds.z, this.bounds.z);
    // gira hacia la marcha (por el camino corto)
    const yaw = Math.atan2(dir.x, dir.z);
    let d = ((yaw - A.rotation.y + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    A.rotation.y += d * (1 - Math.pow(0.0005, dt));
    if (this.avatar.action !== "walk") this.avatar.setAction("walk");
  }

  // ---------------- CORE companion ----------------
  buildCore() {
    const group = new THREE.Group();
    const orb = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.085, 1),
      new THREE.MeshStandardMaterial({ color: 0xff6a00, emissive: 0xff6a00, emissiveIntensity: 0.35, roughness: 0.35, metalness: 0.1 })
    );
    group.add(orb);
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xff6a00, transparent: true, opacity: 0.12 })
    );
    group.add(halo);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.16, 0.006, 8, 36),
      new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.5 })
    );
    ring.rotation.x = Math.PI / 2.4;
    group.add(ring);
    const light = new THREE.PointLight(0xff6a00, 0.8, 3);
    group.add(light);
    return { group, orb, halo, ring, light, phase: 0, mood: "calm" };
  }

  setCoreMood(mood) {
    this.core.mood = mood;
    const c = mood === "alert" ? 0xff6a00 : mood === "gold" ? 0xff6a00 : 0x111111;
    this.core.orb.material.color.setHex(c);
    this.core.orb.material.emissive.setHex(mood === "calm" ? 0xff6a00 : c);
    this.core.light.color.setHex(c);
    this.core.halo.material.color.setHex(c);
  }

  buildMotes() {
    const n = 90, g = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 8;
      pos[i * 3 + 1] = Math.random() * 3.2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ color: 0xff6a00, size: 0.012, transparent: true, opacity: 0.35 });
    this.motes = new THREE.Points(g, m);
    return this.motes;
  }

  // ---------------- ENVIRONMENTS ----------------
  mat(color, rough = 0.8, metal = 0.05, emissive = 0x000000) {
    return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, emissive });
  }
  box(parent, size, pos, material, rotY = 0) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    m.position.set(...pos); m.rotation.y = rotY;
    m.castShadow = true; m.receiveShadow = true;
    parent.add(m); return m;
  }
  floor(parent, color = 0x111111, size = 16) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(size, size), this.mat(color, 0.95));
    f.rotation.x = -Math.PI / 2; f.receiveShadow = true;
    parent.add(f); return f;
  }

  buildEnv(name) {
    const g = new THREE.Group();
    const accentLight = new THREE.PointLight(0xff6a00, 0, 8);
    g.add(accentLight);
    const props = new THREE.Group(); g.add(props);
    // paleta por modo: CINE (blanco cálido + naranja) / NOCHE (negro + naranja)
    const P = this.mood === "noche"
      ? { FLOOR: 0x0e0b08, WALL: 0x171310, INK: 0x0a0806, ACC: 0xff6a00, SOFT: 0x28221b }
      : { FLOOR: 0xe9e3d7, WALL: 0xf7f3ea, INK: 0x211d18, ACC: 0xff6a00, SOFT: 0xd9d2c4 };
    const { FLOOR, WALL, INK, ACC, SOFT } = P;

    switch (name) {
      case "home": {
        this.floor(g, FLOOR, 18);
        this.box(props, [7, 3.4, 0.15], [0, 1.7, -3.2], this.mat(WALL, 0.9));
        const win = this.box(props, [1.8, 1.5, 0.08], [-1.6, 1.8, -3.1], this.mat(0xffffff, 0.4, 0, 0xdcdcdc));
        win.material.emissiveIntensity = 0.6;
        this.box(props, [1.8, 0.5, 0.8], [1.9, 0.25, -1.6], this.mat(SOFT, 0.85));
        this.box(props, [1.8, 0.5, 0.2], [1.9, 0.5, -2.0], this.mat(SOFT, 0.85));
        this.box(props, [0.9, 0.32, 0.55], [1.6, 0.16, 0.2], this.mat(INK, 0.6));
        this.box(props, [0.05, 1.5, 0.05], [-2.6, 0.75, -1.4], this.mat(INK, 0.5, 0.3));
        const lamp = new THREE.PointLight(0xffffff, 3, 5);
        lamp.position.set(-2.6, 1.6, -1.4); g.add(lamp);
        this.box(props, [0.22, 0.3, 0.22], [-2.6, 1.55, -1.4], this.mat(0xffffff, 0.3, 0, 0xdcdcdc)).material.emissiveIntensity = 0.5;
        const rug = new THREE.Mesh(new THREE.CircleGeometry(1.15, 40), this.mat(0xdcdcdc, 0.98));
        rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.011, 0.2); rug.receiveShadow = true;
        props.add(rug);
        this.box(props, [0.26, 0.3, 0.26], [2.9, 0.15, -0.2], this.mat(ACC, 0.7));
        this.box(props, [0.3, 0.7, 0.3], [2.9, 0.65, -0.2], this.mat(0x2e2e2e, 0.85));
        accentLight.color.setHex(ACC); accentLight.intensity = 0.5;
        accentLight.position.set(-1.5, 2, -1);
        break;
      }
      case "gym": {
        this.floor(g, FLOOR, 18);
        this.box(props, [9, 3.6, 0.15], [0, 1.8, -3.4], this.mat(WALL, 0.85));
        const stripe = this.box(props, [7, 0.06, 0.05], [0, 2.5, -3.3], this.mat(ACC, 0.3, 0, ACC));
        stripe.material.emissiveIntensity = 0.35;
        this.box(props, [0.5, 0.35, 1.5], [-1.8, 0.18, -0.6], this.mat(INK, 0.7));
        this.box(props, [0.5, 0.12, 0.35], [-1.8, 0.42, -0.2], this.mat(0x1a1a1a, 0.7));
        this.box(props, [0.14, 1.7, 0.14], [-2.3, 0.85, -1.4], this.mat(0x2b2b2b, 0.5, 0.4));
        this.box(props, [0.14, 1.7, 0.14], [-1.3, 0.85, -1.4], this.mat(0x2b2b2b, 0.5, 0.4));
        this.box(props, [1.3, 0.08, 0.08], [-1.8, 1.6, -1.4], this.mat(0x9a9a9a, 0.35, 0.7));
        this.box(props, [1.6, 0.7, 0.4], [2.2, 0.35, -1.8], this.mat(0x2b2b2b, 0.8));
        for (let i = 0; i < 4; i++) {
          for (const s of [-1, 1]) {
            const wgt = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.07, 16), this.mat(i === 3 ? ACC : 0x1a1a1a, 0.4, 0.4));
            wgt.rotation.z = Math.PI / 2;
            wgt.position.set(1.7 + i * 0.34, 0.78, -1.8 + s * 0.09);
            wgt.castShadow = true; props.add(wgt);
          }
        }
        for (let i = 0; i < 3; i++) {
          const p = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.05, 10, 24), this.mat([0x1a1a1a, 0xff6a00, 0x9a9a9a][i], 0.5, 0.3));
          p.position.set(-2.9 + i * 0.1, 0.24 + i * 0.02, 0.6); p.rotation.y = Math.PI / 2;
          p.castShadow = true; props.add(p);
        }
        const patch = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3), this.mat(0xdcdcdc, 0.99));
        patch.rotation.x = -Math.PI / 2; patch.position.set(0, 0.012, 0.4); patch.receiveShadow = true;
        props.add(patch);
        accentLight.color.setHex(ACC); accentLight.intensity = 0.6; accentLight.position.set(0, 2.4, -1);
        break;
      }
      case "kitchen": {
        this.floor(g, FLOOR, 18);
        this.box(props, [8, 3.2, 0.15], [0, 1.6, -3], this.mat(WALL, 0.85));
        this.box(props, [3.4, 0.9, 0.7], [-1.2, 0.45, -2.4], this.mat(0xd6d6d6, 0.7));
        this.box(props, [3.6, 0.08, 0.8], [-1.2, 0.93, -2.4], this.mat(INK, 0.3, 0.2));
        this.box(props, [0.8, 2, 0.7], [2.5, 1, -2.5], this.mat(0xe8e8e8, 0.4, 0.2));
        this.box(props, [1.5, 0.08, 0.9], [0.8, 0.75, 0.3], this.mat(0x2b2b2b, 0.5));
        this.box(props, [0.1, 0.7, 0.1], [0.8, 0.38, 0.3], this.mat(INK, 0.6));
        for (const sx of [-0.5, 0.5]) {
          this.box(props, [0.35, 0.5, 0.35], [0.8 + sx, 0.25, 1.1], this.mat(ACC, 0.8));
        }
        const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), this.mat(0xffffff, 0.35));
        bowl.position.set(0.5, 0.83, 0.3); props.add(bowl);
        for (let i = 0; i < 3; i++) {
          const f = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), this.mat([0xff6a00, 0x2e2e2e, 0xf0f0f0][i], 0.5));
          f.position.set(0.42 + i * 0.09, 0.87, 0.28 + (i % 2) * 0.06); props.add(f);
        }
        const warm = new THREE.PointLight(0xffffff, 2.5, 6);
        warm.position.set(0, 2.4, -1); g.add(warm);
        accentLight.color.setHex(ACC); accentLight.intensity = 0.4; accentLight.position.set(-1, 1.6, -1.5);
        break;
      }
      case "recovery": {
        this.floor(g, FLOOR, 18);
        this.box(props, [8, 3.2, 0.15], [0, 1.6, -3], this.mat(WALL, 0.85));
        for (let i = -1; i <= 1; i++) {
          const mat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 1.9), this.mat(0xd6d6d6, 0.9));
          mat.position.set(i * 1.1, 0.02, 0.3); mat.receiveShadow = true; props.add(mat);
        }
        for (let i = 0; i < 2; i++) {
          const r = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.5, 18), this.mat(ACC, 0.6));
          r.rotation.z = Math.PI / 2; r.position.set(1.9, 0.09, -0.4 - i * 0.35); r.castShadow = true; props.add(r);
        }
        for (let i = -1; i <= 1; i++) {
          const pnl = this.box(props, [0.6, 1.2, 0.04], [i * 1.4, 1.7, -2.9], this.mat(0xffffff, 0.4, 0, 0xffffff));
          pnl.material.emissiveIntensity = 0.3;
        }
        accentLight.color.setHex(ACC); accentLight.intensity = 0.5; accentLight.position.set(0, 2, -1);
        break;
      }
      case "mind": {
        this.floor(g, FLOOR, 18);
        this.box(props, [8, 3.2, 0.15], [0, 1.6, -3], this.mat(WALL, 0.9));
        const glow = new THREE.Mesh(new THREE.CircleGeometry(1.5, 48), new THREE.MeshBasicMaterial({ color: 0xff6a00, transparent: true, opacity: 0.08 }));
        glow.position.set(0, 1.5, -2.85); props.add(glow);
        const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.14, 28), this.mat(INK, 0.9));
        cushion.position.set(0, 0.07, 0); cushion.receiveShadow = true; props.add(cushion);
        for (const sx of [-1.6, 1.6]) {
          const c = this.box(props, [0.08, 0.3, 0.08], [sx, 0.15, -0.9], this.mat(0xffffff, 0.3, 0, 0xdcdcdc));
          c.material.emissiveIntensity = 0.5;
          const l = new THREE.PointLight(0xdcdcdc, 1.2, 3.4); l.position.set(sx, 0.6, -0.9); g.add(l);
        }
        accentLight.color.setHex(ACC); accentLight.intensity = 0.4; accentLight.position.set(0, 1.6, -1.4);
        break;
      }
      case "lab": {
        this.floor(g, FLOOR, 18);
        this.box(props, [9, 3.6, 0.15], [0, 1.8, -3.2], this.mat(WALL, 0.8));
        for (let i = -1; i <= 1; i++) {
          const frame = this.box(props, [1.5, 1, 0.03], [i * 1.8, 1.5, -2.6], this.mat(0xffffff, 0.4, 0.1, 0xf0f0f0));
          frame.material.emissiveIntensity = 0.4;
          for (let b = 0; b < 7; b++) {
            const h = 0.12 + Math.abs(Math.sin(i * 3 + b)) * 0.5;
            const bar = this.box(props, [0.1, h, 0.02], [i * 1.8 - 0.55 + b * 0.18, 1.05 + h / 2, -2.55], this.mat(b % 3 === 0 ? ACC : INK, 0.3));
            bar.material.emissiveIntensity = 0;
          }
        }
        for (let i = -3; i <= 3; i++) {
          this.box(props, [8, 0.005, 0.02], [0, 0.006, i * 0.8], this.mat(0xd6d6d6, 0.5));
        }
        accentLight.color.setHex(ACC); accentLight.intensity = 0.6; accentLight.position.set(0, 2, -1.5);
        break;
      }
      case "work": {
        this.floor(g, FLOOR, 18);
        this.box(props, [8, 3.2, 0.15], [0, 1.6, -3], this.mat(WALL, 0.85));
        // ventana de tarde (luz cálida de trabajo)
        const win = this.box(props, [1.7, 1.4, 0.08], [-2.2, 1.8, -2.9], this.mat(0xffffff, 0.4, 0, 0xdcdcdc));
        win.material.emissiveIntensity = 0.55;
        // escritorio + laptop
        this.box(props, [2.6, 0.08, 1.1], [0.6, 0.74, -1.4], this.mat(INK, 0.5, 0.15));
        for (const sx of [-1, 1]) this.box(props, [0.08, 0.74, 0.08], [0.6 + sx * 1.1, 0.37, -1.4], this.mat(0x2b2b2b, 0.6));
        const lap = this.box(props, [0.62, 0.02, 0.42], [0.5, 0.79, -1.35], this.mat(0x1a1a1a, 0.4, 0.3));
        const scr = this.box(props, [0.62, 0.4, 0.02], [0.5, 0.98, -1.56], this.mat(0x111111, 0.2, 0.2, 0xdcdcdc));
        scr.material.emissiveIntensity = 0.35; scr.rotation.x = -0.18;
        // lámpara de estudio + taza + planta
        this.box(props, [0.05, 0.9, 0.05], [1.7, 1.2, -1.7], this.mat(INK, 0.5, 0.3));
        const lampHead = this.box(props, [0.24, 0.1, 0.24], [1.7, 1.66, -1.6], this.mat(0xffffff, 0.3, 0, 0xdcdcdc));
        lampHead.material.emissiveIntensity = 0.5;
        const deskLamp = new THREE.PointLight(0xffffff, 2.2, 4.5);
        deskLamp.position.set(1.7, 1.55, -1.5); g.add(deskLamp);
        this.box(props, [0.12, 0.14, 0.12], [1.1, 0.85, -1.2], this.mat(ACC, 0.6));
        this.box(props, [0.3, 0.28, 0.3], [-1.2, 0.14, -0.6], this.mat(ACC, 0.7));
        this.box(props, [0.26, 0.5, 0.26], [-1.2, 0.5, -0.6], this.mat(0x2e2e2e, 0.85));
        // silla
        this.box(props, [0.55, 0.08, 0.55], [0.5, 0.45, -0.5], this.mat(0x2b2b2b, 0.8));
        this.box(props, [0.55, 0.6, 0.08], [0.5, 0.78, -0.24], this.mat(0x2b2b2b, 0.8));
        accentLight.color.setHex(ACC); accentLight.intensity = 0.45; accentLight.position.set(0, 2, -1.2);
        break;
      }
      case "locker": {
        this.floor(g, FLOOR, 18);
        for (let i = -3; i <= 3; i++) {
          this.box(props, [0.7, 2.2, 0.5], [i * 0.78, 1.1, -2.7], this.mat(i % 2 ? 0x1a1a1a : 0x2b2b2b, 0.7, 0.1));
          this.box(props, [0.05, 0.5, 0.05], [i * 0.78 + 0.25, 1.2, -2.42], this.mat(ACC, 0.4, 0.3));
        }
        const mirror = this.box(props, [1.4, 1.9, 0.05], [2.6, 1.2, -1.4], this.mat(0xe8e8e8, 0.08, 0.6), -Math.PI / 4);
        mirror.material.envMapIntensity = 2;
        this.box(props, [1.4, 0.4, 0.5], [-1.9, 0.2, -0.8], this.mat(INK, 0.8));
        accentLight.color.setHex(ACC); accentLight.intensity = 0.5; accentLight.position.set(0, 2, -1);
        break;
      }
      default: {
        this.floor(g, FLOOR, 18);
      }
    }

    g.userData.accentLight = accentLight;
    g.userData.name = name;
    return g;
  }

  envFor(name) {
    const key = `${name}:${this.mood}`;
    if (!this.envCache[key]) this.envCache[key] = this.buildEnv(name);
    return this.envCache[key];
  }

  // ---------------- TRANSITIONS (300–900ms) ----------------
  goTo(envName, { avatarAction = "idle", camPos, camTarget, onMid } = {}) {
    if (this.transitioning) return;
    const veil = document.getElementById("transition-veil");
    const reduce = this.reducedMotion;
    this.transitioning = true;

    const apply = () => {
      if (this.currentEnv) this.envGroup.remove(this.currentEnv);
      this.currentEnv = this.envFor(envName);
      this.envGroup.add(this.currentEnv);
      this.idleAction = avatarAction;
      this.moveTarget = null;
      this.avatar.setAction(avatarAction);
      if (camPos && camTarget) this.setCameraGoal(camPos, camTarget);
      if (onMid) onMid();
    };

    if (reduce) {
      apply(); this.transitioning = false; return;
    }
    veil.classList.add("on");
    setTimeout(() => {
      apply();
      setTimeout(() => { veil.classList.remove("on"); this.transitioning = false; }, 180);
    }, 300);
  }

  setCameraGoal(pos, target) {
    // encuadre RELATIVO al personaje: la cámara viaja con él adonde vaya
    const A = this.avatar.group.position;
    this.camGoalOffset = new THREE.Vector3(pos[0] - target[0], pos[1] - target[1], pos[2] - target[2]);
    this.camTgtOffset = new THREE.Vector3(target[0] - A.x, target[1], target[2] - A.z);
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    if (this.renderer) this.renderer.setSize(w, h, false);
    if (this.fallback2d) this.fallback2d.resize();
    this.camera.aspect = w / h;
    // mobile: frame the avatar bigger
    this.camera.fov = w < 700 ? 40 : 34;
    this.camera.updateProjectionMatrix();
  }

  raycastNDC(x, y, objects) {
    const rc = new THREE.Raycaster();
    rc.setFromCamera(new THREE.Vector2(x, y), this.camera);
    return rc.intersectObjects(objects, true);
  }

  // ---------------- LOOP ----------------
  update() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;
    this.avatar.update(dt, this.reducedMotion);
    this.integrateMove(dt);

    // CORE follows avatar shoulder
    const c = this.core;
    c.phase += dt;
    const A = this.avatar.group.position;
    const targetPos = new THREE.Vector3(A.x + 0.55, 1.35 + Math.sin(c.phase * 1.2) * 0.05, A.z + 0.35);
    c.group.position.lerp(targetPos, 1 - Math.pow(0.001, dt));
    c.orb.rotation.y += dt * 0.6; c.orb.rotation.x += dt * 0.25;
    c.ring.rotation.z += dt * 0.8;
    const pulse = c.mood === "alert" ? 3.5 : 1.6;
    c.light.intensity = pulse * (0.85 + Math.sin(c.phase * 2.4) * 0.15) * (this.mood === "noche" ? 1.5 : 0.8);
    c.halo.scale.setScalar(1 + Math.sin(c.phase * 2.4) * 0.08);

    // camera: sigue al personaje con el encuadre orbital elegido
    const A3 = this.avatar.group.position;
    const tg = new THREE.Vector3(A3.x + this.camTgtOffset.x, this.camTgtOffset.y, A3.z + this.camTgtOffset.z);
    const goal = new THREE.Vector3().copy(tg).add(this.camGoalOffset);
    this.camera.position.lerp(goal, 1 - Math.pow(0.004, dt));
    this.camera.lookAt(tg);

    // motes drift
    this.motes.rotation.y += dt * 0.014;
    this.motes.position.y = Math.sin(t * 0.2) * 0.05;

    if (this.renderer) this.renderer.render(this.scene, this.camera);
    else {
      if (!this.fallback2d) {
        this.fallback2d = new Fallback2D(this.canvas, this.avatar);
        this.canvas = this.fallback2d.canvas;
      }
      this.fallback2d.env = (this.currentEnv && this.currentEnv.userData.name) || "home";
      this.fallback2d.reducedMotion = this.reducedMotion;
      this.fallback2d.draw(t, this.core);
    }
  }
}
