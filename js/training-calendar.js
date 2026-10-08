// BAYONA · Navegación del macrociclo · contrato puro y probado.
// No toca estado, recompensas ni programación individual.
import { MACRO, phaseOfWeek } from "./data.js";

const bound = (value,low,high) => Math.max(low,Math.min(high,value));

export function weekView(currentWeek, offset = 0, totalWeeks = MACRO.totalWeeks) {
  const total = Number.isInteger(totalWeeks) && totalWeeks > 0 ? totalWeeks : MACRO.totalWeeks;
  const current = bound(Number.isInteger(currentWeek) ? currentWeek : 1,1,total);
  const shift = Number.isInteger(offset) ? offset : 0;
  const week = bound(current+shift,1,total);
  return {
    week,
    offset: week-current,
    phase: phaseOfWeek(week),
    canPrevious: week>1,
    canNext: week<total,
  };
}

// Fechas LOCALES sin sumar milisegundos: cruces DST y meses no desplazan día.
export function weekDayDate(referenceDate, weekOffset, dayIndex) {
  const valid = referenceDate instanceof Date && Number.isFinite(referenceDate.getTime());
  const ref = valid ? referenceDate : new Date();
  const monday = (ref.getDay()+6)%7;
  const d = new Date(ref.getFullYear(),ref.getMonth(),ref.getDate(),12,0,0);
  const weeks = Number.isInteger(weekOffset) ? weekOffset : 0;
  const day = bound(Number.isInteger(dayIndex) ? dayIndex : 0,0,6);
  d.setDate(d.getDate()-monday+weeks*7+day);
  return d;
}
