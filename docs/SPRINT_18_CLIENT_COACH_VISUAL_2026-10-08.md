# BAYONA App · Sprint 18: sistema visual Cliente + Coach OS

Fecha: 2026-10-08. Rama aislada: `bayona-one/sprint18-role-visual-20261008`, origen: `8717405` (PR #34).

## Modelo de producto

- **Cliente:** es la experiencia principal. Acceso «Soy cliente»; Inicio, entrenamiento, recuperación, progreso, hábitos. La sesión de hoy debe aparecer antes de las estadísticas de segundo nivel.
- **Entrenador:** Coach OS es una experiencia distinta para gestionar clientes, planificación, agenda y seguimiento. La persona propietaria debe tener la cuenta profesional autorizada.
- **IMPORTANTE: rol real no certificado.** La elección actual de entrada todavía es una selección de contexto en frontend. Los datos mostrados en Coach OS proceden en parte de una cartera local/demo; NO se considera control de acceso. Para permitir SOLO al entrenador titular se requiere autenticar una cuenta coach, comprobar rol en el servidor y aplicar RLS en Supabase, sin considerar un botón, localStorage o JavaScript como autorización. Hasta entonces no habilitar acceso profesional con datos reales ni lanzar producción.

## Cambios implementados

- Nueva portada editorial con jerarquía, copy Cliente/Entrenador sin «atleta», tarjeta de recorrido marcada como ilustración, y tarjetas de decisión más visibles.
- Tema día y noche accesible desde la pantalla de entrada, conectado al motor común `applyTheme`. El cambio se sincroniza con el resto de la app y respeta preferencia almacenada; control de modo dentro de la app en su barra superior.
- Paletas diferenciadas marfil/crema + grafito/ámbar BAYONA; foco visible, tipografía Display / Inter y radios, superficies y espaciado revisados.
- Home Cliente reorganizada: primero la sesión/acción de hoy, después identidad/estadísticas y ayudas complementarias. Se corrigió la interpolación `{coach}` que se mostraba como texto literal.
- Coach OS mantiene su estructura funcional, con mejoras de tarjetas, titulares, métricas, botones y contraste día/noche.
- Maquetación de la entrada en móvil corregida para permitir desplazar las dos opciones sin taparlas con el pie.
- Nueva hoja `css/bayona-experience.css` cargada al final, precacheada en PWA `bayona-shell-v54` y testeada con presupuesto estático.
- No se tocan tarifas ni entitlements, rutas de entrenamiento, datos del cliente ni endpoints de cloud/Stripe.

## Comprobación y aislamiento

- Capturas de 320/390/1440 px oscuro/claro en `artifacts/sprint18-after`, cliente y Coach OS capturados separadamente.
- `tests/experience-role-eval.mjs`: 19 verificaciones de roles, temas y cascada.
- `tests/experience-role-browser.mjs` integrado a la regresión Playwright: cambio de tema real, roles separados, tamaño de tarjetas, ausencia de desbordamiento y tarjeta Coach accesible con desplazamiento en móvil.
- Las pruebas `onboarding-eval.mjs`, `paleta-eval.mjs`, `pro-ui-eval.mjs` se adaptaron a la nueva especificación visual; eliminarían errores ficticios que reclamaban deliberadamente el diseño anterior.
- El repositorio original `~/TRABAJO/02_DESARROLLO/SBAYONA-APP-PRO` mantiene 40 archivos modificados/no seguidos, sin reescritura ni stash. El desarrollo se hizo en `/tmp/bayona-sprint18-role-visual-20261008`.

## Puertas antes de producción

1. Identidad + sesión real de entrenador con roles autorizados; guard Coach OS y datos profesionales protegido en backend/Supabase RLS. Ningún perfil cliente puede consultar o editar datos ajenos.
2. Preferencias de tema aisladas por cuenta al habilitar sincronización, sin alterar los dispositivos de los demás clientes.
3. Nube y pagos de Stripe TEST, webhooks y cancelaciones validados; cloud y Stripe live actualmente no certificados.
4. Revisión responsive, accesibilidad, E2E, integridad de assets/seguridad y preview aislada antes de tocar producción.
