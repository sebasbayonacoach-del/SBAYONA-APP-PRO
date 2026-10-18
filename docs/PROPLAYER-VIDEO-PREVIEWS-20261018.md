# BAYONA PROPLAYER · Previsualización de vídeos

## Causa
Las tarjetas de ejercicios mostraban solo un bloque decorativo con
las iniciales F/M/C. Los MP4 estaban enlazados en el catálogo,
pero el reproductor aparecía solo al pulsar PROBAR VÍDEO.

## Corrección
- 2.255 fichas contienen URLs MP4 existentes (1.607 estado OK y
  648 referencias compartidas). Las otras 886 no inventan miniaturas.
- Cada tarjeta con URL incorpora una vista previa real.
- La fuente multimedia solo se solicita cuando la tarjeta entra en la vista.
- Primer fotograma tras cargar y decodificar el MP4 existente.
- Ratón: pasar por encima reproduce sin audio, salir pausa.
- Móvil: fotograma sin autoplay; VER VÍDEO abre el reproductor completo.
- Como máximo una tarjeta reproduce activamente al mismo tiempo.
- Respeta prefers-reduced-motion.
- Los filtros liberan vídeos de las tarjetas anteriores.
- Estado de error si el enlace no carga.

## Derechos
No se han incluido nuevas copias MP4, capturas, pósteres, reuploads
ni medios en la distribución. Se reutilizan los enlaces del catálogo,
sin que ello demuestre autorización de difusión de material ajeno.
No publicar la versión oficial sin aclarar derechos.

## Pruebas
- CDN: primer vídeo responde HTTP 206 video/mp4.
- Playwright 1440 y 390 px: vídeo nativo 1920x1080, readyState=4,
  fotograma visible, reproducción al hover, sin overflow ni errores JS.
- 21 pruebas estructurales del módulo.
- 56 suites automáticas PASS.
- Sin modificar backend, datos personales ni permisos de Supabase.

## Control adicional de estabilidad (19:37, 18/10)
- Tras observar saturación de renderizadores Brave durante un pegado,
  la previsualización se rediseñó para usar **un solo decodificador de vídeo
  a la vez**, mediante una cola y una captura local de fotograma en canvas
  de 320 píxeles de ancho.
- El fotograma permanece visible mientras que el elemento MP4 libera su
  fuente inmediatamente después de dibujarlo.
- Reproducción dinámica solo a petición (hover), con pausa si se detecta
  Ctrl+V o la pestaña deja de estar visible.
- No se exportan imágenes desde canvas, no se crean ficheros multimedia
  y no se suben contenidos a servidores.
- Verificado en Chromium 1440 y 390 px: respectivamente 5 y 2 fotogramas
  listos después de ~7 segundos, cero fuentes MP4 activas tras la extracción,
  cero errores JS y cero overflow horizontal.
- Esto reduce el riesgo de bloqueo del navegador; no demuestra que los vídeos
  fueran la causa exclusiva del problema de pegado.
