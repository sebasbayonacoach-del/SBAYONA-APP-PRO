// ============================================================
// BAYONA LIFE OS · catálogo de conectores
// ------------------------------------------------------------
// Catálogo de capacidades, NO credenciales. Un proveedor solo puede marcarse
// conectado cuando exista autorización real. Tokens nunca viven aquí.
// ============================================================

export const INTEGRATION_GROUPS = Object.freeze([
  "calendar", "tasks", "communication", "health", "mobility", "media", "universal",
]);

export const INTEGRATIONS = Object.freeze([
  { id:"bayona", name:"BAYONA", group:"universal", status:"native", capabilities:["read","write","context"] },
  { id:"ics", name:"Calendario ICS", group:"calendar", status:"native", capabilities:["import","export"] },
  { id:"device_calendar", name:"Calendario del teléfono", group:"calendar", status:"native-permission", capabilities:["read","events","auto-sync"] },

  { id:"google_calendar", name:"Google Calendar", group:"calendar", status:"adapter", capabilities:["read","write","events"] },
  { id:"outlook_calendar", name:"Outlook Calendar", group:"calendar", status:"adapter", capabilities:["read","write","events"] },
  { id:"apple_calendar", name:"Apple Calendar / CalDAV", group:"calendar", status:"adapter", capabilities:["read","write","events"] },

  { id:"todoist", name:"Todoist", group:"tasks", status:"adapter", capabilities:["read","write","tasks"] },
  { id:"notion", name:"Notion", group:"tasks", status:"adapter", capabilities:["read","write","pages","tasks"] },
  { id:"microsoft_todo", name:"Microsoft To Do", group:"tasks", status:"adapter", capabilities:["read","write","tasks"] },

  { id:"gmail", name:"Gmail", group:"communication", status:"adapter", capabilities:["read","actions"] },
  { id:"outlook_mail", name:"Outlook Mail", group:"communication", status:"adapter", capabilities:["read","actions"] },
  { id:"slack", name:"Slack", group:"communication", status:"adapter", capabilities:["read","actions"] },
  { id:"teams", name:"Microsoft Teams", group:"communication", status:"adapter", capabilities:["read","actions"] },

  { id:"health_connect", name:"Health Connect", group:"health", status:"adapter", capabilities:["read","health"] },
  { id:"apple_health", name:"Apple Health", group:"health", status:"adapter", capabilities:["read","health"] },
  { id:"garmin", name:"Garmin", group:"health", status:"adapter", capabilities:["read","health","activity"] },
  { id:"fitbit", name:"Fitbit", group:"health", status:"adapter", capabilities:["read","health","activity"] },
  { id:"strava", name:"Strava", group:"health", status:"adapter", capabilities:["read","activity"] },

  { id:"google_maps", name:"Google Maps", group:"mobility", status:"native-link", capabilities:["links","travel"] },
  { id:"waze", name:"Waze", group:"mobility", status:"adapter", capabilities:["links","travel"] },
  { id:"uber", name:"Uber", group:"mobility", status:"adapter", capabilities:["links","travel"] },

  { id:"spotify", name:"Spotify", group:"media", status:"native-link", capabilities:["playback","context"] },
  { id:"youtube_music", name:"YouTube Music", group:"media", status:"adapter", capabilities:["links","context"] },

  { id:"webhook", name:"Webhook", group:"universal", status:"adapter", capabilities:["read","write","automation"] },
  { id:"android_share", name:"Compartir con BAYONA", group:"universal", status:"native-link", capabilities:["share","capture"] },
  { id:"rest_api", name:"REST API", group:"universal", status:"adapter", capabilities:["read","write","automation"] },
]);

export function integrationById(id) {
  return INTEGRATIONS.find((x) => x.id === id) || null;
}

export function integrationStatus(life, id) {
  const meta = life?.integrations?.connections?.[id] || null;
  const def = integrationById(id);
  if (id === "bayona" || id === "ics" || def?.status === "native-link") return { connected: true, state: "ready", meta };
  return {
    connected: Boolean(meta?.connected),
    state: meta?.connected ? "connected" : "available",
    meta,
  };
}
