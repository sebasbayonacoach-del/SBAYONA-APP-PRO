# BAYONA App · Sprint 16A — Demo de membresías clara y accesible

Fecha: 2026-10-08. Rama aislada `bayona-one/sprint16a-demo-clarity-20261008` sobre el oficial posterior al PR #31.

## Auditoría visual real

Antes de cambios se verificaron 120 combinaciones Playwright: anchuras 320/390/1440 px × modo día/noche × membresías FREE/RAÍZ/PERFORMANCE/ELITE × cinco superficies Inicio/Entrenar/Comer/Progreso/Coach. Cero pageerrors y cero overflow horizontal. Se detectaron errores de confianza y accesibilidad:

- El móvil falso rotulaba una tarjeta `Datos reales`, pese a no leer ni mostrar datos personales.
- Una fecha fija `MARTES · 6 OCT` podía confundirse con actividad del usuario.
- Botones de membresía de solo 34px y estado de selección visual sin `aria-pressed`.
- El cambio de tema desde controles externos podía dejar los botones Día/Noche de la demo desincronizados.

## Cambios entregados

- Copy explícito `SIMULACIÓN INTERACTIVA`, `EJEMPLO · SIN DATOS PERSONALES` y advertencia de que no hay acceso premium o pago confirmado por la demostración.
- Eliminar fecha fija y pretensión de datos reales; ejemplos rotulados como ilustración.
- Presentación conservadora de funciones según el **motor único** de membresías `hasFeature` y `featureTier`. La demo no escribe plan, entitlement, pagos, perfil ni datos personales.
- Estados `aria-pressed` actualizados para las cuatro membresías, cinco superficies y dos temas. Los controles de tema se sincronizan al recibir `bayona:theme` del resto de la aplicación.
- Mayor legibilidad, botones al menos 44px, teclado/foco visible en ambas apariencias, disposición móvil 2×2 de planes.
- Contenidos nuevos en catálogo i18n sin subir línea base de 114 literales hardcodeados.
- PWA v51 y versión CSS `luxe.css?v=2` para coherencia tras instalar/recargar.

## Verificaciones

- Playwright: 120 variaciones de ancho, tema, plan y superficie sin overflow ni JS error, con capturas antes y después.
- E2E producción: 112/112 verificaciones, incluyendo 30 nuevas sobre membresías, controles, permisos y simulación.
- Nueva suite `tests/demo-preview-integrity-eval.mjs`: 30 verificaciones y 68 combinaciones de permisos comparadas con `FEATURES`.
- `npm run check:production` y CI GitHub deben validar todo antes de fusión.

## Límites de producto

La vista previa representa ilustraciones y acceso previsto por plan, no una cuenta registrada ni cobro real. Stripe real y nube siguen sin habilitar hasta sus verificaciones específicas de staging. El original local `~/TRABAJO/02_DESARROLLO/SBAYONA-APP-PRO` con 40 cambios sin confirmar no se edita, guarda con stash ni sustituye. Esta tarea se desarrolla en clon aislado bajo `/tmp`.
