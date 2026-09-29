# CORE · Coach con IA

Cómo conectar el coach conversacional de BAYONA a un modelo de lenguaje
sin sacar ni una clave del servidor.

---

## Qué es y qué no es

| | |
|---|---|
| **El modelo propone** | redacta la respuesta y pide herramientas |
| **El dispositivo ejecuta** | abre la sesión, registra el síntoma, deriva |
| **El proxy traduce** | solo tokens. Sin base de datos, sin auth, sin efectos |
| **La seguridad decide** | los 30 escenarios de `js/seguridad-guion.js`, antes del modelo |

La clave **nunca** va en el navegador. El proxy (`api/coach.js`) la lee de
`OPENAI_API_KEY` y responde en streaming. El cliente solo habla con `/api/coach`.

---

## Sin configurar nada (por defecto)

La app arranca y **el coach funciona igual**: usa el motor de reglas local
(`js/coach/replies.js`), que responde con tus registros reales. El panel lo
dice sin esconderlo: la píldora muestra `LOCAL` y el estado dice
«Reglas en tu dispositivo · funciona sin conexión».

Esto es intencionado. Un coach de gimnasio no puede desaparecer porque el
servidor esté caído, y la app se juega en el tren sin cobertura.

---

## Conectar la IA

### 1 · Conseguir la clave

Crea una cuenta y genera una clave de API en la plataforma de tu proveedor
(este proxy está escrito para la API de chat de OpenAI, formato
`POST /v1/chat/completions` con `stream: true` y `tools`).

### 2 · Configurar la variable

**En Vercel** (despliegue real):

```
Settings → Environment Variables → OPENAI_API_KEY = sk-...
```

**En local**, exporta la variable antes de arrancar el servidor:

```bash
OPENAI_API_KEY=sk-... npm start
```

`tools/serve.mjs` monta el proxy en `/api/coach`, así que la app y la IA
conversan sin desplegar nada. (También vale `node api/coach.js` a secas,
que lo sirve solo en `http://localhost:8787/coach`.)

Si necesitas un proxy en otro host, en `index.html`, antes de `js/main.js`:

```html
<script>window.BAYONA_COACH_ENDPOINT = "https://tu-proxy.co/api/coach";</script>
```

### 3 · Otro proveedor (opcional)

Cualquier endpoint compatible con la API de chat de OpenAI vale:

```
BAYONA_COACH_UPSTREAM = https://tu-gateway/v1/chat/completions
BAYONA_COACH_API_KEY   = ...        (si no, usa OPENAI_API_KEY)
BAYONA_COACH_MODEL     = gpt-4o-mini
```

El proxy está preparado para temperatura baja (`0.4`) y un presupuesto
corto (`max_tokens: 500`): un coach que se enrolla es un coach que distrae.

---

## Comprobar que funciona

```bash
npm run coach:smoke
```

Levanta el servidor real, habla con `/api/coach` por HTTP y comprueba 35
puntos: streaming token a token, los 30 disparadores del guion de seguridad,
que el proveedor **nunca** se llama ante una alarma, CORS, 400/404/405 y que
la herramienta llega antes del cierre del stream. No necesita clave: usa un
proveedor simulado en el propio proceso.

A mano, contra el servidor ya arrancado:

```bash
curl http://localhost:8080/api/coach            # → { "ok": false, "motivo": "falta OPENAI_API_KEY…" }

curl -N -X POST http://localhost:8080/api/coach \
  -H 'content-type: application/json' \
  -d '{"message":"¿Qué entreno hoy?","context":{"perfil":{"nombre":"Aurora"}}}'
# → data: {"type":"delta","text":"Hoy te toca FUERZA A. "} …  data: [DONE]
# -N es imprescindible: sin él, curl no muestra el streaming

curl -N -X POST http://localhost:8080/api/coach \
  -H 'content-type: application/json' \
  -d '{"message":"me aprieta el pecho y me cuesta respirar"}'
# → guion de derivación, sin llamar al modelo
```

- `ok: true` en `/api/coach` → la IA está montada.
- `ok: false` con `motivo` → falta la clave; la app seguirá en modo local.

En la app, el punto **LOCAL/IA** de la cabecera del panel CORE también
recomprueba al pulsarlo.

---

## Dónde está cada cosa

```
api/coach.js            proxy: clave, streaming, herramientas, rate limit, CORS
tools/serve.mjs         servidor estático + monta /api/coach
tools/coach-smoke.mjs   prueba de extremo a extremo (npm run coach:smoke)
js/coach/ai-core.js     núcleo PURO: seguridad, herramientas, prompt, parser SSE
js/coach/ai.js          capa de navegador: contexto real, endpoint, repliegue
js/coach/coachStub.js   política clínica y reglas de red flag (preexistente)
js/seguridad-guion.js   los 30 escenarios de derivación (preexistente)
js/ui/core.js           la conversación
css/coach.css           el acabado
tests/coach-ai-eval.mjs 73 comprobaciones que impiden que esto se rompa
```

---

## Garantías que no se negocian

Estas están fijadas por pruebas, no por buenas intenciones:

1. **La seguridad va primero, siempre.** Una frase de alarma recibe el guion
   de derivación aunque haya endpoint, red y clave. En el cliente y en el
   proxy. Nunca se llama al modelo.
2. **El proxy no necesita clave para ser seguro.** El guion corre *antes* de
   mirar la variable de entorno.
3. **Lo no registrado no se inventa.** Cada ausente viaja al prompt marcado
   como `sin registrar`, y el modelo tiene prohibido rellenarlo.
4. **Las herramientas son una lista cerrada.** Seis. El nombre se valida
   contra la allowlist antes de ejecutarse; lo que no esté, se descarta.
5. **Ningún texto del modelo es HTML.** Todo entra por `textContent`.
6. **Si la red falla, la conversación continúa.** Cae al motor local y el
   panel lo dice.
7. **Ninguna herramienta se pierde al cerrar el stream.** El proveedor
   siempre termina en `[DONE]`; el proxy vuelca las herramientas
   acumuladas *antes* de cerrar. Sin esto el coach contestaba pero nunca
   hacía nada, en silencio.

---

## Límites

- El proxy no autentica: está pensado para ir detrás de la app. Si lo expones
  publicly, pon delante tu propio control de acceso o un rate limit externo.
- Rate limit en memoria: 30 peticiones/minuto y IP. Se reinicia al reiniciar
  el proceso (suficiente para una instancia; para varias, usa Redis).
- El historial se recorta a 6 parejas de turnos antes de enviarlo.
