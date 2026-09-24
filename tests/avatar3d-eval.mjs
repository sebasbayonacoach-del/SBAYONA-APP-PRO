// avatar3d-eval.mjs — personaje 3D (node tests/avatar3d-eval.mjs)
// Lógica pura de avatar3d.js: config demo, URL del creador, validación de
// export, magia GLB y cobertura de las 18 acciones. Sin red, sin DOM.
import {
  configureAvatar3d, avatar3dConfig, creatorUrl, parseExportResult,
  isGlbBytes, AVATAR3D_ACTIONS, AVATAR3D_PROVIDER, AVATAR3D_RIG_PROFILE,
} from '../js/avatar3d.js';

let pass = 0, fail = 0;
const assert = (cond, name, extra = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

console.log('\n🎭 AVATAR 3D · EVAL\n');

// demo pública por defecto (sin registro): la forma existe
{
  configureAvatar3d({ subdomain: '' });
  const c = avatar3dConfig();
  assert(c.subdomain === 'demo', 'subdominio demo por defecto [SUPUESTO]');
  assert(creatorUrl() === 'https://demo.avaturn.dev', 'URL del creador demo', creatorUrl());
  configureAvatar3d({ subdomain: 'MiMarca ' });
  assert(creatorUrl() === 'https://mimarca.avaturn.dev', 'subdominio propio normalizado');
  configureAvatar3d({ subdomain: '' });
}

// exportación del SDK: forma estricta
{
  const goodHttp = { avatarId: 'abc-1', url: 'https://cdn.avaturn.dev/x.glb', urlType: 'httpURL' };
  const goodData = { avatarId: 'abc-2', url: 'data:model/gltf-binary;base64,Z2xURg==', urlType: 'dataURL' };
  assert(parseExportResult(goodHttp)?.avatarId === 'abc-1', 'httpURL válido aceptado');
  assert(parseExportResult(goodData)?.avatarId === 'abc-2', 'dataURL válido aceptado');
  assert(parseExportResult(null) === null, 'null rechazado');
  assert(parseExportResult({ url: 'https://x/y.glb', urlType: 'httpURL' }) === null, 'sin avatarId rechazado');
  assert(parseExportResult({ avatarId: 'a', url: 'http://x/y.glb', urlType: 'httpURL' }) === null, 'http (no https) rechazado');
  assert(parseExportResult({ avatarId: 'a', url: 'data:image/png;base64,xx', urlType: 'dataURL' }) === null, 'dataURL no-modelo rechazado');
  assert(parseExportResult({ avatarId: 'a', url: 'https://x/y.glb', urlType: 'magia' }) === null, 'urlType desconocido rechazado');
}

// magia GLB con bytes sintéticos
{
  const ok = new Uint8Array([0x67, 0x6c, 0x54, 0x46, 0, 0, 0, 0, 1, 2, 3, 4]).buffer;
  const bad = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]).buffer;
  assert(isGlbBytes(ok) === true, 'magia glTF aceptada');
  assert(isGlbBytes(bad) === false, 'bytes ajenos rechazados');
  assert(isGlbBytes(new ArrayBuffer(4)) === false, 'cabecera corta rechazada');
}

// contrato con el mundo: las 18 acciones tienen cue
{
  const expected = ['idle', 'walk', 'squat', 'bench', 'press', 'row', 'pullup', 'lunge', 'curl',
    'plank', 'stretch', 'meditate', 'sit', 'eat', 'drink', 'celebrate', 'wave', 'sleep'];
  const missing = expected.filter((a) => !AVATAR3D_ACTIONS[a]);
  assert(missing.length === 0, 'las 18 acciones tienen cue', missing.join(','));
  const bad = expected.filter((a) => {
    const c = AVATAR3D_ACTIONS[a];
    return !c || !['y', 'amp', 'freq', 'rx'].every((k) => typeof c[k] === 'number');
  });
  assert(bad.length === 0, 'cada cue trae y/amp/freq/rx numéricos', bad.join(','));
  assert(AVATAR3D_PROVIDER === 'avaturn' && AVATAR3D_RIG_PROFILE === 'avaturn-fullbody-v1', 'provider + rig del esquema avatars');
}

console.log(`\n  → ${pass} ok, ${fail} fallos`);
process.exit(fail ? 1 : 0);
