// ============================================================
// BAYONA — COACH OS · dominio profesional del entrenador
// ------------------------------------------------------------
// Evolución del Excel de Colombia → command center real.
// Dos capas:
//   CAPA 1 · vista operativa (clientes de hoy, alertas, adherencia)
//   CAPA 2 · laboratorio (planificación macrociclo/mesociclo)
//
// HONESTIDAD (regla BAYONA):
//   · Tu ficha local se deriva de datos REALES del dispositivo.
//   · La cartera de ejemplo es DEMOSTRACIÓN y va marcada (demo: true).
//   · CORE Coach = reglas locales explicables, NO IA ni nube.
//   · Sin diagnóstico: solo información deportiva organizada.
// ============================================================
import { MACRO, phaseOfWeek, WORKOUTS } from "./data.js";

/** Valida una asignación de entrenador (reglas claras, sin excepciones sorpresa). */
export function validaAsignacion({ clienteId, workoutId, dia, nota = "" } = {}, catalogo = WORKOUTS) {
  if (!clienteId || typeof clienteId !== "string") return { ok: false, error: "Falta el cliente." };
  if (!workoutId || !catalogo[workoutId]) return { ok: false, error: "Ese entrenamiento no existe en el catálogo." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia || "")) return { ok: false, error: "Falta el día de la sesión (AAAA-MM-DD)." };
  if (String(nota).length > 200) return { ok: false, error: "La nota es demasiado larga (máx. 200 caracteres)." };
  return { ok: true, error: null };
}

/** Cartera de DEMOSTRACIÓN (sin backend: datos fijos y marcados). */
export const CLIENTES_DEMO = [
  {
    id: "demo_paola", demo: true, nombre: "Paola Moreno", edad: 42,
    nivel: 37, rango: "EXPLORADORA FITNESS", objetivo: "Recomposición corporal",
    antiguedadMeses: 8, hora: "17:00", sesionHoy: "TREN INFERIOR", min: 52,
    preparacion: 82, peso: 54.9, pesoDelta: -1.2, fuerzaDelta: 8, cinturaDelta: -3,
    adherencia: 91, dormir: 6.5, fatiga: "MODERADA", dolor: null,
    sesionesFalladas: 0, semanasSinProgresion: 0, ultimoCambio: "Cintura −3 cm en 8 semanas",
  },
  {
    id: "demo_diego", demo: true, nombre: "Diego", edad: 31,
    nivel: 12, rango: "ASPIRANTE", objetivo: "Fuerza general",
    antiguedadMeses: 3, hora: "18:00", sesionHoy: "CUERPO ENTERO", min: 45,
    preparacion: 58, peso: 81.2, pesoDelta: -0.4, fuerzaDelta: 3, cinturaDelta: -1,
    adherencia: 55, dormir: 7.5, fatiga: "BAJA", dolor: null,
    sesionesFalladas: 2, semanasSinProgresion: 0, ultimoCambio: "Sentadilla +5 kg en 3 semanas",
  },
  {
    id: "demo_carlos", demo: true, nombre: "Carlos", edad: 28,
    nivel: 24, rango: "VETERANO", objetivo: "Dominadas y espalda",
    antiguedadMeses: 11, hora: "19:00", sesionHoy: "POTENCIA SUPERIOR", min: 55,
    preparacion: 74, peso: 74.0, pesoDelta: 0.2, fuerzaDelta: 0, cinturaDelta: 0,
    adherencia: 78, dormir: 6.0, fatiga: "ALTA", dolor: "hombro derecho leve",
    sesionesFalladas: 0, semanasSinProgresion: 3, ultimoCambio: "Sin cambios en 3 semanas",
  },
];

/**
 * Tu ficha real como cliente de Coach OS (todo derivado del dispositivo).
 * Sin datos → null (la UI muestra «Todavía no lo has registrado»).
 */
export function fichaLocal(S) {
  const d = S.data;
  const hist = d.history.slice(-14);
  const activos = hist.filter((h) => h.workouts > 0 || h.sets > 0).length;
  const adherencia = hist.length ? Math.round((activos / Math.max(hist.length, 1)) * 100) : 0;
  const w = S.todayWorkout();
  return {
    id: "local", demo: false, nombre: d.profile.name || "TÚ",
    edad: d.profile.age ?? null,
    nivel: S.level().lvl, rango: S.rank(),
    objetivo: d.profile.goal,
    antiguedadMeses: Math.max(1, Math.round((Date.now() - d.profile.created) / 2.63e9)),
    hora: "HOY", sesionHoy: w ? w.name : "DÍA DE DESCANSO", min: w?.min ?? 0,
    preparacion: S.readiness(),
    peso: d.profile.weightKg ?? null, pesoDelta: null, fuerzaDelta: null, cinturaDelta: null,
    adherencia: hist.length ? adherencia : 0, adherenciaDias: hist.length,
    dormir: d.today.sleep, fatiga: null,
    dolor: d.today.soreness != null && d.today.soreness >= 6 ? `molestia ${d.today.soreness}/10 declarada` : null,
    sesionesFalladas: 0, semanasSinProgresion: 0,
    ultimoCambio: d.stats.prs > 0 ? `${d.stats.prs} récord(s) personales en tu historia` : "Sin récords todavía",
  };
}

/** Alertas por reglas explicables (sin IA). Nivel: alta | media. */
export function alertasDe(c) {
  const out = [];
  if (c.dolor) out.push({ nivel: "alta", texto: `Molestia declarada (${c.dolor}): adapta la carga` });
  if (c.adherencia < 60) out.push({ nivel: "alta", texto: `Adherencia ${c.adherencia} %: por debajo del 60 %` });
  if (c.sesionesFalladas >= 2) out.push({ nivel: "alta", texto: `${c.sesionesFalladas} sesiones consecutivas falladas` });
  if (c.semanasSinProgresion >= 3) out.push({ nivel: "media", texto: `Sin progresión en ${c.semanasSinProgresion} semanas` });
  if (c.preparacion != null && c.preparacion < 40) out.push({ nivel: "media", texto: `Preparación baja hoy (${c.preparacion} %)` });
  if (c.dormir != null && c.dormir < 7) out.push({ nivel: "media", texto: `Sueño por debajo de 7 h (${c.dormir} h)` });
  return out;
}

/** KPIs de la cartera para el command center. */
export function resumenCartera(clientes) {
  const n = clientes.length;
  const sesionesHoy = clientes.filter((c) => c.sesionHoy && c.sesionHoy !== "DÍA DE DESCANSO").length;
  const alertas = clientes.reduce((a, c) => a + alertasDe(c).length, 0);
  const adherenciaMedia = n ? Math.round(clientes.reduce((a, c) => a + (c.adherencia || 0), 0) / n) : 0;
  return { activos: n, sesionesHoy, alertas, adherenciaMedia };
}

/** CORE Coach: mensajes de priorización por reglas locales. */
export function coreCoach(clientes, S) {
  const out = [];
  const baja = clientes.filter((c) => (c.adherencia || 0) < 60);
  if (baja.length) out.push(`${baja.length} cliente(s) con adherencia inferior al 60 %: ${baja.map((c) => c.nombre).join(", ")}.`);
  const listas = clientes.filter((c) => (c.preparacion ?? 0) >= 80);
  if (listas.length) out.push(`${listas.map((c) => c.nombre).join(", ")} preparada(s) para progresar carga (preparación ≥ 80 %).`);
  for (const c of clientes) {
    if (c.sesionesFalladas >= 2) out.push(`${c.nombre} ha fallado ${c.sesionesFalladas} sesiones consecutivas: reorganiza su semana.`);
    if (c.semanasSinProgresion >= 3) out.push(`${c.nombre} lleva ${c.semanasSinProgresion} semanas sin progresión: revisa volumen y técnica.`);
  }
  if (!out.length) out.push("Sin alertas: la cartera avanza según lo planificado.");
  return out;
}

/** Planificación: macrociclo por fases + microciclo de hoy (CAPA 2). */
export function planificacion(S) {
  const semana = S.data.plan.week;
  const fase = phaseOfWeek(semana);
  const w = S.todayWorkout();
  const original = w ? w.exercises.reduce((a, e) => a + e.sets, 0) : 0;
  return {
    semana, totalSemanas: MACRO.totalWeeks, fase,
    fases: MACRO.phases.map((f) => ({
      ...f,
      estado: semana >= f.from && semana <= f.to ? "actual" : (semana > f.to ? "pasada" : "futura"),
    })),
    hoy: {
      sesion: w?.name || "DESCANSO",
      seriesOriginales: original,
      volumenPct: Math.round(fase.vol * 100),
      intensidadPct: Math.round(fase.int * 100),
    },
  };
}
