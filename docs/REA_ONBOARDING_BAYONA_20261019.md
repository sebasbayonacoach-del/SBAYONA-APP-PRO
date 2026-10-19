# REA × BAYONA: auditoría del onboarding (19 octubre 2026)

## Fuente y límites
- REA, paquete npm oficial rea-agents@6.7.0, configurado y comprobado
  para Codex y Cursor sin sobrescribir su configuración existente.
- Análisis estático, con analyze-javascript-application y fuentes exactas:
  js/onboarding.js, js/ui/first-run-tour.js.
- Evidence ID: ev_027304ef33a94c1292314b345e5e7e7110969655558d821299c604b356160439.
- La inspección es parcial y estática. No valida servicios en producción
  ni ejecución en todos los dispositivos. El doctor global de REA señala
  motores nativos opcionales no instalados; el análisis JS sí funciona.

## Dos mejoras aplicadas
1. Solo Sebastián es entrenador. En el registro, mara se conserva
   únicamente como ID técnico antiguo para no romper perfiles existentes.
   Su nombre comercial pasa a BAYONA IA y el rol mostrado a
   Asistente digital, nunca coach.
2. La guía contextual de primera entrada ya no deja una capa modal
   inaccesible si falta el último elemento a destacar. Marca la guía
   como saltada y desmonta la capa y su listener de resize.

## Evidencia de pruebas
- node tests/rea-onboarding-safety-eval.mjs: 14 comprobaciones.
- node tests/onboarding-eval.mjs: 45 comprobaciones.
- node tests/run.mjs: 64 suites, exit code 0.
- Chromium QA sin tocar cuentas reales: escritorio 1440 px y móvil
  390 px; pasos existentes y ausentes, overlay retirado, sin errores JS
  ni desplazamiento horizontal.

## Publicación
Rama independiente; no fusionar a producción Vercel hasta completar
revisión de Auth, OAuth Google, pruebas en Android y licencias de medios.
No se añade recogida de datos personales ni un segundo entrenador.
