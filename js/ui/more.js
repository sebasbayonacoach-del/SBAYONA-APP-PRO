// ============================================================
// BAYONA — MÁS: perfil, membresías, ajustes, privacidad real
// Exportar / eliminar datos funcionan de verdad. Todo en español.
// ============================================================
import { S } from "../state.js";
import { consentStatus, revokeConsent, isGranted } from "../consents.js";
import { pending, dead } from "../data/offlineQueue.js";
import { esc, fmtDate, fmtInt, t } from "../i18n.js";
import { elT } from "./shared.js";
import {
  UI, $, el, showModal, hideModal, toast, BUILDERS, openSection,
} from "./shared.js";
import { getAppearance, THEMES } from "./appearance.js";
import { diagnostico, instantaneas, previsualizar, restaurar } from "../backup.js";
import { currentSession, isConfigured } from "../sync/supabase.js";
import { openAccount } from "../sync/account.js";
import { showDayRecap } from "./cinematics.js";

BUILDERS.more = (body) => {
  body = body || $("#drawer-body");
  const d = S.data;
  body.textContent = "";

  // ---------- ADN BAYONA ----------
  body.appendChild(el("div", "sec-label", "ADN BAYONA"));
  body.appendChild(el("div", "card", `
    <div class="kv"><span class="k">NOMBRE</span><span class="v">${esc(d.profile.name || "ATLETA")}</span></div>
    <div class="kv"><span class="k">OBJETIVO</span><span class="v">${esc(d.profile.goal)}</span></div>
    <div class="kv"><span class="k">EXPERIENCIA</span><span class="v">${esc(d.profile.experience || t("state.notLogged"))}</span></div>
    <div class="kv"><span class="k">DISPONIBILIDAD</span><span class="v">${esc(d.profile.availability || t("state.notLogged"))}</span></div>
    <div class="kv"><span class="k">EQUIPAMIENTO</span><span class="v">${esc(d.profile.equipment || t("state.notLogged"))}</span></div>
    <div class="kv"><span class="k">COACH</span><span class="v">${esc(d.profile.coach)}</span></div>
    <div class="kv"><span class="k">RACHA</span><span class="v">${esc(d.stats.workouts)} entrenos · ${esc(d.streak)} días</span></div>
    <div class="kv"><span class="k">CUENTA</span><span class="v">${fmtInt(d.points)} ◆ PUNTOS BAYONA · ${fmtInt(d.credits)} ✦ CRÉDITOS</span></div>`));

  // ---------- RESUMEN DEL DÍA ----------
  body.appendChild(el("div", "sec-label", "MUNDOS Y HERRAMIENTAS"));
  const wgrid = el("div", "opt-row");
  [
    ["profile", "EDITAR MI PERFIL"], ["rhythm", "MI RITMO Y CICLO"],
    ["training", "ENTRENAMIENTO"], ["nutrition", "NUTRICIÓN"], ["recovery", "RECUPERACIÓN"],
    ["mind", "MENTE"], ["trabajo", "TRABAJO"], ["hoy", "HOY"],
    ["progress", "PROGRESO"], ["plan", "PLAN"], ["armory", "ARMARIO"], ["core", "CORE"],
  ].forEach(([k, nm]) => {
    const b = el("button", "opt", nm);
    b.type = "button";
    b.addEventListener("click", () => openSection(k));
    wgrid.appendChild(b);
  });
  body.appendChild(wgrid);

  body.appendChild(el("div", "sec-label", "RESUMEN DEL DÍA"));
  const rc = el("div", "card");
  rc.innerHTML = `<h4>CERRAR EL DÍA</h4><div class="sub">Un capítulo de tu día con lo que has registrado de verdad. Cada día cuenta.</div>`;
  const bR = el("button", "btn btn-gold btn-block", "RESUMEN DEL DÍA");
  bR.style.marginTop = "10px";
  bR.addEventListener("click", showDayRecap);
  rc.appendChild(bR);
  body.appendChild(rc);

  // ---------- MEMBRESÍAS ----------
  body.appendChild(el("div", "sec-label", "MEMBRESÍAS"));
  body.appendChild(el("div", "card", `
    <div class="card-row"><h4>GRATIS</h4><span class="pill green">ACTIVA</span></div>
    <div class="sub">Avatar, entrenos, XP, inventario básico, progreso y CORE básico. Producto útil, no demo frustrante.</div>`));
  body.appendChild(el("div", "card", `
    <div class="card-row"><h4>PRO</h4><span class="pill gold">PRÓXIMAMENTE</span></div>
    <div class="sub">CORE avanzado, plan adaptativo, macrociclo profesional, analítica profunda, nutrición avanzada, recuperación, contador de reps con cámara.<br>
    <b>PAGAR NO COMPRA NIVEL:</b> no compra fuerza, récords ni disciplina. Compra herramientas, personalización, analítica y acompañamiento.</div>`));
  body.appendChild(el("div", "card", `
    <div class="card-row"><h4>ÉLITE</h4><span class="pill">PRÓXIMAMENTE</span></div>
    <div class="sub">Todo lo de PRO + acompañamiento humano, revisiones y servicios premium.<br>
    <em>La facturación requiere backend: esta versión local no procesa pagos ni habla de planes como si estuvieran activos.</em></div>`));

  // ---------- CUENTA / NUBE ----------
  body.appendChild(el("div", "sec-label", "CUENTA"));
  const ses = currentSession();
  const cCard = el("div", "card shine");
  cCard.innerHTML = `
    <div class="card-row"><h4>${ses ? "BAYONA EN LA NUBE" : "GUARDADO LOCAL"}</h4>
      <span class="pill ${ses ? "green" : "gold"}">${ses ? "SINCRONIZADO" : isConfigured() ? "SIN SESIÓN" : "100 % LOCAL"}</span></div>
    <div class="sub">${ses
      ? "Cuenta activa. Tus datos son solo tuyos: cada fila está protegida por RLS y nunca se suben vídeos ni fotos."
      : "Todo tu progreso vive en este dispositivo. Con una cuenta ganas copia en la nube y cambio de dispositivo sin perder nada."}</div>`;
  const bC = el("button", "btn btn-primary btn-block", ses ? "GESTIONAR CUENTA Y SINCRONIZAR" : "CREAR CUENTA / ENTRAR");
  bC.style.marginTop = "12px";
  bC.addEventListener("click", openAccount);
  cCard.appendChild(bC);
  body.appendChild(cCard);

  // ---------- APARIENCIA ----------
  // ---------- COACH OS (profesional) ----------
  body.appendChild(el("div", "sec-label", "PROFESIONAL"));
  const coCard = el("div", "card shine");
  coCard.innerHTML = `
    <div class="card-row"><h4>BAYONA COACH OS</h4><span class="pill gold">CENTRO DE MANDO</span></div>
    <div class="sub">El sistema profesional del entrenador: clientes de hoy, fichas vivas, alertas y planificación. Tu ficha usa datos reales; la cartera de ejemplo va marcada.</div>`;
  const bCo = el("button", "btn btn-gold btn-block", "ABRIR COACH OS");
  bCo.style.marginTop = "10px";
  bCo.type = "button";
  bCo.addEventListener("click", () => openSection("coachos"));
  coCard.appendChild(bCo);
  body.appendChild(coCard);

  body.appendChild(el("div", "sec-label", "APARIENCIA"));
  const ap = getAppearance();
  const apTheme = THEMES.find((x) => x.id === ap.theme) || THEMES[0];
  const apCard = el("div", "card shine");
  apCard.innerHTML = `
    <div class="card-row"><h4>DISEÑO · MONO NARANJA</h4><span class="pill gold">${apTheme.name}</span></div>
    <div class="sub">Paleta estricta naranja · blanco · negro. Luz, densidad, esquinas y movimiento en vivo, guardados solo en este dispositivo.</div>
    <div class="kv"><span class="k">LUZ</span><span class="v">${ap.mode === "marfil" ? "BLANCO" : "NEGRO"}</span></div>
    <div class="kv"><span class="k">PALETA</span><span class="v">NARANJA</span></div>
    <div class="kv"><span class="k">MOVIMIENTO</span><span class="v">${ap.motion === "off" ? "NINGUNO" : ap.motion === "sereno" ? "SERENO" : "PLENO"}</span></div>`;
  const bAp = el("button", "btn btn-primary btn-block", "PERSONALIZAR INTERFAZ");
  bAp.style.marginTop = "12px";
  bAp.addEventListener("click", () => openSection("appearance"));
  apCard.appendChild(bAp);
  body.appendChild(apCard);

  // ---------- AJUSTES ----------
  body.appendChild(el("div", "sec-label", "AJUSTES"));
  const st = el("div", "card");
  const mk = (label, key) => {
    const b = el("button", "btn btn-block", `${label}: ${d.settings[key] ? "SÍ" : "NO"}`);
    b.style.marginBottom = "8px";
    b.addEventListener("click", () => {
      d.settings[key] = !d.settings[key];
      S.save();
      if (key === "motion" && UI.W) UI.W.reducedMotion = !d.settings.motion;
      BUILDERS.more();
    });
    return b;
  };
  st.append(mk("SONIDO", "sound"), mk("MOVIMIENTO (animaciones)", "motion"), mk("VIBRACIÓN", "haptics"));
  body.appendChild(st);

  // ---------- PRIVACIDAD ----------
  body.appendChild(el("div", "sec-label", "PRIVACIDAD Y DATOS"));
  const cons = consentStatus();
  const pv = el("div", "card");
  pv.innerHTML = `<h4>CONSENTIMIENTOS</h4>` + Object.entries(cons).map(([k, v]) => `
    <div class="kv"><span class="k">${esc(domainName(k))}</span><span class="v">${v.concedido ? "CONCEDIDO" : v.revocado ? "REVOCADO" : "SIN CONCEDER"}${v.desde ? " · desde " + esc(fmtDate(v.desde)) : ""}
      ${v.concedido ? `<button class="btn-mini" data-revoke="${esc(k)}">REVOCAR</button>` : ""}</span></div>`).join("");
  pv.querySelectorAll("[data-revoke]").forEach((b) => {
    b.onclick = () => { revokeConsent(b.dataset.revoke); toast("CONSENTIMIENTO REVOCADO", `${domainName(b.dataset.revoke)}: revocado.`); BUILDERS.more(); };
  });
  body.appendChild(pv);

  const notes = S.voiceNotes();
  const vn = el("div", "card");
  vn.innerHTML = `<h4>GRABACIONES DE VOZ</h4><div class="sub">${notes.length ? `${notes.length} grabación(es), solo en este dispositivo.` : "Sin grabaciones."}</div>`;
  if (notes.length) {
    const delv = el("button", "btn btn-danger btn-block", "ELIMINAR MIS GRABACIONES");
    delv.style.marginTop = "8px";
    delv.onclick = () => { S.data.voice = []; S.data.pastMessage = null; S.save(); toast("VOZ ELIMINADA", "Grabaciones borradas de este dispositivo."); BUILDERS.more(); };
    vn.appendChild(delv);
  }
  body.appendChild(vn);

  // estado offline (cola de sincronización honesto)
  const qn = pending().length, dn = dead().length;
  const off = el("div", "card");
  off.innerHTML = `<h4>ESTADO SIN CONEXIÓN</h4>
    <div class="sub">${esc(t("state.localOnly"))}. Pendientes de sincronizar: <b>${qn}</b> · en recuperación (revisar): <b>${dn}</b>.
    ${dn ? "Nada se descarta en silencio: los registros con fallos se conservan para recuperación." : ""}</div>`;
  body.appendChild(off);

  // ---------- RED DE SEGURIDAD DEL PROGRESO ----------
  body.appendChild(el("div", "sec-label", t("data.safetyLabel")));
  const diag = diagnostico();
  const shots = instantaneas();
  const safe = el("div", "card");
  safe.appendChild(elT("h4", "", t("data.safetyTitle")));
  safe.appendChild(elT("div", "sub", t("data.safetyNote")));

  const facts = el("div", "card");
  facts.innerHTML = `<div class="kv"><span class="k">${esc(t("data.safetyState"))}</span>
      <span class="v">${diag.partidaLegible ? esc(t("data.safetyOk")) : esc(t("data.safetyBad"))}</span></div>
    <div class="kv"><span class="k">${esc(t("data.safetyShots"))}</span>
      <span class="v">${diag.instantaneas} / ${diag.maxima}</span></div>
    <div class="kv"><span class="k">${esc(t("data.safetySize"))}</span>
      <span class="v">${(diag.bytesPartida / 1024).toFixed(1)} KB</span></div>`;
  safe.appendChild(facts);

  if (!diag.partidaLegible) {
    const warn = el("div", "media-caption", t("data.safetyBroken"));
    safe.appendChild(warn);
  }

  if (shots.length) {
    const lista = el("div", "data-shots");
    shots.slice(0, 5).forEach((s, i) => {
      const v = previsualizar(i) || {};
      const fila = el("div", "data-shot");
      fila.innerHTML = `<div><strong>${esc(new Date(s.at).toLocaleString("es-ES"))}</strong>
        <small>${esc(t("data.safetyShotN", { xp: fmtInt(v.xp || 0), w: fmtInt(v.entrainamientos || 0), sets: fmtInt(v.series || 0) }))}</small></div>`;
      const b = el("button", "btn-mini", esc(t("data.safetyRestore")));
      b.onclick = () => {
        showModal(`
          <div class="cine-tag">${esc(t("data.safetyRestoreTag"))}</div>
          <div class="cine-title" style="font-size:20px">${esc(t("data.safetyRestoreTitle"))}</div>
          <div class="sub">${esc(t("data.safetyRestoreText"))}</div>
          <div style="display:flex;gap:8px">
            <button class="btn grow" id="rs-no">${esc(t("data.safetyCancel"))}</button>
            <button class="btn btn-primary grow" id="rs-yes">${esc(t("data.safetyConfirm"))}</button>
          </div>`, () => {
          $("#rs-no").onclick = hideModal;
          $("#rs-yes").onclick = () => {
            if (restaurar(i)) { hideModal(); toast(t("data.safetyRestored"), t("data.safetyRestoredNote")); location.reload(); }
          };
        });
      };
      fila.appendChild(b);
      lista.appendChild(fila);
    });
    safe.appendChild(lista);
  }
  body.appendChild(safe);

  const exp = el("button", "btn btn-block", "EXPORTAR MIS DATOS (JSON)");
  exp.onclick = exportData;
  const del = el("button", "btn btn-danger btn-block", "ELIMINAR TODOS MIS DATOS");
  del.style.marginTop = "10px";
  del.addEventListener("click", () => {
    showModal(`
      <div class="cine-tag">ELIMINAR TODO</div>
      <div class="cine-title" style="font-size:20px">¿ELIMINAR TODOS TUS DATOS?</div>
      <div class="sub">Se borra tu progreso, inventario, fotos, voz y consentimientos de <b>este dispositivo</b>. No se puede deshacer. Si quieres conservar una copia, exporta antes.</div>
      <div style="display:flex;gap:8px">
        <button class="btn grow" id="d-no">CANCELAR</button>
        <button class="btn btn-danger grow" id="d-yes">ELIMINAR</button>
      </div>`, () => {
      $("#d-no").onclick = hideModal;
      $("#d-yes").onclick = () => {
        S.deleteAll();
        hideModal();
        location.reload();
      };
    });
  });
  body.append(exp, del);

  body.appendChild(el("div", "media-caption",
    "La exportación incluye: perfil, progreso (XP, niveles, habilidades), entrenamientos y series, comidas e hidratación, registros de recuperación, fotos de progreso, diario, voz, código phygital y preferencias. Las credenciales (si existieran) viajarían separadas y cifradas."));
};

function domainName(k) {
  return { vision: "CÁMARA Y MOVIMIENTO", health: "SALUD Y BIENESTAR", voice: "VOZ", photos: "FOTOS" }[k] || k.toUpperCase();
}

function exportData() {
  try {
    const data = S.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `bayona-datos-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast("EXPORTACIÓN", "Copia de tus datos descargada (JSON).");
  } catch (e) {
    toast("ERROR", "No se pudo exportar en este navegador.", "danger");
  }
}
