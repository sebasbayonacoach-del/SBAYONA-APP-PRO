# BAYONA / Performance Studio — Experiencia de entrenador

## Referencia de producto
Analizadas páginas públicas de Muscle & Motion Strength Training y su Knowledge Center:
- https://www.muscleandmotion.com/strength-training-app/
- https://www.muscleandmotion.com/strength-training-app-trainers/
- https://www.muscleandmotion.com/knowledge-center/the-3d-model/

Se estudia **la organización de funciones y la navegación** (músculo → ejercicio →
plan, corrección de técnica, biblioteca y cliente), no código, vídeos, animaciones,
logos, ilustraciones ni materiales propietarios. El mapa BAYONA es un SVG original
y simplificado; no es un modelo 3D ni representa biomecánica clínica detallada.

## Evolución efectuada
- Sustituye el hero poco legible por un nuevo espacio oscuro dedicado al entrenador.
- Centro de movimiento original con zonas Tren superior / Zona media / Tren inferior.
- Acciones funcionales existentes: abrir biblioteca, crear rutina desde PROPLAYER,
  localizar la cartera y consultar la agenda.
- Panel de indicadores etiquetados: biblioteca real, fichas locales y valores DEMO
  expresamente diferenciados de datos reales.
- Mejora contraste de prioridades, plantillas, clientes y cartera incluso con
  la preferencia global de modo claro.
- Vista adaptativa a escritorio/tablet/móvil y soporte de reducción de movimiento.
- No cambia políticas RLS, autenticación, datos clínicos ni clientes reales.

## Estado de acceso
La vista de Coach Studio sigue destinada exclusivamente a la identidad coach
verificada por Supabase; no hay otro entrenador ni conmutador público de roles.
El SVG y las decisiones visuales no constituyen una barrera de seguridad: el control
de permisos sigue en el backend.

## Pruebas
- node tests/coach-elite-eval.mjs — 19 validaciones de estructura y aislamiento.
- node tests/run.mjs — 54 suites completas PASS.
- Playwright en 1440/1024/390/320 px con SVG interactivo: sin error JS,
  sin desbordamiento horizontal, navegación a biblioteca y cartera correcta.
- Renderizado completo de Coach Studio en tema claro a 1440 y 390 px:
  prioridades y clientes en superficie #141B1E con texto de alto contraste.
- Sin despliegue público automático: reconciliar ramas de auth/app y la versión
  oficial de Vercel antes de promover.
