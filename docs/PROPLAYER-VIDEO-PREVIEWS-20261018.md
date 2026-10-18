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
