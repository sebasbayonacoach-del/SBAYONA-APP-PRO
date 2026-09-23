// Datos · offlineQueue.js — cola offline de resúmenes de serie (SOLO números, GDPR).
// Idempotente, ordenada, con backoff exponencial. Persiste en localStorage (misma
// clave que js/vision/boot.js → la cola de la cámara es esta cola).
// El transporte se inyecta: `send(item)` → Promise<{ok:boolean, retry?:boolean}>.

const QUEUE_KEY = 'bayona.sets_queue_v1';
const DEAD_KEY = 'bayona.sets_queue_dead_v1'; // nunca se pierde en silencio: los
// registros que agotan reintentos se conservan aquí (recuperables/auditables).
const MAX_ATTEMPTS = 6;
const BASE_BACKOFF_MS = 2000; // 2s · 4s · 8s · 16s · 32s · 64s

const mem = new Map();
const memStore = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
};

function storeOf(store) {
  try {
    return store ?? (typeof localStorage !== 'undefined' ? localStorage : memStore);
  } catch {
    return memStore;
  }
}

function load(store) {
  try {
    const q = JSON.parse(storeOf(store).getItem(QUEUE_KEY) || '[]');
    return Array.isArray(q) ? q : [];
  } catch {
    return [];
  }
}

function save(store, q) {
  try {
    storeOf(store).setItem(QUEUE_KEY, JSON.stringify(q));
  } catch { /* almacenamiento lleno: la cola vive en memoria de la pestaña */ }
}

function uuid() {
  try {
    return crypto.randomUUID();
  } catch {
    return `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

/**
 * Encola un resumen de serie (acepta items crudos de boot.js sin marcadores).
 * @returns {{queued:number, item:object}}
 */
export function enqueue(summary, store) {
  const q = load(store);
  const item = {
    ...summary,
    _key: summary._key || summary.idempotencyKey || uuid(), // idempotencia servidor
    _queuedAt: summary._queuedAt || new Date().toISOString(),
    _attempts: summary._attempts || 0,
  };
  q.push(item);
  save(store, q);
  return { queued: q.length, item };
}

/** Items pendientes (en orden FIFO). */
export function pending(store) {
  return load(store);
}

/** Estadísticas para la UI. */
export function queueStats(store) {
  const q = load(store);
  return { queued: q.length, attempts: q.reduce((s, i) => s + (i._attempts || 0), 0) };
}

/** Vacía la cola manualmente (borrado local, p. ej. al revocar consentimiento). */
export function clear(store) {
  save(store, []);
}

/** Registros pendientes de recuperación (agotaron reintentos o fallo definitivo). */
export function dead(store) {
  try {
    const q = JSON.parse(storeOf(store).getItem(DEAD_KEY) || '[]');
    return Array.isArray(q) ? q : [];
  } catch { return []; }
}

function bury(store, item, reason) {
  const d = dead(store);
  d.push({ ...item, _deadAt: new Date().toISOString(), _reason: reason });
  try { storeOf(store).setItem(DEAD_KEY, JSON.stringify(d)); } catch { /* sin storage */ }
}

/** Vacía también la zona de recuperación (borrado GDPR explícito). */
export function clearDead(store) {
  try { storeOf(store).setItem(DEAD_KEY, '[]'); } catch { /* sin storage */ }
}

/** Backoff para el reintento n (0-based). */
export function backoffMs(attempts) {
  return Math.min(BASE_BACKOFF_MS * 2 ** attempts, 60_000);
}

/**
 * Intenta enviar todo lo pendiente. Respeta el orden: un fallo reintenable
 * detiene el lote (no se salta nada por delante). Fallo definitivo descarta
 * el item (enviado al registro de errores del servidor).
 * @param {{send:(item:object)=>Promise<{ok:boolean, retry?:boolean}>, store?:Storage}} opts
 * @returns {Promise<{sent:number, dropped:number, remaining:number, nextRetryMs:number|null}>}
 */
export async function flush({ send, store } = {}) {
  if (typeof send !== 'function') throw new Error('flush: falta send()');
  let sent = 0, dropped = 0, nextRetryMs = null;
  for (;;) {
    const q = load(store);
    if (!q.length) break;
    const item = q[0];
    let res;
    try {
      res = await send(item);
    } catch {
      res = { ok: false, retry: true };
    }
    if (res?.ok) {
      q.shift(); sent++;
    } else if (res?.retry) {
      item._attempts = (item._attempts || 0) + 1;
      if (item._attempts >= MAX_ATTEMPTS) {
        q.shift(); dropped++; // fuera de la cola activa…
        bury(store, item, 'max_attempts'); // …pero CONSERVADO, nunca perdido en silencio
      } else {
        q[0] = item;
        nextRetryMs = backoffMs(item._attempts - 1);
      }
      save(store, q);
      if (nextRetryMs !== null) break;
    } else {
      q.shift(); dropped++;
      bury(store, item, 'rejected'); // 4xx: conservado para auditoría/reintento manual
    }
    save(store, q);
  }
  return { sent, dropped, remaining: load(store).length, nextRetryMs };
}

/**
 * Emisor HTTP contra la API BAYONA (contratos §6: POST /sessions/:id/sets).
 * `getSessionId()` aporta la sesión abierta; sin sesión → reintento más tarde.
 */
export function makeSender({ baseUrl, getToken, getSessionId, fetchImpl } = {}) {
  const doFetch = fetchImpl ?? ((...a) => fetch(...a));
  return async (item) => {
    const sessionId = typeof getSessionId === 'function' ? getSessionId() : getSessionId;
    if (!sessionId) return { ok: false, retry: true };
    const { _key, _queuedAt, _attempts, ...body } = item;
    try {
      const r = await doFetch(`${baseUrl}/sessions/${sessionId}/sets`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': _key,
          ...(getToken ? { authorization: `Bearer ${getToken()}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (r.ok) return { ok: true };
      return { ok: false, retry: r.status >= 500 || r.status === 429 }; // 4xx = descarte
    } catch {
      return { ok: false, retry: true }; // sin red → reintentar
    }
  };
}

/* Auto-flush al volver la conexión (solo en navegador). */
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('online', () => {
    const cfg = window.BAYONA_API;
    if (!cfg?.baseUrl) return;
    flush({ send: makeSender(cfg) }).then((r) => {
      if (r.sent) window.dispatchEvent(new CustomEvent('bayona:queue-flushed', { detail: r }));
    });
  });
}
