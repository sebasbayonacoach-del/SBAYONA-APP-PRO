// consents-cache-eval.mjs — la migración no pierde consentimientos en memoria
// (node tests/consents-cache-eval.mjs). Sin localStorage en node, la caché
// manda: migrateLegacyConsents() debe partir de ella, no de un blank.
import { setConsent, isGranted, migrateLegacyConsents, resetConsents } from '../js/consents.js';

let pass = 0, fail = 0;
const assert = (cond, name, extra = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

console.log('\n🔏 CONSENTIMIENTOS · CACHÉ\n');

resetConsents();
setConsent('vision', true);
{
  const m = migrateLegacyConsents();
  assert(m.vision.granted === true, 'migrar conserva lo concedido en memoria');
  assert(isGranted('vision') === true, 'sigue concedido tras migrar');
}
resetConsents();

setConsent('recordings', true);
assert(isGranted('recordings') === true, 'grabación local tiene consentimiento separado');
resetConsents();
assert(isGranted('recordings') === false, 'borrado de consentimientos revoca grabación local');

console.log(`\n  → ${pass} ok, ${fail} fallos`);
process.exit(fail ? 1 : 0);
