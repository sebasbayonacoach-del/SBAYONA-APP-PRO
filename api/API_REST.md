# BAYONA — Contratos API REST (v1)

> Base: `https://api.bayona.app/v1` · Auth: `Authorization: Bearer <JWT>` (Supabase Auth)
> **Regla global:** cada dominio de salud exige su consentimiento activo (scope). Sin scope → `403 consent_required`.
> Datos personales de salud: GDPR art. 9 · cero frames de vídeo vía API (ADR-003).

## Errores (formato único)
```json
{ "error": { "code": "consent_required", "message": "Dominio 'health_wearables' sin consentimiento", "domain": "health_wearables" } }
```
| Código | HTTP | Significado |
|---|---|---|
| `consent_required` | 403 | Falta o fue revocado el consentimiento del dominio |
| `red_flag_active` | 409 | Hay una bandera roja sin resolver; la app debe mostrar protocolo |
| `validation_error` | 422 | Payload inválido (detalle en `fields`) |
| `rate_limited` | 429 | >60 req/min por usuario |

## Perfil y avatar
| Método · ruta | Scope | Descripción |
|---|---|---|
| `GET /me` | — | Perfil + consents + flags activas |
| `PATCH /me` | — | Nombre, objetivos, medidas |
| `POST /onboarding/scan` | `body_scan` | multipart cifrado: `turnVideo`, `faceShots[5]`, `measurements`, `consentToken` → `202 {scanId}` |
| `GET /avatars/me` | `body_scan` | `AvatarHandle` (ver PLAN_NIVEL_3_PRO §2.1) — `glbUrl` = signed URL 5 min |
| `DELETE /me/data?domain=<d>` | — | Borrado total trazado (acuse + plazos) → `200 {receiptId}` |
| `GET /me/export` | — | Export JSON+PDF (portabilidad) |

## Entrenamiento (GEMELO-1)
| Método · ruta | Scope | Descripción |
|---|---|---|
| `POST /vision/session/start` | `vision` | → `{sessionId, iceServers}` |
| `POST /sessions/:id/sets` | `vision` | `[{exerciseId, reps, formScore, fatiguePct, repDetail[]}]` — **solo resúmenes numéricos** → `201 {setId}` |
| `POST /sessions/:id/complete` | `vision` | `rpeOut`, `notes` → cierra `workout_sessions` |
| `GET /plan/day?date=` | — | `PlanDay` + `rationale` (auto-regulación explicada) |
| `POST /plan/adjust` | — | `{sessionId, change, reason}` → versiona el plan |

## Salud
| Método · ruta | Scope | Descripción |
|---|---|---|
| `POST /health/samples/batch` | `health_wearables` | Ingest idempotente (`idempotencyKey`); fuentes: `apple_watch`,`garmin`,`withings`,`manual`,`camera` |
| `GET /health/samples?kind=&from=&to=` | `health_wearables` | Serie temporal paginada |
| `GET /readiness/today` | `health_wearables` | `{score, factors{hrv,sueño,carga,dolor}}` |
| `POST /healthmap` | `health_clinical` | PAR-Q+/PHQ-2/GAD-2/pains → `HealthMap` (ver `js/health/healthMap.js`) |
| `POST /symptoms` | `health_clinical` | `{bodyMap, severity 0-3, note}` → puede generar `red_flag` |
| `GET /red-flags` | `health_clinical` | Banderas propias + estado de derivación |

## Coach IA (SSE)
| Método · ruta | Scope | Descripción |
|---|---|---|
| `POST /coach/chat` | `health_clinical` | `{message, history[]}` → stream SSE: `token` · `tool_call` · `tool_result` · `referral` · `done` |
| `POST /coach/escalate` | `health_clinical` | `{domain, urgency}` → crea `red_flag` + recurso de derivación |

**Orden del prompt (server-side, §5.2):** `CLINICAL_POLICY` → contexto (Health Map + readiness + dolor activo) → memoria → RAG (ACSM/NSCA/ISSN/OMS) → mensaje. El screening determinista (`screenMessage`) corre **antes** que el modelo: si hay red flag, la respuesta es `referral` y no hay chat.

## Scans y Progress Vault
| Método · ruta | Scope | Descripción |
|---|---|---|
| `POST /scans/progress` | `body_scan` | Escaneo de progreso (perímetros/3D) → `202 {scanId}` |
| `GET /scans` | `body_scan` | Lista propia (metadatos; sin binarios) |
| `GET /scans/:id/url` | `body_scan` | Signed URL 5 min al binario cifrado por usuario |

## Gamificación
| Método · ruta | Scope | Descripción |
|---|---|---|
| `GET /xp/ledger` | — | Ledger íntegro (xp, skill_xp, credits, points) |
| `GET /items/mine` | — | Armory: items DIGITAL/PHYSICAL + verificación NFC/QR |
| `POST /items/verify` | — | `{nfcTag\|qrCode}` → `PHYSICAL ITEM VERIFIED` → gemelo digital |
