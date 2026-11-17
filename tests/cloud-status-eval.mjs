import assert from "node:assert/strict";
import handler from "../api/cloud-status.js";

const priorFetch = globalThis.fetch;
const statusByPath = {
  "/rest/v1/profiles": 200,
  "/rest/v1/coach_clients": 200,
  "/rest/v1/coach_assignments": 200,
  "/auth/v1/settings": 200,
};
let passed = 0;

async function probe(overrides = {}) {
  const requested = [];
  const statuses = { ...statusByPath, ...overrides };
  globalThis.fetch = async (input, options) => {
    const u = new URL(String(input));
    requested.push({ path: u.pathname, limit: u.searchParams.get("limit"), select: u.searchParams.get("select"), headers: options?.headers });
    if (u.pathname === "/rest/v1/") throw Error("Introspection root must never be queried");
    const status = statuses[u.pathname] ?? 404;
    return { status, ok: status >= 200 && status < 300 };
  };
  let result;
  const res = {
    setHeader() {},
    status(code) { assert.equal(code, 200); return this; },
    json(body) { result = body; return this; },
  };
  try {
    await handler({}, res);
    return { result, requested };
  } finally {
    globalThis.fetch = priorFetch;
  }
}

const good = await probe();
assert.equal(good.result.ok, true);
passed++;
assert.equal(good.result.coreSchema, true);
assert.equal(good.result.coachingSchema, true);
passed++;
assert.deepEqual(new Set(good.requested.map((r) => r.path)), new Set(Object.keys(statusByPath)));
passed++;
assert.equal(good.requested.filter((r) => r.path.startsWith("/rest/")).every((r) => r.limit === "0"), true);
passed++;
assert.equal(good.requested.every((r) => typeof r.headers?.apikey === "string"), true);
passed++;
assert.equal((await probe({ "/rest/v1/profiles": 401 })).result.ok, false);
passed++;
assert.equal((await probe({ "/rest/v1/coach_clients": 404 })).result.coachingSchema, false);
passed++;
assert.equal((await probe({ "/rest/v1/coach_assignments": 403 })).result.coachingSchema, false);
passed++;
assert.equal((await probe({ "/auth/v1/settings": 521 })).result.authReachable, false);
passed++;
assert.equal((await probe({ "/rest/v1/profiles": 500 })).result.restReachable, false);
passed++;
console.log("APP 7.0 cloud-status: " + passed + " comprobaciones PASS");
