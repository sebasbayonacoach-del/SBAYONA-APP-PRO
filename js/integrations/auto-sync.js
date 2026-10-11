// BAYONA LIFE OS · refresco silencioso de fuentes ya autorizadas.
import { S } from "../state.js";
import { consumeNativeShare, syncDeviceCalendar, DEVICE_CALENDAR_ID } from "./native-context.js";

let running = false;

export async function refreshConnectedContext() {
  if (running || !S.data) return { ok: false, reason: "busy-or-state" };
  running = true;
  try {
    let life = S.data.life;
    const share = await consumeNativeShare(life);
    if (share.ok && share.created) {
      life = share.life;
      S.data.life = life;
      S.save();
      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("bayona:planner", { detail: { event: "share-inbox" } }));
    }

    const connected = Boolean(life?.integrations?.connections?.[DEVICE_CALENDAR_ID]?.connected);
    if (!connected) return { ok: true, shareCreated: Boolean(share.created), calendar: "not-connected" };

    const result = await syncDeviceCalendar(life, { askPermission: false });
    if (!result.ok) return { ...result, shareCreated: Boolean(share.created) };
    S.data.life = result.life;
    S.save();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("bayona:planner", { detail: { event: "auto-device-calendar-sync" } }));
    }
    return { ...result, shareCreated: Boolean(share.created) };
  } finally {
    running = false;
  }
}

if (typeof window !== "undefined") {
  const run = () => setTimeout(() => refreshConnectedContext().catch(() => null), 500);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, { once: true });
  else run();
  window.addEventListener("online", () => refreshConnectedContext().catch(() => null));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshConnectedContext().catch(() => null);
  });
}
