// mirror-avatar3d-eval.mjs — espejo del 3D (node tests/mirror-avatar3d-eval.mjs)
// payloadAvatar: una fila por proveedor (idempotente), cero fotos/vídeo.
import { payloadAvatar } from '../js/sync/mirror.js';

let pass = 0, fail = 0;
const assert = (cond, name, extra = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

console.log('\n☁️ ESPEJO 3D · EVAL\n');

{
  const p = payloadAvatar('u-1', {});
  assert(p.tabla === 'avatars', 'tabla avatars');
  assert(p.del.user_id === 'eq.u-1', 'scope = usuario completo');
  assert(p.filas.length === 0, 'sin 3D → cero filas');
}
{
  const p = payloadAvatar('u-1', { avatar3d: { avatarId: 'a-9', urlType: 'httpURL', httpUrl: 'https://cdn/x.glb', cacheKey: 'avaturn:a-9.glb' } });
  assert(p.filas.length === 1, 'con 3D → UNA fila');
  const f = p.filas[0];
  assert(f.provider === 'avaturn' && f.rig_profile === 'avaturn-fullbody-v1', 'proveedor + rig', JSON.stringify(f));
  assert(f.glb_path === 'https://cdn/x.glb', 'viaja la referencia, no el modelo');
  assert(f.morphs?.avatar_id === 'a-9', 'avatar_id en morphs');
  assert(!('face' in f) && !('photo' in f), 'cero fotos (ADR-003)');
}

console.log(`\n  → ${pass} ok, ${fail} fallos`);
process.exit(fail ? 1 : 0);
