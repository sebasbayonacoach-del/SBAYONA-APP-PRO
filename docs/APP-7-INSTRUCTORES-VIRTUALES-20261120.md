# BAYONA APP 7.0 — Sebastián y Profesora BAYONA en PROPLAYER

## Objetivo
La persona usuaria elige libremente quién demuestra el ejercicio: una referencia del catálogo, Sebastián Bayona o Profesora BAYONA. No se segmenta el acceso por sexo ni se altera el catálogo de 3.141 ejercicios.

## Implantado en esta rama
- Selector real de instructor en PROPLAYER, disponible en Coach y Atleta.
- El reproductor y las vistas previas usan vídeo propio del instructor elegido **solo** si el registro de ese ejercicio ha superado las cuatro verificaciones.
- Contadores por instructor: demostraciones propias aprobadas frente al total. Con el manifiesto inicial, ambos contadores son **cero**. No se afirma que exista material final.
- Sin imágenes ni vídeos sintéticos o de terceros atribuidos a Sebastián o a la profesora.
- Los filtros y constructor de rutinas siguen operativos. Se respetan las referencias preexistentes sin atribuirles titularidad BAYONA.
- El selector no sustituye ni interfiere con la representación de avatar personal del atleta (Avaturn) ni con el entrenamiento de Coach OS.

## Manifiesto
Archivo: `media/instructor-demos.json`. La clave de ejercicio es `String(record.pos)` de `trainingym/catalog.json`.

```json
{
  "version": 1,
  "exercises": {
    "42": {
      "sebas": {
        "url": "/media/instructors/sebas/42.mp4",
        "published": true,
        "identity_approved": true,
        "rights_clear": true,
        "technique_approved": true
      }
    }
  }
}
```

Este bloque es **solo un ejemplo**, no una publicación efectiva. Todos los flags deben ser `true` para que aparezca el vídeo y la ruta debe corresponder al instructor. El fichero real arranca con `exercises: {}`.

## Producción audiovisual pendiente
1. Sebastián: revisar material facial original de «Mi Centro de Recursos», validar parecido con él y consentimiento/identidad de cualquier proveedor de clon audiovisual. No tomar un avatar genérico como rostro final.
2. Captura de movimiento: ejercicios de referencia originales o movimientos cuyos derechos de animación estén autorizados, retargeting a rigs equivalentes, sin degradar posiciones articulares. El actual Avatar3D sólo tiene traslaciones/rotaciones globales, no técnica completa.
3. Técnica: revisión individual por tipo de ejercicio; priorizar familias y variantes reutilizables (fuerza, movilidad, cardio, parkour). Revisar lateralidad, rango, equipamento, puntos de apoyo y trayectorias antes de publicar cada ficha.
4. Profesora BAYONA: personaje original, identidad/voz y derechos controlados por BAYONA. Sin reutilizar rostro o voz de ninguna persona real ajena sin autorización verificable.
5. Salida final: clips propios comprimidos, 16:9 y 9:16 cuando proceda, instrucciones breves, subtítulos, voz en español; alojar en almacenamiento propio con CDN y rangos HTTP 206. El resolvedor actualmente admite **rutas propias locales**; ampliar a un origen de almacenamiento externo sólo tras definir un dominio permitido y controles de propiedad.
6. Validación: probar calidad biomecánica, reproducción con Android/Chrome, modo ahorro, silencio/sonido, PWA, rendimientos de red, contraste/lectura, vídeos sin carga y revocación.

## Sin promesas incorrectas
- **No** se han creado ni incorporado 3.141 vídeos.
- **No** se ha finalizado ni verificado el clon corporal y de voz en este cambio.
- **No** se ha publicado a producción; esta rama es una integración inicial de producto.
- El proyecto DESPIERTA (Marc/Aurora) es independiente y ningún material suyo se incorpora aquí.

## Pruebas
`node tests/instructors-eval.mjs`, `node tests/proplayer-video-preview-eval.mjs` y `npm test`.
