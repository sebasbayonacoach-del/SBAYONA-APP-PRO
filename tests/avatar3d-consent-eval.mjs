// avatar3d-consent-eval.mjs — permiso Avatar 3D (node tests/avatar3d-consent-eval.mjs)
// El dominio avatar_3d existe, empieza denegado, se concede/revoca y migra.
import { getConsents, setConsent, revokeConsent, isGranted, migrateLegacyConsents, resetConsents } from '../js/consents.js';

let pass = 0, fail = 0;
const assert = (cond, name, extra = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

console.log('\n🔏 CONSENTIMIENTO 3D · EVAL\n');

resetConsents();
{
  assert(getConsents().avatar_3d?.granted === false, 'avatar_3d existe y empieza denegado');
  setConsent('avatar_3d', true);
  assert(isGranted('avatar_3d') === true, 'conceder avatar 3D');
  revokeConsent('avatar_3d');
  assert(isGranted('avatar_3d') === false, 'revocar avatar 3D');
}
{
  setConsent('avatar_3d', true);
  assert(migrateLegacyConsents().avatar_3d.granted === true, 'la migración lo conserva');
  resetConsents();
  assert(isGranted('avatar_3d') === false, 'borrado total lo limpia');
}

console.log(`\n  → ${pass} ok, ${fail} fallos`);
process.exit(fail ? 1 : 0);
