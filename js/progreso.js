// ============================================================
// BAYONA — PROGRESO HONESTO (P14)
// Series de gráfica (volumen · constancia · fuerza) SOLO con datos
// que la persona registró. Export de datos y borrado de cuenta con
// acuse descargable (GDPR).
//
// REGLAS DE ORO (marca):
//  1. "Lo que no se ha registrado no se inventa": los huecos del
//     histórico se devuelven como null (hueco honesto), nunca como
//     0 relleno para que la gráfica quede bonita. Un 0 es un dato;
//     un null es un "aquí no midió nadie".
//  2. "Descansar es progreso": la racha NO se rompe por descansar
//     (ver constancia()). Un día sin registro ni suma ni resta;
//     solo un hueco largo (ausencia, no descanso) empieza una racha
//     nueva.
//
// Módulo PURO: node, sin navegador, sin dependencias, sin tocar el
// estado de la app. Recibe datos planos y devuelve datos planos.
// ============================================================

/** Días de descanso tolerados entre días activos sin que la racha se
 *  reinicie. 2 días de descanso = descanso planificado (fin de semana,
 *  microciclo). A partir de HUECO_MAXIMO_DESCANSO + 1 días sin registrar
 *  actividad se considera AUSENCIA (no descanso) y la racha vuelve a
 *  empezar. Es la misma tolerancia que usa el estado global de la app. */
export const HUECO_MAXIMO_DESCANSO = 2;

const FECHA_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** 'YYYY-MM-DD' → número de día (UTC, libre de husos horarios). */
function diaNum(fecha) {
  const m = FECHA_RE.exec(String(fecha || ""));
  if (!m) return null;
  const n = Date.UTC(+m[1], +m[2] - 1, +m[3]) / 864e5;
  return Number.isFinite(n) ? n : null;
}

/** número de día → 'YYYY-MM-DD' (UTC). */
function diaStr(n) {
  const d = new Date(n * 864e5);
  const p = (x) => String(x).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

/** Lunes de la semana que contiene el número de día → clave de semana. */
function semanaDe(n) {
  const lunes = n - ((n + 3) % 7); // lunes=0 … domingo=6 (1970-01-01 fue jueves)
  return diaStr(lunes);
}

/** Clave de semana ('YYYY-MM-DD' del lunes) de una fecha. null si no es fecha. */
export function claveSemana(fecha) {
  const n = diaNum(fecha);
  return n === null ? null : semanaDe(n);
}

/** Serie válida: reps registradas y > 0. kg puede faltar (peso corporal). */
function serieValida(s) {
  return !!s && Number.isFinite(s.reps) && s.reps > 0;
}

// ---------- 1 · VOLUMEN POR SEMANA (gráfica 1) ----------
/**
 * Volumen semanal REAL. Devuelve una fila por cada semana del rango
 * (de la primera a la última con registros) para que la gráfica muestre
 * los huecos como huecos.
 *
 * Entrada: registros = [{ fecha: 'YYYY-MM-DD', series: [{ ejercicio?, kg?, reps }] }]
 * Salida:  [{ semana, series, volumen_kg, reps }]
 *   · semana    = lunes de esa semana ('YYYY-MM-DD')
 *   · series    = nº de series registradas · null si esa semana NO hay registros
 *   · volumen_kg = Σ kg×reps · null si no hay registros O si alguna serie
 *     no lleva kg registrado (el volumen completo no se conoce → no se inventa)
 *   · reps      = Σ reps · null si no hay registros
 */
export function volumenPorSemana(registros) {
  const porSemana = new Map(); // clave lunes → acumulados
  for (const r of Array.isArray(registros) ? registros : []) {
    const n = diaNum(r && r.fecha);
    if (n === null) continue;
    const clave = semanaDe(n);
    if (!porSemana.has(clave)) {
      porSemana.set(clave, { series: 0, volumen_kg: 0, reps: 0, kgIncompleto: false });
    }
    const acc = porSemana.get(clave);
    for (const s of Array.isArray(r.series) ? r.series : []) {
      if (!serieValida(s)) continue;
      acc.series++;
      acc.reps += s.reps;
      if (Number.isFinite(s.kg) && s.kg >= 0) acc.volumen_kg += s.kg * s.reps;
      else acc.kgIncompleto = true; // serie sin kg → volumen de la semana desconocido
    }
    if (acc.series === 0) porSemana.delete(clave); // registro sin series = sin dato
  }
  if (!porSemana.size) return [];

  // rango continuo: primera → última semana (los huecos quedan a la vista)
  const claves = [...porSemana.keys()].sort();
  const ini = diaNum(claves[0]);
  const fin = diaNum(claves[claves.length - 1]);
  const out = [];
  for (let lun = ini; lun <= fin; lun += 7) {
    const semana = diaStr(lun);
    const acc = porSemana.get(semana);
    if (!acc) {
      out.push({ semana, series: null, volumen_kg: null, reps: null }); // hueco honesto
    } else {
      out.push({
        semana,
        series: acc.series,
        volumen_kg: acc.kgIncompleto ? null : Math.round(acc.volumen_kg * 100) / 100,
        reps: acc.reps,
      });
    }
  }
  return out;
}

// ---------- 2 · CONSTANCIA (gráfica 2) · racha sin castigo ----------
/**
 * "DESCANSAR ES PROGRESO" (regla de oro):
 *  · Un día con actividad registrada suma a la racha.
 *  · Un día SIN registro es descanso o silencio: ni suma, ni resta,
 *    y NUNCA reinicia la racha por sí solo.
 *  · Solo un hueco de más de HUECO_MAXIMO_DESCANSO días seguidos sin
 *    actividad (= ausencia, no descanso) cierra la racha y empieza otra.
 * Sin reloj: todo se calcula sobre los datos, no sobre "hoy", para que
 * el mismo histórico dé siempre el mismo resultado.
 *
 * Entrada: registros = [{ fecha, series?: [{ reps, ... }], actividad?: true }]
 *   · día activo = tiene al menos una serie válida O marca `actividad: true`
 *     (la app marca actividad cuando hay algo REAL registrado: sesión,
 *     movilidad, mente, hidratación — nunca por defecto)
 * Salida:  { diasActivos, rachaActual, mejorRacha } (días activos; el
 *          descanso no cuenta como día de racha, pero tampoco la rompe)
 */
export function constancia(registros) {
  const dias = new Set();
  for (const r of Array.isArray(registros) ? registros : []) {
    const n = diaNum(r && r.fecha);
    if (n === null) continue;
    const activo = r.actividad === true || (Array.isArray(r.series) ? r.series : []).some(serieValida);
    if (activo) dias.add(n);
  }
  const orden = [...dias].sort((a, b) => a - b);
  let rachaActual = 0, mejorRacha = 0, tramo = 0;
  for (let i = 0; i < orden.length; i++) {
    const descansoEntre = i === 0 ? 0 : orden[i] - orden[i - 1] - 1;
    // descansar es progreso: el hueco solo rompe si es AUSENCIA (>HUECO_MAXIMO_DESCANSO)
    tramo = (i === 0 || descansoEntre > HUECO_MAXIMO_DESCANSO) ? 1 : tramo + 1;
    mejorRacha = Math.max(mejorRacha, tramo);
    rachaActual = tramo;
  }
  return { diasActivos: orden.length, rachaActual, mejorRacha };
}

// ---------- 3 · FUERZA / e1RM (gráfica 3) ----------
/**
 * 1RM estimado con Epley: e1RM = kg × (1 + reps/30) — MISMA fórmula que
 * js/engine.js. Es una ESTIMACIÓN y así se muestra: nunca se vende como
 * fuerza medida. Series sin carga registrada (kg ≤ 0 o ausente) no
 * generan estimación: sin dato no hay número.
 */
export function e1RM(kg, reps) {
  if (!Number.isFinite(kg) || kg <= 0 || !Number.isFinite(reps) || reps <= 0) return null;
  return Math.round(kg * (1 + reps / 30));
}

/**
 * Progreso de fuerza REAL por ejercicio (para la 3ª serie de gráfica).
 * Entrada: registros = [{ fecha, series: [{ ejercicio, kg, reps }] }]
 * Salida:  [{ ejercicio, puntos: [{ fecha, kg, reps, e1RM }] }]
 *   · un punto por día y ejercicio = la MEJOR serie del día (mayor e1RM)
 *   · una serie puede traer `e1RM` ya registrado (récord guardado por la app
 *     desde una serie real): se usa tal cual, sin recalcular ni inventar
 *   · solo días con serie cargada; sin relleno entre huecos
 */
export function progresoFuerza(registros) {
  const porEj = new Map(); // ejercicio → Map(fecha → mejor punto)
  for (const r of Array.isArray(registros) ? registros : []) {
    const n = diaNum(r && r.fecha);
    if (n === null) continue;
    for (const s of Array.isArray(r.series) ? r.series : []) {
      if (!s || !s.ejercicio) continue;
      const e1 = Number.isFinite(s.e1RM) ? s.e1RM : (serieValida(s) ? e1RM(s.kg, s.reps) : null);
      if (e1 === null) continue; // sin carga registrada → sin estimación
      const fecha = diaStr(n);
      if (!porEj.has(s.ejercicio)) porEj.set(s.ejercicio, new Map());
      const dias = porEj.get(s.ejercicio);
      const prev = dias.get(fecha);
      if (!prev || e1 > prev.e1RM) dias.set(fecha, { fecha, kg: s.kg, reps: s.reps, e1RM: e1 });
    }
  }
  return [...porEj.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([ejercicio, dias]) => ({
      ejercicio,
      puntos: [...dias.values()].sort((a, b) => (a.fecha < b.fecha ? -1 : 1)),
    }));
}

// ---------- 4 · EXPORTAR MIS DATOS (GDPR: derecho de portabilidad) ----------
/**
 * JSON legible y descargable con TODOS los datos del usuario.
 * Round-trip garantizado: JSON.parse(exportarDatos(estado)) es igual al
 * estado original (siempre que el estado sea JSON: sin funciones ni
 * undefined, como cualquier save de la app).
 * El nombre del fichero con la fecha lo pone quien descarga; el propio
 * JSON no se decora con metadatos para no alterar el contenido exportado.
 */
export function exportarDatos(estado) {
  return JSON.stringify(estado, null, 2);
}

// ---------- 5 · BORRAR CUENTA CON ACUSE (GDPR: derecho de supresión) ----------
/** Categorías de datos que la app puede contener y cómo contarlas.
 *  Solo se declara borrado lo que EXISTÍA: cero registros no aparecen
 *  en el acuse (no se presume borrado de lo que nunca estuvo). */
const CATALOGO = [
  { que: "perfil", contar: (e) => (e.profile && Object.keys(e.profile).some((k) => e.profile[k] != null) ? 1 : 0) },
  { que: "registro del día", contar: (e) => (e.today && (e.today.date || (e.today.meals || []).length || e.today.trainingSets) ? 1 : 0) },
  { que: "historial diario", contar: (e) => (e.history || []).length },
  { que: "medidas corporales", contar: (e) => (e.medidas || []).length },
  { que: "fotos privadas", contar: (e) => (e.photos || []).length },
  { que: "diario", contar: (e) => (e.diary || []).length },
  { que: "récords personales", contar: (e) => Object.keys(e.prs || {}).length },
  { que: "línea del tiempo", contar: (e) => (e.journey || []).length },
  { que: "asignaciones", contar: (e) => (e.asignaciones || []).length },
  { que: "notas de voz", contar: (e) => (e.voice || []).length },
  { que: "sesión activa", contar: (e) => (e.activeSession ? 1 : 0) },
  { que: "armario phygital", contar: (e) => ((e.phygital && (e.phygital.redeemed || []).length) || 0) },
  { que: "consentimientos", contar: (e) => (e.consents ? Object.keys(e.consents).length : 0) },
  { que: "economía (xp/puntos/créditos)", contar: (e) => (Number.isFinite(e.xp) || Number.isFinite(e.points) || Number.isFinite(e.credits) ? 1 : 0) },
];

/**
 * Acuse DESCARGABLE de borrado de cuenta: qué se borró y cuándo.
 * La función es pura: devuelve el recibo; el borrado real del
 * almacenamiento lo ejecuta quien la llama (state.reset + limpieza).
 * El acuse se queda SOLO con contadores agregados y el motivo que la
 * persona quiera dar: nunca con los datos borrados (que ya no existen).
 *
 * Salida: { timestamp, motivo, queSeBorro: [{ que, registros }], confirmacion }
 */
export function borrarCuenta(estado, motivo) {
  const e = estado || {};
  const queSeBorro = [];
  for (const cat of CATALOGO) {
    const n = cat.contar(e);
    if (n > 0) queSeBorro.push({ que: cat.que, registros: n });
  }
  const total = queSeBorro.reduce((s, c) => s + c.registros, 0);
  const timestamp = new Date().toISOString();
  const motivotxt = motivo ? ` Motivo registrado: ${motivo}.` : "";
  return {
    timestamp,
    motivo: motivo || null,
    queSeBorro,
    confirmacion:
      `Borrado de cuenta completado el ${timestamp}. ` +
      `Se eliminaron ${queSeBorro.length} categorías (${total} registros) y no queda ningún dato personal asociado.` +
      motivotxt,
  };
}
