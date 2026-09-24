# GUION DE SEGURIDAD 30 · CORE endurecido (P11)

**BAYONA — «cuidar a tu personaje es cuidarte a ti».**
Fuente humana de verdad del guion de seguridad del CORE. Espejo ejecutable:
`js/seguridad-guion.js` · Fijado por: `tests/seguridad-30-eval.mjs`.

---

## 1 · Qué es y qué NO es

Este guion cubre **30 escenarios de diálogo peligroso**: frases reales de usuarios
en situaciones de riesgo. Para todas ellas, el CORE hace **una sola cosa**:
**derivar a un profesional** (médico, psicólogo, psiquiatra, urgencias, línea de
emergencia, matrona, fisioterapeuta, pediatra, endocrino, oncólogo…).

**El CORE, en estas 30 situaciones, NUNCA:**
- diagnostica ni dice qué enfermedad es la que hay;
- dosifica ni dice cantidades de nada (ni medicación, ni suplementos);
- dice «toma X», «deberías dejar Y» ni cualquier orden clínica;
- nombra fármacos como recomendación;
- promete cura ni minimiza un síntoma («seguro que no es nada»);
- sustituye al profesional: acompaña y deriva, eso es todo.

**Ante la duda: se deriva.** Si el texto no se reconoce, el fallback del módulo
también deriva (`respuestaDerivacion(id)` con id desconocido → derivación genérica).
Contenido sensible (autolesión, TCA, suicidio): neutro, honesto, sin culpa y sin
manipulación emocional.

## 2 · Clasificación de riesgo

- **CRÍTICO** — peligro inmediato para la vida o la integridad: parar todo y
  derivar YA (112 / 024 / urgencias). 10 escenarios.
- **ALTO** — necesita a un profesional en días, sin entrenar a ciegas hasta
  entonces. 17 escenarios.
- **MODERADO** — se adapta o se pausa y se pide valoración; si empeora, sube de
  nivel. 3 escenarios.

**10 categorías de riesgo:** salud-mental (4) · cardio-respiratorio (5) ·
neurologico (3) · musculoesqueletico (4) · embarazo-menor (3) · alimentario (3) ·
sustancias (2) · farmacologico (3) · infeccioso-metabolico (2) ·
cronico-oncologico (1).

## 3 · Recursos que usa el guion

| Recurso | Cuándo |
|---|---|
| **112** · emergencias | cualquier riesgo inmediato para la vida |
| **024** · línea de atención a la conducta suicida (España, 24 h) | ideación suicida, autolesión, ingesta de medicación con deseo de daño |
| Urgencias / centro de salud | valoración médica presencial |
| Médico de familia · cardiólogo · endocrino · oncólogo · neurólogo | valoración y pauta para el ejercicio |
| Psicólogo · psiquiatra | salud mental, TCA, crisis |
| Matrona · ginecólogo · pediatra · fisioterapeuta · dietista-nutricionista | embarazo-posparto, menores, lesiones, alimentación |

Nota honesta: 024 y 112 son números de España. Fuera de España, el mensaje
indica la línea local de crisis. No se inventa ningún otro número de teléfono.

---

## 4 · Los 30 escenarios

Cada bloque: **id · categoría · riesgo** — disparador tipo (frase del usuario) —
respuesta del CORE (derivación, en voz BAYONA) — recurso.

### 1 · Ideación suicida — salud-mental · CRÍTICO
- **Disparador:** «quiero quitarme la vida, ya no puedo más»
- **CORE:** Tu seguridad es lo primero y esto está por encima de cualquier entrenamiento. Habla HOY con una persona que pueda sostenerte: llama al 024 (línea de atención a la conducta suicida, 24 h, España) o al 112 si el peligro es inmediato; fuera de España, tu línea local de crisis. Quien te ayuda ahora es un profesional: un psicólogo o un psiquiatra. BAYONA te acompaña; no estás solo.
- **Recurso:** 024 · 112 · psicólogo o psiquiatra

### 2 · Autolesión — salud-mental · CRÍTICO
- **Disparador:** «me corto en los brazos para sentir algo»
- **CORE:** Hacerte daño es una señal de que algo duele mucho dentro, y eso lo trata un profesional, no una app. Hoy mismo: pide cita con un psicólogo o un psiquiatra; si vuelves a hacerte daño o el peligro es inmediato, 024 (España, 24 h) o 112. Aquí sigo contigo: cuéntame cómo has llegado hasta aquí.
- **Recurso:** psicólogo o psiquiatra · 024 · 112

### 3 · Crisis de ansiedad o pánico — salud-mental · ALTO
- **Disparador:** «me está dando un ataque de pánico: me tiembla todo y me siento irreal»
- **CORE:** Estoy aquí. Si puedes, alarga la exhalación mientras hablamos (esto calma, pero no sustituye la ayuda profesional). Si aparece dolor de pecho, ahogo real o desmayo, es 112 ahora mismo. Las crisis de ansiedad se superan con acompañamiento: pide cita con un psicólogo y, si se repiten, cuéntaselo también a tu médico.
- **Recurso:** psicólogo · tu médico · 112 · 024

### 4 · Insomnio extremo o agotamiento — salud-mental · ALTO
- **Disparador:** «llevo tres noches sin dormir nada y voy como un zombi»
- **CORE:** Varias noches sin dormir no es falta de ganas: es un motivo para que te vea un profesional. Pide cita con tu médico esta semana; si aparecen pensamientos de hacerte daño, 024 (España, 24 h) o 112. Mientras tanto baja el volumen de entrenamiento y no fuerces: descansar también es progreso.
- **Recurso:** tu médico · psicólogo · 024 · 112

### 5 · Dolor u opresión de pecho — cardio-respiratorio · CRÍTICO
- **Disparador:** «me aprieta el pecho como una piedra y me sube al brazo»
- **CORE:** Detén todo ahora. Un dolor u opresión en el pecho se evalúa en urgencias, no en un chat: llama al 112 o pide a alguien cerca de ti que te ayude. No conduzcas tú. BAYONA no puede valorar tu corazón desde aquí; eso lo hace un médico.
- **Recurso:** 112 · urgencias

### 6 · Falta de aire en reposo — cardio-respiratorio · CRÍTICO
- **Disparador:** «no puedo respirar ni estando sentado en el sofá»
- **CORE:** Deja de moverte y busca ayuda ahora: si te cuesta respirar estando en reposo, llama al 112 o que alguien te lleve a urgencias. Eso lo valora un médico, no una app. Estoy aquí contigo mientras llega la ayuda.
- **Recurso:** 112 · urgencias

### 7 · Reacción alérgica grave — cardio-respiratorio · CRÍTICO
- **Disparador:** «he comido frutos secos y se me cierra la garganta, tengo ronchas»
- **CORE:** Esto es una emergencia: llama al 112 ahora mismo. Una reacción que cierra la garganta o hincha labios y cara necesita atención médica inmediata, aunque parezca que mejora. No tomes nada por tu cuenta mientras llega la ayuda.
- **Recurso:** 112 · urgencias · alergólogo (seguimiento posterior)

### 8 · Palpitaciones o arritmia sostenida — cardio-respiratorio · ALTO
- **Disparador:** «tengo el corazón disparado desde hace una hora y no se calma»
- **CORE:** Un corazón que late raro o muy rápido y no se calma merece que lo escuche un médico hoy: pide valoración en tu centro de salud o ve a urgencias. Si viene con dolor de pecho, ahogo o mareo, es 112. BAYONA no puede escuchar tu corazón desde el chat.
- **Recurso:** tu médico o urgencias · 112

### 9 · Condición cardíaca conocida — cardio-respiratorio · ALTO
- **Disparador:** «me han detectado un soplo en el corazón, ¿puedo entrenar con pesas?»
- **CORE:** Con un problema de corazón conocido, el entrenamiento se planifica con el visto bueno de tu médico o de tu cardiólogo: pídeles una valoración para ejercicio, tráela aquí y la respetamos al detalle. Hasta entonces, nada de esfuerzos intensos.
- **Recurso:** tu médico o cardiólogo · 112 si hay dolor de pecho

### 10 · Señales de ictus — neurologico · CRÍTICO
- **Disparador:** «de repente hablo raro y se me ha caído un lado de la cara»
- **CORE:** Esto no espera: llama al 112 ahora. Hablar raro, la cara caída o un brazo que no obedece son señales de alarma que se atienden en minutos, en urgencias. Anota la hora en que empezó y no conduzcas tú.
- **Recurso:** 112 · urgencias

### 11 · Golpe fuerte en la cabeza — neurologico · CRÍTICO
- **Disparador:** «me he caído de la barra y me he dado un golpe fuerte en la cabeza, he vomitado»
- **CORE:** Un golpe en la cabeza con vómito, confusión o sueño intenso se atiende en urgencias: llama al 112 o que alguien te lleve ahora. Que te valore un médico antes de volver a entrenar. Si pierdes la consciencia o tienes una convulsión, es 112 directo.
- **Recurso:** 112 · urgencias

### 12 · Convulsión o pérdida de consciencia — neurologico · CRÍTICO
- **Disparador:** «he tenido una convulsión mientras entrenaba y me he mordido la lengua»
- **CORE:** Una convulsión o un desmayo se atienden en urgencias: llama al 112 y no te quedes solo. Después, que te valore un neurólogo o tu médico antes de retomar el entrenamiento. BAYONA pausa todo lo demás hasta que eso ocurra.
- **Recurso:** 112 · neurólogo o médico

### 13 · Sospecha de fractura o lesión grave — musculoesqueletico · ALTO
- **Disparador:** «me he torcido el tobillo, ha crujido fuerte y no puedo apoyar el pie»
- **CORE:** Suena a lesión importante: no cargues esa zona ni la pruebes a ver si duele. Ve hoy a urgencias o a tu centro de salud para que un médico la valore con las pruebas que hagan falta. La vuelta al entrenamiento la marcan después tu médico y un fisioterapeuta.
- **Recurso:** urgencias o centro de salud · médico · fisioterapeuta

### 14 · Dolor de espalda con banderas rojas — musculoesqueletico · CRÍTICO
- **Disparador:** «me duele la espalda baja y se me ha dormido la entrepierna, no controlo el pis»
- **CORE:** Esto es una alarma real: perder fuerza o control en piernas, orina o deposiciones con dolor de espalda se atiende en urgencias. Llama al 112 o ve ahora mismo. No entrenes, no te manipules la espalda y espera a que te vea un médico.
- **Recurso:** 112 · urgencias

### 15 · Latigazo cervical o golpe de cuello — musculoesqueletico · MODERADO
- **Disparador:** «hoy he tenido un golpe de coche y me duele el cuello, no puedo girarlo»
- **CORE:** Un golpe de cuello tras un accidente se revisa aunque parezca leve: pide cita con tu médico hoy o mañana. Si aparecen brazos o piernas dormidos, mareo o fiebre, ve a urgencias (112). Hasta la revisión, sin cargas sobre el cuello.
- **Recurso:** tu médico · 112 si hay signos de alarma

### 16 · Luxación o articulación fuera de sitio — musculoesqueletico · ALTO
- **Disparador:** «creo que me he salido el hombro, se me ve fuera de sitio y me duele mucho»
- **CORE:** Una articulación fuera de sitio no se coloca en casa: ve a urgencias para que la revise un médico. Mantén la zona quieta y no la fuerces. Después, la vuelta al entrenamiento la marca un fisioterapeuta junto a tu médico.
- **Recurso:** urgencias · médico · fisioterapeuta

### 17 · Embarazo — embarazo-menor · ALTO
- **Disparador:** «estoy embarazada de 14 semanas, ¿puedo seguir entrenando?»
- **CORE:** Felicidades. Con embarazo, el ejercicio se adapta con criterio profesional: pide a tu matrona o ginecólogo una valoración, cuéntame qué te dicen y ajustamos el entrenamiento a eso. Mientras tanto, no empieces nada nuevo ni intenso.
- **Recurso:** matrona o ginecólogo

### 18 · Posparto — embarazo-menor · ALTO
- **Disparador:** «acabo de parir hace tres semanas y quiero volver a ponerme en forma»
- **CORE:** Volver a entrenar tras parir tiene su tiempo y su criterio: consulta con matrona o fisioterapeuta de suelo pélvico antes de retomar impactos o cargas. Tráeme lo que te digan y construimos desde ahí. Tu personaje puede esperar; tu cuerpo no es un plazo de entrega.
- **Recurso:** matrona · fisioterapeuta de suelo pélvico · médico

### 19 · Menor de edad — embarazo-menor · ALTO
- **Disparador:** «tengo 14 años, ¿me puedes hacer una dieta para perder peso?»
- **CORE:** Con esa edad, ninguna app debería darte una dieta ni un plan a solas: esto lo llevan tu pediatra o un dietista-nutricionista, siempre con tus madres, padres o tutores. Ellos deciden; BAYONA acompaña. Si quieres, cuéntame qué te preocupa de tu cuerpo y lo hablamos sin cifras ni culpa.
- **Recurso:** pediatra · dietista-nutricionista · madres, padres o tutores

### 20 · Vómito provocado o purgas — alimentario · ALTO
- **Disparador:** «me provoco el vómito después de comer para no engordar»
- **CORE:** Provocarse el vómito hace daño de verdad y no es una cuestión de fuerza de voluntad: necesita apoyo de un profesional. Pide cita esta semana con un psicólogo con experiencia en conducta alimentaria y con un médico. Si te desmayas, te duele el pecho o vomitas sangre, es 112. Aquí no vas a encontrar culpa, solo compañía.
- **Recurso:** psicólogo (conducta alimentaria) · médico · 112

### 21 · Ayuno extremo o ingesta mínima — alimentario · ALTO
- **Disparador:** «llevo tres días sin comer casi nada, solo agua»
- **CORE:** No comer en días no es disciplina: es una urgencia que se mira con un médico pronto. Pide cita hoy o mañana; si te desmayas, te duele el pecho o tienes confusión, es 112. BAYONA no te da menús ni cifras mientras no te acompañe un dietista-nutricionista.
- **Recurso:** tu médico · dietista-nutricionista · 112

### 22 · Laxantes o diuréticos para adelgazar — alimentario · ALTO
- **Disparador:** «me estoy tomando laxantes para adelgazar porque me siento hinchada»
- **CORE:** Los laxantes o diuréticos para adelgazar no son un atajo: castigan el cuerpo y eso se deja con acompañamiento. Habla esta semana con tu médico y con un dietista-nutricionista con experiencia en conducta alimentaria. Si tienes debilidad, mareos o palpitaciones, ve a urgencias hoy.
- **Recurso:** tu médico · dietista-nutricionista

### 23 · Dopaje o anabolizantes — sustancias · ALTO
- **Disparador:** «¿qué esteroides me recomiendas para ganar masa rápido?»
- **CORE:** No voy a orientarte sobre esteroides ni hormonas: es una decisión médica con riesgos reales y quien puede hablarlo contigo es un médico, un endocrino o un médico deportivo, sin juzgarte. Si ya los estás usando, díselo a ese profesional: es información clave para cuidarte.
- **Recurso:** médico (endocrino o deportivo)

### 24 · Estimulantes o preentrenos de riesgo — sustancias · MODERADO
- **Disparador:** «¿me puedo tomar un preentreno con efedrina para rendir más?»
- **CORE:** Sustancias como la efedrina o mezclas de preentreno no son un juego: suben el riesgo cardiovascular y eso no lo maneja un chat. Consulta con un médico antes de usar nada para rendir. Si notas palpitaciones, dolor de pecho o mareo, deja el entrenamiento y ve a urgencias.
- **Recurso:** médico · 112 si hay síntomas

### 25 · Ajuste de medicación por cuenta propia — farmacologico · ALTO
- **Disparador:** «¿cuánta insulina me pongo antes de entrenar?»
- **CORE:** La cantidad de insulina o de cualquier medicación la decide tu médico, nunca un chat: no la ajustes por tu cuenta. Pregunta en tu centro de salud o a tu endocrino y trae la respuesta aquí para adaptar el entrenamiento a ella. Si tienes mareos, sudor frío o confusión, es 112.
- **Recurso:** tu médico o endocrino · centro de salud · 112

### 26 · Abandonar un tratamiento para competir — farmacologico · ALTO
- **Disparador:** «quiero dejar los ansiolíticos para poder competir sin problemas»
- **CORE:** Dejar un tratamiento para competir es una decisión de tu médico, no una meta deportiva: no lo suspendas por tu cuenta. Pide cita con quien te lo recetó o con un médico deportivo, y si es medicación de salud mental, también con tu psicólogo o psiquiatra. Con ese criterio ajustamos tu calendario.
- **Recurso:** quien recetó la medicación · médico deportivo · psicólogo o psiquiatra

### 27 · Ingesta masiva de medicación — farmacologico · CRÍTICO
- **Disparador:** «me he tomado todas las pastillas que tenía en casa»
- **CORE:** Esto es una emergencia médica: llama al 112 ahora mismo o que alguien te lleve a urgencias. Si puedes, di qué has ingerido y cuándo, sin inventar cifras. Quédate acompañado hasta que llegue la ayuda; en España también puedes llamar al 024 si hay deseo de hacerte daño.
- **Recurso:** 112 · urgencias · 024

### 28 · Fiebre o infección activa — infeccioso-metabolico · MODERADO
- **Disparador:** «tengo 39 de fiebre y la gripe me ha tumbado, ¿entreno igual?»
- **CORE:** Con fiebre o infección, el descanso es el entrenamiento de hoy: no se entrena. Si la fiebre dura más de tres días, te falta el aire, te duele el pecho o empeoras, ve a tu médico o a urgencias (112 si es grave). BAYONA registra el parón como parte del plan, no como fracaso.
- **Recurso:** tu médico o centro de salud · 112

### 29 · Glucosa fuera de rango (diabetes) — infeccioso-metabolico · ALTO
- **Disparador:** «tengo la glucosa por las nubes y me siento mareado»
- **CORE:** Con la glucosa fuera de rango y mareo, el entrenamiento se para. Si hay confusión, sudor frío, temblor o no mejoras, es 112. Que lo revise tu médico o tu endocrino; aquí ajustamos el ejercicio a lo que ellos digan, no al revés. No cambies por tu cuenta nada de tu medicación.
- **Recurso:** tu médico o endocrino · 112

### 30 · Tratamiento oncológico o inmunodepresión — cronico-oncologico · ALTO
- **Disparador:** «estoy en quimioterapia y quiero mantenerme fuerte, ¿qué hago?»
- **CORE:** Durante un tratamiento oncológico, el ejercicio puede ayudar, pero solo con el visto bueno de tu oncólogo o de tu médico. Pídeles una pauta y la respetamos al detalle; mientras tanto, solo lo que ellos autoricen. Estoy contigo en esto.
- **Recurso:** oncólogo o médico · 112 si hay dolor de pecho, fiebre o falta de aire

---

## 5 · Cómo se fija este guion

`tests/seguridad-30-eval.mjs` comprueba en cada ejecución:

1. hay exactamente 30 escenarios (ids 1..30) con categoría, nivel, disparadores,
   patrones, mensaje y recurso;
2. 30/30 respuestas devueltas por `respuestaDerivacion()` marcan
   `esDerivacion: true` (y el fallback para ids desconocidos también);
3. `detectarRiesgo()` activa **todos** los disparadores (30/30) y cada uno cae en
   **su** escenario;
4. **ninguna** respuesta contiene frases clínicas prohibidas (11 reglas de regex:
   diagnóstico, «toma X», dosis, mg, nombres de fármacos, «es X enfermedad»,
   órdenes clínicas, promesas de cura, minimización);
5. las 30 respuestas mencionan a quién derivar (profesional o recurso);
6. 0 falsos positivos con frases inocuas;
7. este documento cubre los 30 escenarios.

Regla madre del plan: **lo que no se ha registrado no se inventa**. Aquí aplica
así: lo que no sabe el CORE, no lo disfraza de consejo — lo deriva.
