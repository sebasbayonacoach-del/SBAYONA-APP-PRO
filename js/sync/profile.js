// ============================================================
// BAYONA · perfil portable no sensible
// ------------------------------------------------------------
// Solo preferencias operativas necesarias para personalizar la experiencia.
// Nunca incluye lesiones, dolor, medicación, sexo fisiológico, peso ni otros
// datos de salud. Es seguro usarlo como metadata de Auth para bootstrap.
// ============================================================

const cleanList = (value, max = 12) =>
  (Array.isArray(value) ? value : []).map((x) => String(x || "").trim()).filter(Boolean).slice(0, max);

export function portableProfile(profile = {}) {
  return {
    name: String(profile.name || "").trim().slice(0, 40),
    goal: String(profile.goal || profile.goalPrimary || "BIENESTAR Y ADHERENCIA"),
    goalPrimary: String(profile.goalPrimary || profile.goal || "BIENESTAR Y ADHERENCIA"),
    goals: cleanList(profile.goals, 8),
    experience: profile.experience || null,
    availability: profile.availability || null,
    equipment: profile.equipment || null,
    trainingPlaces: cleanList(profile.trainingPlaces, 10),
    customPlaces: cleanList(profile.customPlaces, 5),
    equipmentItems: cleanList(profile.equipmentItems, 30),
    weeklyAvailability: {
      days: cleanList(profile.weeklyAvailability?.days, 7),
      preferredWindows: cleanList(profile.weeklyAvailability?.preferredWindows, 7),
      difficultDays: cleanList(profile.weeklyAvailability?.difficultDays, 7),
    },
    sessionMinutes: Number(profile.sessionMinutes) || 30,
    preferredSessionRange: cleanList(profile.preferredSessionRange, 2),
    coachPersona: String(profile.coachPersona || "sebastian").slice(0, 24),
    membershipPlan: String(profile.membershipPlan || "free").slice(0, 20),
    onboardingVersion: Number(profile.onboardingVersion) || 0,
    onboardingCompletedAt: profile.onboardingCompletedAt || null,
    onboarded: Boolean(profile.onboarded),
  };
}

export function portableProfileFromUser(user) {
  const raw = user?.user_metadata?.bayona_profile;
  return raw && typeof raw === "object" ? portableProfile(raw) : null;
}

export function displayNameFromUser(user) {
  return String(
    user?.user_metadata?.display_name
    || user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || ""
  ).trim().slice(0, 40);
}
