// contexto-eval.mjs — regresión del motor de contexto y del bloque TRABAJO
// (node tests/contexto-eval.mjs)
// Cubre: momentos del día, entorno sugerido (la acción manda), saludos,
// día cerrado honesto, y tope sano diario de bloques de foco y pausas
// (la gamificación premia equilibrio, nunca la compulsión).
import { S } from '../js/state.js';
import { contextoDelDia, momentoDe, MOMENTOS } from '../js/contexto.js';
import { focusReward, activePauseReward, RULES } from '../js/rewards.js';

let pass = 0, fail = 0;
const assert = (cond, name, extra = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

console.log('\n🧭 CONTEXTO · EVAL DEL MOTOR DE CONTEXTO Y TRABAJO\n');

// ---------- momentos del día (fronteras exactas) ----------
{
  assert(momentoDe(5) === 'manana' && momentoDe(11) === 'manana', '05:00–11:59 → mañana');
  assert(momentoDe(12) === 'mediodia' && momentoDe(15) === 'mediodia', '12:00–15:59 → mediodía');
  assert(momentoDe(16) === 'tarde' && momentoDe(20) === 'tarde', '16:00–20:59 → tarde');
  assert(momentoDe(21) === 'noche' && momentoDe(4) === 'noche', '21:00–04:59 → noche');
  assert(momentoDe(25) === 'noche', 'hora 25 se normaliza (25 ≡ 01:00 → noche)');
  assert(momentoDe(24) === 'noche' && momentoDe(30) === 'manana', 'más normalizaciones (24 ≡ 0, 30 ≡ 6)');
  assert(MOMENTOS.length === 4, 'cuatro momentos definidos');
}

// ---------- entorno sugerido por momento ----------
{
  const casos = [
    [8, 'home', 'manana'], [13, 'kitchen', 'mediodia'], [18, 'work', 'tarde'], [23, 'recovery', 'noche'],
  ];
  for (const [hora, entorno, mom] of casos) {
    const c = contextoDelDia({ hora, siguiente: { id: 'hidratacion' } });
    assert(c.entorno === entorno && c.momento === mom, `h=${hora} → ${entorno} (${mom})`, JSON.stringify(c));
  }
}

// ---------- la acción manda: entrenar va al gimnasio ----------
{
  const c1 = contextoDelDia({ hora: 8, siguiente: { id: 'sesion' } });
  assert(c1.entorno === 'gym' && c1.etiqueta === 'TOCA ENTRENAR', 'toca entrenar → gimnasio a cualquier hora');
  const c2 = contextoDelDia({ hora: 22, sesionEnCurso: true, siguiente: { id: 'hidratacion' } });
  assert(c2.entorno === 'gym' && c2.foco === 'sesion', 'sesión en curso manda sobre la hora');
  const c3 = contextoDelDia({ hora: 8, siguiente: { id: 'sesion' }, trained: true });
  assert(c3.frase.includes('Ya has entrenado'), 'sin doble sesión: frase honesta si ya entrenaste');
}

// ---------- día cerrado: sin tareas inventadas ----------
{
  const c = contextoDelDia({ hora: 19, siguiente: null });
  assert(c.etiqueta === 'DÍA CERRADO' && c.foco === 'descanso', 'sin pendientes → día cerrado');
  const cn = contextoDelDia({ hora: 23, siguiente: null });
  assert(cn.entorno === 'recovery', 'de noche el cierre vive en recuperación');
}

// ---------- saludo personalizado y determinismo ----------
{
  const c = contextoDelDia({ hora: 8, nombre: 'Sebastián' });
  assert(c.saludo === 'Buenos días, Sebastián', 'saludo con nombre', c.saludo);
  const a = contextoDelDia({ hora: 18, siguiente: { id: 'checkin' } });
  const b = contextoDelDia({ hora: 18, siguiente: { id: 'checkin' } });
  assert(JSON.stringify(a) === JSON.stringify(b), 'determinista: mismas entradas → mismas salidas');
  assert(a.foco === 'checkin', 'el foco sigue la siguiente acción del plan');
}

// ---------- TRABAJO: recompensas desde la fuente única ----------
{
  assert(focusReward().xp === RULES.work.foco.xp, 'focusReward sale de RULES');
  assert(activePauseReward().xp === RULES.work.pausa.xp, 'activePauseReward sale de RULES');
}

// ---------- tope sano: la gamificación NO premia la compulsión ----------
{
  S.init(); S.reset(true);
  const xp0 = S.data.xp;
  let n = 0, r;
  while ((r = S.logFocusBlock())) n++;
  assert(n === RULES.work.foco.cap, `solo ${RULES.work.foco.cap} bloques de foco premian/día`, `premiados: ${n}`);
  assert(S.data.today.workBlocks === RULES.work.foco.cap, 'el registro sigue contando (sin premio)');
  const xpFoco = S.data.xp - xp0;
  assert(xpFoco === n * RULES.work.foco.xp, 'XP exacto de bloques', `${xpFoco}`);

  let m = 0;
  while (S.logActivePause()) m++;
  assert(m === RULES.work.pausa.cap, `solo ${RULES.work.pausa.cap} pausas activas premian/día`, `premiadas: ${m}`);

  assert(S.logPostureCheck() === true, 'checklist de postura se registra');
  assert(S.data.today.postureChecks === 1, 'postura = registro honesto, sin XP');
}

console.log('\n══════════════════════════════════');
if (fail) { console.log(`❌ CONTEXTO: ${pass} pass · ${fail} fail`); process.exit(1); }
console.log(`📊 RESULTADO: ${pass} pass · 0 fail`);
