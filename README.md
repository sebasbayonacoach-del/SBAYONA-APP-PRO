# BAYONA — Avatar-Centered Fitness Life RPG

> **CUIDAR A TU PERSONAJE ES CUIDARTE A TI.**
> **BAYONA vive alrededor del personaje.**

Videojuego fitness 3D donde tu avatar es el centro de la experiencia:
tú entrenas → él entrena, tú comes → él come, tú bebes → él bebe.
El avatar es un **gemelo de comportamiento**, no una mascota.
**Todo lo visible al usuario está en español (es-ES).**

## ✨ v10 · LUXE (landing pública nivel motionsites.ai)

La app era software denso y correcto; le faltaba **puerta de venta**. v10 añade
una landing pública cinematográfica —dark `#080a0c` + glass + grain + aurora—
**sin tocar ni un píxel del panel PRO** que ya funciona:

- **`css/luxe.css`** — tokens dark premium (`--luxe-*`), nav sticky glass con
  `backdrop-filter`, hero 48–64px con `letter-spacing: -.04em`, bento grid de
  12 columnas, planes y FAQ. Se carga ENTRE `aurum.css` y `pro.css`: **PRO
  sigue siendo la última hoja y manda dentro de `#drawer`** (probado:
  `tests/pro-ui-eval.mjs` sigue en verde).
- **`js/ui/landing.js`** — el contenido es **puro y catalogado**: todo el
  texto vive en `js/i18n.js` (`luxe.*`, 41 claves), el HTML se genera con
  `esc()` y el reveal usa `IntersectionObserver` con fallback. Sin datos,
  sin inventar nada — igual que el resto de la app.
- **`js/ui/landing-boot.js`** — decide: usuario nuevo → landing visible y
  `#entry` apagada (`body.luxe-activo`); usuario recurrente → sin landing,
  arranque v9 intacto. Al pulsar ENTRAR retira la capa y cede el control.
- **SEO/OG completos** en `index.html`: `description`, `og:title/description/
  image/locale`, `twitter:card` — la app ya tiene preview al compartir.
- **PWA y empaquetado**: `manifest` con fondo luxe `#080a0c`, `robots.txt`,
  `sitemap.xml`, y `sw.js` **v21** precacheando `luxe.css`, `landing.js` y
  `landing-boot.js` (de uno en uno, como siempre).
- **`tests/luxe-eval.mjs` (82 comprobaciones)** — SEO presente, alcance de
  la capa (NO pisa `#drawer-body`, `.btn` ni `.card`), pureza de `landing.js`
  (sin `localStorage`), las 41 claves en el catálogo, decisiones del boot,
  precache v21 y archivos de marketing (`robots`, `sitemap`, manifest).

**Lo que NO hace, y lo dice**: la landing no recoge emails ni falsifica
métricas — las cifras del hero (`100% local · 0 datos vendidos · 75 suites`)
son reales y verificables. El CTA entra al onboarding real; no hay demo
falsa.

## ✨ v9 · TECLADO (paleta de comandos ⌘K, atajos directos y foco que no se escapa)

Lo que separa un juguete de un software no es el color: es que **se pueda
usar entero sin tocar el ratón**. Esta versión añade la capa de teclado
completa, sin quitar nada de lo anterior.

- **`js/comandos.js`** — el núcleo **puro** (sin DOM): normalizar lo que se
  escribe (minúsculas, sin tildes, sin espacios de más), puntuar cada
  comando (exacto > prefijo > palabra > alias > contiene > difusa), decidir
  qué sale y en qué orden, mover el cursor dando la vuelta y **comprobar si
  un evento de teclado es «ese» atajo**. Al vivir fuera del DOM se puede
  probar en Node: un criterio de búsqueda escrito dentro de la interfaz no lo
  podría comprobar nadie.
- **`js/ui/command.js`** — la paleta: `⌘K` / `Ctrl+K` (el símbolo se decide
  según la plataforma), `↑` `↓` `Inicio` `Fin` `Enter` `Esc`, y el foco
  vuelve **al control que la abrió** al cerrarse. Es un `combobox` de
  verdad: `aria-activedescendant` dice qué fila está marcada y cada fila es
  un `role="option"`.
- **Busca socios de verdad**: escribir «paola» o un teléfono ofrece la ficha
  de esa persona y Enter la abre. Se acabó buscar en la lista de socios.
- **Atajos directos**: `Alt+1`…`Alt+6` saltan al raíl, en el mismo orden en
  el que se ve. Se reconocen por `event.code`, porque en Mac `Alt+1` no
  entrega la tecla «1» sino «¡».
- **Hoja de atajos con `?`** — generada **a partir del registro**: no hay
  ninguna lista escrita a mano que se pueda quedar vieja.
- **Foco atrapado** (`trapFoco` en `js/ui/shared.js`): el `Tab` no se sale del
  modal ni de la paleta hacia la página que hay detrás. Antes, `Escape` solo
  cerraba el modal; ahora cierra lo que esté abierto y devuelve el foco.
- Un atajo **suelto** («?») no salta mientras se escribe en un campo, y
  encima de un modal abierto no se apila otra capa.

**`tests/paleta-eval.mjs` (143 comprobaciones)** vigila lo que se puede
comprobar sin navegador: la búsqueda con tildes y mayúsculas, el orden de los
resultados, que un atajo no salte de más, que las filas que se pintan llevan
su ARIA, que el foco no se escape, que los dos ficheros nuevos estén en el
precache y que ninguna palabra de la paleta viva fuera del catálogo.

## ✨ v8 · CENTRO (gestión de gimnasio: socios, cuotas, agenda, puerta, portal e informes)

Lo que se ha añadido encima, **sin quitar nada de lo que había**:
un centro de mando para el gimnasio. Socios, membresías, cuotas, deuda,
agenda con aforo, control de acceso con código y bloqueo por impago, el
portal que ve el propio socio, informes del mes y una cola de avisos
para trabajar. Todo con índice: seis secciones, como en cualquier
software de gestión.

- **`js/gym/model.js`** — el dominio **puro** (sin DOM ni `localStorage`):
  `nuevoSocio` · `nuevoPlan` · `cuotasDe` · `deudaDe` · `diasDeMora` ·
  `finDeMembresia` · `nuevaClase` · `puedeReservar` · `reservar` ·
  `cancelarReserva` · `registrarAcceso` · `visitasDe` · `riesgoBaja` · `kpis`.
- **`js/gym/store.js`** — persistencia en su **PROPIA clave**
  (`bayona.centro.v1`): los datos de otras personas no se mezclan con la
  partida del atleta. Lleva **anillo de seguridad propio** (5 instantáneas) y
  recorte por cuota que suelta **accesos y reservas viejas, nunca la lista
  de socios**.
- **`js/gym/acceso.js`** — la puerta: `codigoAcceso` (8 caracteres de un
  alfabeto sin `0/O/1/I/L`, determinista por socio), `normalizaCodigo`,
  `socioPorCodigo`, `validarAcceso` y `avisosPendientes`. El dominio
  devuelve **códigos de motivo**, nunca frases: el texto vive en
  `js/i18n.js` (`gym.rechazo.*`).
- **`js/gym/informes.js`** — `facturacionMensual` · `asistenciaDiaria` ·
  `ocupacionClases` · `watchlist` · `morosos` · `resumenMensual` · `aCSV`.
  Cifras de registros reales; sin datos sale 0, nunca una estimación.
- **`js/ui/centro.js` · `cuotas.js` · `agenda.js` · `acceso.js` · `portal.js` · `informes.js`** —
  las seis pantallas, en el mismo lenguaje PRO (filetes de 1 px, filas de
  28 px, cifras tabulares; el color solo para el estado).

**La puerta** (`PUERTA`): se teclea el código y la app dice SÍ o NO **con el
motivo**, nunca en silencio. Bloquea por deuda vencida, por baja y por pausa;
quien atiende puede **deferir** la entrada y queda la visita fichada. Honesto
por escrito dentro de la app: el código es una credencial de puerta, no
criptografía, y se valida en el dispositivo; un torniquete real (QR, pulsera,
lector facial) es un proyecto de hardware aparte, y aquí está la **decisión y
el código** que el lector leería.

**El portal del socio** (`PORTAL DEL SOCIO`): lo que ve quien se apunta, no lo
que ve el entrenador. Su membresía, su código, su programa de entrenamiento,
sus reservas (apuntar y cancelar), su historial de visitas y las notas del
entrenador. Se entra desde la ficha de cada socio.

**Los informes** (`INFORMES`): el mes en cifras (cobrado, ticket medio,
visitas, socios activos y altas), la facturación de los últimos 6 meses, la
asistencia de 14 días, la ocupación de las clases que vienen, **a quién llamar
hoy** con su riesgo y sus motivos, los morosos con sus días de mora, y
exportación a **CSV** (socios, cobros y accesos) que se genera en el
dispositivo y no se sube a ningún servidor.

**La cola de avisos** (`AVISOS PENDIENTES`): impago, inactividad real (14 días
sin visitas) y membresía por vencer (≤ 7 días), cada uno explicando **de
dónde sale** el aviso. Sin proveedor de SMS o correo, la app **genera el
texto y lo copias**: no finge que ha avisado a nadie.

**Las reglas que no se negocian** (214 comprobaciones en `tests/gym-eval.mjs`):

| Regla | Qué evita |
|---|---|
| No se sobrevende una clase | Clases con más reservas que aforo |
| No se repite ni se solapa | Un socio en dos clases a la vez, o dos veces en la misma |
| La deuda nunca es negativa | Pagar de más es saldo a favor, no deber −40 € |
| «Vencido» es dinero vencido, no periodos caducados | Bloquear en la puerta a quien ya pagó el año |
| El bloqueo **siempre** dice por qué | Alguien rechazado sin explicación en la cara |
| El aviso **nunca** se da por enviado | Decir que has avisado sin haber avisado |
| El riesgo **siempre** explica sus motivos | Un número sin razones es adivinar |
| Sin registros **no** se inventa riesgo | Un socio nuevo no es «riesgo alto» por azar |
| Baja o pausa bloquea la reserva y el acceso | Alguien que dejó el centro no entra |
| Cuota llena → se sueltan accesos, no socios | Perder la ficha de un cliente |
| El CSV escapa `;` y comillas | Una columna partida al abrirlo en Excel |

**Lo que NO hace, y dice que no hace**: no confirma pagos sola. No predice
bajas con una caja negra: el riesgo sale de reglas explicables sobre registros
reales, y cada punto dice qué señal lo ha subido. Sin `OPENAI_API_KEY`, todo
el centro funciona igual: no depende de la nube.

### 💳 Cobro por enlace de pasarela

Una PWA estática no tiene servidor, y **una pasarela confirma un cobro con un
webhook**: algo tiene que recibir esa petición. Sin servidor, la confirmación
automática no es posible. Decirlo de otra forma sería inventar.

Lo que sí se puede, y es lo que hace el software de verdad:

1. El gimnasio pega, **en su plan**, el enlace de pago que ya tiene creado en
   su pasarela (Mollie, Stripe Payment Links, SumUp…). Ese enlace es público
   por diseño — es la página de cobro, no una clave — así que puede vivir en el
   cliente sin riesgo.
2. La app **abre ese enlace**: el socio paga en la página de su banco, con
   SEPA, Bizum o tarjeta.
3. Quien atiende **registra la referencia** que le ha dado la pasarela. La app
   guarda de dónde vino cada euro (`pago.pasarela`, `pago.referencia`).

El enlace se valida antes de guardarse: `javascript:`, `data:`, `vbscript:`,
`file:` y las URLs sin host se rechazan. Un QR o un correo malicioso no puede
dejar un `javascript:` esperando a que alguien pulse «Cobrar». **Ningún cobro
se marca nunca como automático** — sin webhook, la app no miente.

**`tests/arranque-eval.mjs` (23 comprobaciones)** existe porque en CI no hay
navegador: enlaza todo el grafo de módulos que carga `index.html` y comprueba
que no hay rutas rotas, exports perdidos, precache incompleto ni secciones sin
pantalla. Lo que **no** comprueba —y lo dice— es que la app se pinte bien.

Esa prueba ya ha encontrado dos fallos reales que llevaban meses en producción:

- **`js/ui.js` importaba `../gym/store.js`** en vez de `./gym/store.js`: un 404
  en cada carga de la app.
- **El precache del service worker pedía 3 ficheros que no existen** y usaba
  `cache.addAll()`, que es todo o nada: la instalación fallaba y **la PWA se
  quedaba sin offline sin decir nada**. Ahora cachea de uno en uno y el test
  vigila que el precache esté entero.

## ✨ v7 · PRO (lenguaje de software, no de cartel)

«Esta app se ve fea» no es una opinión: es un defecto de sistema. Las
decisiones anteriores (botones de 48 px, títulos de 42 px, sombras difusas,
cartas de 22 px de radio, naranja en todo) hacían que BAYONA se leyera como
una landing de gimnasio. **`css/pro.css` se carga el último y manda sobre
todas las capas anteriores**: es el aspecto real de la app.

- **Neutro.** Fuera el naranja: papel `#f6f6f7`, tinta `#15171c`, filetes de
  1 px. **El acento es el propio negro** (botón negro sobre papel). El color
  solo informa: verde va bien, ámbar ojo, rojo para.
- **Denso.** Botones de **30 px**, filas de 28, tipografía de 12-14 px, cifras
  tabulares alineadas. Nada de botones gigantes ni círculos de 220 px.
- **Plano.** Cero sombras y cero cristal esmerilado. Un borde de 1 px separa
  mejor y no ensucia con 40 tarjetas. La única sombra de la app es el modal,
  que sí flota.
- **Caja oracionaria.** Los textos venían en MAYÚSCULAS desde el HTML; ahora
  los títulos pasan por `capitalize`. Las mayúsculas se quedan solo donde son
  etiquetas.- **Sin romper nada.** `css/dashboard.css` sigue siendo dueña de la rejilla del tablero (su contrato con el JS no se toca): PRO solo la pisa por cascada. Y que «la pisa» está **probado**, no supuesto: `tests/pro-ui-eval.mjs` resuelve la cascada a mano (especificidad + orden de carga) y exige que, para 12 elementos clave (botón, tarjetas, menú, modal, campos, cifras del tablero…), la declaración ganadora sea de `pro.css`.
- **La puerta deja de ser un cartel.** La portada tenía dos píldoras CINE/NOCHE y un titular de 100 px: ahora es una frase y **un botón**. El cambio de luz vive donde se decide (Apariencia y el HUD), no en la puerta.

Y la otra mitad del encargo: **la IA asigna rutinas y el alumno las ve**.

- **`assign_routine`** entra en la allowlist cerrada del coach (7 herramientas).
  El modelo solo puede pedir una sesión **del catálogo** (`enum` con los 5 ids
  reales), y la interfaz la valida con `validaAsignacion` antes de escribir.
- **Sin nube también funciona**: el motor local detecta «asigname fuerza
  superior» / «programa pierna» / «quiero hacer movilidad hoy» y propone la
  rutina en una tarjeta. Preguntar *por qué* no asigna nada, y **nada se escribe
  sin que alguien pulse el botón**.
- **El alumno lo ve como una orden de trabajo**: quién lo asignó, desde cuándo,
  qué sesión, la nota y un botón para abrirla. `origen` y `autor` viajan en la
  asignación: ninguna rutina es anónima.

## ✨ v6 · RED DE SEGURIDAD DEL PROGRESO (tu partida no se pierde)

«¿Cómo vas a segurar el progreso?» Una partida vive en `localStorage`, y
`localStorage` se puede vaciar (limpiar datos del navegador, modo privado,
cuota llena, un guardado a medias). Antes de v6, una sola escritura rota
significaba empezar de cero: semanas de racha, XP y récords, evaporadas.
No hay red debajo de eso.

- **`js/backup.js`** — **anillo de 8 instantáneas** (`bayona.backup.v1`).
  - `guardarSeguro()` en cada guardado; si la cuota está llena, **recorta en
    este orden**: notas de voz → diario de viaje → historial → log de series.
    Se sueltan los datos prescindibles **antes** que perder la partida.
  - `recuperar()` — si la partida principal no parsea, se carga la última
    instantánea legible en vez de arrancar de cero (emite `storage-recovered`).
  - `restaurar()` · `previsualizar()` · `diagnostico()` — y
    `vigilarOtraPestana()`, que detecta que otra pestaña reescribió la partida.
- **`js/state.js`** — `init()` intenta la recuperación; `save()` escribe
  seguro y avisa con `storage-trimmed` si tuvo que recortar; `deleteAll()`
  borra también el anillo y la copia corrupta (si no, «borrar mis datos» sería
  una mentira).
- **`js/ui/more.js`** — «TUS DATOS Y RESPALDOS»: diagnóstico de almacenamiento,
  lista de instantáneas con su fecha y **VOLVER AQUÍ** (con confirmación).
- **Techos duros.** XP, cartera y minutos se sanean a un máximo
  (`XP_TECHO`, `CARTERA_TECHO`) y toda entrada numérica se valida con
  `numero()`/`enRango()`: `NaN`, `Infinity`, negativos y fuera de rango ya no
  pueden envenenar un contador «para siempre».

## ✨ v5.1 · EL PLAN DE 5.000 PREGUNTAS (ejecutado, en verde)

Un plan de preguntas que nadie ejecuta no es un plan: es un documento. Aquí el
plan **es código que genera los casos y los ejecuta**.

- **`tests/qa-5000-eval.mjs`** — **34 acciones × 14 entradas hostiles × 8
  invariantes**, más familias de idempotencia (×100), vandalismo del
  almacenamiento, cuota llena, viaje en el tiempo, dos pestañas y migraciones
  de esquema → **17.640 comprobaciones**.
- **Los 8 invariantes** (lo que, pase lo que pase, es cierto): el XP nunca baja
  solo · nada es `NaN`/`Infinity`/negativo donde no toca · la misma serie con la
  misma clave no premia dos veces · los contadores solo suman · el nivel no
  retrocede sin que bajen los XP · el inventario no concede dos veces el mismo
  objeto · **el guardado nunca lanza** (o escribe o avisa) · la estructura del
  estado sigue siendo válida.
- **Bug real que encontró** (y que ya no existe): el nivel se buscaba restando
  250 XP en bucle, así que una partida corrupta (`xp: 1e30`, que se puede
  escribir a mano en el almacenamiento) eran **3·10¹⁴ vueltas**: la app se
  quedaba en blanco. Ahora el nivel sale de la inversa de la cuadrática
  (`nivelDeXp`, O(1), 0 ms también con 1e30) y los desbloqueos se recorren
  **solo sobre los 7 niveles que tienen recompensa**, no sobre todos los
  enteros del salto. Comprobado: los valores de `lvl`/`cur`/`need` son
  **idénticos** a los del bucle original en 120.907 XP de prueba.
- **Segundo bug real**: `addPoints`/`addCredits`/`logSleep`/`logSoreness`/
  `logEnergy`/`logStress`/`logMind`/`eat`/`drink`/`addSteps` aceptaban
  cualquier valor. Con un campo de texto vacío, «3 h» o `-99999` el contador
  quedaba en `NaN` para siempre. Ahora se sanean o se ignoran.
- **Tercero**: `init()` aceptaba un guardado que *parsea* pero no es una partida
  (`"texto"`, `0`, `[]`). Ahora se trata como corrupción: copia + instantánea.

## ✨ v5 · PIZARRA (dashboard de escritorio + fotos de receta)

En el shell de escritorio el mundo 3D estaba **oculto**: la app se leía como un
informe largo con barra lateral. Eso no es una app de gimnasio.

- **`css/dashboard.css` + `js/ui/dashboard.js`** — el **tablero**: raíl de
  navegación, **el personaje en el centro** y los datos reales flotando a su
  alrededor (preparación, sesión de hoy, nivel, macros, hidratación, constancia
  y CORE). El contenido vive en una columna a la derecha, como en cualquier app
  de gimnasio seria. Por debajo de 1100 px el tablero se apaga solo y la app
  vuelve a documento, que es lo que funciona en móvil.
- **`js/world.js`** — el mundo se dimensiona **por su contenedor**, no por la
  ventana. Sin esto, con el personaje en una columna central, quedaba
  descentrado. Con un `ResizeObserver` para los cambios que no son de ventana.
- **`api/image.js` + `js/recipeImage.js`** — **fotos de receta por IA**. El
  cliente pide «la foto de `r_bowl_pollo`» y **el prompt lo construye el
  servidor** desde el catálogo: si el navegador pudiera mandar texto libre,
  esto sería un generador de imágenes abierto y pagado por la app.
- **La cocina no se rompe nunca.** Sin clave o sin red, cada receta muestra una
  ilustración estable en vez de un hueco. Las fotos se piden **una a una, cuando
  el usuario las pide** — generarlas cuesta dinero y ancho de banda, y la app
  no gasta ninguno de los dos sin permiso. La imagen se reescala a miniatura en
  el dispositivo y se guarda (LRU de 8) para no volver a pedirla.

## ✨ v4 · CORE (coach conversacional)

CORE deja de ser un formulario con reglas y pasa a ser **una conversación**.
La pieza entera cabe en un vertical slice, y la puerta se abre sin claves.

- **`js/coach/ai-core.js`** — núcleo **puro** (sin DOM, sin red): la puerta de
  seguridad, el allowlist cerrado de herramientas, el prompt por capas y un
  parser SSE que sobrevive a cortes de chunk a mitad de línea.
- **`js/coach/ai.js`** — capa de navegador: reúne el **contexto real** del
  usuario, habla con el proxy y, si algo falla, **mantiene la conversación
  viva** con el motor de reglas de siempre.
- **`api/coach.js`** — proxy de Node (función de Vercel **y** endpoint de
  `tools/serve.mjs` en `/api/coach`). La clave vive en `OPENAI_API_KEY`;
  **jamás** sale del servidor. Solo traduce tokens: no tiene base de datos,
  no autentica y no muta nada. Acepta cualquier gateway compatible con la
  API de chat de OpenAI vía `BAYONA_COACH_UPSTREAM`. Configuración:
  **`api/COACH_IA.md`**.
- **`tools/serve.mjs`** — arranque sin Python (`npm start`), en Node puro.
  Monta `/api/coach` para poder probar la IA en local sin desplegar.
- **`npm run coach:smoke`** — prueba de extremo a extremo (35 puntos):
  levanta el servidor real y habla con `/api/coach` por HTTP.
- **`js/ui/core.js` + `css/coach.css`** — la conversación: burbujas con
  streaming token a token, **tarjetas de herramienta** (ves lo que el coach
  ha hecho de verdad), banner de derivación, historial persistente y un
  composer pensado para el pulgar.
- **`tools/serve.mjs`** — arranque sin Python (`npm start`), en Node puro.

**Las seis garantías van con pruebas** (`tests/coach-ai-eval.mjs`, 73 checks):

| Garantía | Cómo se sostiene |
|---|---|
| La seguridad va primero, siempre | los 30 escenarios corren en el cliente **y** en el proxy, antes de la red |
| El proxy es seguro sin clave | el guion se ejecuta *antes* de mirar `OPENAI_API_KEY` |
| Lo no registrado no se inventa | cada ausente viaja marcado `sin registrar` y el modelo tiene prohibido rellenarlo |
| Las herramientas son una lista cerrada | seis, validadas contra la allowlist antes de ejecutarse |
| El modelo nunca inyecta HTML | todo el streaming entra por `textContent` |
| Si la red cae, el chat sigue | degrada al motor local y lo dice en pantalla |
| Ninguna herramienta se pierde al cerrar | el proxy vuelca las `tool_calls` **antes** del `[DONE]` |

> Por defecto la app arranca **sin nada que configurar** y CORE funciona con el
> motor local. La IA es un acelerador, nunca un requisito.

## ✨ v3 · CINE (rediseño cinematográfico)

- **Ingreso cinematográfico**: portada `#entry` → `ENTRAR` → mundo. Nada se
  muestra de golpe: el contenido vive en el **panel lateral** (misión, métricas,
  nivel + 14 mundos). HUD mínimo (marca · luz · nivel).
- **Movimiento libre del personaje** (`js/move.js`): clic/toque = camina ahí,
  WASD/flechas = caminar (SHIFT corre), arrastrar = cámara orbital, rueda =
  zoom, joystick virtual en móvil.
- **Luz CINE / NOCHE**: por defecto **blanco + naranja** en modo cinematográfico
  (grano de película, barras de encuadre, viñeta); el **negro** queda reservado
  al **modo nocturno**. El mundo 3D cambia de estudio claro a escenario nocturno.
- **Tipografía CLAUDE** (Anthropic): `Styrene B` / `Tiempos Text` declaradas con
  gemelas libres auto-alojadas (`fonts/`: Instrument Sans · Newsreader · Space
  Mono, subset latin, 255 KB). Cero dependencias de red.
- **Cristal** (glassmorphism) + muelles, panel lateral redondeado, onboarding
  rediseñado. Menos texto, más lujo.
- **Backend**: `api/supabase/migrations/0004_perf_sync.sql` — índices calientes,
  `xp_ledger` inmutable + idempotencia, vistas de tablero con
  `security_invoker`, `updated_at` en planes (también en `setup.sql`).

## ✨ v2.1 · MONO NARANJA (rediseño minimalista estricto)

Firma visual nueva: **PALETA ESTRICTA · NARANJA · BLANCO · NEGRO. Nada más.**

- `css/aurum.css` — acabado MONO: superficies planas, filetes 1px, radios mínimos,
  sin aurora/grano/degradados metálicos. Modo NEGRO/BLANCO. El naranja SOLO para
  acción, dato vivo y foco.
- `css/style.css` — tokens canónicos; semántica (`--ok/--danger/--gold/--blue/--cyan`)
  re-mapeada a la paleta (nunca rojo/verde/azul).
- Navegación sin cajas: rail de mundos con pestañas de texto + subrayado naranja
  activo; CTAs con jerarquía NARANJA > BLANCO > CONTORNO.
- Mundo 3D + avatar recoloreados: estudio blanco, maniquí en escala de grises,
  equipamiento negro/blanco/naranja. Toda rareza, macro y dato usa la paleta.
- `js/ui/appearance.js` — panel mínimo (LUZ/DENSIDAD/TEXTO/ESQUINAS/MOVIMIENTO).

## ✨ v2.0 · ATELIER (rediseño de lujo) — superado por v2.1

Capa visual nueva sin tocar la lógica de juego:

- `css/aurum.css` — 7 auras de color, modo claro MARFIL, superficies de cristal,
  letras metálicas, aurora de ambiente, grano fino, tipografía TITÁN/ATELIER.
- `css/motion.css` + `js/ui/motion.js` — transición de mundo cinematográfica,
  revelado escalonado, ripple, tilt 3D, contadores animados, chispas de XP,
  esqueletos de carga. Intensidad PLENO/SERENO/NINGUNO + `prefers-reduced-motion`.
- `js/ui/appearance.js` — panel **APARIENCIA** con vista previa en vivo y 9
  controles (aura, luz, tipografía, densidad, texto, esquinas, cristal, brillo,
  movimiento), persistidos en `localStorage["bayona.appearance.v1"]`.
- Enlaces directos a mundos: `index.html?go=apariencia` · `#entrenamiento` · …

Detalle completo y capturas: **`docs-luxe/`**.

## 🗺️ MAPA DEL REPO

```bash
./run.sh             # → http://localhost:8080   (o: npm start)
npm test             # → batería multiplataforma (tests/run.mjs) + golden set de biomecánica
npm run qa:5000      # → el plan de 5.000 preguntas, ejecutado (17.640 comprobaciones)
node tests/pro-ui-eval.mjs   # → el contrato de diseño (neutro, denso, sin botones grandes)
npm run coach:smoke  # → prueba de extremo a extremo del coach y las fotos contra /api
npm run mobile:pack  # → empaquetado web para Capacitor (ver docs/MOBILE_RELEASE.md)
```

| Dónde | Qué es |
|---|---|
| `index.html` + `css/` + `js/` + `media/` + `vendor/` | La app: mundo 3D + mundos + plan + armario |
| `js/ui/` | Módulos por mundo (shell, gimnasio, cocina, recuperación, mente, plan, armario, progreso, CORE, más, **tablero de escritorio**) |
| `js/vision/` | **GEMELO-1**: cámara → contador de reps → biomecánica (procesado 100% local) |
| `js/coach/` · `js/health/` | CORE conversacional (IA con repliegue local) · **Mapa de Salud** (PAR-Q+/PHQ-2/GAD-2) |
| `js/state.js` · `js/rewards.js` · `js/engine.js` | Estado persistente (esquema v3 + migración) · economía (fuente única) · motor de rendimiento |
| `js/backup.js` | **Red de seguridad**: anillo de 8 instantáneas, recuperación automática ante corrupción, recorte por cuota y diagnóstico |
| `js/contexto.js` · `js/ui/trabajo.js` | **Motor de contexto** (momento del día → entorno/saludo) · contexto **TRABAJO** (foco 25/5, pausas activas, postura) |
| `js/medidas.js` | **Mediciones**: evolución corporal ANTES→AHORA→HACIA DÓNDE (deltas, tendencia, proyección honesta) |
| `js/coachos.js` · `js/ui/coachos.js` | **COACH OS**: command center del entrenador (fichas vivas, alertas por reglas, CORE Coach, macrociclo) |
| `js/hoy.js` | **Plan del día**: jerarquía CRÍTICO→HOY→RECOMENDADO→OPCIONAL→COMPLETADO + misiones diarias deterministas (panel en `js/ui/hoy.js`) |
| `js/i18n.js` · `js/consents.js` · `js/phygital.js` | Catálogo/formato es-ES + `esc()` · consentimientos centralizados · códigos físico→digital |
| `js/data/offlineQueue.js` | Cola offline FIFO idempotente + zona de recuperación (nada se pierde en silencio) |
| `tests/` + `ml/evals/` | 36 suites ejecutables (visión, coach, salud, HOY, cola, economía, estado, phygital, tablero, recetas, plan de 5.000 preguntas, contrato de diseño, centro) + golden set |
| `css/pro.css` | **El aspecto real de la app**: capa neutra y densa que se carga la última y pisa a todas las demás |
| `js/gym/` · `js/ui/centro.js` · `cuotas.js` · `agenda.js` | **CENTRO**: gestión del gimnasio (socios, membresías, cuotas, agenda, acceso, riesgo de baja) |
| `api/` | Proxy del coach (`api/coach.js` + **`api/COACH_IA.md`**) · proxy de fotos de receta (`api/image.js`) · SQL Supabase (tablas + RLS) + contratos REST · **`api/supabase/SETUP.md`** = guía para crear la cuenta y desplegar · **`api/supabase/setup.sql`** = script único e idempotente para el SQL Editor |
| `mobile/` | Contenedor **Capacitor** → Android / iOS (configurado; sin compilar en esta fase) |
| `sw.js` + `manifest.webmanifest` | PWA: shell offline (network-first para código) + instalable |

## Ejecutar

```bash
./run.sh                    # → http://localhost:8080
./run.sh & abrí index.html  # requiere servidor local por los módulos ES
```

Diagnóstico sin service worker: `index.html?nosw=1`.

## Estado real de los sistemas (verificado con tests + navegador)

| Sistema | Estado | Evidencia |
|---|---|---|
| Onboarding ÚNICO (personaje, objetivo, disponibilidad, equipamiento, consentimientos) | ✅ implementado y probado | E2E navegador |
| Avatar 3D persistente + outfit en tiempo real + rotación 360° | ✅ (avatar procedural = fallback técnico; pipeline GLB/VRM preparado, sin modelos) | E2E navegador |
| Mundos (Inicio · Gimnasio · Cocina · Recuperación · Mente · Laboratorio · Vestidor) con transición 300–900 ms | ✅ | E2E navegador |
| Entrenamiento end-to-end: sesión persistente, registro editable, descanso, PR, XP idempotente, cierre parcial/abandono | ✅ | E2E navegador + `tests/state-eval.mjs` |
| Autoregulación REAL (volumen recortado de verdad, carga sugerida usada en el registro) | ✅ | `tests/state-eval.mjs` + E2E |
| CORE conversacional (streaming, herramientas que actúan de verdad, 30 escenarios de derivación, repliegue local sin red) | ✅ con y sin IA | `tests/coach-ai-eval.mjs` + `tests/seguridad-30-eval.mjs` |
| Nutrición (macros, fibra, comidas custom, hidratación rápida/personalizada) | ✅ | E2E navegador |
| Recetas con foto generada por IA, en caché y con ilustración de repuesto | ✅ con y sin clave | `tests/dashboard-receta-eval.mjs` + `npm run coach:smoke` |
| Tablero de escritorio con el personaje en el centro | ✅ ≥1100 px | `tests/dashboard-receta-eval.mjs` |
| Recuperación con desglose «¿POR QUÉ?» y honestidad de datos ausentes | ✅ | E2E navegador |
| Red de seguridad del progreso (8 instantáneas, recuperación, cuota llena, borrado real) | ✅ | `tests/qa-5000-eval.mjs` |
| Plan de 5.000 preguntas ejecutado: 17.640 comprobaciones, 0 fallos | ✅ | `npm run qa:5000` |
| Lenguaje visual PRO (neutro, denso, sin botones grandes) en toda la app | ✅ | `tests/pro-ui-eval.mjs` |
| La capa PRO gana de verdad la cascada (12 elementos clave comprobados) | ✅ | `tests/pro-ui-eval.mjs` |
| Paleta de comandos (⌘K), atajos directos, hoja de atajos y foco atrapado | ✅ | `tests/paleta-eval.mjs` |
| Rutinas asignadas por IA y visibles por el alumno (autor, fecha, nota) | ✅ | `tests/pro-ui-eval.mjs` + `tests/coach-ai-eval.mjs` |
| Centro de gestión de gimnasio: socios, cuotas, agenda, acceso y riesgo de baja | ✅ | `tests/gym-eval.mjs` |
| Plan macrociclo: vista SIMPLE / LABORATORIO (hoja profesional, adherencia real) | ✅ | E2E navegador |
| Armario: rarezas, DIGITAL/FÍSICO, equipamiento persistente, códigos phygital (formato+control+uso único+auditoría) | ✅ (validación local; server-side pendiente de backend) | `tests/phygital-eval.mjs` + E2E |
| Progreso: analítica real, fotos privadas (solo dispositivo), comparador ANTES/AHORA | ✅ | E2E navegador |
| Privacidad: consentimientos centralizados/revocables, exportar JSON, eliminar todo | ✅ | E2E navegador |
| PWA offline (shell) + instalable | ✅ probado sin red | E2E navegador offline |
| Idioma: experiencia completa en español + formateo es-ES (fechas, decimales 72,5, 24 h) | ✅ | checklist + revisión visual |
| Economía sin dobles XP (previsto = recibido = guardado) | ✅ | `tests/rewards-eval.mjs`, `tests/state-eval.mjs` |
| Backend real (auth, API, sync) | 🚧 cliente completo + espejo idempotente + cola offline (`js/sync/`); falta la anon key del proyecto y aplicar `api/supabase/migrations/` | `js/sync/`, `api/supabase/` |
| Comunidad / Tienda / Membresías de pago | 🚧 fuera de este slice (deshabilitadas o informativas, sin falsa experiencia) | — |
| APK / iOS | ✅ Android: APK v1.0 compilado y firmado (`mobile/android/`, gradle sin Android Studio); iOS 🚧 requiere Mac/Xcode | `mobile/` |

## Filosofía

- Simple para vivirlo. Profundo para entenderlo. Profesional cuando quieras abrirlo.
- Pagar no compra nivel, fuerza, récords ni disciplina.
- Lo que no se ha registrado no se inventa: sin datos → «Todavía no lo has registrado».
- Descansar bien también es progreso (sin castigo por faltar).


## Actualización de la app · 29 septiembre 2026

Requiere Node.js 22 o posterior para las pruebas (importación JSON).

- Entrada guiada: duración por sesión, resumen del perfil, avatar opcional desplegable y saludo al volver.
- MI PERFIL: edición del perfil y calendario según disponibilidad/material; asignaciones del entrenador tienen prioridad.
- MI RITMO: diario menstrual opcional local con consentimiento, fechas, sensaciones, historial y borrado. No infiere ovulación ni fertilidad.
- Modo suave: reduce las series de la misión por elección explícita; no por una supuesta fase hormonal. Una sesión ya iniciada se conserva.
- Progreso: formulario de medidas recuperado; exportación local incluye el diario; borrar datos también elimina el diario.
- Pausar una sesión devuelve a HOY y recupera la navegación.
- PWA: recursos del avatar recuperados, caché de recursos versionados y paquete móvil completo.

`npm test` ejecuta las 75 suites; `npm run qa:5000` ejecuta el plan de 5.000 preguntas, `tests/pro-ui-eval.mjs` el contrato de diseño y `tests/paleta-eval.mjs` el de teclado. `npm run mobile:pack` genera los recursos para Capacitor; no compila ni firma un APK/IPA. El coach con IA es opcional: sin `OPENAI_API_KEY`, CORE sigue funcionando con su motor local (`api/COACH_IA.md`). Backend de cuentas, credenciales y publicación en tiendas requieren configuración y validación independientes.

Criterio para ciclo y entrenamiento: [consenso UEFA, 2025](https://bmjopensem.bmj.com/content/11/3/e002769). La evidencia no respalda prescribir automáticamente la intensidad según una fase estimada del calendario; se priorizan síntomas, autonomía y contexto individual.
