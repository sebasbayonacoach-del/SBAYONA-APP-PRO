# BAYONA · Misión comercial 2026-10-09

## Objetivo verificable
Conseguir conversaciones cualificadas y la primera contratación real de servicios de entrenamiento. **No** considerar una conversación, clic o intención como una venta. Marcar ingresos únicamente cuando se compruebe el cobro y la prestación acordada.

## Activo compartible
- Página pública: `/misiones.html` (Vercel preview hasta certificación y publicación).
- Reto gratis de 7 días con siete acciones voluntarias, progreso almacenado solo en el navegador y sin inventar XP.
- CTA principal: «Hablar con un entrenador».
- CTAs por plan: RAÍZ 35 €/mes, PERFORMANCE 93 €/mes, ELITE 209 €/mes. Importes cotejados con `js/entitlements.js`.
- WhatsApp comercial público extraído del enlace ya publicado en `https://bayona-jet.vercel.app/`: `https://wa.me/34641698332`. Solo se utiliza para que el interesado **inicie** la conversación; no se hacen envíos masivos ni contactos no consentidos.
- No hay formulario de datos ni checkout ficticio. La contratación se confirma manualmente.

## Misiones comerciales de hoy

| Misión | Resultado | Condición de cierre |
|---|---|---|
| 01 · Activar escaparate | Compartir enlace directo de la misión en tus canales | Abrir la URL desde incógnito y móvil; comprobar primer render, WhatsApp y plan |
| 02 · Demostrar valor | Publicar una muestra real de entrenamiento/recuperación | Enlace funcional, sin testimonios o resultados inventados |
| 03 · Abrir conversaciones | Contactar personalmente a 10 personas que hayan mostrado interés o permitido contacto | Respuestas pertinentes registradas, sin spam ni copia masiva |
| 04 · Recuperar interesados | Dar seguimiento individual a 5 conversaciones previas relevantes | Mensajes adecuados a cada necesidad, una sola vez |
| 05 · Confirmar encaje | Hacer preguntas básicas sobre objetivo y disponibilidad, sin recabar historia médica por WhatsApp | Interés, modalidad y alcance claros |
| 06 · Ofertar con precisión | Presentar precio y entregables reales del plan elegido | Precio y condiciones expresamente confirmados por ambas partes |
| 07 · Cerrar correctamente | Proporcionar un cobro legítimo ya habilitado y acordado, emitir comprobante según corresponda | Pago **verificado** y acuerdo de prestación guardado |

## Mensaje inicial sugerido, solo para contactos con interés previo

«He abierto la Misión BAYONA de 7 días: una forma sencilla de empezar a moverse y registrar progreso. Se puede probar gratis aquí: [ENLACE]. Si luego quieres algo personalizado, dime tu objetivo y te cuento qué programa encaja. No hay compromiso».

## Seguimiento

| Métrica | Inicial |
|---|---:|
| Enlace de campaña funcional | PENDIENTE DE PREVIEW |
| Personas contactadas por el titular | 0 verificadas |
| Respuestas recibidas | 0 verificadas |
| Consultas por WhatsApp | 0 verificadas |
| Propuestas aceptadas | 0 verificadas |
| Pagos cobrados | **0 verificados** |

## Reglas de seguridad
- Sin claves ni datos de salud/financieros en la landing.
- Coach OS no se promociona como multiusuario seguro: Supabase Auth/RLS sigue sin pruebas operativas.
- Stripe LIVE no se activa hasta realizar pruebas completas de entitlements, webhooks, cancelaciones y acceso.
- No desplegar como producción comercial con pagos automáticos; esta campaña es una página estática de captación y contacto.
- Mantener intactos los 40 archivos modificados/no seguidos de la carpeta de trabajo original.
