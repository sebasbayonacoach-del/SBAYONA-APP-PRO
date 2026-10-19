# BAYONA Android · auditoría de micrófono y firmas (2026-10-19)

- Base auditada: v1.0.19-beta, código 20, firma v2 correcta.
- Hallazgo: `AndroidManifest.xml` no declaraba `RECORD_AUDIO`; el
  `BridgeWebChromeClient` de Capacitor solicita grabación de audio para
  `getUserMedia()`, de modo que el flujo de voz podía fallar en Android.
- Corrección aislada: declarar `RECORD_AUDIO` y `MODIFY_AUDIO_SETTINGS`
  y subir la versión a 1.0.20-beta (código 21).
- Test `tests/android-audio-permission-eval.mjs`: PASS; batería completa,
  68 suites PASS. El APK debug se compiló, su firma es válida y su certificado
  corresponde al de la versión de desarrollo previamente instalada.
- **Importante:** la firma release v1.0.19 no coincide con la de la versión
  v1.0.9 existente en el dispositivo de prueba; no se debe hacer instalación
  de reemplazo sin resolver compatibilidad/respaldos. No se instaló nada.
- El paquete debug sirve únicamente para QA, no para distribución comercial:
  incluye capacidades de depuración. La compilación release de v1.0.20 no
  finalizó por carga elevada de RAM y swap; no afirmamos release validada.
- Precauciones pendientes: `allowBackup=true` sin reglas de extracción,
  OAuth/redirect Android sin QA integral, permisos y seguridad de medios,
  protección de contraseñas filtradas deshabilitada en Supabase, revisión
  de RPC `SECURITY DEFINER`. Todo cambio a producción requiere aprobación.
- No se empaquetaron contraseñas, archivos de claves, tokens ni datos
  personales. Los materiales temporales de firma fueron eliminados.