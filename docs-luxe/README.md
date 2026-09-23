# BAYONA · ATELIER — capa de diseño «LUJO» (v2.0)

Rediseño visual y de movimiento de BAYONA. **No toca la lógica de juego**: es una
capa de presentación + un centro de personalización, montada encima del
Design System v3 existente.

## Qué hay de nuevo

### 1. `css/aurum.css` — sistema visual «ATELIER»
- **Paleta de aura** con 7 identidades: `ONYX ORO` (firma), `AMANECER`, `ZAFIRO`,
  `ESMERALDA`, `RUBÍ`, `VIOLETA`, `AURORA`. Todas recalculan el acento de **toda**
  la app vía los tokens `--orange / --gold / --cream` del sistema base.
- **Modo claro «MARFIL»** completo (superficies, textos, sombras, mezclas).
- **Superficies de cristal**: desenfoque + saturación, degradado de luz superior
  (bisel), filete de contorno fino y sombra multicapa.
- **Aurora de ambiente** (`#aurora`): focos de color del tema que respiran detrás
  del mundo 3D, mezclados en `screen` (o `multiply` en modo claro).
- **Grano fino** de plata sobre toda la interfaz (textura de alto contraste al 4 %).
- **Letras metálicas** para marca, títulos de misión, títulos cinemáticos y el
  panel: degradado oro con `background-clip: text`.
- **Tipografía de autor**: `TITÁN` (Archivo Black, la firma original) o `ATELIER`
  (Cormorant Garamond en cursiva para titulares).
- **Barras y anillos** con degradado de acento + barrido de brillo continuo.
- **Scrollbars, foco `:visible`, píldoras, tablas, chat, calendario** terminados.

### 2. `css/motion.css` — sistema de movimiento
- **Transición de mundo cinematográfica**: velo con barrido luminoso + destello
  de aura al llegar al nuevo lugar.
- **Revelado escalonado** del cajón (8 pasos con desenfoque de entrada).
- **Microinteracciones**: onda de toque (ripple) en todos los controles, prensa
  con `scale(.965)`, barrido de brillo en botones, inclinación 3D en tarjetas.
- **Contadores animados** (`data-count-to`) con pop final.
- **Chispas doradas** en XP y recompensas.
- **Modales y toasts** con entrada elástica y destello único.
- **Esqueletos de carga** (`.skeleton`) con shimmer.
- **Intensidad de movimiento** `PLENO / SERENO / NINGUNO` + respeto total a
  `prefers-reduced-motion`.

### 3. `js/ui/appearance.js` — centro de personalización
Panel **APARIENCIA** (rail lateral o `MÁS → ATELIER DE DISEÑO`) con vista previa
en vivo y 9 controles:

| Control | Opciones |
|---|---|
| Aura de color | 7 temas |
| Luz | NOCHE · MARFIL |
| Tipografía de títulos | TITÁN · ATELIER |
| Densidad de interfaz | COMPACTA · CÓMODA · AMPLIA |
| Tamaño de texto | 90 / 100 / 110 / 120 % |
| Esquinas | RECTO · SUAVE · REDONDO |
| Cristal (desenfoque) | ACTIVADO · SÓLIDO |
| Brillo de acentos | BAJO · MEDIO · ALTO |
| Movimiento | PLENO · SERENO · NINGUNO |

Todo se aplica **en vivo** y se guarda solo en el dispositivo
(`localStorage["bayona.appearance.v1"]`), separado del estado del juego.
«VOLVER A LA FIRMA ORIGINAL» restaura `ONYX ORO · NOCHE · TITÁN`.

### 4. `js/ui/motion.js` — motor de interacción
Autocontenido, sin dependencias. Ripple, contadores, tilt, chispas, destellos,
revelado por visibilidad y los observadores del shell (cajón abierto → se atenúan
los paneles flotantes; viaje → destello).

### 5. Extras de producto
- **Sin destello de tema**: script en `<head>` que aplica la firma antes del
  primer pintado.
- **Enlaces directos a mundos**: `index.html?go=apariencia`, `#entrenamiento`,
  `#plan`, `#armario`… (con alias en español) — abre la sección al arrancar.
- El rail y la barra inferior **se recolocan** cuando el cajón está abierto para
  que la navegación nunca quede tapada ni solapada.

### 6. Barrido de color en módulos autocontenidos
Los módulos que inyectan su propio CSS (`js/onboarding.js`, `js/diary/sessionDiary.js`,
`js/health/healthUI.js`, `js/vision/boot.js`) llevaban **91 colores fijos en hex** y
se quedaban fuera del tema (rompían en modo MARFIL). Ahora usan los tokens
`--paper / --paper-2 / --panel / --cream / --ink / --hair / --acc-*`, y el esqueleto
de la cámara dibuja con el aura activa (`cssVar('--acc-2')`).
Resultado: **toda** la superficie del producto —incluidos onboarding, diario de
sesión, mapa de salud y GEMELO-1— sigue la aura, la luz y el brillo elegidos.

## Personalización por atributos (para quien integre)

```html
<html data-theme="onyx" data-mode="noche" data-font="titan"
      data-density="comoda" data-radius="suave" data-glass="on"
      data-glow="medio" data-scale="100" data-motion="pleno">
```

## Evidencia

Capturas en `docs-luxe/` (escritorio 1440×900 y móvil 390×844):
`home-desktop.png`, `look-desktop.png`, `train-desktop.png`, `home-mobile.png`,
`marfil-zafiro.png` (modo claro + tipografía ATELIER).

Batería de tests del proyecto: **11 suites · 0 fallos** (`npm test`).
