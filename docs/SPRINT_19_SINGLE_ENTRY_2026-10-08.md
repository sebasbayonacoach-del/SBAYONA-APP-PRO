# BAYONA App · Sprint 19 — Una sola presentación, selector separado

Fecha 2026-10-08. Rama `bayona-one/sprint19-single-entry-20261008`. Base desarrollo oficial `c971b8021324ee3f00f1bf8766b30cd2638aed30`.

## Síntoma comunicado

Se percibían «dos versiones una encima de otra» en la preview Sprint 18.

## Diagnóstico reproducido

En la URL preview, comprobación Playwright a 390 y 1440 px:

- Estado inicial: el módulo público `#luxe-landing` está visible y `#entry` oculto.
- Después de «Entrar ahora»: `#luxe-landing` se retira del DOM, `#entry` se vuelve visible.
- Después de entrar como cliente: `#entry` vuelve a quedar oculto.
- No había dos instancias simultáneas de la pantalla en esta prueba, ni IDs duplicados ni errores JavaScript.
- Sí había **dos portadas publicitarias consecutivas**: la pública «Más fuerte. Más tú.» y una segunda «Tu siguiente gran versión.» que también repetía explicación y presentación del sistema. Esto justificaba la sensación de diseño superpuesto o duplicado.

## Solución implementada

- Se mantiene la portada comercial y sus recursos sin modificaciones.
- Se elimina la segunda presentación `.e-entry-intro` y el mockup ilustrativo de la puerta.
- `#entry` pasa a una tarjeta única centrada «¿Cómo quieres entrar?», con dos únicas opciones: **Soy cliente** y **Soy entrenador**.
- Se conservan onboarding, flujo de Coach OS, atajos, último perfil, tema día/noche y aviso de que elegir entrenador no concede permisos.
- `css/bayona-single-entry.css` es la última capa de composición; no modifica el resto de pantallas.
- Ajustado pie y tipografía para que no se superpongan y las dos opciones quepan en pantallas normales de móvil.
- PWA: `bayona-shell-v55`, incluyendo nuevo CSS offline, e `index.html` enlaza la capa nueva.

## Evidencia y QA

- Auditoría visual y DOM en 320, 390, 768, 1440 px × oscuro y claro. Comprobación de pantalla de acceso sin hero duplicado, dos roles presentes, botón Coach por encima del footer, cero overflow horizontal y sin pageerrors.
- Capturas aisladas en `/tmp/bayona-sprint19-single-entry-20261008/artifacts/sprint19-single`; no forman parte de la aplicación publicada.
- `tests/experience-role-browser.mjs`: deja de exigir mockup de la portada duplicada y exige que el selector compacto sea visible sin una segunda pantalla promocional, y que la portada anterior no se superponga.
- Contratos estáticos de onboarding, paleta, marca y PWA actualizados para el acceso único.
- Aún no certificado: autenticación cloud/Supabase y autorización real del rol entrenador; esta UX es selección visual de contexto, no control de datos.

## Recomendación

La versión pública de marketing no es la versión de la app. No volver a presentar una portada editorial completa después de pulsar Entrar. El usuario debe ver únicamente la decisión Cliente/Entrenador.
