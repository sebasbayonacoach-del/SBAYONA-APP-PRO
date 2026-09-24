// ============================================================
// BAYONA — ONBOARDING ÚNICO: crea tu personaje y tu perfil BAYONA
// Un solo proceso de bienvenida (antes había dos). Conserva lo escrito al
// retroceder, permite omitir lo opcional y termina en una acción real.
// ============================================================
import { S } from "./state.js";
import { esc } from "./i18n.js";
import { setConsent, migrateLegacyConsents } from "./consents.js";

migrateLegacyConsents();

const SKINS = ["#e0e0e0", "#c9c9c9", "#a6a6a6", "#808080", "#5c5c5c", "#3a3a3a"];
const GOALS = ["FUERZA", "HIPERTROFIA", "RESISTENCIA", "SALUD"];
const EXP = ["EMPIEZO AHORA", "ALGO DE EXPERIENCIA", "ENTRENO HACE AÑOS"];
const AVAIL = ["2 DÍAS/SEMANA", "3 DÍAS/SEMANA", "4-5 DÍAS/SEMANA", "CASI A DIARIO"];
const EQUIP = ["SIN EQUIPAMIENTO", "MANCUERNAS/BANDAS", "GIMNASIO COMPLETO"];

const st = {
  step: 0,
  name: "", goal: "FUERZA", experience: EXP[1], availability: AVAIL[1], equipment: EQUIP[1],
  skinIdx: 0, face: null, skinHex: null, avatar3d: null,
  consentVision: false, consentHealth: false, consentAvatar3d: false,
};

const el = (html) => {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstChild;
};

function dots() {
  return `<div id="ob-dots">${[0, 1, 2, 3].map((i) => `<i class="${i === st.step ? "on" : ""}"></i>`).join("")}</div>`;
}
function chipRow(key, values) {
  return `<div class="ob-row">${values.map((v) =>
    `<button data-k="${key}" data-v="${esc(v)}" class="${st[key] === v ? "on" : ""}">${esc(v)}</button>`).join("")}</div>`;
}

function view() {
  if (st.step === 0) return `
    ${dots()}
    <h2>CREA TU PERSONAJE</h2>
    <div class="ob-sub">Cuidar a tu personaje es cuidarte a ti. Este es el comienzo de tu historia.</div>
    <label>TU NOMBRE O APODO (opcional)</label>
    <input id="ob-name" maxlength="18" placeholder="p. ej. Sebas" value="${esc(st.name)}" />
    <label>TONO DE PIEL</label>
    <div class="ob-row" id="ob-skins">${SKINS.map((s, i) =>
      `<button data-skin="${i}" style="width:38px;height:38px;border-radius:50%;background:${s};border:3px solid ${i === st.skinIdx ? "var(--acc-2)" : "transparent"};box-shadow:${i === st.skinIdx ? "0 0 12px var(--acc-2)" : "none"}"></button>`).join("")}</div>
    <label>FOTO (opcional) · será la cara de tu personaje, solo en tu dispositivo</label>
    <div class="ob-row">
      <label class="ob-file">SUBIR FOTO<input type="file" id="ob-face" accept="image/*" hidden /></label>
      <span id="ob-face-ok" style="font-size:12px;align-self:center"></span>
    </div>
    <label>AVATAR 3D (opcional) · tu cuerpo completo en el juego</label>
    <div class="ob-row">
      <button type="button" id="ob-a3d" style="border-color:var(--acc-2);font-weight:800">CREAR MI AVATAR 3D ◈</button>
      <span id="ob-a3d-ok" style="font-size:12px;align-self:center"></span>
    </div>
    <div class="ob-check"><input type="checkbox" id="ob-ca3" ${st.consentAvatar3d ? "checked" : ""} />
      <span><b>Avatar 3D:</b> tu selfie se procesa en Avaturn para crear el cuerpo 3D. Sin esto juegas con tu foto, y lo creas cuando quieras en APARIENCIA.</span></div>
    <button class="big" id="ob-next">CONTINUAR →</button>`;

  if (st.step === 1) return `
    ${dots()}
    <h2>TU OBJETIVO</h2>
    <div class="ob-sub">Define tus misiones y tu plan. Lo cambiarás cuando quieras.</div>
    <label>¿QUÉ QUIERES LOGRAR PRIMERO?</label>
    ${chipRow("goal", GOALS)}
    <label>EXPERIENCIA PREVIA</label>
    ${chipRow("experience", EXP)}
    <button class="big" id="ob-next">CONTINUAR →</button>
    <button class="big ob-back" id="ob-back">← ATRÁS</button>`;

  if (st.step === 2) return `
    ${dots()}
    <h2>TU DISPONIBILIDAD</h2>
    <div class="ob-sub">Esto CAMBIA de verdad tus opciones: el plan se ajusta a tu tiempo y tu material.</div>
    <label>¿CUÁNTO PUEDES ENTRENAR?</label>
    ${chipRow("availability", AVAIL)}
    <label>¿QUÉ EQUIPAMIENTO TIENES?</label>
    ${chipRow("equipment", EQUIP)}
    <button class="big" id="ob-next">CONTINUAR →</button>
    <button class="big ob-back" id="ob-back">← ATRÁS</button>`;

  return `
    ${dots()}
    <h2>TU PRIVACIDAD</h2>
    <div class="ob-sub">Cada permiso se activa solo si TÚ quieres y lo revocas cuando quieras (MÁS → Privacidad).</div>
    <div class="ob-check"><input type="checkbox" id="ob-cv" ${st.consentVision ? "checked" : ""} />
      <span><b>Cámara y movimiento:</b> cuenta tus reps y conduce tu personaje. <b>El vídeo NUNCA sale de tu dispositivo.</b></span></div>
    <div class="ob-check"><input type="checkbox" id="ob-ch" ${st.consentHealth ? "checked" : ""} />
      <span><b>Salud y bienestar:</b> Mapa de Salud (screening, nunca diagnóstico) con derivación profesional cuando toca.</span></div>
    <button class="big" id="ob-done">EMPEZAR MI CAMINO ◈</button>
    <button class="big ob-back" id="ob-back">← ATRÁS</button>`;
}

function render(box) {
  box.innerHTML = view(); // plantilla con datos YA escapados
  const q = (s) => box.querySelector(s);
  box.querySelectorAll("[data-k]").forEach((b) => {
    b.onclick = () => { st[b.dataset.k] = b.dataset.v; render(box); };
  });
  box.querySelectorAll("[data-skin]").forEach((b) => {
    b.onclick = () => { st.skinIdx = +b.dataset.skin; render(box); applyAvatar(); };
  });
  const fi = q("#ob-face");
  fi && (fi.onchange = async () => {
    const f = fi.files && fi.files[0];
    if (!f) return;
    try {
      const { face, skin } = await processFace(f);
      st.face = face;
      st.skinHex = skin;
      q("#ob-face-ok").textContent = "Foto lista ✓";
      applyAvatar();
    } catch {
      q("#ob-face-ok").textContent = "No se pudo procesar la imagen";
    }
  });
  const ca3 = q("#ob-ca3");
  ca3 && (ca3.onchange = () => { st.consentAvatar3d = ca3.checked; });
  const a3btn = q("#ob-a3d");
  const a3ok = () => {
    const s = q("#ob-a3d-ok");
    if (s) s.textContent = st.avatar3d ? "Avatar 3D listo ✓" : "";
  };
  a3ok();
  a3btn && (a3btn.onclick = async () => {
    st.consentAvatar3d = q("#ob-ca3")?.checked || false;
    if (!st.consentAvatar3d) {
      a3btn.textContent = "MARCA EL PERMISO AVATAR 3D ↑";
      setTimeout(() => { a3btn.textContent = "CREAR MI AVATAR 3D ◈"; }, 2200);
      return;
    }
    a3btn.textContent = "ABRIENDO CREADOR…";
    try {
      const { openCreatorModal } = await import("./avatar3d.js");
      setConsent("avatar_3d", true);
      openCreatorModal({
        onNeedConsent: () => q("#ob-ca3")?.checked || st.consentAvatar3d,
        onExport: (desc) => {
          st.avatar3d = desc;
          a3ok();
          applyAvatar3d();
          import("./ui.js").then(({ toast }) =>
            toast("AVATAR 3D LISTO", "Tu 3D entra contigo al DÍA 1", "gold"));
        },
      });
    } catch {
      const s = q("#ob-a3d-ok");
      if (s) s.textContent = "Sin conexión al creador: sigues con tu foto";
    }
    a3btn.textContent = "CREAR MI AVATAR 3D ◈";
  });
  q("#ob-next") && (q("#ob-next").onclick = () => {
    if (st.step === 0) st.name = q("#ob-name").value.trim();
    st.step++;
    render(box);
  });
  q("#ob-back") && (q("#ob-back").onclick = () => { st.step--; render(box); }); // lo escrito se conserva
  q("#ob-done") && (q("#ob-done").onclick = () => {
    st.consentVision = q("#ob-cv").checked;
    st.consentHealth = q("#ob-ch").checked;
    if (st.consentVision) setConsent("vision", true);
    if (st.consentHealth) setConsent("health", true);
    if (st.consentAvatar3d) setConsent("avatar_3d", true);
    S.onboard({
      name: st.name || "ATLETA",
      goal: st.goal,
      experience: st.experience,
      availability: st.availability,
      equipment: st.equipment,
      skin: st.skinIdx,
      face: st.face,
      skinHex: st.skinHex,
      avatar3d: st.avatar3d || null,
      consents: { vision: st.consentVision, health: st.consentHealth, avatar_3d: st.consentAvatar3d },
    });
    S.addXP(25, "discipline");
    document.getElementById("ob-layer")?.remove();
    import("./ui.js").then(({ toast }) => {
      toast("BIENVENIDO AL DÍA 1", `${st.name || "ATLETA"} · tu primera misión te espera · +25 XP`, "gold");
    });
    // la primera acción realizable: entrenamiento de hoy (o flujo de recuperación)
    import("./ui/shared.js").then(({ UI }) => {
      setTimeout(() => {
        const w = S.todayWorkout();
        UI.actions.openTraining?.(w ? w.id : "mobility_flow");
      }, 600);
    });
  });
}

function applyAvatar() {
  import("./ui/shared.js").then(({ UI }) => {
    const av = UI.W?.avatar;
    if (!av) return;
    av.setSkin(st.skinHex || SKINS[st.skinIdx]);
    if (st.face) av.setFace(st.face);
  });
}

/** Vista previa del 3D en cuanto se exporta (si falla, el de la foto sigue). */
function applyAvatar3d() {
  import("./ui/shared.js").then(({ UI }) => {
    if (!UI.W || !st.avatar3d) return;
    import("./avatar3d.js").then(({ attachAvatar3d }) => attachAvatar3d(UI.W, st.avatar3d).catch(() => {}));
  });
}

/** Procesa la foto localmente (redimensionada) para la cara del avatar. */
async function processFace(file) {
  const img = await new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = URL.createObjectURL(file);
  });
  const size = 128;
  const cv = document.createElement("canvas");
  cv.width = size; cv.height = size;
  const cx = cv.getContext("2d");
  const side = Math.min(img.width, img.height);
  cx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
  const face = cv.toDataURL("image/jpeg", 0.82);
  // tono de piel: promedio del centro
  const d = cx.getImageData(size / 2 - 8, size / 2 - 8, 16, 16).data;
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
  const n = d.length / 4;
  // MONO: tono de piel → gris de la misma luminosidad (paleta estricta)
  const lum = Math.max(40, Math.min(235, Math.round((0.299 * r + 0.587 * g + 0.114 * b) / n)));
  const skin = `rgb(${lum},${lum},${lum})`;
  return { face, skin };
}

const css = `
#ob-layer{position:fixed;inset:0;z-index:120;background:color-mix(in srgb, var(--paper) 91%, transparent);display:flex;
  align-items:center;justify-content:center;padding:16px;font:14px/1.5 Manrope,system-ui}
#ob-box{background:var(--paper-2);border:1px solid var(--hair);border-radius:2px;max-width:380px;width:100%;padding:22px;color:var(--ink);max-height:92vh;overflow:auto;
  box-shadow:var(--shadow-lift);position:relative;animation:modalIn .55s var(--spring) both;
  scrollbar-width:thin;scrollbar-color:var(--hair-strong) transparent}
#ob-box::-webkit-scrollbar{width:4px}
#ob-box::-webkit-scrollbar-thumb{background:var(--hair-strong)}
#ob-box::-webkit-scrollbar-track{background:transparent}
#ob-box::before{content:"";position:absolute;left:0;right:0;top:0;height:2px;background:var(--acc-2)}
#ob-box h2{margin:0 0 4px;font:800 18px/1.1 Archivo Black,Arial;letter-spacing:.02em;color:var(--ink)}
#ob-box .ob-sub{font-size:13px;line-height:1.55;color:var(--ink-soft);margin-bottom:14px}
#ob-box .ob-row{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}
#ob-box button{border:1px solid var(--hair-strong);border-radius:2px;background:var(--panel);color:var(--ink);
  font:700 13px/1 Manrope;padding:11px 14px;cursor:pointer;transition:transform .18s var(--spring),border-color .2s,box-shadow .25s}
#ob-box button:hover{border-color:var(--acc-2);box-shadow:0 0 0 3px var(--acc-soft)}
#ob-box button:active{transform:scale(.97)}
#ob-box button.on{background:var(--ink);color:var(--paper-2);border-color:var(--ink)}
#ob-box button.big{width:100%;background:var(--acc-2);color:var(--acc-ink);padding:16px;font-size:14px;font-weight:800;min-height:56px;margin-top:18px;border-color:transparent}
#ob-box button.ob-back{background:var(--panel);color:var(--ink);border:1px solid var(--hair-strong)}
#ob-box input[type=text],#ob-box input:not([type]){width:100%;padding:11px;border:1px solid var(--hair-strong);border-radius:2px;background:var(--panel);color:var(--ink);
  font:14px Manrope;margin:6px 0;box-sizing:border-box}
#ob-box label{font-size:11px;font-weight:700;letter-spacing:.06em;color:var(--ink-mute);display:block;margin:14px 0 6px}
#ob-box label.ob-file{display:inline-block;background:var(--panel);border:1px solid var(--hair-strong);border-radius:2px;padding:11px 14px;cursor:pointer;margin:0}
#ob-box .ob-check{display:flex;gap:10px;align-items:flex-start;margin:10px 0;font-size:12px}
#ob-box .ob-check input[type=checkbox]{width:22px;height:22px;accent-color:var(--acc-2);margin:0;flex:0 0 auto;cursor:pointer}
#ob-dots{display:flex;gap:6px;justify-content:center;margin-bottom:12px}
#ob-dots i{width:7px;height:7px;border-radius:50%;background:var(--hair-strong);transition:all .3s var(--ease)}
#ob-dots i.on{background:var(--acc-2);box-shadow:0 0 10px var(--acc-2);transform:scale(1.25)}
`;

function boot(retries = 20) {
  if (document.getElementById("ob-layer")) return;
  if (!S.data) {
    if (retries > 0) setTimeout(() => boot(retries - 1), 250); // state aún no arranca
    return;
  }
  if (S.data.profile?.onboarded) return;
  document.head.appendChild(el(`<style>${css}</style>`));
  const layer = el(`<div id="ob-layer" role="dialog" aria-label="Bienvenida a BAYONA"><div id="ob-box"></div></div>`);
  document.body.appendChild(layer);
  render(layer.querySelector("#ob-box"));
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
}

export { st as __obState };
