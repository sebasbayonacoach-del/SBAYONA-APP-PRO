// ============================================================
// BAYONA — FACE PIPELINE (CREA A TI MISMO)
// Foto real del usuario → cara del avatar.
// Recorte cuadrado centrado → máscara ovalada → textura 3D
// + extracción de tono de piel para el cuerpo.
// ============================================================

// Procesa un File/Blob de foto → { face: dataURL(256), skin: hex, hair: hex }
export function processFace(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const S2 = 256;
        // recorte cuadrado centrado ligeramente elevado (la cara suele estar arriba)
        const side = Math.min(img.width, img.height) * 0.85;
        const sx = (img.width - side) / 2;
        const sy = Math.max(0, (img.height - side) / 2 - side * 0.06);
        const c = document.createElement("canvas");
        c.width = S2; c.height = S2;
        const ctx = c.getContext("2d");

        // máscara ovalada suave
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(S2 / 2, S2 / 2, S2 * 0.42, S2 * 0.48, 0, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, sx, sy, side, side, 0, 0, S2, S2);
        // viñeta suave para integrar con el estilo del avatar
        const g = ctx.createRadialGradient(S2 / 2, S2 * 0.45, S2 * 0.3, S2 / 2, S2 / 2, S2 * 0.55);
        g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.18)");
        ctx.fillStyle = g; ctx.fillRect(0, 0, S2, S2);
        ctx.restore();

        // tono de piel: muestrea la zona media-inferior (mejilla/mentón)
        const skin = sampleTone(ctx, S2);

        URL.revokeObjectURL(url);
        resolve({ face: c.toDataURL("image/png"), skin });
      } catch (e) { reject(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("no-image")); };
    img.src = url;
  });
}

// promedio RGB de la región de mejilla (evita ojos/cabello extremos)
function sampleTone(ctx, S2) {
  const d = ctx.getImageData(S2 * 0.3, S2 * 0.45, S2 * 0.4, S2 * 0.3).data;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < d.length; i += 16) {
    const rr = d[i], gg = d[i + 1], bb = d[i + 2];
    if (d[i + 3] < 100) continue;
    // descarta píxeles muy oscuros (pelo/sombra) o sin croma
    const mx = Math.max(rr, gg, bb), mn = Math.min(rr, gg, bb);
    if (mn < 18 || mx > 250) continue;
    r += rr; g += gg; b += bb; n++;
  }
  if (!n) return "#e8b38a";
  r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n);
  // suaviza hacia tono de piel natural (corrige dominantes de color de la foto)
  r = Math.min(255, Math.round(r * 1.06 + 8));
  g = Math.round(g * 0.96 + 2);
  b = Math.round(b * 0.88);
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

// Crea una imagen redonda lista para dibujar en canvas 2.5D
export function loadFaceImage(dataURL) {
  return new Promise((resolve) => {
    if (!dataURL) return resolve(null);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = dataURL;
  });
}
