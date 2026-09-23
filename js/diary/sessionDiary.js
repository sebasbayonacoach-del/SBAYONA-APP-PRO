// ============================================================
// BAYONA · DIARIO DE SESIÓN CINEMATOGRAFICO
// Consume los reps/scores REALES del GEMELO-1 (js/vision/boot.js →
// evento 'bayona:set-complete') y los convierte en un diario
// narrado: escenas por serie, repetición héroe, la que costó,
// arco de fatiga y epílogo con veredicto.
// Núcleo puro (testeable en Node) + capa DOM fina y autoinyectada.
// Todo texto pintado con innerHTML pasa por escHtml() (= esc() de js/i18n.js).
// ============================================================
import { esc, t } from '../i18n.js';
import { migrateLegacyConsents } from '../consents.js';

// Consentimientos centralizados: migra claves antiguas (incluida la clave rota '***') al arrancar.
migrateLegacyConsents();

export const EX_NAMES = {
  squat: 'SENTADILLA', press: 'PRESS MILITAR', pullup: 'DOMINADAS',
  deadlift: 'PESO MUERTO', lunge: 'ZANCADA', plank: 'PLANCHÓN', mobility: 'MOVILIDAD',
};

const CHAPTERS = ['EL PRIMER FUEGO', 'EL PULSO', 'LA RESISTENCIA', 'EL LÍMITE', 'EL CIERRE', 'LA VUELTA A CASA'];
const HEADLINES = { S: 'IMPACTANTE', A: 'SÓLIDO', B: 'HONESTO', C: 'DIFÍCIL', D: 'UN ACTO DE FE', '—': 'SIN CÁMARA, CON TRABAJO' };
const CLOSINGS = {
  S: 'Saliste mejor de cómo entraste. Esto es la demostración.',
  A: 'Trabajo limpio. El tipo de día que construye atletas.',
  B: 'Trabajo honesto. Hay base y hay techo — y eso está bien.',
  C: 'Los días así existen. El cuerpo aprendió igual.',
  D: 'Apareciste. Ese es siempre el primer acto de la historia.',
  '—': 'Sin números que exhibir, con trabajo que cuenta.',
};

const avg = (xs) => xs.reduce((s, v) => s + v, 0) / xs.length;
const stddev = (xs) => {
  if (xs.length < 2) return 0;
  const mu = avg(xs);
  return Math.sqrt(xs.reduce((s, v) => s + (v - mu) ** 2, 0) / xs.length);
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** Banda de nota por score (0-100) → 'S'|'A'|'B'|'C'|'D'|'—'. */
export function grade(score) {
  if (score == null || Number.isNaN(score)) return '—';
  if (score >= 95) return 'S';
  if (score >= 85) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  return 'D';
}

/** Escapa HTML de cualquier texto externo antes de pintarlo (delegado en esc() de i18n). */
export function escHtml(s) {
  return esc(s);
}

/**
 * Analiza un resumen de serie real del GEMELO-1.
 * @param {{exercise?:string, ts?:string, reps?:number, formScore?:number|null,
 *          fatiguePct?:number, rirEstimate?:number|null,
 *          repDetail?:Array<{n:number, romDeg?:number, durMs?:number, velocityLossPct?:number, score?:number}>}} summary
 */
export function analyzeSet(summary = {}) {
  const detail = Array.isArray(summary.repDetail) ? summary.repDetail.filter((r) => r && typeof r === 'object') : [];
  const scores = detail.map((r) => r.score).filter((v) => typeof v === 'number');
  const roms = detail.map((r) => r.romDeg).filter((v) => typeof v === 'number');

  const reps = Math.max(0, summary.reps ?? detail.length ?? 0);
  const avgScore = summary.formScore ?? (scores.length ? Math.round(avg(scores)) : null);

  const pick = (key) => (detail.length
    ? detail.reduce((best, r) => ((r[key] ?? -Infinity) > (best[key] ?? -Infinity) ? r : best))
    : null);
  const hero = scores.length ? detail.reduce((best, r) => ((r.score ?? -Infinity) > (best.score ?? -Infinity) ? r : best)) : null;
  const hardest = detail.some((r) => typeof r.velocityLossPct === 'number') ? pick('velocityLossPct') : null;

  return {
    exercise: summary.exercise || 'squat',
    exName: EX_NAMES[summary.exercise] || String(summary.exercise || 'ENTRENAMIENTO').toUpperCase(),
    ts: summary.ts || null,
    reps,
    avgScore,
    grade: grade(avgScore),
    hero,
    hardest,
    // 100 = todas las reps iguales; baja = altibajos
    consistency: scores.length >= 2 ? Math.round(clamp(100 - stddev(scores) * 4, 0, 100)) : (scores.length === 1 ? 100 : null),
    romAvg: roms.length ? Math.round(avg(roms)) : null,
    fatiguePct: Math.round(clamp(summary.fatiguePct ?? 0, 0, 100)),
    rirEstimate: summary.rirEstimate ?? null,
    empty: reps === 0,
  };
}

/**
 * Narración cinematográfica de una serie → ESCENA.
 * Determinista: mismos datos ⇒ misma escena.
 */
export function narrateSet(a, index = 0) {
  const chapter = a.empty ? 'SILENCIO EN EL SET' : CHAPTERS[Math.min(index, CHAPTERS.length - 1)];
  const lines = [];

  if (a.empty) {
    lines.push('Serie en blanco. Sin repeticiones — pero el intento queda en el diario.');
  } else {
    lines.push(`${a.reps} repeticiones bajo la mirada del GEMELO-1.`);
    if (a.romAvg != null) {
      lines.push(`Recorrido medio ${a.romAvg}° por repetición.`);
    }
    if (a.consistency != null) {
      const flavor = a.consistency >= 85 ? 'Un metrónomo.'
        : a.consistency >= 60 ? 'Altibajos naturales, como toca.'
          : 'Cada repetición fue un país distinto.';
      lines.push(`Consistencia ${a.consistency}/100 entre repeticiones. ${flavor}`);
    }
    if (a.hero && typeof a.hero.score === 'number') {
      lines.push(`La repetición del día: la #${a.hero.n} — ${a.hero.score}/100.`);
    }
    if (a.hardest && typeof a.hardest.velocityLossPct === 'number' && a.hardest.velocityLossPct > 15) {
      lines.push(`La #${a.hardest.n} costó: ${Math.round(a.hardest.velocityLossPct)}% de velocidad perdida. Ahí crece el personaje.`);
    }
    if (a.fatiguePct >= 40) {
      lines.push(`Cerraste con ${a.fatiguePct}% de fatiga: el esfuerzo fue real.`);
    }
  }

  const statParts = [
    `REPS ${a.reps}`,
    `TÉCNICA ${a.avgScore ?? '—'}/100`,
    `FATIGA ${a.fatiguePct}%`,
  ];
  if (a.rirEstimate != null) statParts.push(`RIR ${a.rirEstimate}`);

  return {
    chapter,
    exercise: a.exercise,
    exName: a.exName,
    headline: HEADLINES[a.grade],
    grade: a.grade,
    lines,
    statLine: statParts.join(' · '),
    spotlight: a.hero && !a.empty ? `REP HÉROE #${a.hero.n}` : null,
    ts: a.ts,
  };
}

/**
 * Construye el diario completo de una sesión (lista de summaries del GEMELO-1).
 * @param {Array<object>} setSummaries
 * @param {{startedAt?:string, title?:string}} meta
 */
export function buildDiary(setSummaries = [], meta = {}) {
  const sets = [...setSummaries].sort((x, y) => String(x?.ts || '').localeCompare(String(y?.ts || '')));
  const analyses = sets.map(analyzeSet);
  const scenes = analyses.map((a, i) => narrateSet(a, i));

  const scored = analyses.filter((a) => a.avgScore != null);
  const totalReps = analyses.reduce((s, a) => s + a.reps, 0);
  const avgScore = scored.length ? Math.round(avg(scored.map((a) => a.avgScore))) : null;
  const maxFatigue = analyses.reduce((m, a) => Math.max(m, a.fatiguePct), 0);

  // MVP: escena con mejor técnica (empate → la primera)
  let mvpIndex = -1;
  analyses.forEach((a, i) => {
    if (a.avgScore == null) return;
    if (mvpIndex === -1 || a.avgScore > analyses[mvpIndex].avgScore) mvpIndex = i;
  });

  const g = grade(avgScore);
  const date = (meta.startedAt || sets[0]?.ts || new Date().toISOString()).slice(0, 10);

  return {
    title: meta.title || 'DIARIO DE SESIÓN',
    date,
    subtitle: `${analyses.length} escena(s) · GEMELO-1`,
    scenes,
    epilogue: {
      totals: {
        sets: analyses.length,
        reps: totalReps,
        avgScore,
        maxFatigue,
        gradedSets: scored.length,
      },
      mvp: mvpIndex >= 0 ? { setIndex: mvpIndex, chapter: scenes[mvpIndex].chapter, score: analyses[mvpIndex].avgScore } : null,
      closing: CLOSINGS[g],
    },
    grade: g,
  };
}

// ---------------- persistencia (inyectable → testeable) ----------------
const DIARY_KEY = 'bayona.diary.v1';

let storageFailed = false;

/** Fallo de almacenamiento: evento global + marca para el estado honesto de la UI. */
function notifyStorageError() {
  storageFailed = true;
  if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bayona:storage-error', { detail: { module: 'diary' } }));
  }
}

export function DiaryStore(storage) {
  return {
    load() {
      try {
        const list = JSON.parse(storage.getItem(DIARY_KEY) || '[]');
        return Array.isArray(list) ? list : [];
      } catch {
        // storage corrupto/ilegible: se avisa y se degrada a diario nuevo, sin drama
        notifyStorageError();
        return [];
      }
    },
    save(diary) {
      const list = this.load();
      list.unshift(diary);
      const out = list.slice(0, 30); // acotado: diarios, no Big Data
      try {
        storage.setItem(DIARY_KEY, JSON.stringify(out));
        storageFailed = false; // el último guardado fue bien: se limpia el aviso
      } catch {
        // almacenamiento lleno/bloqueado: se avisa (el diario sigue vivo en memoria)
        notifyStorageError();
      }
      return out;
    },
    latest() { return this.load()[0] || null; },
  };
}

// ---------------- sesión en vivo ----------------
const live = { sets: [], startedAt: null };

export function noteSet(summary = {}) {
  live.sets.push(summary);
  if (!live.startedAt) live.startedAt = summary.ts || new Date().toISOString();
  return live.sets.length;
}
export function resetSession() { live.sets = []; live.startedAt = null; }
export function liveDiary() { return buildDiary(live.sets.slice(), { startedAt: live.startedAt }); }
export function liveSetCount() { return live.sets.length; }

/** Cierra la sesión: construye el diario, lo guarda y vacía el buffer. */
export function finishSession() {
  const d = liveDiary();
  try {
    DiaryStore(globalThis.localStorage).save(d);
  } catch {
    // sin storage: se avisa (evento + estado honesto) y el diario se devuelve igual
    notifyStorageError();
  }
  resetSession();
  return d;
}

// ---------------- capa DOM (fina, autoinyectada) ----------------
function mountUI() {
  if (typeof document === 'undefined' || document.getElementById('bd-fab')) return;

  const fab = document.createElement('button');
  fab.id = 'bd-fab';
  fab.textContent = '🎬 DIARIO';
  fab.title = 'Diario de sesión cinematográfico';
  Object.assign(fab.style, {
    position: 'fixed', right: '12px', top: '58%', zIndex: 44,
    padding: '10px 14px', borderRadius: '999px', border: '1px solid var(--hair-strong)',
    background: 'var(--paper-2)', color: 'var(--acc-1)', font: '800 12px/1 "Archivo Black", sans-serif',
    cursor: 'pointer', boxShadow: '0 6px 24px #0006', letterSpacing: '.04em',
  });
  fab.addEventListener('click', () => {
    let d = null;
    try {
      d = liveSetCount() ? liveDiary() : DiaryStore(globalThis.localStorage).latest();
    } catch {
      // localStorage inaccesible (modo privado/bloqueado): aviso + estado honesto
      notifyStorageError();
    }
    openDiary(d);
  });
  document.body.appendChild(fab);
}

function sceneHtml(s, i) {
  const lines = s.lines.map((l) => `<li>${escHtml(l)}</li>`).join('');
  const spot = s.spotlight ? `<div class="bd-spot">★ ${escHtml(s.spotlight)}</div>` : '';
  return `<section class="bd-scene">
    <header>
      <span class="bd-chapter">CAPÍTULO ${['I', 'II', 'III', 'IV', 'V', 'VI'][Math.min(i, 5)]} · ${escHtml(s.chapter)}</span>
      <span class="bd-grade bd-g${escHtml(s.grade)}">${escHtml(s.grade)}</span>
    </header>
    <h3>${escHtml(s.exName)} — <em>${escHtml(s.headline)}</em></h3>
    <ul>${lines}</ul>
    ${spot}
    <footer>${escHtml(s.statLine)}</footer>
  </section>`;
}

/** Pinta el diario como recap cinematográfico a pantalla completa. */
export function openDiary(diary) {
  if (typeof document === 'undefined') return;
  document.getElementById('bd-overlay')?.remove();

  const ov = document.createElement('div');
  ov.id = 'bd-overlay';
  Object.assign(ov.style, {
    position: 'fixed', inset: '0', zIndex: 98, overflowY: 'auto',
    background: 'linear-gradient(180deg,var(--paper),var(--paper-2))', color: 'var(--ink)',
    padding: '28px 18px 40px', font: '14px/1.55 Manrope, sans-serif',
  });

  // estado honesto de almacenamiento (si hubo un fallo al guardar/leer)
  const head = `<style>
    .bd-storage{max-width:560px;margin:0 auto 14px;background:color-mix(in srgb, var(--danger) 16%, var(--paper-2));border:1px solid var(--danger);
      border-radius:10px;padding:10px 12px;font-size:12px;text-align:center;color:var(--ink)}
    .bd-empty .bd-close{margin-top:14px;padding:10px 16px;border-radius:10px;border:1px solid var(--acc-1);
      background:var(--acc-ink);color:var(--acc-1);font:800 12px/1 "Archivo Black",sans-serif;letter-spacing:.05em;cursor:pointer}
  </style>` + (storageFailed
    ? `<div class="bd-storage">⚠ ${escHtml(t('err.storage'))}</div>`
    : '');

  if (!diary || !diary.scenes?.length) {
    ov.innerHTML = `${head}<div class="bd-empty">🎬<h2>AÚN NO HAY ESCENAS</h2>
      <p>Haz una serie con el GEMELO-1 (cámara) y el diario escribirá tu sesión, repetición a repetición.</p>
      <button class="bd-close" type="button">CERRAR</button></div>`;
  } else {
    const { epilogue: ep } = diary;
    const mvp = ep.mvp ? `<div class="bd-mvp">🏆 MOMENTO DEL DÍA · ${escHtml(ep.mvp.chapter)} · ${escHtml(ep.mvp.score)}/100</div>` : '';
    ov.innerHTML = `${head}
      <style>
        .bd-head{text-align:center;margin-bottom:22px}
        .bd-head h1{font:800 22px/1.15 "Archivo Black",sans-serif;letter-spacing:.05em;margin:0}
        .bd-head .bd-sub{color:var(--acc-1);font-size:12px;letter-spacing:.12em;margin-top:6px}
        .bd-scene{max-width:560px;margin:0 auto 18px;background:var(--cream);border:1px solid var(--hair-strong);
          border-radius:14px;padding:16px 18px;animation:bdfade .5s ease both}
        .bd-scene:nth-child(odd){animation-delay:.12s}
        .bd-scene header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
        .bd-chapter{font:800 11px/1 "Archivo Black",sans-serif;letter-spacing:.14em;color:var(--acc-1)}
        .bd-grade{font:800 14px/1 "Archivo Black",sans-serif;padding:4px 8px;border-radius:8px}
        .bd-gS{background:var(--acc-1);color:var(--acc-ink)}.bd-gA{background:#7fbf7f;color:var(--acc-ink)}
        .bd-gB{background:#6f9fcf;color:var(--acc-ink)}.bd-gC{background:#cfa05a;color:var(--acc-ink)}
        .bd-gD{background:#b06a5a;color:#fff}.bd-g—{background:var(--hair-strong);color:var(--ink-soft)}
        .bd-scene h3{margin:0 0 8px;font:800 16px/1.2 "Archivo Black",sans-serif}
        .bd-scene h3 em{color:var(--acc-1);font-style:normal}
        .bd-scene ul{margin:0 0 10px;padding-left:18px}
        .bd-scene footer{font-size:12px;color:var(--ink-soft);letter-spacing:.04em;border-top:1px solid var(--hair-strong);padding-top:8px}
        .bd-spot{margin:8px 0;font:800 12px/1 "Archivo Black",sans-serif;color:var(--acc-1);letter-spacing:.08em}
        .bd-mvp{max-width:560px;margin:14px auto;text-align:center;font:800 13px/1 "Archivo Black",sans-serif;
          color:var(--acc-1);letter-spacing:.06em}
        .bd-epi{max-width:560px;margin:10px auto 0;border-top:2px solid var(--acc-1);padding-top:14px;text-align:center}
        .bd-epi .bd-tot{font-size:13px;letter-spacing:.05em;color:var(--ink-soft)}
        .bd-epi .bd-closing{margin:12px 0 16px;font:800 15px/1.4 "Archivo Black",sans-serif}
        .bd-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
        .bd-actions button{padding:11px 16px;border-radius:10px;border:1px solid var(--acc-1);cursor:pointer;
          font:800 12px/1 "Archivo Black",sans-serif;letter-spacing:.05em}
        .bd-close{background:var(--acc-ink);color:var(--acc-1)}
        .bd-finish{background:var(--acc-1);color:var(--acc-ink)}
        .bd-live{font-size:11px;color:var(--acc-2);letter-spacing:.14em;margin-top:4px}
        .bd-empty{max-width:420px;margin:15vh auto;text-align:center}
        @keyframes bdfade{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
      </style>
      <div class="bd-head">
        <h1>🎬 ${escHtml(diary.title)} · ${escHtml(diary.date)}</h1>
        <div class="bd-sub">${escHtml(diary.subtitle)} · NOTA GLOBAL ${escHtml(diary.grade)}</div>
        ${liveSetCount() ? '<div class="bd-live">● SESIÓN EN CURSO — el diario sigue escribiéndose</div>' : ''}
      </div>
      ${diary.scenes.map(sceneHtml).join('')}
      ${mvp}
      <div class="bd-epi">
        <div class="bd-tot">${escHtml(ep.totals.sets)} serie(s) · ${escHtml(ep.totals.reps)} reps · técnica media ${escHtml(ep.totals.avgScore ?? '—')}/100 · pico de fatiga ${escHtml(ep.totals.maxFatigue)}%</div>
        <div class="bd-closing">« ${escHtml(ep.closing)} »</div>
        <div class="bd-actions">
          ${liveSetCount() ? '<button class="bd-finish" type="button">TERMINAR SESIÓN Y GUARDAR</button>' : ''}
          <button class="bd-close" type="button">CERRAR</button>
        </div>
      </div>`;
  }

  ov.querySelector('.bd-close')?.addEventListener('click', () => ov.remove());
  ov.querySelector('.bd-finish')?.addEventListener('click', () => {
    // cierra la sesión REAL: lo que se muestra es exactamente el diario que se ha intentado guardar
    const closed = finishSession();
    ov.remove();
    openDiary(closed);
  });
  document.body.appendChild(ov);
}

// autoarranque en navegador: recolecta series del GEMELO-1 + botón flotante
if (typeof window !== 'undefined') {
  window.addEventListener('bayona:set-complete', (e) => {
    noteSet(e.detail || {});
    const fab = document.getElementById('bd-fab');
    if (fab) {
      fab.textContent = `🎬 DIARIO · ${liveSetCount()}×`;
      fab.style.boxShadow = '0 0 18px var(--acc-2)';
      setTimeout(() => { fab.style.boxShadow = '0 6px 24px #0006'; }, 1400);
    }
  });
  window.BAYONA_DIARY = { open: openDiary, finish: finishSession, live: liveDiary };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountUI, { once: true });
  else mountUI();
}
