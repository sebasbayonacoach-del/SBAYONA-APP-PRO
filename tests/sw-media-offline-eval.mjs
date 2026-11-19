import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const js = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
const handlers = new Map();
const items = new Map();
const origin = "https://bayona.example";
let online = true, networkCalls = 0;
let passes = 0;
const ok = (condition, label) => { assert.ok(condition, label); passes++; };

const caches = {
  async match(req) {
    const url = typeof req === "string" ? new URL(req, origin + "/").href : req.url;
    return items.get(url)?.clone();
  },
  async open() {
    return {
      async put(req, res) { items.set(req.url, res.clone()); },
      async add() {},
    };
  },
};
const fakeFetch = async (req) => {
  networkCalls++;
  if (!online) throw Error("offline");
  if (req.headers?.has("range")) return new Response("part", {
    status: 206,
    headers: { "Content-Range": "bytes 0-3/100" },
  });
  return new Response("media", { status: 200, headers: { "Content-Type": "video/mp4" } });
};
const self = {
  location: { origin },
  registration: { scope: origin + "/" },
  clients: { claim: async () => {}, matchAll: async () => [] },
  addEventListener(type, listener) { handlers.set(type, listener); },
  skipWaiting() {},
};
runInNewContext(js, {
  self, caches, fetch: fakeFetch, location: self.location,
  URL, Request, Response, console,
});
const fetchEvent = async (path, opts = {}) => {
  const req = new Request(opts.origin || origin + path, {
    method: opts.method || "GET",
    headers: opts.range ? { Range: "bytes=0-3" } : {},
  });
  let response;
  handlers.get("fetch")({ request: req, respondWith(p) { response = p; } });
  return response ? await response : undefined;
};

ok(handlers.has("fetch"), "fetch listener installed");
online = false;
const missingImage = await fetchEvent("/not-cached.webp");
ok(missingImage?.status === 503, "uncached image reports offline error");
ok(missingImage.headers.get("Content-Type")?.startsWith("text/plain"), "offline error is not index.html");
const missingVideo = await fetchEvent("/clip.mp4");
ok(missingVideo?.status === 503, "uncached video does not return HTML shell");

online = true;
const image = await fetchEvent("/thumbnail.webp");
ok(image?.status === 200, "online image returns 200");
await Promise.resolve();
await Promise.resolve();
ok(items.has(origin + "/thumbnail.webp"), "small image is cached");
online = false;
const cachedImage = await fetchEvent("/thumbnail.webp");
ok(cachedImage?.status === 200, "cached image survives offline");
const noRangeNetworkCalls = networkCalls;

online = true;
const video = await fetchEvent("/training.mp4");
ok(video?.status === 200, "video streams over network");
await Promise.resolve();
await Promise.resolve();
ok(!items.has(origin + "/training.mp4"), "full MP4 is not added to shell cache");
online = false;
const videoOffline = await fetchEvent("/training.mp4");
ok(videoOffline?.status === 503, "MP4 unavailable offline returns explicit 503");

online = true;
const ranged = await fetchEvent("/training.mp4", { range: true });
ok(ranged?.status === 206, "Range request preserves 206 streaming semantics");
ok(ranged?.headers.get("Content-Range") === "bytes 0-3/100", "Range headers preserved");
online = false;
const rangedOffline = await fetchEvent("/training.mp4", { range: true });
ok(rangedOffline?.status === 503, "offline Range returns explicit error");
ok(rangedOffline?.headers.get("Cache-Control") === "no-store", "offline Range errors are not cached");

ok(await fetchEvent("/health", { method: "POST" }) === undefined, "POST not intercepted");
ok(await fetchEvent("/training.mp4", { origin: "https://external.example/training.mp4" }) === undefined, "other origins not intercepted");
ok(noRangeNetworkCalls > 0, "media request reached origin before offline");

console.log("APP 7.0 media offline: " + passes + " checks PASS");
