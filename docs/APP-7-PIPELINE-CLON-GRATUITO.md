# BAYONA APP 7.0 — Producción de instructores con software gratuito

## Estado
- Existe integración PROPLAYER con opción Sebastián / Profesora / referencia.
- La identidad fotográfica «Sebastian» existe en HeyGen, pero su consentimiento se encuentra en procesamiento. La voz «Sebastian» está activa; esto no equivale a tener 3.141 vídeos.
- No hay vídeos de ejercicio publicados como Sebastián o Profesora; `media/instructor-reviews.json` comienza vacío.
- Este flujo local evita generar cargos y no depende de HeyGen o servicios de pago.

## Cadena gratuita recomendada
1. **Captura original:** grabación con móvil/cámara de una ejecución real por ejercicio representativo; revisar iluminación, amplitud y visibilidad de articulaciones. Los movimientos deben ser biomecánicamente correctos.
2. **Movimiento:** [FreeMoCap](https://freemocap.org/download.html) (software libre) procesa el movimiento; exportar a Blender, FBX/BVH. Alternativa: [MediaPipe Pose Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker) para obtener puntos corporales y análisis, con corrección de errores.
3. **Personaje:** modelar y ajustar el rostro/cuerpo propio a partir de referencias autorizadas en [Blender](https://www.blender.org/); usar esqueleto Rigify y retargeting. Un fotograma o un avatar de retrato **no** basta para reproducir el movimiento corporal.
4. **Animación:** retarget y corregir manualmente caderas, rodillas, columna, hombros, manos, soporte, cargas y suelo; revisar cada variante y lateralidad. Crear una profesora original, sin imitar a otra persona real.
5. **Vídeo:** renderizar con Blender y codificar con [FFmpeg](https://ffmpeg.org/), en MP4 (H.264) o WebM; preferir 720p y clips cortos. No añadir música/medios ajenos sin licencia.
6. **App:** guardar los clips revisados como `media/instructors/sebas/42.mp4` o `media/instructors/profesora/42.webm` usando `record.pos` de `trainingym/catalog.json`, nunca como nombre comercial o título.
7. **Revisión por ejercicio:** añadir un registro a `media/instructor-reviews.json` con `exercise_id`, `instructor`, `extension`, y los cuatro campos `published`, `identity_approved`, `rights_clear`, `technique_approved`. Todos deben ser verdaderos tras las verificaciones respectivas.
8. **Publicación local:** ejecutar `node tools/build-instructor-demos.mjs` para simular; `node tools/build-instructor-demos.mjs --write` para construir el manifiesto. El script comprueba que el archivo local exista, sea no trivial y tenga cabecera MP4/WebM válida. NO comprueba por sí mismo que la técnica sea buena: debe aprobarse antes.
9. **QA:** `node tests/instructor-pipeline-eval.mjs`; `npm test`. Comprobar reproducción en móvil antes de desplegar.

## Ejemplo de revisión (documental; no aprobado)
```json
{
  "exercise_id": 42,
  "instructor": "sebas",
  "extension": "mp4",
  "published": false,
  "identity_approved": false,
  "rights_clear": false,
  "technique_approved": false
}
```

## Barreras
- Nunca subir fotografías privadas, muestras de voz o secretos a un repositorio público sin revisar su alcance.
- El sistema no hace pasar las referencias Trainingym por grabaciones de BAYONA.
- La captura de movimiento estimada por IA puede crear errores; validar cada gesto, fuerza y trayectoria antes de usarlo como demostración instructiva.
- No incluir personas ni voces de DESPIERTA (Marc/Aurora): proyecto separado.
- Con 3.141 ejercicios, la reutilización de familias de movimiento puede acelerar el trabajo, pero no sustituye la aprobación ejercicio por ejercicio.
