# Sprint 11 · Comunidad + FitCoins + tienda

Fecha: 2026-10-07

## Objetivo

Convertir la Comunidad en una superficie real de progreso, no en una red de apariencia:

- progreso social;
- FitCoins;
- referidos;
- canje;
- recompensas digitales;
- separación estricta entre moneda virtual y comercio físico.

## Progreso social

Nuevo dominio: `js/community.js`.

Solo se pueden compartir candidatos derivados de datos ya registrados:

- sesión completada;
- récord personal;
- racha;
- hitos/progreso estructurado.

No existe un formulario para escribir manualmente un “PR” o una sesión inexistente.

Cada publicación conserva:

- `type`;
- `evidenceId`;
- título semántico;
- métrica;
- caption opcional;
- fuente;
- nivel de verificación.

Una misma evidencia no se comparte dos veces localmente.

## FitCoins

`credits` se conserva por compatibilidad interna, pero la experiencia nueva lo presenta como FitCoins.

Nuevo ledger:

- amount;
- balanceBefore;
- balanceAfter;
- source;
- reference;
- label;
- timestamp.

El saldo heredado se migra mediante un asiento de apertura auditable.

### Reglas

- sesión completa: +20 FitCoins;
- una sesión parcial no recibe bono;
- un segundo cierre de la misma sesión no duplica FitCoins;
- no existen bonos por dolor, fatiga extrema o exceso de actividad.

## Recompensas

`FITCOIN_REWARDS` contiene recompensas digitales.

El canje:

1. verifica que la recompensa exista;
2. verifica que el artículo no esté ya poseído;
3. verifica saldo suficiente;
4. crea una transacción negativa;
5. crea un registro de redemption;
6. desbloquea el gemelo digital.

Nunca se cobra dos veces un artículo ya poseído.

## Productos físicos

Los artículos físicos se muestran separados de FitCoins.

La UI declara expresamente:

- FitCoins no procesan una compra física;
- no se simula pedido;
- no se simula pago;
- no se llama checkout desde el flujo FitCoin.

## Comunidad cloud

Nueva migración:

`api/supabase/migrations/0007_community_referrals.sql`

Tablas:

- `community_posts`;
- `community_reactions`;
- `user_referral_codes`;
- `user_referrals`.

### RLS

- feed visible solo a usuarios autenticados;
- post/reacción: escritura propia;
- nombre público fijado por trigger del servidor;
- cliente no puede marcarse `server_verified`;
- código de referido: visible directamente solo a su dueño;
- relación de referido visible a las partes implicadas.

## Referidos verificados

RPCs:

- `create_user_referral_code()`;
- `accept_user_referral_code(code)`.

Protecciones:

- no autorreferido;
- un único referrer por cuenta;
- el cliente no inserta conversiones directamente;
- compartir un código no cuenta como conversión;
- no se otorgan FitCoins locales por un referral sin verificación autoritativa.

## Cliente cloud

Nuevo:

`js/sync/community.js`

Incluye:

- `loadCommunityFeed()`;
- `publishCommunityPost()`;
- `toggleCommunityReactionCloud()`;
- `getOrCreateReferralCode()`;
- `acceptReferralCode()`;
- `myReferralStats()`.

Si falla Supabase, el progreso local permanece guardado.

## UI

Nueva:

`js/ui/community.js`

La ruta existente `social` ahora abre Comunidad real.

Incluye:

- KPIs;
- feed local;
- feed cloud;
- reacciones;
- compartir progreso verificable;
- tienda FitCoin;
- productos físicos separados;
- referidos;
- historial FitCoin.

## Estado · schema 11

Nuevo:

- `community.posts`;
- `community.fitcoinLedger`;
- `community.redemptions`;
- `community.reactions`;
- `community.referralInvites`;
- `community.referralCode`.

Operaciones:

- `fitCoinBalance()`;
- `fitCoinLedger()`;
- `redeemFitCoinReward()`;
- `progressShareCandidates()`;
- `createProgressPost()`;
- `toggleCommunityReaction()`;
- `referralCode()`;
- `recordReferralShare()`;
- `communitySummary()`.

## PWA

- `js/community.js` precacheado;
- `js/ui/community.js` precacheado;
- `js/sync/community.js` precacheado;
- shell v43.

## Validación

Nuevas suites:

- `tests/community-eval.mjs`;
- `tests/community-state-eval.mjs`;
- `tests/community-ui-eval.mjs`;
- `tests/community-cloud-eval.mjs`;
- `tests/fitcoins-workout-eval.mjs`.

Suite total: **75 suites**.

Validación local:

- 75/75 suites verdes;
- i18n 114/114, sin regresión;
- golden biomecánica verde;
- referidos anti-self;
- sesión parcial sin FitCoins;
- doble cierre sin doble recompensa;
- producto físico sin checkout ficticio.

Merge únicamente con `bateria` y `ci` verdes.
