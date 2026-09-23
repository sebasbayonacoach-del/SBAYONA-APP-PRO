// ============================================================
// BAYONA — MOTOR DE CONTEXTO (dominio puro, sin DOM)
// ------------------------------------------------------------
// «UN SOLO AVATAR + MUCHOS CONTEXTOS + UNA EXPERIENCIA CONTINUA»
// Este módulo decide EN QUÉ MOMENTO DE TU VIDA estás dentro de BAYONA:
// momento del día + lo que toca hacer → entorno sugerido, saludo y frase.
//
// Reglas:
//  · Determinista: mismas entradas → mismas salidas (testeado).
//  · La acción manda: si toca (o está en curso) entrenar, el contexto es
//    el gimnasio, da igual la hora.
//  · No inventa estado: recibe datos ya registrados por el usuario.
//  · La sugerencia NUNCA bloquea: el usuario puede ir a cualquier mundo.
// ============================================================

export const MOMENTOS = ["manana", "mediodia", "tarde", "noche"];

const MOMENTO_INFO = {
  manana:   { entorno: "home",      etiqueta: "MAÑANA · ARRANCA EL DÍA", saludo: "Buenos días",
              frase: "Empieza por lo importante: tu día ya tiene orden." },
  mediodia: { entorno: "kitchen",   etiqueta: "MEDIODÍA · ENERGÍA", saludo: "Buenas tardes",
              frase: "Come de verdad: la comida de ahora carga la tarde." },
  tarde:    { entorno: "work",      etiqueta: "TARDE · EQUILIBRIO", saludo: "Buenas tardes",
              frase: "BAYONA también te cuida mientras trabajas: mueve la espalda." },
  noche:    { entorno: "recovery",  etiqueta: "NOCHE · RECUPERACIÓN", saludo: "Buenas noches",
              frase: "Baja el ritmo. Lo que descansas hoy, lo rindes mañana." },
};

/** Momento del día por hora local (0–23). */
export function momentoDe(hora) {
  const h = ((Number(hora) % 24) + 24) % 24;
  if (h >= 5 && h < 12) return "manana";
  if (h >= 12 && h < 16) return "mediodia";
  if (h >= 16 && h < 21) return "tarde";
  return "noche";
}

/**
 * Contexto actual de la experiencia.
 * @param {{hora?:number, nombre?:string, siguiente?:object|null,
 *          sesionEnCurso?:boolean, trained?:boolean}} ctx
 * @returns {{momento:string, entorno:string, etiqueta:string, saludo:string,
 *            frase:string, foco:string}}
 */
export function contextoDelDia({
  hora = 12, nombre = "", siguiente = null, sesionEnCurso = false, trained = false,
} = {}) {
  const momento = momentoDe(hora);
  const base = MOMENTO_INFO[momento];
  let entorno = base.entorno;
  let etiqueta = base.etiqueta;
  let frase = base.frase;
  let foco = siguiente?.id || (momento === "noche" ? "descanso" : "dia");

  if (sesionEnCurso) {
    entorno = "gym";
    etiqueta = "SESIÓN EN CURSO";
    frase = "Tu sesión está viva. Vuelve y termina lo que empezaste.";
    foco = "sesion";
  } else if (siguiente && siguiente.id === "sesion") {
    entorno = "gym";
    etiqueta = "TOCA ENTRENAR";
    frase = trained
      ? "Ya has entrenado hoy. Lo demás es constancia."
      : "Tu misión de hoy está lista. El personaje ya está en el gimnasio.";
    foco = "sesion";
  } else if (!siguiente) {
    entorno = momento === "noche" ? "recovery" : "home";
    etiqueta = "DÍA CERRADO";
    frase = "Todo lo de hoy está hecho. Descansar también es progreso.";
    foco = "descanso";
  }

  const saludo = `${base.saludo}${nombre ? `, ${nombre}` : ""}`;
  return { momento, entorno, etiqueta, saludo, frase, foco };
}
