// BAYONA — Entitlement Engine v1
// Fuente única para planes y funciones. La UI no decide acceso por strings sueltos.

export const PLANS = Object.freeze(["free", "raiz", "performance", "elite"]);

export const PLAN_META = Object.freeze({
  free: {
    id: "free", label: "FREE", rank: 0, priceCop: 0, priceEur: 0,
    tagline: "Empieza y registra progreso real.",
  },
  raiz: {
    id: "raiz", label: "RAÍZ", rank: 1, priceCop: 149000, priceEur: 35,
    tagline: "Plan mensual, seguimiento y comunidad.",
  },
  performance: {
    id: "performance", label: "PERFORMANCE", rank: 2, priceCop: 399000, priceEur: 93,
    tagline: "Personalización completa, analítica e IA adaptativa.",
  },
  elite: {
    id: "elite", label: "ELITE", rank: 3, priceCop: 899000, priceEur: 209,
    tagline: "Acompañamiento humano prioritario y máxima personalización.",
  },
});

export const FEATURES = Object.freeze({
  "training.basic": "free",
  "training.custom": "raiz",
  "training.videoAnalysis": "performance",
  "coach.chat": "raiz",
  "coach.call": "elite",
  "progress.basic": "free",
  "progress.advanced": "performance",
  "planning.macrocycle": "performance",
  "nutrition.basic": "free",
  "nutrition.advanced": "performance",
  "wearable.sync": "performance",
  "backup.cloud": "performance",
  "community.view": "free",
  "community.post": "raiz",
  "ai.adaptive": "performance",
  "coach.priority": "elite",
  "private.sessions": "elite",
});

export const SECTION_FEATURES = Object.freeze({
  plan: "planning.macrocycle",
});

export function featureForSection(section) {
  return SECTION_FEATURES[String(section || "")] || null;
}

const PLAN_ALIASES = Object.freeze({
  atleta: "free",
  pro: "performance",
  centro: "elite",
  root: "raiz",
  performance: "performance",
  elite: "elite",
  free: "free",
  raiz: "raiz",
  "raíz": "raiz",
});

export function normalizePlan(plan) {
  const key = String(plan || "free").trim().toLowerCase();
  return PLAN_ALIASES[key] || "free";
}

export function planRank(plan) {
  return PLAN_META[normalizePlan(plan)].rank;
}

export function featureTier(feature) {
  return FEATURES[feature] || "elite";
}

export function hasFeature(plan, feature) {
  return planRank(plan) >= planRank(featureTier(feature));
}

export function lockedFeatureCopy(feature, plan = "free") {
  const need = PLAN_META[featureTier(feature)];
  const current = PLAN_META[normalizePlan(plan)];
  return hasFeature(plan, feature)
    ? { locked: false, current: current.label, required: current.label, text: "Incluido en tu plan." }
    : {
        locked: true,
        current: current.label,
        required: need.label,
        text: `Disponible en ${need.label}. Puedes ver cómo funciona antes de cambiar de plan.`,
      };
}

export function planComparison() {
  return PLANS.map((id) => ({
    ...PLAN_META[id],
    features: Object.fromEntries(Object.keys(FEATURES).map((feature) => [feature, hasFeature(id, feature)])),
  }));
}

// El perfil local solo expresa intención: nunca acredita pago.
let verifiedEntitlement = { userId: null, plan: "free" };

export function clearVerifiedEntitlement() {
  verifiedEntitlement = { userId: null, plan: "free" };
}

export function acceptVerifiedEntitlement(userId, status) {
  clearVerifiedEntitlement();
  if (!userId || !status?.ok || !status?.active) return "free";
  const plan = normalizePlan(status.plan);
  if (plan === "free") return "free";
  verifiedEntitlement = { userId: String(userId), plan };
  return plan;
}

export function planFromProfile(_profile) {
  // La autorización real de endpoints premium permanece en servidor/RLS.
  return verifiedEntitlement.plan;
}
