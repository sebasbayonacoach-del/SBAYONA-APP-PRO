# BAYONA Avatar OS · 1.0.18-beta

## Implementado y utilizable sin créditos ni servicios externos
- Foto propia autorizada → avatar ilustrado existente.
- Voz propia: permiso explícito separado de la foto, grabación por micrófono
  o archivo WAV/WebM/MP4 de 3 a 30 segundos, máx. 6 MB.
- Vista previa con boca ilustrada sensible al volumen de la voz. **No es
  sincronización labial fonética** ni clonación de voz sintética.
- Exportación WebM 9:16 con imagen y **pista de audio Opus real** con la
  grabación del propio usuario, obtenida por MediaRecorder con Web Audio.
- 6 recetas con guiones y 6 movimientos/ejercicios didácticos, decorativos.
  El avatar *presenta* la actividad; sus movimientos no enseñan técnica
  biomecánica, remitir a PROPLAYER para demostraciones reales.
- Descarga local y portada PNG sin servidor, cuotas, pagos ni compartición
  automática de fotografía o voz.
- Eliminación de voz cargada dentro de la sesión; nunca se guarda en perfil,
  nunca se envía al backend. Foto solo se persiste con permiso adicional.
- Modo sin voz permanece disponible; audio propio no se transforma en voz
  de otra persona. Menores: se requiere autorización, pero los controles
  parentales y edad aún NO han sido verificados, por lo que no debe venderse
  este flujo como apto para todas las edades.
- Si el navegador no admite audio WebM/MediaRecorder, se puede crear PNG.

## HeyGen / voz realista
- La cuenta HeyGen se verificó conectada desde ChatGPT, pero usa plan Free.
- El proveedor ofrece avatares de foto, voz sintética/lip-sync avanzado,
  **sujetos a verificación de identidad, consentimiento y créditos**.
- La conexión MCP de ChatGPT **no da a la APP credenciales reutilizables**.
- No se sube ningún dato personal a HeyGen ni se copia un API key en el cliente.
- Para una fase de avatars realistas por usuario, falta un backend propio
  con identidad verificada, permisos por usuario, seguimiento de costes,
  custodia de claves, retención/borrado y revisión de usos.
- Esta entrega demuestra un personaje ilustrado hablando con audio original,
  NO un servicio de clonación de voz para usuarios.

## QA
- Tests automatizados (66 suites) incluyen comprobaciones de permisos,
  duraciones, rutas de exportación y formato del contenedor.
- Test en Chromium con fotografía sintética + voz sintética WAV (sin datos
  biométricos reales). Exportación WebM con flujos VP9 y Opus confirmados por
  ffprobe. No se emplean fotos/voz del propietario para pruebas.
- El medio se probó en escritorio; validar descarga de audio/vídeo en móvil
  físico con permisos del micrófono antes de comercializar.
- Google OAuth Android, licencias multimedia, revisión de nutrición y
  controles de menores aún no concluidos.
- La versión pública Vercel permanece sin modificar; reconciliar antes de
  cualquier despliegue de producción.
