# MASTER PLAN · BAYONA ONE

Fecha: 2026-10-07  
Base oficial: `bayona-one/visual-integration-v6`

## Norte de producto

BAYONA debe sentirse como un sistema personal de entrenamiento y bienestar, no como una colección de pantallas. La experiencia debe responder siempre a cinco preguntas:

1. ¿Quién soy dentro del sistema?
2. ¿Qué toca hoy?
3. ¿Cómo llego hoy?
4. ¿Qué hice realmente?
5. ¿Qué cambia mañana por lo que acabo de registrar?

El Coach y la IA deben explicar decisiones, nunca inventar datos ni sustituir diagnóstico médico.

## Identidad unificada WEB + APP

Fuente: `SBAYONA-WEB-PRO/src/styles.css` y `src/engine/config/theme.js`.

### Paleta canónica

- Negro: `#050505`
- Negro 2: `#0C0C0D`
- Negro 3: `#141416`
- Blanco: `#FFFFFF`
- Muted: `#C4C4C4`
- Gris: `#949494`
- Orange: `#F4A261`
- Orange Fire: `#E76F51`
- Orange Deep: `#D45D38`
- Orange On Dark: `#FFC08A`
- Orange On Light: `#9C4F1F`

Noche replica literalmente la marca web. Día mantiene el mismo naranja y jerarquía, con superficies claras accesibles.

## Arquitectura de producto

### Capa 1 · Identidad y cuenta

- Perfil, sexo/género solo cuando sea relevante para personalización elegida por el usuario.
- Edad y etapa de desarrollo.
- Objetivo principal y secundarios.
- Experiencia.
- Contexto de entrenamiento.
- Coach elegido.
- Membresía.
- Consentimientos.
- Preferencias de notificación.
- Copia segura y recuperación de cuenta.

### Capa 2 · Estado diario

- Fecha local real.
- Sueño.
- Energía.
- Estrés.
- Molestias.
- Disponibilidad.
- Entrenamiento previsto.
- Hidratación.
- Comidas.
- Otros deportes/actividad.
- Trabajo/pausas.
- Estado de recuperación.

Los campos ausentes permanecen `null`; nunca se rellenan con valores ficticios.

### Capa 3 · Motor de entrenamiento

Jerarquía obligatoria para trabajo planificado:

`Objetivo → temporada/macrociclo → mesociclo → microciclo → sesión → fase → ejercicio → serie`.

Cada nivel debe conservar:
- objetivo;
- duración;
- volumen;
- intensidad;
- frecuencia;
- progresión;
- descarga;
- criterios de ajuste;
- tests/checkpoints;
- observaciones del Coach.

No se usarán nombres pseudo-científicos ni “patologías” para prescribir sin criterio clínico. Las condiciones médicas sirven para marcar precauciones/derivación y requerir validación profesional cuando corresponda.

### Capa 4 · Sesión viva

Estado: implementado en Sprint 03.

- Fase inicial.
- Fase central.
- Fase final.
- Feedback por serie.
- Evidencia local opcional.
- XP por trabajo real.
- Bono solo con sesión completa.
- Resumen con nivel/FitCoins/puntos reales.

### Capa 5 · Nutrición

Próximo bloque funcional.

Pantalla principal:
- hora actual;
- última comida;
- tiempo desde última ingesta;
- agua;
- sensación actual;
- calendario semanal;
- comida actual/siguiente.

Modelo:
- preferencias;
- alergias e intolerancias declaradas;
- alimentos evitados;
- horarios;
- objetivo energético;
- macros cuando proceda;
- adherencia;
- recetas;
- lista de compra;
- registro libre.

No se presentará “nutrición genética” sin una fuente genética real, consentimiento y una interpretación clínicamente válida.

### Capa 6 · Progreso

Visual y cronológico:

- fotos;
- peso/medidas;
- fuerza;
- volumen;
- PR;
- adherencia;
- racha;
- historial de sesiones;
- comentarios antiguos vs actuales;
- revisión de progreso;
- comparativas semanales/mensuales.

Para PERFORMANCE/ELITE:
- volumen por patrón/músculo;
- carga interna/externa;
- tendencia;
- microciclo/mesociclo;
- ondulación de carga;
- exportación estructurada.

### Capa 7 · Recuperación y sueño

- sueño manual;
- wearables cuando exista integración real;
- hora objetivo de dormir;
- alarmas/reminders;
- fatiga;
- estrés;
- molestias;
- movilidad;
- respiración;
- pausas activas;
- recuperación post-sesión.

Los datos de reloj o wearable deben aparecer como “conectados” solo si existe una integración activa.

### Capa 8 · Coach personal + IA

Un “Coach Memory” por usuario basado en eventos:

- qué hizo;
- cómo se sintió;
- qué cambió;
- qué funcionó;
- qué no;
- qué recomendó el Coach;
- qué se confirmó después.

La IA debe:
- citar el dato real que usa;
- distinguir dato registrado de inferencia;
- proponer, no ocultar cambios;
- explicar por qué adapta una sesión;
- escalar riesgo médico;
- permitir deshacer/revisar decisiones.

### Capa 9 · Coach OS / CRM

Vista superior del entrenador:

- clientes;
- estado del día;
- alertas;
- agenda;
- pagos/membresía;
- sesiones;
- cumplimiento;
- referencias;
- compras;
- mensajes;
- archivos;
- evaluación;
- planificación.

Ficha de cliente:
- perfil;
- objetivos;
- historia;
- tests;
- calendario;
- macrociclo;
- adherencia;
- progresos;
- conversaciones;
- compras/referidos;
- permisos.

### Capa 10 · Constructor científico de planificación

Buscador de ejercicios:
- búsqueda incremental por cualquier letra;
- nombre;
- patrón;
- músculo;
- articulación;
- equipamiento;
- deporte;
- nivel;
- edad/etapa;
- objetivo;
- entorno;
- limitaciones declaradas;
- precauciones.

El motor de recomendación debe separar:
- compatible;
- requiere adaptación;
- requiere valoración profesional;
- contraindicado según una regla validada.

### Capa 11 · Comunidad, referidos y tienda

Comunidad centrada en progreso:
- publicaciones de progreso;
- hitos;
- comentarios;
- moderación;
- privacidad.

FitCoins:
- una sola economía: `credits`;
- ganancia por hitos definidos;
- nunca por dolor, fatiga extrema o actividad compulsiva;
- canje por recompensas digitales;
- productos reales solo mediante backend/comercio confirmado.

Referidos:
- invitaciones;
- estado;
- recompensa;
- atribución;
- antifraude.

### Capa 12 · Backend y producción

Antes de prometer “copia segura”, “IA que aprende cada día” o entitlements de pago reales:

- autenticación;
- base de datos;
- cifrado;
- sync;
- backup;
- auditoría;
- controles de acceso;
- billing server-side;
- entitlements server-side;
- rate limits;
- observabilidad;
- exportación/borrado de datos;
- recuperación de cuenta.

## Roadmap de ejecución

### Sprint 01 · Entrada + onboarding + planes
Estado: completado.

### Sprint 02 · Hub personal
Estado: completado.

### Sprint 03 · Sesión viva
Estado: completado.

### Sprint 04 · Brand System WEB → APP
Estado: en ejecución.

Entregables:
- tokens canónicos;
- Noche idéntica a web;
- Día derivado accesible;
- controles y acentos;
- Apariencia;
- landing/demo;
- Hub;
- sesión;
- PWA;
- test de paridad.

### Sprint 05 · Nutrición Calendar
- timeline diaria;
- calendario semanal;
- agua;
- última/siguiente comida;
- plan editable;
- restricciones/preferencias;
- registro libre.

### Sprint 06 · Progreso Visual
- timeline;
- fuerza;
- volumen;
- fotos;
- revisiones;
- comparadores;
- exportación avanzada.

### Sprint 07 · Recovery + Sleep
- sueño;
- fatiga;
- estrés;
- movilidad;
- pausas;
- reminders;
- integración wearable solo si existe proveedor.

### Sprint 08 · Coach Memory + IA adaptativa
- event store;
- explicación;
- propuesta de cambios;
- feedback loops;
- seguridad.

### Sprint 09 · Coach CRM
- cartera;
- ficha;
- agenda;
- pagos;
- referidos;
- compras;
- alertas.

### Sprint 10 · Planning Studio
- macrociclos;
- mesociclos;
- microciclos;
- tests;
- cargas;
- plantillas por deporte;
- buscador de ejercicios avanzado.

### Sprint 11 · Comunidad + FitCoins + tienda
- progreso social;
- referidos;
- canje;
- comercio.

### Sprint 12 · Production Hardening
- backend;
- backup;
- billing;
- seguridad;
- observabilidad;
- pruebas E2E;
- performance;
- accesibilidad;
- rollout.

## Criterio de “terminado”

Ningún Sprint entra a la rama oficial hasta cumplir:

1. sintaxis;
2. lint/typecheck;
3. build-check;
4. batería completa;
5. pruebas específicas del Sprint;
6. sin regresión i18n;
7. datos ausentes no inventados;
8. permisos explícitos para cámara/salud/vídeo;
9. móvil sin overflow grave;
10. documentación de lo confirmado y lo pendiente.

## Regla de producto

BAYONA debe premiar constancia, técnica, progreso y responsabilidad. No debe premiar dolor, extremos, engaño ni actividad compulsiva.
