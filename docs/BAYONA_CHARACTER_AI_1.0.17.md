# BAYONA Character AI · MVP funcional 1.0.17-beta

## Qué hace
- Cada persona carga una foto JPG/PNG/WebP (hasta 8 MB) autorizada.
- Crea su personaje gráfico y animado usando el recorte local de cara de
  BAYONA. El cuerpo es una ilustración, no un doble físico realista.
- Selecciona cualquiera de las seis recetas existentes de Nutrición.
- Ve una previsualización en tiempo real y crea un vídeo 9:16 de 8 segundos
  con cocina animada, ingredientes, pasos y títulos.
- Descarga el vídeo WebM o la portada PNG. Funciona sin suscripción a servicios
  audiovisuales y sin enviar fotos a un servidor externo.
- El coach propietario dispone de un acceso en Studio, sin cambiar de rol.

## Datos y límites
- Autorización explícita previa a leer la imagen. Para menores, se solicita
  autorización del adulto responsable; faltan controles verificados de edad
  y consentimiento tutelar para ofertarlo específicamente a menores.
- La imagen original no se sube ni se conserva por esta función. El recorte
  se conserva solo en memoria por defecto; el usuario puede elegir
  expresamente guardarlo en el perfil, donde podría sincronizarse.
- No se genera clon de voz, vídeo fotorrealista, rostro parlante ni
  asesoramiento nutricional clínico. Es una animación ilustrada y silenciosa.
- Valores nutricionales de las recetas: estimaciones, no prescripciones.
- Si la plataforma no admite MediaRecorder/WebM, se permite generar PNG.
- Los vídeos resultantes contienen la imagen del usuario y deben tratarse
  como contenido personal; no compartirlos automáticamente.
- No se añade sistema paralelo de XP, ni se factura nada.

## QA
- Pruebas funcionales del motor y consentimiento: tests/character-video-eval.mjs.
- Chromium escritorio 1280 px: permiso denegado/correcto,
  foto de prueba sintética, recetario real, render visible,
  descarga de BAYONA_WRAP_DE_ATUN.webm de 725758 bytes
  tras 8 s, sin errores JS ni overflow.
- Chromium móvil 390 px: misma foto sintética, personaje y recetas,
  sin errores JS ni overflow.
- Pendiente probar instalación/descarga en Android físico.
