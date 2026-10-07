# Sprint 09 · Coach CRM

Fecha: 2026-10-07

## Objetivo

Convertir Coach OS en una capa CRM operativa para gestionar:

- cartera;
- ficha;
- agenda;
- pagos administrativos;
- referidos;
- compras;
- notas;
- alertas.

## Principios

- Los clientes DEMO nunca entran al ledger CRM.
- Los clientes vinculados reales pueden registrarse como fuente NUBE.
- Un pago “pagado” significa estado administrativo registrado; BAYONA no afirma haber cobrado dinero.
- Los importes viven en céntimos enteros.
- Saldos EUR, COP, USD, etc. nunca se mezclan.
- La sincronización cloud es explícita; no se suben contactos o notas solo por abrir la pantalla.
- El CRM local sigue funcionando aunque Supabase no esté disponible.

## Dominio

Nuevo `js/coach/crm.js`.

Entidades: client, appointment, payment, referral, purchase y note.

Estados canónicos:

- Cliente: lead, active, paused, archived.
- Cita: scheduled, completed, cancelled, no_show.
- Pago: due, paid, overdue, cancelled, refunded.
- Referido: lead, contacted, converted, lost.
- Compra: ordered, paid, fulfilled, refunded, cancelled.

## Alertas

Reglas explicables:

- pago vencido;
- referido sin contactar durante 7 días;
- compra pagada pendiente de entrega durante 7 días.

No son diagnósticos ni decisiones automáticas.

## Estado · schema 9

Nuevo:

- `coachCrm.clients`;
- `coachCrm.appointments`;
- `coachCrm.payments`;
- `coachCrm.referrals`;
- `coachCrm.purchases`;
- `coachCrm.notes`.

Operaciones:

- `upsertCoachCrmClient()`;
- `addCoachCrmRecord()`;
- `updateCoachCrmStatus()`.

## UI

Nueva `js/ui/coach-crm.js`.

Incluye:

- hero de operaciones;
- KPIs CRM;
- deuda registrada separada por moneda;
- alta de cliente;
- agenda;
- alertas;
- cartera CRM;
- ficha individual;
- pago registrado;
- referido;
- compra;
- nota;
- timeline unificada;
- transiciones explícitas de estado.

## Cloud

Nueva migración:

`api/supabase/migrations/0006_coach_crm.sql`

Tablas privadas del Coach:

- coach_crm_clients;
- coach_crm_appointments;
- coach_crm_payments;
- coach_crm_referrals;
- coach_crm_purchases;
- coach_crm_notes.

### RLS

- lectura/escritura solo del Coach propietario;
- clientes autenticados vinculados no obtienen acceso automático a pagos/notas administrativas;
- fichas vinculadas requieren relación `coach_clients` activa;
- registros hijos deben pertenecer a una ficha CRM del mismo Coach;
- notas sin UPDATE para conservar historial.

## Sync

`js/sync/coaching.js` añade:

- `pullCoachCrmFromCloud()`;
- `pushCoachCrmToCloud()`;
- `syncCoachCrmCloud()`.

La sincronización:

1. fusiona nube → local;
2. compara `updatedAt`;
3. conserva ID local estable;
4. usa `cloudId` separado;
5. sube la versión más reciente;
6. nunca usa una credencial `service_role`.

## PWA

- `js/coach/crm.js` precacheado.
- `js/ui/coach-crm.js` precacheado.
- shell v41.

## Validación

Nuevas suites:

- `tests/coach-crm-eval.mjs`
- `tests/coach-crm-state-eval.mjs`
- `tests/coach-crm-ui-eval.mjs`
- `tests/coach-crm-cloud-eval.mjs`

Suite total: **66 suites**.

Validación local:

- 66/66 suites verdes;
- golden biomecánica verde;
- sin fallos en contratos CRM.

Merge únicamente con `bateria` y `ci` verdes.
