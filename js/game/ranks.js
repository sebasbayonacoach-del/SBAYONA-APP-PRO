// BAYONA LIFE GAME — escalera original de rangos.
// El XP y la curva de niveles siguen en js/state.js; NO se duplican.
export const LIFE_RANKS = Object.freeze([
  { min: 1, name: "INICIADO", tier: "origin" },
  { min: 2, name: "EXPLORADOR", tier: "origin" },
  { min: 3, name: "APRENDIZ", tier: "origin" },
  { min: 4, name: "PIONERO", tier: "origin" },
  { min: 5, name: "IMPULSO", tier: "origin" },
  { min: 6, name: "ATLETA", tier: "bronze" },
  { min: 8, name: "FORJADOR", tier: "bronze" },
  { min: 10, name: "DISCIPLINADO", tier: "bronze" },
  { min: 12, name: "ESTRATEGA", tier: "bronze" },
  { min: 14, name: "VANGUARDIA", tier: "silver" },
  { min: 17, name: "VIGÍA", tier: "silver" },
  { min: 20, name: "HORIZONTE", tier: "silver" },
  { min: 22, name: "NEXO", tier: "silver" },
  { min: 25, name: "ÉLITE", tier: "gold" },
  { min: 29, name: "ARQUITECTO", tier: "gold" },
  { min: 33, name: "MAESTRÍA", tier: "gold" },
  { min: 37, name: "AUREO", tier: "gold" },
  { min: 40, name: "TITÁN", tier: "platinum" },
  { min: 46, name: "GUARDIÁN", tier: "platinum" },
  { min: 53, name: "CENTINELA", tier: "platinum" },
  { min: 60, name: "ASCENDIENTE", tier: "ascendant" },
  { min: 68, name: "SINGULAR", tier: "ascendant" },
  { min: 76, name: "ETERNO", tier: "ascendant" },
  { min: 85, name: "LEYENDA", tier: "legend" },
  { min: 100, name: "ORIGEN SUPREMO", tier: "legend" },
  { min: 120, name: "INFINITO", tier: "legend" },
].map((rank, i) => Object.freeze({
  ...rank, id: "rank_" + String(i + 1).padStart(2, "0"), badgeKey: "bayona-" + rank.tier + "-" + String(i + 1),
})));

export function rankForLevel(level) {
  const lvl = Math.max(1, Math.floor(Number(level) || 1));
  let rank = LIFE_RANKS[0];
  for (const candidate of LIFE_RANKS) {
    if (lvl >= candidate.min) rank = candidate;
    else break;
  }
  return rank;
}
export function xpForLevel(level) {
  const n = Math.max(0, Math.floor(Number(level) || 1) - 1);
  return 90 * n * n + 160 * n;
}
export function rankProgress(totalXp = 0) {
  const xp = Math.max(0, Number.isFinite(Number(totalXp)) ? Number(totalXp) : 0);
  let current = LIFE_RANKS[0];
  for (const rank of LIFE_RANKS) {
    if (xp >= xpForLevel(rank.min)) current = rank;
    else break;
  }
  const next = LIFE_RANKS.find((rank) => rank.min > current.min) || null;
  const start = xpForLevel(current.min);
  const target = next ? xpForLevel(next.min) : null;
  return {
    current,
    next,
    xp,
    remaining: target === null ? 0 : Math.max(0, target - xp),
    percent: target === null ? 100 : Math.max(0, Math.min(100, Math.floor((xp - start) / Math.max(1, target - start) * 100))),
  };
}
