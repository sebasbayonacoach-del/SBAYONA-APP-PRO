# Integración Trainingym / PROPLAYER — 15-10-2026

## Estado comprobado

La app ya incorpora el catálogo en `trainingym/catalog.json` y una biblioteca PROPLAYER con búsqueda, filtros, reproducción bajo demanda y creación de rutinas. Los datos locales contienen **3.141 fichas**, **2.255 fichas con referencia de vídeo** y **1.607 nombres de archivo distintos**; 648 referencias reutilizan nombres. El resumen de estados registra 828 fichas sin vídeo y 58 incidencias. Estos recuentos describen el catálogo, no el número de vídeos que se han reproducido; por tanto, no son 3.000 vídeos verificados.

`private-trainingym/` contiene los catálogos y el resumen, pero no contiene archivos MP4. En la revisión de navegador del 15-10-2026, una muestra del CDN devolvió `206 video/mp4`, el navegador cargó metadatos y reprodujo el clip; esto acredita solo esa muestra en esa fecha, no disponibilidad de todo el catálogo.

## Derechos y acceso

La auditoría de Trainingym del 04-10-2026 indica expresamente que recuperar los MP4 y tenerlos disponibles localmente no acredita licencia de difusión; también advierte que la documentación pública del proveedor no acredita permisos reales de la cuenta. No se encontró en la documentación revisada un contrato, licencia o autorización escrita para republicar los vídeos fuera de Trainingym. No inferir esa autorización del acceso al CDN.

Antes de ampliar, descargar o volver a alojar medios, obtener confirmación escrita que cubra el uso en BAYONA, la difusión pública, la audiencia/territorio y el plazo. Mantener cada referencia vinculada a su archivo original y conservar la atribución requerida por el titular. Este cambio no descarga, copia ni publica vídeos adicionales.

## Auditoría repetible

Ejecuta `node tools/audit-proplayer-catalog.mjs` para obtener recuentos y errores de estructura. El comando valida nombres de MP4, esquema de URLs HTTPS y correspondencia entre archivo y URL; nunca imprime las URLs. Se puede pasar la ruta a un catálogo autorizado como primer argumento. Después de recibir autorización y un catálogo/manifest legítimos, ejecuta el mismo comando y revisa los recuentos; para verificar reproducción, prueba de forma controlada una muestra autorizada y registra el resultado por separado.

La interfaz diferencia referencias de catálogo y reproducción: un registro con referencia no se presenta como vídeo cargado hasta que el navegador recibe sus metadatos. El mensaje de error ofrece alternativa escrita y un reintento manual, sin reintentos automáticos. No atribuye propiedad ni licencia que no consta en la evidencia.
