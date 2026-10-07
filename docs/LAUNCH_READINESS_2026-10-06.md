# BAYONA APP — Launch Readiness · 2026-10-06

## Estado de producción

- URL pública: https://bayona-app-one.vercel.app/
- Rama de release: `bayona-one/visual-integration-v6`
- Hosting: Vercel
- Vídeos PROPLAYER: Vercel Blob, fuera de Git
- Catálogo PROPLAYER: 3.141 fichas
- Fichas con vídeo: 2.255
- MP4 únicos publicados: 1.607

## Verde para lanzamiento local-first

- PWA instalable con manifest, iconos y Service Worker.
- Instalación visible desde **MÁS → INSTALAR BAYONA**.
- Modo Coach y modo cliente/afiliado separados.
- PROPLAYER reproduce vídeos desde CDN.
- Coach puede seleccionar hasta 12 ejercicios y configurar series, repeticiones/tiempo, carga, RIR y descanso.
- Routine Studio permite reordenar, duplicar y eliminar ejercicios antes de guardar.
- Plantillas reutilizables dentro de Coach Studio.
- Entrenamiento ejecuta rutinas personalizadas y respeta descansos por ejercicio.
- Datos locales funcionan offline.
- Cola de sincronización y recuperación no descarta cambios silenciosamente.
- SEO técnico corregido: canonical, OG/Twitter, robots y sitemap absolutos.
- Las APIs dinámicas quedan fuera del caché del Service Worker.
- La interfaz declara de forma honesta cuando la nube no responde.

## QA

La batería completa pasa:

- **54 suites**
- **0 fallos**
- Smoke de sintaxis: todos los módulos parsean.
- Golden set de biomecánica: 100 % de precisión en los escenarios evaluados.
- Launch readiness: SEO/PWA/caché/instalación validados.
- Pruebas reales de navegador en móvil: sin overflow y sin errores de página.

Comando:

```bash
npm test
```

## Bloqueador actual para lanzamiento SaaS completo

El producto puede lanzarse como experiencia **local-first / beta**, pero todavía NO debe anunciarse como SaaS multi-dispositivo plenamente operativo.

El backend Supabase configurado actualmente no resuelve por DNS. Las referencias históricas encontradas en el equipo tampoco resuelven. Además, la CLI de Supabase no tiene una sesión autenticada ni `SUPABASE_ACCESS_TOKEN`.

Por tanto, hoy no están verificables de extremo a extremo:

- registro/login real en nube;
- vínculo Coach ↔ cliente remoto;
- asignación remota a otro dispositivo;
- cierre de asignación remota;
- sincronización multi-dispositivo;
- RLS real en el proyecto activo.

La app no finge que esto funciona: entra en modo local y muestra **NUBE OFFLINE / SIN RESPUESTA**.

## Paso exacto cuando haya acceso a Supabase

1. Restaurar el proyecto válido o crear uno nuevo.
2. Aplicar `api/supabase/setup.sql` completo.
3. Confirmar las 18 tablas esperadas y RLS.
4. Configurar en Vercel:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
5. Redeploy de producción.
6. Verificar `/api/cloud-status.js` hasta obtener:
   - `ok: true`
   - `coreSchema: true`
   - `coachingSchema: true`
7. E2E real:
   - crear Coach;
   - crear cliente;
   - generar invitación;
   - aceptar invitación;
   - enviar rutina PROPLAYER;
   - abrirla desde la cuenta cliente;
   - completar sesión;
   - confirmar estado completado en Coach Studio.

## Criterio de salida

**Launch local-first:** listo.

**Launch SaaS completo Coach ↔ cliente:** pendiente únicamente de backend Supabase operativo + E2E real.
