# BAYONA · Servidor local: aislamiento de archivos y red

**Fecha:** 2026-10-08 · Alcance: `tools/serve.mjs` (servidor de desarrollo).

## Problema corregido
La versión anterior servía cualquier archivo legible bajo la raíz del repositorio, incluyendo `/.git/config` y potencialmente `/.env.local`. Además, escuchaba en todas las interfaces (`0.0.0.0`) sin que el usuario tuviera que solicitarlo. La comprobación se hizo usando únicamente códigos HTTP; no se leyó ni mostró ningún secreto.

## Medidas
- Lista explícita de recursos estáticos públicos: archivos necesarios para iniciar la app y directorios de recursos frontend.
- Respuesta 403 para archivos ocultos, API fuente, pruebas, documentación interna, `package.json` y archivos privados.
- Ruta resuelta con `relative()`; tras resolver enlaces simbólicos con `realpathSync()`, se vuelve a validar que el destino es público y pertenece a la raíz.
- Rechazo de rutas malformadas y barras invertidas; solo se transmiten archivos regulares.
- Por defecto, `127.0.0.1`. Para un móvil en una red **de confianza**, iniciar voluntariamente con `BAYONA_HOST=0.0.0.0 npm start`. Evitarlo en redes públicas.
- Los endpoints `/api/coach` y `/api/meal-image` permanecen delegados a los handlers existentes.

## Verificaciones
- `node tests/dev-server-privacy-eval.mjs`: 24 comprobaciones (recursos legítimos, archivos privados, rutas codificadas y symlink).
- Ejecutar `npm run check:production` y E2E navegador antes de integrar a la rama oficial.
- Los servidores que ya estaban ejecutándose mantienen el código anterior **hasta ser reiniciados**. Este cambio no reinicia procesos ajenos ni actualiza producción por sí solo.

## Límite
Esto protege el servidor estático de desarrollo; no sustituye revisiones de despliegue, claves, autenticación, RLS ni firewall.
