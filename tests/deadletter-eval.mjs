// deadletter-eval.mjs — nada se pierde en silencio (node tests/deadletter-eval.mjs)
import { enqueue, flush, dead, pending, clearDead, queueStats } from '../js/data/offlineQueue.js';

let pass = 0, fail = 0;
const assert = (cond, name, extra = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

const fakeStore = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
};

console.log('\n🗃  COLA OFFLINE · ZONA DE RECUPERACIÓN\n');

{
  const s = fakeStore();
  enqueue({ exercise: 'squat', reps: 5 }, s);
  let r;
  for (let i = 0; i < 8; i++) r = await flush({ send: async () => ({ ok: false, retry: true }), store: s });
  assert(r.remaining === 0, 'la cola activa no queda atascada');
  assert(dead(s).length === 1, 'el registro agotado se CONSERVA en zona de recuperación');
  assert(dead(s)[0]._reason === 'max_attempts', 'marcado con el motivo');
  clearDead(s);
  assert(dead(s).length === 0, 'borrado GDPR explícito de la zona de recuperación');
}

{
  const s = fakeStore();
  enqueue({ exercise: 'bench', reps: 8 }, s);
  const r = await flush({ send: async () => ({ ok: false, retry: false }), store: s });
  assert(r.dropped === 1 && dead(s).length === 1, 'fallo definitivo (4xx) → conservado, no desaparece');
}

{
  const s = fakeStore();
  enqueue({ exercise: 'squat', reps: 5 }, s);
  enqueue({ exercise: 'squat', reps: 6 }, s);
  const got = [];
  const r = await flush({ send: async (i) => { got.push(i.reps); return { ok: true }; }, store: s });
  assert(r.sent === 2 && queueStats(s).queued === 0 && pending(s).length === 0, 'envío normal limpio');
}

console.log(`\n📊 RESULTADO: ${pass} pass · ${fail} fail\n`);
process.exit(fail ? 1 : 0);
