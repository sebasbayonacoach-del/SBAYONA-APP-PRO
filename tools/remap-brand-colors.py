#!/usr/bin/env python3
"""
BAYONA · re-mapeo de los colores de ACENTO a la paleta de la web.

POR QUÉ SOLO EL ACENTO
---------------------
Se probó primero un re-mapeo global de los 529 hex por luminancia y se
DESCARTÓ: el dry-run mostró que colapsaba la jerarquía neutra. Ejemplos de lo
que salía mal, y por qué no se aplica:

    #9ba1a5  (texto secundario)  ->  #ffffff   lo convertía en primario
    #555d61  (borde medio)      ->  #1f1f22   lo volvía casi negro
    #180c05  (marrón de fondo)  ->  #ffc08a   lo volvía melocotón claro

El tono oscuro de la app ya es de la casa: fondo #050505 (idéntico al de la
web), superficie #0d0e10~#111111, tinta #f4f4f1~#ffffff, filete #24272a~#1f1f22.
La única diferencia real de marca es el naranja: #ff6a00 (puro, saturado)
frente al #F4A261 de la web. Eso es lo que se unifica aquí.

QUÉ SE TOCA
    · los naranjas de acento, hex y rgba(...)
    · nada de estados (peligro / bien / aviso), nada de tonos de piel o
      ilustración, nada de los neutros, nada de tema claro, nada de tokens
      (--x los resuelve css/bayona-brand.css, que gana la cascada)

Destinos: --orange #F4A261 y --orange-on-dark #FFC08A de la web.

Uso:  python3 remap-brand-colors.py [--write]
"""
import re, sys, glob

WEB_ORANGE = "#f4a261"   # src/styles.css  --orange
WEB_ON_DARK = "#ffc08a"  # src/styles.css  --orange-on-dark

# Curado a mano, no automático: cada fila es un naranja de acento que la app
# usaba como "el color de marca", con su equivalente en la web.
ACCENT_MAP = {
    # --- acento principal -> --orange #F4A261 ---
    "#e36619": WEB_ORANGE, "#ef6200": WEB_ORANGE, "#ff6714": WEB_ORANGE,
    "#ff6a00": WEB_ORANGE, "#ff7a1a": WEB_ORANGE, "#ff7b1d": WEB_ORANGE,
    "#ff7d21": WEB_ORANGE, "#ff7d24": WEB_ORANGE, "#f38744": WEB_ORANGE,
    "#ff8a3a": WEB_ORANGE, "#ff8c3b": WEB_ORANGE,
    # --- acento claro / hover sobre oscuro -> --orange-on-dark #FFC08A ---
    "#ef9b60": WEB_ON_DARK, "#ff9a56": WEB_ON_DARK,
    "#ffb074": WEB_ON_DARK, "#e9a17f": WEB_ON_DARK,
}
# NO se tocan, y por qué (documentado para que nadie los "arregle" después):
#   #ffad42  -> --warn, estado funcional
#   #fff6ef #fff7ef #fffaf4 -> casi blancos, texto sobre naranja

HEX = re.compile(r'#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b')
# rgba(255,106,0,a) / rgba(255, 106, 0, a) -> rgba(244,162,97,a)
RGBA = re.compile(r'rgba\(\s*255\s*,\s*106\s*,\s*0\s*(,)?', re.I)

FILES = [f for f in sorted(glob.glob('css/*.css')) if 'bayona-brand' not in f]
WRITE = '--write' in sys.argv

log = []
for path in FILES:
    src = open(path, encoding='utf-8', errors='replace').read()
    out, pos = [], 0
    for m in re.finditer(r'([^{}]+)\{([^{}]*)\}', src):
        sel = m.group(1)
        body = m.group(2)
        # el tema claro conserva su propia paleta: se deja intacto
        if 'data-surface-theme="light"' in sel or 'data-mode="marfil"' in sel:
            continue
        new = body
        # los tokens --x los gestiona bayona-brand.css: se dejan intactos
        parts = re.split(r'(--[a-zA-Z0-9-]+\s*:[^;{}]*)', new)
        for i, chunk in enumerate(parts):
            if i % 2:            # era un token
                continue
            def sub(hm):
                v = hm.group(0).lower()
                if v in ACCENT_MAP:
                    log.append((path, v, ACCENT_MAP[v]))
                    return ACCENT_MAP[v]
                return hm.group(0)
            chunk = HEX.sub(sub, chunk)
            n = [0]
            def rsub(rm):
                n[0] += 1
                log.append((path, 'rgba(255,106,0,…)', 'rgba(244,162,97,…)'))
                return f'rgba(244,162,97{rm.group(1) or ","}'
            chunk = RGBA.sub(rsub, chunk)
            parts[i] = chunk
        out.append(src[pos:m.start(2)]); out.append(''.join(parts))
        pos = m.end(2)
    out.append(src[pos:])
    res = ''.join(out)
    if WRITE and res != src:
        open(path, 'w', encoding='utf-8').write(res)

from collections import Counter
c = Counter((a, b) for _, a, b in log)
print(f"{'ESCRITO' if WRITE else 'SIMULACIÓN'} · {len(log)} sustituciones")
print(f"{'origen':>18} -> {'destino':<18} veces")
for (a, b), n in sorted(c.items(), key=lambda x: -x[1]):
    print(f"{a:>18} -> {b:<18} {n}")