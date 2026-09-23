// Datos · offlinequeue-eval.mjs — evaluación ejecutable (node tests/offlinequeue-eval.mjs)
import {
  enqueue, pending, queueStats, clear, flush, makeSender, backoffMs,
} from '../js/data/offlineQueue.js';

let pass = 0, fail = 0;
const assert = (cond, name, extra = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

// Storage falso en memoria (aislado por test)
const fakeStore = () => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
  };
};

const SET = { exercise: 'squat', ts: '2026-09-23T01:50:00Z', reps: 8, formScore: 88, fatiguePct: 22 };

console.log('\n📦 COLA OFFLINE · EVAL\n');

console.log('— Encolado —');
{
  const s = fakeStore();
  const r = enqueue(SET, s);
  assert(r.queued === 1, 'primer item → cola 1');
  assert(typeof r.item._key === 'string' && r.item._key.length > 5, 'idempotency-key asignada');
  enqueue(SET, s);
  assert(queueStats(s).queued === 2, 'segundo item → cola 2 (FIFO se conserva)');
  assert(pending(s)[0].reps === 8 && pending(s)[1].reps === 8, 'pending expone los resúmenes en orden');
  clear(s);
  assert(queueStats(s).queued === 0, 'clear vacía la cola (revocación GDPR)');
}

console.log('— Flush con transporte inyectable —');
{
  const s = fakeStore();
  enqueue({ ...SET, reps: 5 }, s);
  enqueue({ ...SET, reps: 6 }, s);
  const got = [];
  const r = await flush({ send: async (i) => { got.push(i.reps); return { ok: true }; }, store: s });
  assert(r.sent === 2 && r.remaining === 0, 'todo ok → enviados 2, cola vacía');
  assert(got.join(',') === '5,6', 'orden FIFO respetado');
}

{
  const s = fakeStore();
  enqueue({ ...SET, reps: 5 }, s);
  enqueue({ ...SET, reps: 6 }, s);
  const r = await flush({ send: async (i) => (i.reps === 5 ? { ok: true } : { ok: false, retry: true }), store: s });
  assert(r.sent === 1 && r.remaining === 1, 'fallo reintentable → no se salta: queda 1 pendiente');
  assert(pending(s)[0].reps === 6 && pending(s)[0]._attempts === 1, 'el pendiente acumula intento');
  assert(r.nextRetryMs === backoffMs(0) && r.nextRetryMs === 2000, 'backoff base 2s tras 1er fallo');
}

{
  const s = fakeStore();
  enqueue(SET, s);
  let r, droppedTotal = 0;
  for (let i = 0; i < 6; i++) { r = await flush({ send: async () => ({ ok: false, retry: true }), store: s }); droppedTotal += r.dropped; }
  assert(droppedTotal === 1 && r.remaining === 0, '6 intentos fallidos → item descartado (cola no se atasca)');
}

{
  const s = fakeStore();
  enqueue(SET, s);
  const r = await flush({ send: async () => ({ ok: false, retry: false }), store: s });
  assert(r.dropped === 1 && r.remaining === 0, 'fallo definitivo (4xx) → descarte, no reintenta');
}

{
  const s = fakeStore();
  enqueue(SET, s);
  const r = await flush({ send: async () => { throw new Error('red caída'); }, store: s });
  assert(r.remaining === 1 && r.nextRetryMs !== null, 'excepción de red → tratada como reintento');
}

{
  const s = fakeStore();
  enqueue(SET, s);
  const r = await flush({ send: async () => ({ ok: false, retry: true }), store: s });
  const r2 = await flush({ send: async () => ({ ok: true }), store: s });
  assert(r2.sent === 1 && r2.remaining === 0, 'retry posterior con red recuperada → se vacía');
}

console.log('— makeSender (contrato §6 POST /sessions/:id/sets) —');
{
  let call = null;
  const send = makeSender({
    baseUrl: 'https://api.test',
    getToken: () => 'tok-1',
    getSessionId: () => 'ses-9',
    fetchImpl: async (url, opts) => { call = { url, opts }; return { ok: true, status: 201 }; },
  });
  const s = fakeStore();
  const { item } = enqueue(SET, s);
  const r = await send(item);
  assert(r.ok === true, 'envío ok');
  assert(call.url === 'https://api.test/sessions/ses-9/sets', 'URL según contrato §6');
  assert(call.opts.headers['idempotency-key'] === item._key, 'cabecera idempotency-key');
  assert(call.opts.headers.authorization === 'Bearer tok-1', 'bearer token adjunto');
  const body = JSON.parse(call.opts.body);
  assert(body._key === undefined && body._attempts === undefined, 'el body no arrastra marcadores internos');
  assert(body.reps === 8 && body.formScore === 88, 'body = solo resúmenes numéricos');
}

{
  const send = makeSender({ baseUrl: 'https://api.test', getSessionId: () => null, fetchImpl: async () => { throw new Error('no debe llamarse'); } });
  assert((await send({})).retry === true, 'sin sesión abierta → reintento, no descarte');
}

{
  const send = makeSender({ baseUrl: 'https://api.test', getSessionId: 'ses-1', fetchImpl: async () => ({ ok: false, status: 503 }) });
  assert((await send({})).retry === true, '5xx → reintento');
  const send4 = makeSender({ baseUrl: 'https://api.test', getSessionId: 'ses-1', fetchImpl: async () => ({ ok: false, status: 400 }) });
  assert((await send4({})).retry === false, '4xx → fallo definitivo');
  const sendNet = makeSender({ baseUrl: 'https://api.test', getSessionId: 'ses-1', fetchImpl: async () => { throw new Error('offline'); } });
  assert((await sendNet({})).retry === true, 'excepción fetch → reintento');
}

assert(backoffMs(0) === 2000 && backoffMs(5) === 60000, 'backoff exponencial tope 60s');

console.log(`\n📊 RESULTADO: ${pass} pass · ${fail} fail\n`);
process.exit(fail ? 1 : 0);
