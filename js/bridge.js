// BAYONA · bridge.js — PEGAMENTO: eventos del GEMELO-1 (cámara) y del Mapa de Salud
// → juego (estado + avatar). Escucha: 'bayona:set-complete' y 'bayona:healthmap'.
// REGLA: una serie entra por UN solo camino (S.logSet) con UNA sola recompensa.
// La idempotencia (idKey) evita que dobles clics o reintentos multipliquen XP.
import { S, emit, todayKey } from './state.js';
import { toast } from './ui.js';
import { healthMapReward } from './rewards.js';
import { enqueue, pending } from './data/offlineQueue.js';
import { archiveSet } from './engine.js';

const EX_NAME = { squat: 'SENTADILLA', press: 'PRESS MILITAR', pullup: 'DOMINADAS' };

function onSetComplete(summary) {
  if (!S.data) return;
  // id estable del evento de cámara → mismo evento nunca premia dos veces
  const idKey = summary.id || `cam:${summary.exercise}:${summary.ts || Date.now()}`;

  // registro ÚNICO: logSet calcula la recompensa (setReward) y la concede una vez
  const res = S.logSet(summary.exercise, 0, 0, summary.reps, summary.rirEstimate ?? 2, {
    idKey,
    seconds: summary.seconds || 0,
    formScore: summary.formScore ?? null,
    source: 'gemelo1',
  });
  if (!res) return; // duplicado: nada de XP extra

  // histórico real (tendencias, volumen, strain) — mismo camino que el registro manual
  try {
    archiveSet(summary.exercise, 0, summary.reps, summary.rirEstimate ?? 2);
  } catch { /* sin archivo */ }

  S.logJourney('training',
    `GEMELO-1 · ${EX_NAME[summary.exercise] || summary.exercise}: ${res.text} — serie capturada con tu cámara y procesada solo en tu dispositivo.`,
    res.xp);

  // cola offline (SOLO números). OJO: enqueue(summary, store) — el store va suelto.
  // boot.js ya encola esta serie con la MISMA idempotency-key → solo se encola si aún no está (sin duplicados).
  try {
    const already = pending(globalThis.localStorage).some((i) => i._key === idKey);
    if (!already) {
      enqueue({ kind: 'set_complete', ...summary, idempotencyKey: idKey }, globalThis.localStorage);
    }
  } catch {
    // error de cola NUNCA en silencio: se avisa globalmente (evento de ventana)
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bayona:storage-error', { detail: { module: 'bridge' } }));
      }
    } catch { /* sin DOM */ }
  }

  toast('SERIE REGISTRADA', `+${res.xp} XP · ${res.text}`, 'gold');
  emit('gemelo', summary);
}

function onHealthMap(hm) {
  if (!S.data) return;
  const r = healthMapReward(hm);
  S.addXP(r.xp, r.skill, r.skillGain);
  const flags = hm?.redFlags?.length
    ? ` · ${hm.redFlags.length} aviso(s) de seguridad → integrados en tus sesiones`
    : '';
  S.logJourney('health', `${r.text}: ${hm?.summary || ''}${flags}`, r.xp);
  // los avisos de salud se conectan con el inicio de entrenamiento (state.healthFlags)
  S.data.healthFlags = {
    at: todayKey(),
    redFlags: (hm?.redFlags || []).map((f) => (typeof f === 'string' ? f : f.msg || f.text || '')).filter(Boolean),
    pain: hm?.activePain || hm?.pain || [],
  };
  S.save();
  toast('MAPA DE SALUD', `+${r.xp} XP · ${r.text}`, 'gold');
  emit('healthmap', hm);
}

if (typeof window !== 'undefined') {
  window.addEventListener('bayona:set-complete', (e) => onSetComplete(e.detail || {}));
  window.addEventListener('bayona:healthmap', (e) => onHealthMap(e.detail || {}));
}

export { onSetComplete, onHealthMap };
