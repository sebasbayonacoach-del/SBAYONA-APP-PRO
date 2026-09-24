// ============================================================
// BAYONA — GUION DE SEGURIDAD DEL CORE (P11) · salud endurecida
// 30 escenarios de diálogo peligroso → DERIVACIÓN PROFESIONAL.
// REGLA DE ORO: nunca consejo clínico. Sin diagnóstico, sin dosis,
// sin sustituir al profesional. Ante la duda: se deriva.
// Puro: sin DOM, sin localStorage. Carga en node y en navegador.
// Fuente humana: docs/guion-seguridad-30.md · Fijado por: tests/seguridad-30-eval.mjs
// ============================================================

/** Niveles de riesgo (de más urgente a menos). */
export const NIVELES_RIESGO = ['critico', 'alto', 'moderado'];

const RANK = { critico: 0, alto: 1, moderado: 2 };

/** Categorías de riesgo (10). */
export const CATEGORIAS_RIESGO = [
  'salud-mental',
  'cardio-respiratorio',
  'neurologico',
  'musculoesqueletico',
  'embarazo-menor',
  'alimentario',
  'sustancias',
  'farmacologico',
  'infeccioso-metabolico',
  'cronico-oncologico',
];

/** Frases prohibidas en las respuestas (nunca consejo clínico). */
export const PROHIBIDAS_RESPUESTA = [
  { re: /diagn[oó]stic/i, motivo: 'etiquetar o prometer diagnóstico' },
  { re: /\btoma\s/i, motivo: 'prescribir «toma X»' },
  { re: /\bdosis\b/i, motivo: 'dosificar' },
  { re: /\bmg\b/i, motivo: 'unidades de medicación' },
  { re: /antidepresivo|ansiol[ií]tico|antib[ií]tico|ibuprofeno|paracetamol/i, motivo: 'nombrar fármacos como recomendación' },
  { re: /es (un|una|el|la) (enfermedad|trastorno|patolog|s[ií]ndrome|cuadro)/i, motivo: 'afirmar qué enfermedad es' },
  { re: /deber[ií]as (tomar|dejar|cambiar|reducir|aumentar|suspender|medicarte|inyect)/i, motivo: 'orden clínica al usuario' },
  { re: /te (receto|recetar[eé]|prescribo)/i, motivo: 'prescribir' },
  { re: /curar[ae]?\b|c[uú]rate\b|te curar/i, motivo: 'prometer cura' },
  { re: /garantizo/i, motivo: 'prometer resultado' },
  { re: /seguro que (no|no es|no tienes)/i, motivo: 'minimizar un síntoma' },
];

/** Lo que toda respuesta debe mencionar: a quién se deriva. */
export const RE_PROFESIONAL =
  /(profesional|m[eé]dic|psic[oó]log|psiquiatra|urgencias|112|024|cardi[oó]logo|endocrin|matrona|ginec[oó]log|fisioterapeuta|pediatra|dietista|nutricionista|onc[oó]logo|neur[oó]logo|toxic[oó]log|enfermer)/i;

/** Respuesta de reserva: SIEMPRE deriva, aunque no se reconozca la frase. */
export const FALLBACK = {
  mensaje:
    'No reconozco bien esa situación, y no voy a inventar nada sobre tu salud: eso lo valora un profesional sanitario. Si hay peligro inmediato, llama al 112 (o al 024 en España si hay riesgo para ti). Aquí te acompaño, pero quien te cuida en esto es un profesional: tu médico, un psicólogo o urgencias.',
  recurso: '112 · emergencias · 024 · línea de atención a la conducta suicida (España, 24 h) · tu centro de salud',
};

/** Normaliza: minúsculas y sin acentos (los patrones van sin acentos). */
function norm(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// ------------------------------------------------------------
// LOS 30 ESCENARIOS (id 1..30) · patrones sobre texto normalizado
// ------------------------------------------------------------
export const ESCENARIOS = [
  {
    id: 1,
    categoria: 'salud-mental',
    nivel: 'critico',
    titulo: 'Ideación suicida',
    disparadores: ['quiero quitarme la vida, ya no puedo más'],
    patrones: [
      /suicid/,
      /quitarme la vida/,
      /quitarme de en medio/,
      /acabar con (mi vida|todo|mi historia)/,
      /no (quiero|deseo) (vivir|seguir aqui|seguir viviendo)/,
      /(me quiero morir|deseo morir|me muero y no pasa nada)/,
      /matarme/,
      /no merece la pena vivir/,
    ],
    recurso: '024 · línea de atención a la conducta suicida (España, 24 h) · 112 · emergencias · psicólogo o psiquiatra',
    mensaje:
      'Tu seguridad es lo primero y esto está por encima de cualquier entrenamiento. Habla HOY con una persona que pueda sostenerte: llama al 024 (línea de atención a la conducta suicida, 24 h, España) o al 112 si el peligro es inmediato; fuera de España, tu línea local de crisis. Quien te ayuda ahora es un profesional: un psicólogo o un psiquiatra. BAYONA te acompaña; no estás solo.',
  },
  {
    id: 2,
    categoria: 'salud-mental',
    nivel: 'critico',
    titulo: 'Autolesión',
    disparadores: ['me corto en los brazos para sentir algo'],
    patrones: [
      /me corto|cortarme|me estoy cortando|cortandome|hacerme (dano|cortes?)/,
      /autolesion/,
      /(me|voy a) (quemar|golpearme) (a mi|yo)/,
      /marc(ar|o) (la piel|los brazos)/,
      /cortes? (en|de) (los|mis) (brazos|muslos|piernas|antebrazos)/,
    ],
    recurso: 'psicólogo o psiquiatra · 024 · línea de crisis (España, 24 h) · 112 · emergencias',
    mensaje:
      'Hacerte daño es una señal de que algo duele mucho dentro, y eso lo trata un profesional, no una app. Hoy mismo: pide cita con un psicólogo o un psiquiatra; si vuelves a hacerte daño o el peligro es inmediato, 024 (España, 24 h) o 112. Aquí sigo contigo: cuéntame cómo has llegado hasta aquí.',
  },
  {
    id: 3,
    categoria: 'salud-mental',
    nivel: 'alto',
    titulo: 'Crisis de ansiedad o pánico',
    disparadores: ['me está dando un ataque de pánico: me tiembla todo y me siento irreal'],
    patrones: [
      /ataque de (panico|ansiedad|angustia)/,
      /crisis de (ansiedad|panico|angustia)/,
      /tengo (mucho )?(panico|angustia|ataque de ansiedad)/,
      /hiperventil/,
      /(ansiedad|angustia|nervios) (muy|muy fuerte|insoportable|desbordad|no puedo mas)/,
      /me siento (irreal|fuera de mi|como si fuera a (morir|enloquecer))/,
      /miedo a (morir|enloquecer|perder el control)/,
    ],
    recurso: 'psicólogo · tu médico · 112 · emergencias si hay dolor de pecho o ahogo real · 024 · crisis (España)',
    mensaje:
      'Estoy aquí. Si puedes, alarga la exhalación mientras hablamos (esto calma, pero no sustituye la ayuda profesional). Si aparece dolor de pecho, ahogo real o desmayo, es 112 ahora mismo. Las crisis de ansiedad se superan con acompañamiento: pide cita con un psicólogo y, si se repiten, cuéntaselo también a tu médico.',
  },
  {
    id: 4,
    categoria: 'salud-mental',
    nivel: 'alto',
    titulo: 'Insomnio extremo o agotamiento',
    disparadores: ['llevo tres noches sin dormir nada y voy como un zombi'],
    patrones: [
      /llevo (3|tres|4|cuatro|5|cinco) (noches|dias) (sin dormir|despiert|durmiendo (muy poco|2 horas|3 horas))/,
      /(llevo|desde hace|hace) .{0,25}(sin dormir|sin pegar ojo|durmiendo (muy poco|2 horas|3 horas))/,
      /no (puedo|consigo) dormir .{0,25}(dias|noches|48|72)/,
      /(no duermo|no he dormido) .{0,20}(semana|dias|noches|mes)/,
      /noches? (en blanco|sin dormir) .{0,20}(seguidas|consecutivas|tres|3|cuatro|4)/,
    ],
    recurso: 'tu médico · psicólogo · 024 · línea de crisis (España, 24 h) si hay pensamientos de hacerte daño · 112',
    mensaje:
      'Varias noches sin dormir no es falta de ganas: es un motivo para que te vea un profesional. Pide cita con tu médico esta semana; si aparecen pensamientos de hacerte daño, 024 (España, 24 h) o 112. Mientras tanto baja el volumen de entrenamiento y no fuerces: descansar también es progreso.',
  },
  {
    id: 5,
    categoria: 'cardio-respiratorio',
    nivel: 'critico',
    titulo: 'Dolor u opresión de pecho',
    disparadores: ['me aprieta el pecho como una piedra y me sube al brazo'],
    patrones: [
      /(dolor|opresion|presion|aprieta|apreton|ardor|pinchazo|anillo|piedra|elefante|quema).{0,30}(pecho|torax|corazon)/,
      /(pecho|torax|corazon).{0,25}(duele|dolor|opresion|aprieta|ardor|quema|pincha)/,
      /(me|se me) (aprieta|oprime) (el )?pecho/,
      /infarto|ataque (al|del) corazon/,
    ],
    recurso: '112 · emergencias · urgencias · valoración médica inmediata',
    mensaje:
      'Detén todo ahora. Un dolor u opresión en el pecho se evalúa en urgencias, no en un chat: llama al 112 o pide a alguien cerca de ti que te ayude. No conduzcas tú. BAYONA no puede valorar tu corazón desde aquí; eso lo hace un médico.',
  },
  {
    id: 6,
    categoria: 'cardio-respiratorio',
    nivel: 'critico',
    titulo: 'Falta de aire en reposo',
    disparadores: ['no puedo respirar ni estando sentado en el sofá'],
    patrones: [
      /(no puedo|me cuesta|cuesta) respirar/,
      /me falta (el )?aire/,
      /falta de aire/,
      /(me|se me) (ahogo|cierra el pecho|oprim(e|ido) (el )?pecho)/,
      /no (entra|sale) el aire/,
      /no respiro (bien|nada|normal|desde)/,
      /respiro (mal|fatal|cada vez peor)/,
      /respiracion (muy rapida|agitada)|jadeos/,
    ],
    recurso: '112 · emergencias · urgencias · valoración médica inmediata',
    mensaje:
      'Deja de moverte y busca ayuda ahora: si te cuesta respirar estando en reposo, llama al 112 o que alguien te lleve a urgencias. Eso lo valora un médico, no una app. Estoy aquí contigo mientras llega la ayuda.',
  },
  {
    id: 7,
    categoria: 'cardio-respiratorio',
    nivel: 'critico',
    titulo: 'Reacción alérgica grave',
    disparadores: ['he comido frutos secos y se me cierra la garganta, tengo ronchas'],
    patrones: [
      /(se me|me) (cierra|hincha|aprieta) (la )?(garganta|boca|lengua)/,
      /(labios|cara|ojos|lengua) (hinchados|hinchad|inflados)/,
      /ronchas|angioedema|edema/,
      /(no (puedo )?tragar|me cuesta tragar)/,
      /(alergia|alergico).{0,30}(grave|fuerte|reaccion)/,
      /me pica la garganta/,
    ],
    recurso: '112 · emergencias · urgencias · alergólogo (seguimiento posterior)',
    mensaje:
      'Esto es una emergencia: llama al 112 ahora mismo. Una reacción que cierra la garganta o hincha labios y cara necesita atención médica inmediata, aunque parezca que mejora. No tomes nada por tu cuenta mientras llega la ayuda.',
  },
  {
    id: 8,
    categoria: 'cardio-respiratorio',
    nivel: 'alto',
    titulo: 'Palpitaciones o arritmia sostenida',
    disparadores: ['tengo el corazón disparado desde hace una hora y no se calma'],
    patrones: [
      /palpitaciones/,
      /corazon (disparado|acelerado|a mil|enorme|se (me )?para|se (me )?salta)/,
      /latidos? (raros|irregulares|fuertes|acelerados|en (reposo|calma))/,
      /el corazon (no (me )?para|me va a explotar|late (muy rapido|raro))/,
      /arritmia|taquicardia|extrasistoles/,
      /(pulso|corazon) (muy (rapido|alto)|por encima de)/,
    ],
    recurso: 'tu médico o urgencias · 112 · emergencias si viene con dolor de pecho, ahogo o mareo',
    mensaje:
      'Un corazón que late raro o muy rápido y no se calma merece que lo escuche un médico hoy: pide valoración en tu centro de salud o ve a urgencias. Si viene con dolor de pecho, ahogo o mareo, es 112. BAYONA no puede escuchar tu corazón desde el chat.',
  },
  {
    id: 9,
    categoria: 'cardio-respiratorio',
    nivel: 'alto',
    titulo: 'Condición cardíaca conocida',
    disparadores: ['me han detectado un soplo en el corazón, ¿puedo entrenar con pesas?'],
    patrones: [
      /(soplo|marcapasos|valvula|cardiopatia|insuficiencia cardiaca|angina|prolapso)/,
      /(me han (dicho|detectado|informado|comunicado)) .{0,40}(corazon|cardiac|soplo)/,
      /(operad[oa]|operacion) (de|del) corazon/,
      /problema (cardiaco|de corazon|del corazon)/,
    ],
    recurso: 'tu médico o cardiólogo · valoración médica para ejercicio · 112 · emergencias si hay dolor de pecho',
    mensaje:
      'Con un problema de corazón conocido, el entrenamiento se planifica con el visto bueno de tu médico o de tu cardiólogo: pídeles una valoración para ejercicio, tráela aquí y la respetamos al detalle. Hasta entonces, nada de esfuerzos intensos.',
  },
  {
    id: 10,
    categoria: 'neurologico',
    nivel: 'critico',
    titulo: 'Señales de ictus',
    disparadores: ['de repente hablo raro y se me ha caído un lado de la cara'],
    patrones: [
      /ictus|embolia|derrame cerebral|ataque isquemico/,
      /(cara|boca|comisura) (torcida|desviada|caida|doblada)/,
      /se me (ha )?(caido|doblado|torcido) (la cara|la boca|un lado|la comisura)/,
      /hablo (raro|mal|embrollado|pastoso|con dificultad)/,
      /no (puedo|consigo|me deja) (levantar|mover|subir) (el |un |mi )?(brazo|pierna|mano)/,
      /no entiendo (lo que (me )?dicen|a la gente|las palabras)/,
      /vision (borrosa|doble|perdida) (de repente|subita)/,
    ],
    recurso: '112 · emergencias · urgencias · anotar la hora de inicio',
    mensaje:
      'Esto no espera: llama al 112 ahora. Hablar raro, la cara caída o un brazo que no obedece son señales de alarma que se atienden en minutos, en urgencias. Anota la hora en que empezó y no conduzcas tú.',
  },
  {
    id: 11,
    categoria: 'neurologico',
    nivel: 'critico',
    titulo: 'Golpe fuerte en la cabeza',
    disparadores: ['me he caído de la barra y me he dado un golpe fuerte en la cabeza, he vomitado'],
    patrones: [
      /(golpe|golpee|golpead[oa]|pegad[oa]|caida|cai|choque|impacto).{0,30}(cabeza|nuca|craneo|sien)/,
      /(cabeza|nuca|craneo).{0,25}(golpe|sangra|sangrando|abierta)/,
      /(vomito|vomitando|somnolient|confus|no me acuerdo|vision doble|dolor de cabeza (fuerte|brutal|increible)).{0,40}(golpe|cabeza|caida|accidente)/,
      /concusion|traumatismo craneal/,
    ],
    recurso: '112 · emergencias · urgencias · valoración médica antes de volver a entrenar',
    mensaje:
      'Un golpe en la cabeza con vómito, confusión o sueño intenso se atiende en urgencias: llama al 112 o que alguien te lleve ahora. Que te valore un médico antes de volver a entrenar. Si pierdes la consciencia o tienes una convulsión, es 112 directo.',
  },
  {
    id: 12,
    categoria: 'neurologico',
    nivel: 'critico',
    titulo: 'Convulsión o pérdida de consciencia',
    disparadores: ['he tenido una convulsión mientras entrenaba y me he mordido la lengua'],
    patrones: [
      /convulsion|ataque epileptico|epilepsia/,
      /me he (desmayado|desmayo|desmayad)/,
      /(perdida|perder) (de |la )?(conciencia|conocimiento)/,
      /me he despertado en el suelo/,
      /(espasmos|sacudidas|tirones) (involuntarios|en el suelo|del cuerpo)/,
      /me (mordi|mordido|morde) (la )?lengua/,
    ],
    recurso: '112 · emergencias · urgencias · neurólogo o médico (valoración antes de retomar)',
    mensaje:
      'Una convulsión o un desmayo se atienden en urgencias: llama al 112 y no te quedes solo. Después, que te valore un neurólogo o tu médico antes de retomar el entrenamiento. BAYONA pausa todo lo demás hasta que eso ocurra.',
  },
  {
    id: 13,
    categoria: 'musculoesqueletico',
    nivel: 'alto',
    titulo: 'Sospecha de fractura o lesión grave',
    disparadores: ['me he torcido el tobillo, ha crujido fuerte y no puedo apoyar el pie'],
    patrones: [
      /(fractura|me he roto|creo que (me )?he roto|roto (un )?hueso)/,
      /(hueso (fuera|visible|asomando)|deformidad)/,
      /no (puedo|consigo) (apoyar|pisar|sostener|agarrar|usar)/,
      /(cruje|crujio|crujido|hizo un crujido)/,
      /(hinchad|hinchazon|se (ha )?puesto) (como un globo|enorme|azul|morado)/,
      /(se me|me) (ha )?puesto (azul|morado|como un globo)/,
    ],
    recurso: 'urgencias o centro de salud · médico · 112 · emergencias si la deformidad es evidente · fisioterapeuta (después)',
    mensaje:
      'Suena a lesión importante: no cargues esa zona ni la pruebes a ver si duele. Ve hoy a urgencias o a tu centro de salud para que un médico la valore con las pruebas que hagan falta. La vuelta al entrenamiento la marcan después tu médico y un fisioterapeuta.',
  },
  {
    id: 14,
    categoria: 'musculoesqueletico',
    nivel: 'critico',
    titulo: 'Dolor de espalda con banderas rojas',
    disparadores: ['me duele la espalda baja y se me ha dormido la entrepierna, no controlo el pis'],
    patrones: [
      /(no controlo|no (me )?siento|se me (ha )?dormido|adormecido|hormigueo|perdida de (fuerza|sensibilidad)).{0,40}(pierna|entrepierna|gluteo|esfinter|orina|pis|heces|zona intima)/,
      /(espalda|lumbar|cintura|columna).{0,40}(no controlo|orinar|pis|heces|hormigueo|adormecido|se me duerme)/,
      /no (puedo|consigo) (orinar|hacer (pis|caca))|retencion (de )?(orina|urinaria)/,
      /sindrome de la cola de caballo/,
    ],
    recurso: '112 · emergencias · urgencias · valoración médica inmediata',
    mensaje:
      'Esto es una alarma real: perder fuerza o control en piernas, orina o deposiciones con dolor de espalda se atiende en urgencias. Llama al 112 o ve ahora mismo. No entrenes, no te manipules la espalda y espera a que te vea un médico.',
  },
  {
    id: 15,
    categoria: 'musculoesqueletico',
    nivel: 'moderado',
    titulo: 'Latigazo cervical o golpe de cuello',
    disparadores: ['hoy he tenido un golpe de coche y me duele el cuello, no puedo girarlo'],
    patrones: [
      /latigazo/,
      /(golpe|accidente|colision|choque|coche).{0,30}(cuello|nuca)/,
      /(cuello|nuca).{0,30}(accidente|coche|latigazo)/,
      /(no puedo|me cuesta) girar (el )?(cuello|cabeza)/,
      /rigidez (de|en) (cuello|nuca)/,
    ],
    recurso: 'tu médico (hoy o mañana) · 112 · emergencias si hay brazos o piernas dormidos, mareo o fiebre',
    mensaje:
      'Un golpe de cuello tras un accidente se revisa aunque parezca leve: pide cita con tu médico hoy o mañana. Si aparecen brazos o piernas dormidos, mareo o fiebre, ve a urgencias (112). Hasta la revisión, sin cargas sobre el cuello.',
  },
  {
    id: 16,
    categoria: 'musculoesqueletico',
    nivel: 'alto',
    titulo: 'Luxación o articulación fuera de sitio',
    disparadores: ['creo que me he salido el hombro, se me ve fuera de sitio y me duele mucho'],
    patrones: [
      /(hombro|rodilla|cadera|dedo|mandibula).{0,25}(fuera de sitio|descolocado|luxado|desparramad|me (lo )?he (salido|dislocado))/,
      /me (he|han) (salido|dislocado) (el |la |un |una )?(hombro|rodilla|cadera|dedo|brazo|pierna)/,
      /me (salio|sale|ha salido|ha vuelto a salir) (el |la |un |una )?(hombro|rodilla|cadera|dedo|brazo|pierna)/,
      /(hombro|rodilla|cadera).{0,20}(se sale|me sale|salio|ha salido)/,
      /luxacion|dislocacion|articulacion fuera de sitio/,
    ],
    recurso: 'urgencias · médico · fisioterapeuta junto a tu médico (vuelta al entrenamiento)',
    mensaje:
      'Una articulación fuera de sitio no se coloca en casa: ve a urgencias para que la revise un médico. Mantén la zona quieta y no la fuerces. Después, la vuelta al entrenamiento la marca un fisioterapeuta junto a tu médico.',
  },
  {
    id: 17,
    categoria: 'embarazo-menor',
    nivel: 'alto',
    titulo: 'Embarazo',
    disparadores: ['estoy embarazada de 14 semanas, ¿puedo seguir entrenando?'],
    patrones: [
      /embarazad|embarazo/,
      /(esperando|espero) (un|una) (bebe|criatura)/,
      /gestante|semanas de embarazo/,
      /estoy de \d+ (semanas|meses)/,
      /semanas (de )?(gestacion|embarazo)/,
    ],
    recurso: 'matrona o ginecólogo · valoración profesional para el ejercicio en el embarazo',
    mensaje:
      'Felicidades. Con embarazo, el ejercicio se adapta con criterio profesional: pide a tu matrona o ginecólogo una valoración, cuéntame qué te dicen y ajustamos el entrenamiento a eso. Mientras tanto, no empieces nada nuevo ni intenso.',
  },
  {
    id: 18,
    categoria: 'embarazo-menor',
    nivel: 'alto',
    titulo: 'Posparto',
    disparadores: ['acabo de parir hace tres semanas y quiero volver a ponerme en forma'],
    patrones: [
      /acabo de parir|acabo de tener|recien parid/,
      /hace (poco|semanas|meses) (que )?(di a luz|pari|tuve a)/,
      /posparto|postparto/,
      /diastasis/,
      /(suelo pelvico|perine).{0,30}(parir|parto|embarazo|posparto)/,
      /cesarea (reciente|hace|de hace)/,
    ],
    recurso: 'matrona · fisioterapeuta de suelo pélvico · médico',
    mensaje:
      'Volver a entrenar tras parir tiene su tiempo y su criterio: consulta con matrona o fisioterapeuta de suelo pélvico antes de retomar impactos o cargas. Tráeme lo que te digan y construimos desde ahí. Tu personaje puede esperar; tu cuerpo no es un plazo de entrega.',
  },
  {
    id: 19,
    categoria: 'embarazo-menor',
    nivel: 'alto',
    titulo: 'Menor de edad',
    disparadores: ['tengo 14 años, ¿me puedes hacer una dieta para perder peso?'],
    patrones: [
      /tengo (8|9|1[0-7]) an[ñn]?os/,
      /soy (un |una )?(menor|adolescente)|menor de edad/,
      /(mi|nuestra) (hija|hijo) (tiene|de) (8|9|1[0-7])/,
      /(dieta|plan|rutina|entrenamiento|nutricion) (para|de) (mi hija|mi hijo|un menor|una menor|adolescentes)/,
    ],
    recurso: 'pediatra · dietista-nutricionista · madres, padres o tutores (siempre)',
    mensaje:
      'Con esa edad, ninguna app debería darte una dieta ni un plan a solas: esto lo llevan tu pediatra o un dietista-nutricionista, siempre con tus madres, padres o tutores. Ellos deciden; BAYONA acompaña. Si quieres, cuéntame qué te preocupa de tu cuerpo y lo hablamos sin cifras ni culpa.',
  },
  {
    id: 20,
    categoria: 'alimentario',
    nivel: 'alto',
    titulo: 'Vómito provocado o purgas',
    disparadores: ['me provoco el vómito después de comer para no engordar'],
    patrones: [
      /me (provoco|induzco|hago) (el )?(vomito|vomitar)/,
      /provocarme (el )?vomito/,
      /vomito (a proposito|despues de (comer|cada comida|las comidas|casi siempre)|tras (comer|las comidas)|para (no engordar|adelgazar|compensar))/,
      /(hacerme|me) (purgar|purgo)/,
      /me (introduzco|meto) (los |las )?dedos (en|por) (la )?(boca|garganta)/,
    ],
    recurso: 'psicólogo con experiencia en conducta alimentaria · médico · 112 · emergencias si hay sangre, desmayo o dolor de pecho',
    mensaje:
      'Provocarse el vómito hace daño de verdad y no es una cuestión de fuerza de voluntad: necesita apoyo de un profesional. Pide cita esta semana con un psicólogo con experiencia en conducta alimentaria y con un médico. Si te desmayas, te duele el pecho o vomitas sangre, es 112. Aquí no vas a encontrar culpa, solo compañía.',
  },
  {
    id: 21,
    categoria: 'alimentario',
    nivel: 'alto',
    titulo: 'Ayuno extremo o ingesta mínima',
    disparadores: ['llevo tres días sin comer casi nada, solo agua'],
    patrones: [
      /(llevo|desde hace|hace) .{0,25}(sin comer|sin probar bocado|comiendo (casi |muy )?nada)/,
      /no (como|he comido) (nada )?(en|desde hace|hace) .{0,15}(dias|noches|semanas)/,
      /ayuno (total|extremo|prolongado|de \d+ dias)/,
      /(comiendo|como) (nada|menos de \d+|una (manzana|pieza) al dia)/,
    ],
    recurso: 'tu médico (hoy o mañana) · dietista-nutricionista · 112 · emergencias si hay desmayo, dolor de pecho o confusión',
    mensaje:
      'No comer en días no es disciplina: es una urgencia que se mira con un médico pronto. Pide cita hoy o mañana; si te desmayas, te duele el pecho o tienes confusión, es 112. BAYONA no te da menús ni cifras mientras no te acompañe un dietista-nutricionista.',
  },
  {
    id: 22,
    categoria: 'alimentario',
    nivel: 'alto',
    titulo: 'Laxantes o diuréticos para adelgazar',
    disparadores: ['me estoy tomando laxantes para adelgazar porque me siento hinchada'],
    patrones: [
      /laxante/,
      /diuretico/,
      /(pastillas|productos|suplementos) (para|de) (adelgazar|ir al bano|expulsar)/,
      /(me|voy a) (tomar|usar|comprar) (laxantes|diureticos|pastillas para adelgazar)/,
    ],
    recurso: 'tu médico · dietista-nutricionista con experiencia en conducta alimentaria · urgencias si hay debilidad, mareos o palpitaciones',
    mensaje:
      'Los laxantes o diuréticos para adelgazar no son un atajo: castigan el cuerpo y eso se deja con acompañamiento. Habla esta semana con tu médico y con un dietista-nutricionista con experiencia en conducta alimentaria. Si tienes debilidad, mareos o palpitaciones, ve a urgencias hoy.',
  },
  {
    id: 23,
    categoria: 'sustancias',
    nivel: 'alto',
    titulo: 'Dopaje o anabolizantes',
    disparadores: ['¿qué esteroides me recomiendas para ganar masa rápido?'],
    patrones: [
      /esteroides?|anabolicos?/,
      /(testosterona|hormona del crecimiento|hgh)/,
      /(dianabol|trembolona|estanozolol|turinabol|nandrolona|winstrol|clembuterol)/,
      /dopaj|doparme/,
      /(ciclo|dosis) (de|con) (esteroides|anabolicos|hormonas)/,
      /(sustancias|productos) (para|de) (ganar (mas|musculo|volumen)|dopar)/,
    ],
    recurso: 'médico (endocrino o deportivo) · sin juzgar · 112 · emergencias si hay dolor de pecho, mareo intenso o cambios bruscos',
    mensaje:
      'No voy a orientarte sobre esteroides ni hormonas: es una decisión médica con riesgos reales y quien puede hablarlo contigo es un médico, un endocrino o un médico deportivo, sin juzgarte. Si ya los estás usando, díselo a ese profesional: es información clave para cuidarte.',
  },
  {
    id: 24,
    categoria: 'sustancias',
    nivel: 'moderado',
    titulo: 'Estimulantes o preentrenos de riesgo',
    disparadores: ['¿me puedo tomar un preentreno con efedrina para rendir más?'],
    patrones: [
      /efedrina|efedrin/,
      /preentreno/,
      /estimulantes?/,
      /anfetamin|speed|cocaina|metanfetamin/,
      /quemagrasas?|termogenico/,
      /(sustancias|pastillas|productos) para (rendir( mas)?|estar (mas )?(activo|despierto|con energia))/,
    ],
    recurso: 'médico (antes de usar nada para rendir) · 112 · emergencias si hay palpitaciones, dolor de pecho o mareo',
    mensaje:
      'Sustancias como la efedrina o mezclas de preentreno no son un juego: suben el riesgo cardiovascular y eso no lo maneja un chat. Consulta con un médico antes de usar nada para rendir. Si notas palpitaciones, dolor de pecho o mareo, deja el entrenamiento y ve a urgencias.',
  },
  {
    id: 25,
    categoria: 'farmacologico',
    nivel: 'alto',
    titulo: 'Ajuste de medicación por cuenta propia',
    disparadores: ['¿cuánta insulina me pongo antes de entrenar?'],
    patrones: [
      /(cuanta|cuanto|que cantidad|que medida) .{0,25}(insulina|medicacion|pastilla|comprimido|antihipertensivo)/,
      /(cuanto|cuanta|cuando) me (pongo|tomo|subo|bajo|quito) (de )?(insulina|medicacion|pastillas)/,
      /(ajustar|ajusta|ajusto|cambiar|cambio|modificar) (la |el |los |mis )?(insulina|medicacion|tratamiento|pastillas|antihipertensivos)/,
      /(me subo|me bajo|me quito|me pongo|me mando) (mas|menos|una|otra|el|la) (insulina|medicacion|pastilla|comprimido)/,
      /puedo (tomarme|tomar|ponerme) (mas|menos|una|otra) (insulina|medicacion|pastilla|comprimido)/,
      /(insulina|medicacion) (antes|despues|durante) (de )?(entrenar|el entrenamiento|la sesion|correr)/,
    ],
    recurso: 'tu médico o endocrino · centro de salud · 112 · emergencias ante mareo, sudor frío o confusión',
    mensaje:
      'La cantidad de insulina o de cualquier medicación la decide tu médico, nunca un chat: no la ajustes por tu cuenta. Pregunta en tu centro de salud o a tu endocrino y trae la respuesta aquí para adaptar el entrenamiento a ella. Si tienes mareos, sudor frío o confusión, es 112.',
  },
  {
    id: 26,
    categoria: 'farmacologico',
    nivel: 'alto',
    titulo: 'Abandonar un tratamiento para competir',
    disparadores: ['quiero dejar los ansiolíticos para poder competir sin problemas'],
    patrones: [
      /(quiero|voy a|puedo|debo) (dejar|dejo|quitar|suspender|abandonar|cortar) (la |el |los |mis )?(medicacion|tratamiento|pastillas|ansioliticos|psicofarmacos|antidiabeticos|antihipertensivos|antidepresivos)/,
      /(dejar|sin|quitarme) (la |los |el )?(medicacion|tratamiento|pastillas) (para|por) (competir|entrenar|las pruebas|el torneo)/,
      /competir sin (medicacion|pastillas|tratamiento)/,
      /(me han|quieren|quiero que me) (quit(ar|en|e)) (la |el )?(medicacion|tratamiento)/,
    ],
    recurso: 'quien te recetó la medicación · médico deportivo · psicólogo o psiquiatra si es medicación de salud mental',
    mensaje:
      'Dejar un tratamiento para competir es una decisión de tu médico, no una meta deportiva: no lo suspendas por tu cuenta. Pide cita con quien te lo recetó o con un médico deportivo, y si es medicación de salud mental, también con tu psicólogo o psiquiatra. Con ese criterio ajustamos tu calendario.',
  },
  {
    id: 27,
    categoria: 'farmacologico',
    nivel: 'critico',
    titulo: 'Ingesta masiva de medicación',
    disparadores: ['me he tomado todas las pastillas que tenía en casa'],
    patrones: [
      /me (he )?tomad[oa] (todas|demasiadas|un punado|media caja|el bote)/,
      /(he|me) (bebido|tomado) (la botella|el bote|todo el envase|demasiadas pastillas)/,
      /sobredosis|intoxicaci/,
      /(pastillas|medicamentos|comprimidos) (para|de) (acabar|quitarme|morir)/,
      /(he|me he) mezclad[oa] (pastillas|medicamentos|farmacos|alcohol con pastillas)/,
      /ingerido (demasiadas|pastillas|medicamentos)/,
    ],
    recurso: '112 · emergencias · urgencias · 024 · línea de atención a la conducta suicida (España, 24 h)',
    mensaje:
      'Esto es una emergencia médica: llama al 112 ahora mismo o que alguien te lleve a urgencias. Si puedes, di qué has ingerido y cuándo, sin inventar cifras. Quédate acompañado hasta que llegue la ayuda; en España también puedes llamar al 024 si hay deseo de hacerte daño.',
  },
  {
    id: 28,
    categoria: 'infeccioso-metabolico',
    nivel: 'moderado',
    titulo: 'Fiebre o infección activa',
    disparadores: ['tengo 39 de fiebre y la gripe me ha tumbado, ¿entreno igual?'],
    patrones: [
      /fiebre|calentura/,
      /\b3[89] (grados|de fiebre)/,
      /infeccion/,
      /(gripe|covid|neumonia|angina|bronquitis)/,
      /antibioticos?/,
    ],
    recurso: 'tu médico o centro de salud · 112 · emergencias si falta el aire, duele el pecho o hay confusión',
    mensaje:
      'Con fiebre o infección, el descanso es el entrenamiento de hoy: no se entrena. Si la fiebre dura más de tres días, te falta el aire, te duele el pecho o empeoras, ve a tu médico o a urgencias (112 si es grave). BAYONA registra el parón como parte del plan, no como fracaso.',
  },
  {
    id: 29,
    categoria: 'infeccioso-metabolico',
    nivel: 'alto',
    titulo: 'Glucosa fuera de rango (diabetes)',
    disparadores: ['tengo la glucosa por las nubes y me siento mareado'],
    patrones: [
      /glucosa/,
      /azucar (muy |demasiado )?(alta|baja|descontrolada|por las nubes)/,
      /hiperglucemia|hipoglucemia|coma diabetico/,
      /(diabetes|diabetico|diabetica)/,
      /(insulina).{0,25}(baja|alta|mareo|desmayo|mal)/,
    ],
    recurso: 'tu médico o endocrino · 112 · emergencias ante confusión, sudor frío, temblor o falta de mejora',
    mensaje:
      'Con la glucosa fuera de rango y mareo, el entrenamiento se para. Si hay confusión, sudor frío, temblor o no mejoras, es 112. Que lo revise tu médico o tu endocrino; aquí ajustamos el ejercicio a lo que ellos digan, no al revés. No cambies por tu cuenta nada de tu medicación.',
  },
  {
    id: 30,
    categoria: 'cronico-oncologico',
    nivel: 'alto',
    titulo: 'Tratamiento oncológico o inmunodepresión',
    disparadores: ['estoy en quimioterapia y quiero mantenerme fuerte, ¿qué hago?'],
    patrones: [
      /quimio|quimioterapia|radioterapia/,
      /(cancer|tumor|linfoma|leucemia|metastasis)/,
      /oncolog/,
      /inmunodeprimid|trasplantad/,
      /(estoy|voy) (en|a) (tratamiento|sesiones) (oncologico|de quimio|de radioterapia)/,
    ],
    recurso: 'oncólogo o médico · permiso escrito o pauta para el ejercicio · 112 · emergencias si hay dolor de pecho, fiebre o falta de aire',
    mensaje:
      'Durante un tratamiento oncológico, el ejercicio puede ayudar, pero solo con el visto bueno de tu oncólogo o de tu médico. Pídeles una pauta y la respetamos al detalle; mientras tanto, solo lo que ellos autoricen. Estoy contigo en esto.',
  },
];

// ------------------------------------------------------------
// API PÚBLICA
// ------------------------------------------------------------

/**
 * Detecta riesgo en un texto del usuario (nunca diagnostica: solo clasifica
 * para derivar). Devuelve el escenario más urgente emparejado.
 * @param {string} texto
 * @returns {{riesgo:boolean, categoria:string|null, escenarioId:number|null, nivel:string|null, titulo:string|null, coincidencias:number[]}}
 */
export function detectarRiesgo(texto) {
  const vacio = { riesgo: false, categoria: null, escenarioId: null, nivel: null, titulo: null, coincidencias: [] };
  const t = norm(texto);
  if (!t.trim()) return vacio;
  const hits = ESCENARIOS.filter((e) => e.patrones.some((re) => re.test(t)));
  if (!hits.length) return vacio;
  hits.sort((a, b) => (RANK[a.nivel] - RANK[b.nivel]) || (a.id - b.id));
  const best = hits[0];
  return {
    riesgo: true,
    categoria: best.categoria,
    escenarioId: best.id,
    nivel: best.nivel,
    titulo: best.titulo,
    coincidencias: hits.map((h) => h.id),
  };
}

/**
 * Respuesta del CORE para un escenario: SIEMPRE derivación profesional.
 * @param {number} escenarioId
 * @returns {{mensaje:string, recurso:string, esDerivacion:true, escenarioId:number|null, categoria:string|null, nivel:string|null, titulo:string|null, generico:boolean}}
 */
export function respuestaDerivacion(escenarioId) {
  const e = ESCENARIOS.find((x) => x.id === escenarioId);
  if (!e) {
    return {
      mensaje: FALLBACK.mensaje,
      recurso: FALLBACK.recurso,
      esDerivacion: true,
      escenarioId: null,
      categoria: null,
      nivel: null,
      titulo: null,
      generico: true,
    };
  }
  return {
    mensaje: e.mensaje,
    recurso: e.recurso,
    esDerivacion: true,
    escenarioId: e.id,
    categoria: e.categoria,
    nivel: e.nivel,
    titulo: e.titulo,
    generico: false,
  };
}

/**
 * Atajo para el CORE: texto → {deteccion, respuesta}.
 * Si no hay riesgo, respuesta es null (el chat sigue con normalidad).
 * @param {string} texto
 */
export function protegerDialogo(texto) {
  const deteccion = detectarRiesgo(texto);
  return {
    deteccion,
    respuesta: deteccion.riesgo ? respuestaDerivacion(deteccion.escenarioId) : null,
  };
}
