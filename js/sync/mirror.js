// ============================================================
// BAYONA — ESPEJO NUBE · planificación de subida (dominio puro)
// ------------------------------------------------------------
// «La verdad vive en el dispositivo; la nube es un espejo idempotente»
// (ADR de arquitectura). Cada payload declara su SCOPE de borrado
// (usuario completo) y sus filas con dueño: reenviar nunca duplica.
// Reglas: solo datos REALES del usuario local; la cartera demo jamás se
// sube; ADR-003 = cero vídeo/frames, solo resúmenes numéricos.
// ============================================================

const CAMPOS_MEDIDA = {
  pesoKg: "peso_kg", cinturaCm: "cintura_cm", caderaCm: "cadera_cm",
  brazoCm: "brazo_cm", musloCm: "muslo_cm", grasaPct: "grasa_pct",
};

/** payload de mediciones: UNA fila por fecha (la última gana). */
export function payloadMedidas(userId, medidas = []) {
  const porFecha = new Map();
  for (const m of medidas || []) {
    if (!m || !m.fecha) continue;
    const fila = {};
    for (const [src, col] of Object.entries(CAMPOS_MEDIDA)) {
      if (m[src] != null) fila[col] = m[src];
    }
    const prev = porFecha.get(m.fecha) || { user_id: userId, fecha: m.fecha };
    porFecha.set(m.fecha, { ...prev, ...fila });
  }
  return {
    tabla: "body_medidas",
    del: { user_id: `eq.${userId}` },
    filas: [...porFecha.values()],
  };
}

/** payload de asignaciones: solo cliente real (la demo es demo). */
export function payloadAsignaciones(userId, asignaciones = []) {
  const filas = (asignaciones || [])
    .filter((a) => a && a.clienteId === "local")
    .map((a) => ({
      user_id: userId,
      cliente_id: a.clienteId,
      workout_id: a.workoutId,
      dia: a.dia,
      nota: a.nota || "",
      estado: a.estado || "pendiente",
      creada: a.creada || null,
    }));
  return {
    tabla: "entrenamientos_asignados",
    del: { user_id: `eq.${userId}` },
    filas,
  };
}

/** payload de sesiones: SOLO resumen numérico (ADR-003). */
export function payloadSesiones(userId, sesiones = []) {
  const filas = (sesiones || [])
    .filter((s) => s && s.date)
    .map((s) => ({
      user_id: userId,
      workout_id: s.workoutId || null,
      date: s.date,
      sets: s.sets || 0,
      minutes: s.minutes || 0,
      xp: s.xp || 0,
    }));
  return {
    tabla: "workout_sessions",
    del: { user_id: `eq.${userId}` },
    filas,
  };
}

/** payload del avatar 3D: UNA fila por proveedor (PK user_id+provider: idempotente).
 *  Solo viaja referencia (URL o clave de caché) + perfil de rig. Cero fotos/vídeo (ADR-003). */
export function payloadAvatar(userId, profile = {}) {
  const a = profile && profile.avatar3d;
  const filas = a && a.avatarId ? [{
    user_id: userId,
    provider: "avaturn",
    glb_path: a.httpUrl || (a.cacheKey ? "cache:" + a.cacheKey : null),
    rig_profile: "avaturn-fullbody-v1",
    morphs: { avatar_id: a.avatarId, url_type: a.urlType || null },
    fidelity_score: null,
  }] : [];
  return {
    tabla: "avatars",
    del: { user_id: `eq.${userId}` },
    filas,
  };
}
