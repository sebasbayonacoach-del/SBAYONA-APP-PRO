// Original BAYONA editorial prompts. These are spoken reminders;
// the illustrated motions are decorative, not technical exercise demonstrations.
export const AVATAR_EXERCISES=Object.freeze([
 {id:"squat",nombre:"SENTADILLA SIN PESO",tipo:"MOVIMIENTO",
  ingredientes:["Calienta a tu ritmo","Mantén un rango cómodo","Detente si hay dolor"],
  pasos:["Colócate estable y ajusta la profundidad a tu movilidad.","Haz una repetición lenta y controlada.","Descansa y consulta al entrenador si necesitas adaptación."]},
 {id:"walking",nombre:"CAMINATA ACTIVA",tipo:"MOVIMIENTO",
  ingredientes:["Calzado cómodo","Ritmo conversacional","Hidratación"],
  pasos:["Empieza andando suavemente.","Mantén un ritmo donde puedas hablar.","Termina bajando el ritmo poco a poco."]},
 {id:"mobility",nombre:"MOVILIDAD DE HOMBROS",tipo:"MOVILIDAD",
  ingredientes:["Espacio libre","Movimiento sin dolor","Respiración fluida"],
  pasos:["Mueve los hombros sin forzar el rango.","Haz círculos suaves mientras respiras.","Detén el ejercicio si sientes dolor o molestia."]},
 {id:"pushup",nombre:"FLEXIÓN ADAPTADA",tipo:"FUERZA",
  ingredientes:["Superficie estable","Variante adecuada","Control"],
  pasos:["Elige una inclinación que puedas controlar.","Desciende despacio sin perder estabilidad.","Detente antes de sentir dolor y adapta la dificultad."]},
 {id:"breathing",nombre:"RESPIRACIÓN Y RECUPERACIÓN",tipo:"RECUPERACIÓN",
  ingredientes:["Lugar tranquilo","Postura cómoda","Sin retener el aire"],
  pasos:["Encuentra una posición cómoda.","Respira a un ritmo natural sin forzar.","Continúa unos momentos y vuelve suavemente."]},
 {id:"stretch",nombre:"PAUSA DE MOVILIDAD",tipo:"MOVILIDAD",
  ingredientes:["Pausas sin dolor","Movimientos controlados","Escucha tu cuerpo"],
  pasos:["Explora un rango de movimiento cómodo.","Alterna lados con suavidad.","Regresa a una postura estable."]}
]);
export function narrationFor(item){
 return [item?.nombre||"Tu misión",...(item?.pasos||[])].join(". ").slice(0,480);
}
