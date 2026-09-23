// phygital-eval.mjs — verificación de códigos físico→digital (node tests/phygital-eval.mjs)
// Reglas REALES: formato, dígito de control, catálogo, uso único, auditoría.
import { validateCode, makeCode, checkChar, verifyAndRedeem } from '../js/phygital.js';
import { S } from '../js/state.js';

let pass = 0, fail = 0;
const assert = (cond, name, extra = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

console.log('\n🏷  PHYGITAL · EVAL DE VERIFICACIÓN\n');

assert(validateCode('hola mundo').ok === false, 'no acepta cualquier texto');
assert(validateCode('BAY-1234').ok === false, 'formato corto rechazado');
assert(validateCode('').ok === false, 'vacío rechazado');

const code = makeCode();
const v = validateCode(code);
assert(v.ok === true, 'código generado tiene formato + control válidos', code);

// dígito de control: cambiar un carácter rompe el código
const broken = code.slice(0, 12) + (code.slice(12) === '0' ? '1' : '0');
assert(validateCode(broken).ok === false, 'un carácter cambiado invalida el control');

assert(checkChar('BAYBAYBAYBAY') !== null, 'checkChar determinista sobre cuerpo de 12');

S.init(); S.reset(true);
const before = S.isOwned('ember_tee');
const r1 = verifyAndRedeem(S, code, 'ember_tee');
assert(r1.ok === true, 'canje válido desbloquea el gemelo digital', r1.reason || '');
assert(S.isOwned('ember_tee') === true && before === false, 'artículo efectivamente poseído');
assert((r1.note || '').includes('pendiente de backend'), 'la validación server-side se declara pendiente (honestidad)');

const r2 = verifyAndRedeem(S, code, 'ember_tee');
assert(r2.ok === false && r2.reason.includes('ya se usó'), 'USO ÚNICO: el mismo código no vale dos veces');

const r3 = verifyAndRedeem(S, 'BAY-AAAA-BBBB-CCCC', 'ember_tee');
assert(r3.ok === false, 'código malformado con buena pinta también se rechaza');

assert(S.data.phygital.audit.length >= 2, 'cada intento queda auditado');

console.log(`\n📊 RESULTADO: ${pass} pass · ${fail} fail\n`);
process.exit(fail ? 1 : 0);
