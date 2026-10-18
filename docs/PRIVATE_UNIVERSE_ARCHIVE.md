# Mi Universo · archivo privado BAYONA

Función personal opcional: un archivo JSON con proyectos e hitos se importa desde MÁS → MI UNIVERSO y se protege con AES-256-GCM. El código público NO incluye datos privados de Sebastián ni fichas de clientes.

## Seguridad
- Frase de al menos 12 caracteres; derivación PBKDF2-SHA256 con 210.000 iteraciones, sal y nonce aleatorios.
- Guarda SOLO JSON cifrado en localStorage, separado por cuenta de Supabase cuando la hay, o por dispositivo cuando no hay sesión; nunca en el estado de entrenamiento, colas de sincronización, servidores ni servicios de IA.
- Al cambiar la sesión, la copia descifrada en memoria se limpia. El almacenamiento local no es invulnerable a XSS ni al robo de un dispositivo.
- Permite importar, filtrar, buscar, bloquear, exportar copia cifrada, reimportarla y eliminarla.
- Importación limitada a 2 MB, validación de esquema y de identificadores. Los datos del archivo se muestran con textContent, no con HTML de usuario.

## Límites
- El archivo de arranque es una síntesis parcial fechada, NO una exportación de todas las conversaciones o plataformas.
- No hay sincronización automática entre dispositivos, cifrado nativo de plataforma ni garantía de persistencia eterna.
- No se comparte con atletas, público ni potenciales inversionistas.
- No supone haber fusionado las migraciones RLS de PR #42 ni haber desplegado a producción.

## Pruebas
Ejecutar node tests/private-archive-eval.mjs y npm test. También validar importación, cambio de cuentas, salida y uso offline en navegador y móvil. No afirmar QA end-to-end sin realizarlo.