# BAYONA — MASTER PRODUCT PLAN 2026-10-06
## De app de entrenamiento a sistema operativo personal + Coach OS

> Estado: PLAN MAESTRO DE PRODUCTO / ARQUITECTURA
> Rama base: bayona-one/visual-integration-v6
> Producción actual: https://bayona-app-one.vercel.app/
> Principio: una experiencia sencilla por fuera, profundamente personalizada por dentro.

---

# 0. VISIÓN

BAYONA no debe sentirse como “otra app fitness”.

Debe sentirse como un **mundo personal de salud, entrenamiento y progreso** donde:

1. La persona tiene un personaje que evoluciona con evidencia real.
2. Tiene un Coach que aparece en contexto, aprende de su historial y no la saca de lo que está haciendo.
3. Su plan se adapta a sus objetivos, disponibilidad, entorno, historial y respuesta diaria.
4. El Coach humano ve el mismo sistema desde arriba mediante Coach OS.
5. El usuario entiende qué tiene incluido, qué puede desbloquear y por qué.
6. La ciencia manda sobre la gamificación; la gamificación nunca falsea progreso.
7. El sistema diferencia educación/coaching de diagnóstico clínico.

La arquitectura debe permitir:
- adulto recreativo;
- persona con objetivo estético;
- deportista competitivo;
- niño/adolescente con supervisión apropiada;
- mujer que quiera registrar ciclo/embarazo-posparto cuando proceda;
- persona mayor;
- cliente con restricciones o consideraciones clínicas ya conocidas;
- Coach con decenas o cientos de clientes.

---

# 1. MAPA DEL PRODUCTO

BAYONA se divide en cuatro superficies conectadas.

## A. PUBLIC / PREVIEW
La web o primera pantalla antes de registrarse.

Objetivo:
- vender claridad;
- demostrar valor;
- dejar ver el producto sin entregar todo;
- comparar membresías;
- permitir ver modo claro/oscuro;
- permitir probar “cómo se siente” la app.

## B. BAYONA PERSONAL
La app de cada usuario.

Superficies:
- Hub / Inicio
- Hoy
- Entrenamiento
- Nutrición
- Recuperación
- Sueño
- Progreso
- Comunidad
- Personaje
- Coach
- Cuenta / Datos

## C. COACH OS
CRM + programación + seguimiento + ventas + agenda + conocimiento del cliente.

Superficies:
- Command Center
- Clientes
- Perfil 360
- Planificación
- Biblioteca
- Agenda
- Seguimiento
- Alertas
- Mensajes
- Membresías y pagos
- Referidos
- Informes
- Ciencia / protocolos

## D. COMMERCE + COMMUNITY
- tienda real;
- FitCoins / recompensas;
- membresías;
- referidos;
- comunidad de progreso;
- retos;
- productos físicos/digitales.

---

# 2. MEMBRESÍAS Y ENTITLEMENTS

La UI no debe esconder que existen niveles superiores. Debe mostrar valor sin frustrar.

## FREE
Objetivo: demostrar BAYONA.

Incluye:
- onboarding completo;
- Hub personal;
- plan inicial limitado;
- registro de sesiones;
- progreso básico;
- hidratación / sueño manual;
- biblioteca parcial;
- personaje básico;
- backup/export local;
- vista de comunidad;
- guía inicial del Coach.

## RAÍZ
Incluye FREE +
- plan mensual;
- calendario completo;
- nutrición general;
- vídeos HD;
- seguimiento y check-ins;
- comunidad completa;
- evolución de personaje;
- más personalización.

## PERFORMANCE
Incluye RAÍZ +
- planificación 100% personalizada;
- macro/meso/microciclo;
- IA adaptativa con memoria del usuario;
- análisis técnico de vídeo;
- progreso avanzado;
- wearables cuando estén conectados;
- llamadas / interacción Coach según condiciones del plan;
- funciones PRO de programación y evaluación.

## ELITE
Incluye PERFORMANCE +
- máxima prioridad humana;
- sesiones privadas según plan comercial;
- acceso completo a Coach humano;
- revisión de vídeos y técnica;
- analítica avanzada;
- seguimiento de recuperación y hábitos;
- personalización premium.

## Regla de UX
Un usuario solo puede USAR lo que su entitlement habilita, pero puede VER una previsualización elegante de funciones superiores con:
- candado;
- “Disponible en PERFORMANCE”;
- ejemplo de resultado;
- CTA no agresivo.

Nunca falsificar datos premium en el perfil real.

---

# 3. “VER CÓMO FUNCIONA” — DEMO INTERACTIVA PREMIUM

Esta pantalla debe convertirse en una demostración del producto.

## Concepto
“Un móvil dentro del móvil”.

Una carcasa interactiva muestra BAYONA como si fuera un dispositivo.

Controles exteriores:
- CLARO / OSCURO
- FREE / RAÍZ / PERFORMANCE / ELITE
- PERSONA / COACH
- ANTERIOR / SIGUIENTE

## Historias de demo
1. Inicio / personaje.
2. Sesión de hoy.
3. Nutrición.
4. Progreso.
5. Coach.
6. Final de sesión.
7. Coach OS para versión profesional.

Cada plan cambia:
- herramientas visibles;
- candados;
- profundidad de analítica;
- capacidad de IA;
- contacto humano.

## Criterio
En menos de 45 segundos una persona debe entender:
- qué es BAYONA;
- qué hace cada membresía;
- por qué subir de plan;
- que existe un sistema para Coach.

---

# 4. ONBOARDING V3 — “TE CONOZCO SIN INTERROGARTE”

El onboarding actual mejora, pero todavía se siente como formulario.

Debe ser una conversación progresiva.

## Paso 1 — “¿Cómo quieres que te llamemos?”
- nombre / apodo;
- posibilidad de omitir.

## Paso 2 — “¿Qué quieres conseguir ahora?”
Multi-selección + prioridad principal.

Opciones:
- sentirme mejor;
- ganar fuerza;
- ganar músculo;
- reducir grasa / recomposición;
- mejorar resistencia;
- mejorar movilidad;
- volver a entrenar;
- rendimiento deportivo;
- preparar una prueba;
- salud general;
- otro → texto libre.

No bloquear al usuario en una taxonomía.

## Paso 3 — “¿Dónde entrenas de verdad?”
Multi-select:
- casa sin material;
- casa con material;
- gimnasio;
- parque;
- pista/campo;
- piscina;
- box;
- club;
- trabajo;
- viajo mucho;
- otro → texto.

Luego:
“¿Qué material tienes?”
con búsqueda + selección.

## Paso 4 — reemplazar “TU TIEMPO”
La pregunta actual puede confundir.

Nuevo título:
**“¿Cómo es tu semana real?”**

La persona marca:
- días disponibles;
- franjas preferidas;
- duración aproximada por día;
- días que suelen ser difíciles.

No preguntamos primero “cuánto dura una sesión ideal”.
El sistema propone después:
“Con tu semana, te proponemos sesiones de 30–45 min. Puedes cambiarlo.”

## Paso 5 — contexto personal
Edad / fecha de nacimiento.
Sexo registrado para personalización fisiológica solo cuando sea relevante.
Identidad / tratamiento lingüístico opcional y separado.

Ramas:
- adulto;
- adolescente/menor → flujo especial y consentimiento correspondiente;
- persona mayor.

## Paso 6 — salud y seguridad
Screening de aptitud / banderas de seguridad.

No diagnostica.
No “prescribe patologías”.
Clasifica:
- sin alertas;
- adaptar / preguntar más;
- requiere valoración profesional antes de determinada actividad.

Campos:
- lesiones actuales;
- dolor;
- condiciones médicas conocidas;
- medicación relevante declarada;
- embarazo/posparto cuando aplique;
- alergias/intolerancias para nutrición;
- restricciones del profesional de salud.

## Paso 7 — “Elige quién te acompaña”
Personas de Coach visuales:
- Sebastián;
- Coach femenina;
- opción neutra/minimal.

Cada una cambia:
- imagen/avatar;
- tono;
- lenguaje;
- estilo de refuerzo.

NO cambia la ciencia.

La personalización profunda de personalidad puede ser entitlement superior.

## Paso 8 — membresía
Mostrar FREE / RAÍZ / PERFORMANCE / ELITE.

La persona ve:
- su plan actual;
- qué incluye;
- qué está bloqueado.

## Paso 9 — entrada guiada
Coach:
“Ya tengo lo necesario para empezar. Te enseño tu espacio en 60 segundos.”

Empieza el tour.

---

# 5. TOUR INICIAL CON COACH — SOLO PRIMERA VEZ

No debe ser un tutorial tradicional.

Debe parecer que el Coach camina por el mundo junto a la persona.

## Secuencia
1. “Este es tu día.”
2. “Aquí me dices cómo llegas.”
3. “Aquí aparece tu sesión.”
4. “Esto es lo que has construido.”
5. “Aquí estoy yo cuando me necesites.”
6. “Tu personaje crece con lo que haces de verdad.”

Cada paso:
- spotlight del elemento;
- Coach bubble;
- botón “SIGUIENTE”;
- “SALTAR TOUR”.

## Check-in contextual
Al tocar “¿Cómo estás?” por primera vez:

Coach:
“Si quieres, puedo preguntártelo hasta tres veces al día para entender mejor tu energía y adaptar el plan.”

Opciones:
- al despertar;
- antes de entrenar / tarde;
- noche.

Solo DESPUÉS:
“¿Quieres activar recordatorios?”

Entonces se solicita permiso de notificaciones.

Nunca pedir permiso del sistema sin contexto.

---

# 6. HUB PERSONAL — EL MUNDO PRINCIPAL

El Hub debe ser la pantalla memorable.

## Jerarquía
### Centro
Personaje 3D.

### Alrededor
- fecha y día;
- sesión de hoy;
- progreso;
- alimentación;
- recuperación;
- Coach;
- comunidad;
- calendario;
- fotos de evolución;
- tienda/recompensas.

## Cámara
No es decoración.
La cámara viaja entre zonas del Hub.

Ejemplo:
- tocar Entrenamiento → cámara se desplaza al “Training Zone”;
- tocar Progreso → galería/historia;
- tocar Coach → zona Coach;
- tocar Comunidad → muro social.

## Personaje
Debe reflejar:
- nivel;
- rango;
- equipamiento cosmético;
- logros;
- evolución narrativa.

No cambia físicamente de forma médica ni “predice” composición corporal.

---

# 7. PERSONALIZACIÓN POR EDAD, DESARROLLO Y CONTEXTO

No crear reglas simplistas “hombre vs mujer”.

## Universal
- edad;
- experiencia;
- maduración / etapa de desarrollo cuando sea relevante;
- disponibilidad;
- objetivo;
- carga;
- recuperación;
- historial;
- sueño;
- estrés;
- respuesta subjetiva;
- lesiones/restricciones declaradas.

## Mujer — módulos opcionales
Si la usuaria quiere:
- ciclo menstrual;
- síntomas;
- embarazo/posparto;
- transición menopáusica;
- energía/recuperación.

Debe ser opcional.
No asumir que una fase obliga a cierto entrenamiento.

## Hombre
No inventar un “nivel de testosterona”.

Puede haber:
- recuperación;
- energía;
- sueño;
- estrés;
- libido como dato opcional si el producto lo justifica;
- laboratorio IMPORTADO si el usuario lo proporciona.

Sin análisis médico automático.

## Niños/adolescentes
Modo desarrollo:
- edad cronológica;
- crecimiento;
- habilidades motrices;
- fuerza técnica;
- diversidad deportiva;
- carga apropiada;
- diversión/competencia;
- supervisión.

Nunca tratarlos como adultos pequeños.

---

# 8. ENTRENAMIENTO — EXPERIENCIA DE SESIÓN V3

Toda sesión debe tener estructura.

## Fase A — preparación
- cómo llegas;
- dolor/molestia;
- energía;
- objetivo de hoy;
- calentamiento;
- activación.

## Fase B — principal
Ejercicios con:
- vídeo;
- técnica;
- series;
- reps/tiempo;
- carga;
- RIR/RPE;
- descanso;
- notas;
- alternativas;
- Coach mini-chat.

## Fase C — cierre
- vuelta a calma;
- movilidad;
- sensación final;
- resumen;
- recuperación sugerida.

## Diseño
El control “completar serie” debe vivir visualmente JUNTO al ejercicio.

No obligar a ir a otra zona de pantalla.

Cada serie puede registrar:
- completada;
- peso;
- reps;
- RIR/RPE;
- “me costó”;
- “muy fácil”;
- molestia;
- comentario libre.

La IA aprende de patrones históricos.

---

# 9. COACH MINI-CHAT DURANTE SESIÓN

Nunca sacar al usuario de la rutina.

Panel flotante pequeño.

Acciones:
- escribir;
- enviar foto;
- enviar vídeo;
- “analizar técnica”;
- “llamar al Coach” si entitlement lo permite.

El Coach conoce:
- ejercicio actual;
- serie actual;
- carga;
- RIR;
- historial reciente;
- molestias registradas.

Pero responde dentro del alcance del coaching.
Red flags → detener + derivar.

---

# 10. VÍDEO DE TÉCNICA Y “YO SOY MI DEMO”

## Captura
El usuario puede grabar una serie.

Por defecto:
- procesamiento local cuando sea posible;
- no subir sin consentimiento;
- controles claros para borrar.

## Reutilización
Después de una grabación válida:
“¿Quieres usar este vídeo como tu demostración personal la próxima vez?”

Si acepta:
- su vídeo aparece junto al vídeo técnico oficial;
- se etiqueta “TU ÚLTIMA EJECUCIÓN”.

Nunca sustituye la referencia técnica oficial de forma silenciosa.

---

# 11. MISIÓN COMPLETA — CELEBRACIÓN REAL

La pantalla actual es demasiado fría.

Debe mostrar:
- avatar/cara;
- nombre;
- nivel;
- XP de la sesión;
- FitCoins;
- récords si hubo;
- constancia;
- progreso de rango;
- feedback del Coach;
- “qué cambió hoy”.

## Camino de checkpoints
Cada plan/sesión es un pequeño mapa.

Ejemplo:
1. preparación;
2. bloque A;
3. bloque B;
4. cierre;
5. misión completa.

Al completar:
- el personaje avanza;
- se reclama recompensa;
- pequeña animación;
- sin casino / sin lootboxes.

## Anti-fraude / progreso honesto
- idempotencia por sessionId/setId;
- una serie no premia dos veces;
- XP = trabajo registrado + calidad/eventos definidos;
- sensores/cámara pueden aportar evidencia, pero no deben ser obligatorios;
- nunca premiar dolor o sobreesfuerzo;
- si se abandona, guardar progreso parcial sin castigo.

---

# 12. NUTRICIÓN — DE RECETARIO A DÍA ALIMENTARIO

La pantalla principal debe responder:
“¿Cómo va mi día?”

## Encabezado
- hora actual;
- última comida;
- próxima comida estimada;
- agua;
- energía/hambre;
- objetivo del día.

## Calendario semanal
Lunes → domingo.

Cada día:
- desayuno;
- comida;
- cena;
- snacks;
- hidratación.

## Registro rápido
- hora real;
- qué comió;
- cantidad aproximada;
- hambre antes;
- saciedad después;
- energía;
- foto opcional.

## Personalización
- objetivo;
- cultura alimentaria;
- preferencias;
- alergias;
- intolerancias;
- horarios;
- presupuesto;
- cocina disponible;
- suplementos declarados;
- restricciones médicas conocidas.

No diagnosticar intolerancias.

## Avanzado
- macros;
- proteína;
- carbohidratos;
- grasa;
- fibra;
- hidratación;
- periodización alrededor del entrenamiento cuando corresponda.

---

# 13. PROGRESO — DE DATOS A HISTORIA VISUAL

Cuatro vistas.

## A. FOTO / CUERPO
- galería privada;
- comparación;
- medidas;
- línea de tiempo.

## B. FUERZA / RENDIMIENTO
- último levantamiento;
- mejor marca;
- volumen;
- e1RM estimado cuando procede;
- velocidad si hay sensor compatible;
- tests.

## C. CONSTANCIA
Calendario tipo juego:
- día entrenado;
- movilidad;
- check-in;
- recuperación;
- retos.

No usar culpa por días vacíos.

## D. PLANIFICACIÓN PRO
Entitlement avanzado:
- macrociclo;
- mesociclos;
- microciclos;
- carga;
- intensidad;
- volumen;
- deload;
- test;
- competiciones.

Export:
- Excel;
- PDF;
- informe Coach.

---

# 14. SUEÑO / RECUPERACIÓN / VIDA REAL

## Sueño
- hora de dormir;
- hora de despertar;
- duración;
- calidad subjetiva;
- rutina;
- alarmas;
- recordatorio de desconexión.

## Wearables
Futuro:
- Apple Health / HealthKit;
- Android Health Connect;
- proveedores compatibles.

La app debe distinguir:
- dato medido;
- dato estimado;
- dato auto-reportado.

No convertir wearable en diagnóstico.

## Recuperación
- estrés;
- fatiga;
- dolor;
- carga laboral;
- otros deportes;
- viajes;
- exposición al frío/calor si se quiere registrar;
- movilidad;
- descanso.

## Rutinas por momento
- despertar;
- trabajo;
- pausa activa;
- almuerzo;
- preentreno;
- noche.

---

# 15. COMUNIDAD

No una red social genérica.

Solo contenido alineado con progreso:
- hitos;
- PR;
- constancia;
- reto;
- receta;
- aprendizaje;
- foto de progreso con consentimiento.

Controles:
- privado;
- Coach;
- amigos;
- comunidad.

Sin rankings de peso corporal.

---

# 16. COACH OS V3 — CRM + LABORATORIO DE PROGRAMACIÓN

Coach OS debe convertirse en “vista de pájaro”.

## Home
Avatares/clientes como nodos vivos.

Cada cliente muestra:
- nombre;
- membresía;
- adherencia;
- sesión hoy;
- readiness;
- alertas;
- último contacto;
- estado del plan.

Click → Perfil 360.

## Perfil 360
El Coach puede entrar “como si viera su app”, pero con capa profesional.

Pestañas:
- Resumen
- Plan
- Sesiones
- Progreso
- Nutrición
- Recuperación
- Mensajes
- Vídeos
- Compras
- Referidos
- Consentimientos
- Historial

## CRM
- lead;
- trial;
- cliente;
- pausa;
- riesgo;
- baja;
- reactivación.

Datos comerciales:
- plan;
- pagos;
- renovación;
- productos;
- referidos;
- LTV;
- sesiones restantes.

---

# 17. PLANIFICADOR PROFESIONAL

No obligar al Coach a crear “rutina” primero.

Jerarquía:

1. PERFIL / NECESIDAD
2. OBJETIVO GENERAL
3. OBJETIVOS ESPECÍFICOS
4. TEMPORADA / HORIZONTE
5. MACROCICLO
6. MESOCICLO
7. MICROCICLO
8. SESIÓN
9. BLOQUE
10. EJERCICIO
11. SERIE
12. RESULTADO REAL

## Quick mode
Para población general:
BAYONA crea automáticamente un contenedor de 4–12 semanas.

## Pro mode
Para rendimiento:
- calendario competitivo;
- fases;
- acumulación/desarrollo/especificidad/taper según modelo;
- bloques;
- carga externa/interna;
- pruebas;
- competiciones.

Modelos soportados:
- tradicional/lineal;
- ondulante;
- bloques;
- ATR;
- concurrente;
- taper;
- híbrido.

No declarar un modelo universalmente superior.

---

# 18. BIBLIOTECA PROPLAYER — BÚSQUEDA SERIA

## Comportamiento de búsqueda
Si escribes “p”:
- devuelve todos los ejercicios cuyo nombre/tags contengan p;
- resultados instantáneos;
- luego ranking por relevancia.

Debe soportar:
- contains;
- prefix;
- fuzzy;
- sin tildes;
- sin mayúsculas.

## Facetas
- patrón de movimiento;
- región;
- músculo;
- articulación;
- equipo;
- posición;
- bilateral/unilateral;
- cadena;
- plano;
- objetivo;
- nivel;
- deporte;
- fase;
- entorno;
- población;
- contraindicación/precaución;
- regresión/progresión.

## “Patología”
No usar “elige patología → te damos ejercicio” como receta clínica.

Crear:
**CONSIDERACIONES CLÍNICAS / PRECAUCIONES**

Ejemplos:
- dolor lumbar;
- rodilla;
- hombro;
- cardiometabólico;
- embarazo;
- posparto;
- hipertensión declarada;
- etc.

La IA:
1. filtra contraindicaciones y red flags;
2. respeta restricciones del profesional;
3. busca ejercicios compatibles;
4. explica POR QUÉ;
5. ofrece alternativas;
6. Coach confirma.

---

# 19. IA BAYONA — CEREBRO POR CAPAS

No un chatbot único.

## Capa 1 — Seguridad
Antes de cualquier recomendación:
- red flags;
- scope;
- derivación.

## Capa 2 — Perfil
Contexto estructurado del usuario.

## Capa 3 — Memoria
Hechos útiles:
- preferencias;
- historial;
- respuesta a sesiones;
- horarios;
- adherencia;
- frases/feedback.

No guardar cada frase para siempre.

## Capa 4 — Motor de planificación
Genera propuesta:
- periodización;
- sesión;
- ejercicio;
- carga;
- progresión.

## Capa 5 — Coach conversacional
Explica y acompaña.

## Capa 6 — Aprendizaje post-sesión
Compara:
- plan vs realizado;
- RIR;
- dificultad;
- molestias;
- vídeo;
- sueño/estrés;
- tendencia histórica.

## Capa 7 — Explainability
Toda adaptación debe responder:
“¿Por qué cambió mi plan?”

---

# 20. MOTOR DE CIENCIA

La ciencia NO se actualiza directamente en producción cada día.

Proceso correcto:

1. rastreo diario de publicaciones/guías;
2. clasificación automática;
3. revisión / aprobación;
4. versión de conocimiento;
5. tests de regresión;
6. despliegue.

## Base inicial
- ACSM Guidelines for Exercise Testing and Prescription, 12ª ed.;
- WHO Physical Activity and Sedentary Behaviour Guidelines;
- NSCA Youth Resistance Training / LTAD;
- IOC REDs 2023 + corrección 2024;
- consenso de carga del IOC y literatura moderna posterior;
- guías de sueño;
- posiciones de nutrición deportiva de organismos y journals relevantes.

Cada regla en IA debe poder tener:
- fuente;
- fecha;
- población;
- nivel de confianza;
- versión.

---

# 21. TESTS Y EVALUACIONES

No hacer “test cada semana” por obligación.

## Siempre
- check-in breve antes de sesión;
- respuesta post-sesión;
- carga real.

## Semanal
Según perfil:
- bienestar;
- adherencia;
- readiness;
- síntomas;
- tendencia.

## Periódico
Según objetivo:
- fuerza;
- salto;
- velocidad;
- movilidad;
- resistencia;
- medidas.

## Competitivo
- testing calendar ligado al macrociclo.

---

# 22. DATOS — MODELO CANÓNICO

Entidades principales:

- User
- Profile
- DevelopmentProfile
- Consent
- Membership
- Entitlement
- CoachPersona
- CoachClientLink
- HealthProfile
- SafetyFlag
- ReadinessCheckin
- NotificationPreference
- TrainingPlan
- Macrocycle
- Mesocycle
- Microcycle
- SessionTemplate
- SessionInstance
- Exercise
- ExercisePrescription
- SetLog
- ExerciseFeedback
- TechniqueMedia
- TechniqueAnalysis
- NutritionProfile
- NutritionPlan
- MealPlanDay
- MealLog
- HydrationLog
- SleepLog
- RecoveryLog
- WearableMetric
- ProgressMetric
- ProgressPhoto
- Assessment
- RewardLedger
- AvatarState
- CoachMessage
- AIConversation
- AIObservation
- CommunityPost
- Referral
- Order
- Payment
- BackupSnapshot
- AuditLog

Regla:
la UI nunca inventa un dato que no exista en estas entidades.

---

# 23. COPIA SEGURA Y MULTIDISPOSITIVO

Local-first sigue siendo correcto, pero el usuario debe poder recuperar su vida digital.

## Capas
A. local storage / IndexedDB cifrado donde corresponda;
B. export manual;
C. backup cloud opcional;
D. sync multi-device.

## Requisitos
- versionado;
- checksums;
- conflictos;
- historial;
- restore;
- cifrado en tránsito;
- control de sesión;
- auditoría.

Si pierde/roban teléfono:
- inicia sesión;
- restaura último snapshot;
- medios privados según política de backup elegida.

---

# 24. TEMAS VISUALES

Actualmente BAYONA ONE fuerza oscuro.

Nuevo:
- DARK / NOCHE = firma por defecto;
- LIGHT / DÍA = opción completa.

No hacer “invertir colores”.
Debe ser un sistema de tokens:
- background;
- surface;
- text;
- muted;
- border;
- orange;
- success;
- warning;
- danger.

Ambos temas deben superar QA visual y contraste.

---

# 25. PRIORIDAD DE IMPLEMENTACIÓN

No intentar construir todo a la vez.

## FASE 0 — FUNDACIÓN (1 bloque)
Objetivo:
que cada función futura tenga sitio correcto.

Construir:
- entitlement engine;
- profile schema v4;
- theme engine;
- event/audit model;
- feature flags;
- data migrations;
- route map.

Criterio:
ninguna feature futura necesita crear un segundo sistema paralelo.

## FASE 1 — ENTRADA PERFECTA
Construir:
- demo “móvil dentro del móvil”;
- selector de plan;
- claro/oscuro;
- onboarding V3;
- entrenador/Coach persona;
- ubicaciones y objetivos custom;
- “semana real”;
- membresía;
- tour inicial.

Criterio:
un usuario nuevo entiende el producto sin explicación humana.

## FASE 2 — HUB PERSONAL
Construir:
- personaje protagonista;
- fecha;
- sesión;
- progreso;
- Coach;
- zonas;
- cámara narrativa;
- funciones bloqueadas por entitlement.

## FASE 3 — TRAINING EXPERIENCE
Construir:
- warm-up / main / cool-down;
- set logger premium;
- feedback por serie;
- mini Coach;
- vídeo personal;
- final cinematográfico;
- checkpoints / FitCoins.

## FASE 4 — NUTRICIÓN + RECUPERACIÓN + PROGRESO
Construir:
- calendario nutrición;
- meal timing;
- agua;
- sueño;
- recuperación;
- progress visual;
- constancia;
- fotos;
- informes.

## FASE 5 — IA ADAPTATIVA
Construir:
- memory schema;
- safety layer;
- recommender;
- post-session learning;
- adaptive session;
- explainability;
- evidence versioning.

## FASE 6 — COACH OS CRM
Construir:
- bird’s-eye dashboard;
- Perfil 360;
- membership/payments/referrals;
- messages;
- alerts;
- agenda;
- client mirror.

## FASE 7 — PERIODIZACIÓN PRO
Construir:
- macro/meso/micro;
- planning wizard;
- sports templates;
- load monitoring;
- testing calendar;
- reports/export.

## FASE 8 — CLOUD / WEARABLES / COMMUNITY / COMMERCE
Construir:
- backend real;
- backups;
- multi-device;
- wearable APIs;
- community;
- store;
- real orders.

---

# 26. QUÉ HACEMOS AHORA

Primer sprint recomendado:

### SPRINT “ENTRADA QUE VENDE Y CONOCE”
1. Theme engine día/noche.
2. “Ver cómo funciona” con móvil interactivo.
3. Matriz de membresías / entitlement.
4. Onboarding V3:
   - objetivos multi + custom;
   - entrenamiento multi-lugar + custom;
   - semana real;
   - edad/desarrollo;
   - Coach persona.
5. Primera guía del Coach.
6. Notificaciones contextuales.
7. QA desktop/móvil.
8. Tests y deploy.

No tocar todavía el rediseño profundo de Coach OS hasta tener:
- Profile v4;
- Membership/Entitlements;
- TrainingPlan hierarchy.

Así Coach OS nacerá sobre datos correctos y no tendremos que migrarlo dos veces.

---

# 27. CRITERIOS NO NEGOCIABLES

1. Nunca inventar métricas.
2. Nunca diagnosticar desde un wearable.
3. Nunca recomendar ejercicio solo por nombre de patología.
4. Nunca gamificar dolor, restricción alimentaria o sobreentrenamiento.
5. Nunca mezclar datos de clientes.
6. Nunca romper la sesión por abrir el Coach.
7. Todo bloqueo premium debe explicar valor.
8. Todo cambio de IA debe ser explicable.
9. Coach humano puede sobrescribir la IA.
10. Red flags siempre ganan a objetivos de rendimiento.
11. Menores tienen flujo y privacidad específicos.
12. Los datos sensibles requieren consentimiento y borrado real.
13. El personaje representa progreso; no reemplaza mediciones reales.
14. La UI debe ser simple aunque el motor sea complejo.
15. BAYONA debe sentirse premium tanto en móvil como en escritorio.

---

# 28. RESULTADO FINAL BUSCADO

BAYONA PERSONAL:
“Abro la app y sé qué hacer hoy. Mi Coach me conoce. Veo cómo progreso. Mi mundo cambia conmigo.”

COACH OS:
“Veo a todos desde arriba, sé quién necesita atención, entro en cualquier ficha y puedo programar desde temporada hasta serie sin perder contexto.”

NEGOCIO:
“Cada nivel demuestra el siguiente. El usuario entiende por qué pagar más sin sentir que la versión actual está mutilada.”

CIENCIA:
“Cada recomendación tiene contexto, límites y trazabilidad. BAYONA no presume saber lo que no sabe.”

---

## ORDEN DE EJECUCIÓN APROBADO

1. FUNDACIÓN
2. ENTRADA / ONBOARDING / DEMO
3. HUB PERSONAL
4. TRAINING
5. NUTRICIÓN / RECUPERACIÓN / PROGRESO
6. IA
7. COACH OS
8. PLANIFICACIÓN PRO
9. CLOUD / WEARABLES / COMMUNITY / COMMERCE

Este orden minimiza re-trabajo y permite tener producto usable al final de cada fase.
