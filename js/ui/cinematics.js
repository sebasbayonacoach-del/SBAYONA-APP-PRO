// ============================================================
// BAYONA — CINEMÁTICAS: subida de nivel, récord, resumen del día
// Eventos proporcionados, sin tostadas vacías. Cifras SOLO reales.
// ============================================================
import { S } from "../state.js";
import { EXERCISES } from "../data.js";
import { prReward, workoutCompleteReward } from "../rewards.js";
import { esc, fmtDateLong, t } from "../i18n.js";
import {
  UI, $, el, elT, showModal, hideModal, toast, playTone, haptic,
} from "./shared.js";

export function showLevelUp(lvl) {
  UI.W?.avatar.setAction("celebrate");
  UI.W?.setCoreMood("gold");
  playTone(523, 0.12, () => playTone(659, 0.12, () => playTone(784, 0.2)));
  showModal(`
    <div class="cine-tag">EVOLUCIÓN</div>
    <div class="cine-title">NIVEL ${esc(lvl)}</div>
    <div class="cine-sub">Tu personaje evoluciona porque tú evolucionas.<br>RANGO: <b style="color:var(--gold)">${esc(S.rank())}</b></div>
    <div class="reward-line"><span>NUEVO NIVEL</span><b>${esc(lvl)}</b></div>
    <div class="reward-line"><span>DESBLOQUEOS</span><b>ARMARIO · MUNDO</b></div>
    <button class="btn btn-gold btn-block btn-big" id="m-ok">CONTINUAR LA HISTORIA</button>`,
    () => {
      $("#m-ok").onclick = () => {
        hideModal(); UI.W?.setCoreMood("calm"); UI.W?.avatar.setAction("idle");
      };
      playPastMessage();
    });
}

/** «Mensaje del tú del pasado»: se reproduce SOLO si existe grabación real. */
export function playPastMessage() {
  const id = S.data.pastMessage;
  const note = S.voiceNotes().find((n) => n.id === id && n.dataUrl);
  if (!note) return;
  try {
    const a = new Audio(note.dataUrl);
    a.play().catch(() => { /* el navegador puede bloquear autoplay */ });
  } catch { /* sin audio */ }
}

export function showPR(exKey, pr) {
  const E = EXERCISES[exKey] || { name: exKey };
  const R = prReward();
  S.logJourney("pr", `NUEVO RÉCORD · ${E.name} ${pr.kg} kg × ${pr.reps}`, R.xp);
  UI.W?.setCoreMood("gold");
  haptic(40);
  playTone(880, 0.1, () => playTone(1174, 0.18));
  showModal(`
    <div class="cine-tag">NUEVO RÉCORD PERSONAL</div>
    <div class="cine-title">${esc(E.name)}</div>
    <div class="cine-sub">${esc(pr.kg)} kg × ${esc(pr.reps)} · 1RM estimado ${esc(pr.e1)} kg</div>
    <div class="reward-line"><span>XP</span><b>+${R.xp}</b></div>
    <div class="reward-line"><span>PUNTOS BAYONA</span><b>+${R.points} ◆</b></div>
    <div class="reward-line"><span>HABILIDAD</span><b>FUERZA +${R.skillGain}</b></div>
    <button class="btn btn-gold btn-block btn-big" id="m-ok">SEGUIR</button>`,
    () => {
      $("#m-ok").onclick = () => { hideModal(); UI.W?.setCoreMood("calm"); };
      playPastMessage();
    });
}

export function showDayRecap() {
  const t2 = S.data.today;
  const grade = (pct) => (pct > 90 ? "A+" : pct > 75 ? "A" : pct > 60 ? "B+" : pct > 45 ? "B" : pct > 30 ? "C" : "D");
  const none = `<span style="color:var(--mute);font-size:12px">${esc(t("state.notLogged"))}</span>`;
  const rows = [];
  if (t2.trained || t2.trainingSets > 0) {
    const pct = t2.trained ? 85 + Math.min(15, t2.trainingSets) : Math.min(45, t2.trainingSets * 10);
    rows.push(["ENTRENAMIENTO", `${grade(pct)} <small style="color:var(--mute)">${t2.trainingSets} series</small>`]);
  } else rows.push(["ENTRENAMIENTO", none]);
  rows.push(["NUTRICIÓN", t2.meals.length ? `${grade(Math.min(100, (t2.kcal / 2000) * 80))} <small style="color:var(--mute)">${esc(t2.meals.length)} comidas</small>` : none]);
  rows.push(["MOVIMIENTO", t2.steps > 0 ? `${grade(Math.min(100, (t2.steps / 8000) * 100))} <small style="color:var(--mute)">${esc(t2.steps)} pasos</small>` : none]);
  rows.push(["HIDRATACIÓN", t2.water > 0 ? `${grade(Math.min(100, (t2.water / 2500) * 100))} <small style="color:var(--mute)">${esc(t2.water)} ml</small>` : none]);
  rows.push(["RECUPERACIÓN", t2.mobility || t2.sleep != null ? `${grade(((t2.sleep ?? 7) / 9) * 70 + (t2.mobility ? 30 : 0))}` : none]);
  rows.push(["MENTE", t2.mind > 0 ? `${grade(Math.min(100, t2.mind * 20))} <small style="color:var(--mute)">${esc(t2.mind)} min</small>` : none]);

  UI.W?.avatar.setAction("celebrate");
  showModal(`
    <div class="cine-tag">DÍA ${esc(S.dayNumber())} · ${esc(fmtDateLong(Date.now()))}</div>
    <div class="cine-title">TU DÍA, UN CAPÍTULO</div>
    <div class="cine-sub">Registros reales de hoy. Lo que no has registrado no se inventa.</div>
    ${rows.map(([k, v]) => `<div class="grade-row"><span class="g-k">${k}</span><span class="g-v">${v}</span></div>`).join("")}
    <div style="height:12px"></div>
    <div class="reward-line"><span>XP DEL DÍA</span><b>${esc(t2.xpGained)}</b></div>
    <button class="btn btn-primary btn-block btn-big" id="m-ok">GUARDAR EN MI HISTORIA</button>`,
    () => {
      $("#m-ok").onclick = () => {
        S.logJourney("day", `DÍA ${S.dayNumber()} · ${t2.trainingSets} series · ${t2.xpGained} XP`, t2.xpGained);
        hideModal(); UI.W?.avatar.setAction("idle");
      };
    });
}

/** Cierre honesto de sesión anticipada: explica QUÉ se guarda. */
export function confirmEarlyFinish({ loggedSets, plannedSets, minutes }) {
  const r = workoutCompleteReward({ minutes, loggedSets, plannedSets });
  return new Promise((resolve) => {
    showModal(`
      <div class="cine-tag">FINALIZAR ANTES DE TIEMPO</div>
      <div class="cine-title" style="font-size:22px">¿CERRAR LA SESIÓN?</div>
      <div class="cine-sub">Se conservan tus <b>${esc(loggedSets)}</b> series registradas (${esc(loggedSets)}/${esc(plannedSets)} previstas) con su XP ya ganado.<br>
      El bono de finalización sería <b>+${r.xp} XP · +${r.points} ◆</b>.<br>Una sesión parcia cuenta como actividad iniciada, no como objetivo cumplido.</div>
      <div style="display:flex;gap:8px">
        <button class="btn grow" id="m-keep">SEGUIR ENTRENANDO</button>
        <button class="btn btn-primary grow" id="m-finish">GUARDAR Y SALIR</button>
      </div>`, () => {
      $("#m-keep").onclick = () => { hideModal(); resolve(false); };
      $("#m-finish").onclick = () => { hideModal(); resolve(true); };
    });
  });
}
