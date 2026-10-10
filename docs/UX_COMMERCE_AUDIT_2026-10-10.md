# BAYONA 1.0.3-beta — Auditoría UX + Comercio

Fecha: 2026-10-10

## Objetivo

Reducir la sensación de “producto potente pero fácil de perderse” y establecer una sola verdad comercial entre BAYONA App, Armario y la Tienda web.

## Modelo mental final

- **Inicio**: qué toca hoy y accesos de contexto.
- **Entrenar**: sesión y biblioteca técnica cuando corresponde.
- **Progreso**: resultados reales del usuario.
- **Perfil**: cuenta, preferencias y utilidades.
- **Armario**: inventario personal y gemelos digitales.
- **Tienda**: catálogo comercial canónico de la web.
- **Coach Studio**: superficie profesional separada del cliente.

La navegación inferior del cliente mantiene solo cuatro destinos: Inicio / Entrenar / Progreso / Perfil.

## Fallos detectados y corregidos

1. **Dos verdades comerciales**: la web tenía un catálogo moderno de 39 productos y otro catálogo legado independiente de 6. El catálogo legado ahora es un adaptador de la fuente canónica.
2. **Armario desconectado de Tienda**: los artículos físicos usaban nombres internos que no coincidían con el producto vendido. Cada gemelo físico tiene ahora un shopId real y usa el nombre/precio canónicos.
3. **Canje físico falso**: cualquier objeto digital bloqueado podía abrir el flujo de código físico. Ahora solo un artículo physical con producto comercial real puede canjear código.
4. **Enlaces genéricos**: el Armario llevaba a la tienda sin conservar el producto. Cada gemelo abre /shop?product=<id> y la web enfoca ese producto.
5. **Terminología inconsistente**: convivían Armario, Armería y Recompensas. La superficie del usuario pasa a llamarse **Armario**.
6. **APK con marketing antes del producto**: una instalación nativa nueva podía enseñar la landing comercial antes del selector de rol. Android/iOS y PWA instaladas saltan la landing pública.
7. **Pantalla de acceso mezclaba roles**: antes de elegir rol se mostraban PROPLAYER/RUTINAS/CLIENTES. Ahora la promesa neutral del cliente es Entreno / Nutrición / Recuperación / Progreso y Coach Studio queda separado.
8. **Plataforma mal etiquetada**: Android mostraba “PWA”. La etiqueta de superficie ahora es dinámica: WEB / PWA / ANDROID / IOS.
9. **Guía de producto no recuperable**: el onboarding existía, pero tras completarlo era difícil repetirlo. Se añadió “Repetir guía de BAYONA”.
10. **PROPLAYER podía desaparecer en una recompilación**: mobile/pack-web.mjs no incluía explícitamente trainingym/. Ya se empaqueta y se verifica.
11. **Catálogo móvil sin contrato**: no había una comprobación que impidiera futuras divergencias. tests/commerce-eval.mjs valida catálogo, enlaces, identidad, navegación y empaquetado.
12. **Sin sincronizador explícito**: npm run sync:shop regenera los 39 productos de la app desde la fuente web y falla ante IDs duplicados o enlaces inválidos.

## Contrato Armario ↔ Tienda

Un objeto físico del Armario debe cumplir todos los puntos:

1. physical: true.
2. shopId obligatorio.
3. shopId existe en los 39 productos canónicos.
4. El nombre del Armario coincide con el nombre comercial.
5. El enlace profundo contiene ?product=<shopId>.
6. El producto muestra precio COP y referencia EUR.
7. El canje físico solo se ofrece en este caso.

Los objetos digitales no usan shopId y muestran desbloqueo por progreso.

## Puertas de release

Antes de compartir una APK:

- npm run sync:shop
- node tests/commerce-eval.mjs
- npm test
- npm run mobile:pack
- npx cap sync android
- ./gradlew assembleDebug
- verificar aapt dump badging
- verificar firma con apksigner
- comprobar trainingym/catalog.json = 3.141
- comprobar shop-catalog.js = 39
- instalar con adb install -r
- abrir en móvil real y revisar logcat

## Estado de 1.0.3-beta

- Android: versionCode 4 / versionName 1.0.3-beta.
- Catálogo comercial: 39.
- Gemelos físicos en Armario: 10.
- PROPLAYER empaquetado: 3.141 fichas.
- Navegación cliente: 4 destinos principales.
- Auditoría comercio: 25 comprobaciones, 0 fallos.
- Batería App: 45 suites, 0 fallos.
- Web: 116 archivos de prueba, 793 tests pasados, 1 omitido.
- Build web de producción: correcto.

## Límites todavía vigentes

Esta beta no debe presentarse aún como un SaaS multiusuario terminado hasta certificar autenticación real, aislamiento RLS, sincronización remota entre cuentas y cobros live. Estos límites no impiden usar BAYONA como experiencia de acompañamiento para clientes propios.
