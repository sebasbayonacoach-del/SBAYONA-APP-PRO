// ============================================================
// BAYONA — ONBOARDING ÚNICO: crea tu personaje y tu perfil BAYONA
// Un solo proceso de bienvenida (antes había dos). Conserva lo escrito al
// retroceder, permite omitir lo opcional y termina en una acción real.
// ============================================================
import { S } from "./state.js";
import { esc } from "./i18n.js";
import { setConsent, migrateLegacyConsents } from "./consents.js";

migrateLegacyConsents();

const SKINS = ["#e8b892", "#c98d5f", "#a06a3f", "#7a4a29", "#54301a", "#f0c9a5"];
const GOALS = ["FUERZA", "HIPERTROFIA", "RESISTENCIA", "SALUD"];
const EXP = ["EMPIEZO AHORA", "ALGO DE EXPERIENCIA", "ENTRENO HACE AÑOS"];
const AVAIL = ["2 DÍAS/SEMANA", "3 DÍAS/SEMANA", "4-5 DÍAS/SEMANA", "CASI A DIARIO"];
const EQUIP = ["SIN EQUIPAMIENTO", "MANCUERNAS/BANDAS", "GIMNASIO COMPLETO"];

const st = {
  step: 0,
  name: "", goal: "FUERZA", experience: EXP[1], availability: AVAIL[1], equipment: EQUIP[1],
  skinIdx: 0, face: null, skinHex: null,
  consentVision: false, consentHealth: false,
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
    S.onboard({
      name: st.name || "ATLETA",
      goal: st.goal,
      experience: st.experience,
      availability: st.availability,
      equipment: st.equipment,
      skin: st.skinIdx,
      face: st.face,
      skinHex: st.skinHex,
      consents: { vision: st.consentVision, health: st.consentHealth },
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
  const skin = `rgb(${Math.round(r / n)},${Math.round(g / n)},${Math.round(b / n)})`;
  return { face, skin };
}

const css = `
#ob-layer{position:fixed;inset:0;z-index:120;background:color-mix(in srgb, var(--paper) 91%, transparent);display:flex;
  align-items:center;justify-content:center;padding:16px;font:14px/1.5 Manrope,system-ui}
#ob-box{background:var(--paper-2);border:1px solid var(--hair);border-radius:16px;max-width:380px;width:100%;padding:22px;color:var(--ink);max-height:92vh;overflow:auto;
  box-shadow:var(--shadow-lift);position:relative;animation:modalIn .55s var(--spring) both}
#ob-box::before{content:"";position:absolute;left:14px;right:14px;top:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent)}
#ob-box h2{margin:0 0 4px;font:800 18px/1.1 Archivo Black,Arial;letter-spacing:.02em;
  background:var(--metal);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}
#ob-box .ob-sub{font-size:13px;line-height:1.55;color:var(--ink-soft);margin-bottom:14px}
#ob-box .ob-row{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}
#ob-box button{border:1px solid var(--hair-strong);border-radius:10px;background:var(--panel);color:var(--ink);
  font:700 13px/1 Manrope;padding:11px 14px;cursor:pointer;transition:transform .18s var(--spring),border-color .2s,box-shadow .25s}
#ob-box button:hover{border-color:var(--acc-2);box-shadow:0 0 0 3px var(--acc-soft)}
#ob-box button:active{transform:scale(.97)}
#ob-box button.on{background:var(--ink);color:var(--paper-2);border-color:var(--ink)}
#ob-box button.big{width:100%;background:linear-gradient(140deg,var(--acc-1),var(--acc-2) 62%,var(--acc-deep));color:var(--acc-ink);padding:14px;font-size:14px;margin-top:18px;border-color:transparent}
#ob-box button.ob-back{background:var(--panel);color:var(--ink);border:1px solid var(--hair-strong)}
#ob-box input[type=text],#ob-box input:not([type]){width:100%;padding:11px;border:1px solid var(--hair-strong);border-radius:10px;background:var(--panel);color:var(--ink);
  font:14px Manrope;margin:6px 0;box-sizing:border-box}
#ob-box label{font-size:11px;font-weight:700;letter-spacing:.06em;color:var(--ink-mute);display:block;margin:18px 0 6px}
#ob-box label.ob-file{display:inline-block;background:var(--panel);border:1px solid var(--hair-strong);border-radius:10px;padding:11px 14px;cursor:pointer;margin:0}
#ob-box .ob-check{display:flex;gap:8px;align-items:flex-start;margin:10px 0;font-size:12px}
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
