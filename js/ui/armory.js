// ============================================================
// BAYONA — ARMARIO (vestidor): equipamiento, rarezas, 360°, phygital
// Cambiar prenda → el avatar cambia AL INSTANTE y persiste tras recarga.
// ============================================================
import { S } from "../state.js";
import { ITEMS, SLOTS, SLOT_LABEL, RARITY } from "../data.js";
import { validateCode, verifyAndRedeem, makeCode } from "../phygital.js";
import { esc } from "../i18n.js";
import {
  UI, $, el, elT, showModal, hideModal, toast, BUILDERS,
} from "./shared.js";

BUILDERS.armory = (body) => {
  body = body || $("#drawer-body");
  body.textContent = "";

  // ---------- ROTACIÓN 360° (accesible: botones + arrastre) ----------
  const rot = el("div", "card");
  rot.innerHTML = `<h4>VISTA 360°</h4><div class="sub">Gira a tu personaje para ver el equipo. También puedes arrastrar sobre el mundo.</div>`;
  const row = el("div", "card-row");
  row.style.marginTop = "10px";
  const bL = el("button", "btn grow", "◀ GIRAR IZQUIERDA");
  const bR = el("button", "btn grow", "GIRAR DERECHA ▶");
  bL.onclick = () => rotateAvatar(-Math.PI / 8);
  bR.onclick = () => rotateAvatar(Math.PI / 8);
  row.append(bL, bR);
  rot.appendChild(row);
  body.appendChild(rot);

  body.appendChild(el("div", "sec-label", "EQUIPO · DIGITAL + FÍSICO"));
  SLOTS.forEach((slot) => {
    body.appendChild(el("div", "sec-label", SLOT_LABEL[slot] || slot.toUpperCase()));
    const grid = el("div", "items");
    ITEMS.filter((i) => i.slot === slot).forEach((it) => {
      const owned = S.isOwned(it.id);
      const equipped = S.data.inventory.equipped[slot] === it.id;
      const rar = RARITY[it.rarity] || { color: "#8a8a8a", label: it.rarity };
      const card = el("div", `item ${equipped ? "equipped" : ""} ${owned ? "" : "locked"}`);
      const col = it.vis.color || "#141414";
      const acc = it.vis.accent || col;
      card.innerHTML = `
        <div class="swatch" style="background:linear-gradient(135deg,${col},${acc})"></div>
        <div class="nm">${esc(it.name)}</div>
        <span class="rar" style="color:${rar.color}">${esc(rar.label)}</span>
        <div class="dual">
          <span class="on">DIGITAL ${owned ? "✓" : "—"}</span>
          <span class="${it.physical ? "on" : ""}">FÍSICO ${it.physical ? "✓ (existe)" : "—"}</span>
        </div>
        ${owned && it.physical ? '<div class="dual"><span class="linklike">CONSEGUIR VERSIÓN FÍSICA</span></div>' : ""}
        ${!owned && it.physical ? '<div class="dual"><span class="linklike">POSES FÍSICO: CANJEAR CÓDIGO</span></div>' : ""}`;
      card.addEventListener("click", () => {
        if (!owned) return phygitalFlow(it);
        S.equip(it.id);
        UI.W?.avatar.setAction("wave");
        setTimeout(() => UI.W?.avatar.setAction("idle"), 1400);
        toast("EQUIPADO", it.name);
        BUILDERS.armory();
      });
      grid.appendChild(card);
    });
    body.appendChild(grid);
    if (slot === "top") {
      const gp = el("div", "card");
      gp.innerHTML = `<h4>CONSEGUIR FÍSICO</h4>
        <div class="sub">Cada producto BAYONA tiene gemelo digital: el código único del paquete físico (formato BAY-XXXX-XXXX-XXXX, de un solo uso) desbloquea su versión digital aquí.
        <em>La validación del lote de fabricación requiere backend: hoy se verifica localmente (formato + dígito de control + uso único + auditoría).</em></div>`;
      body.appendChild(gp);
    }
  });

  const legend = el("div", "media-caption");
  legend.textContent = "RAREZAS: " + Object.values(RARITY).map((r) => r.label).join(" · ");
  body.appendChild(legend);

  body.appendChild(el("div", "sec-label", "AUDITORÍA DE CÓDIGOS"));
  const aud = el("div", "card");
  const red = S.data.phygital?.redeemed || [];
  aud.innerHTML = red.length
    ? red.slice(0, 5).map((r) => `<div class="kv"><span class="k">${esc(r.code)}</span><span class="v">${esc(S.item(r.itemId)?.name || r.itemId)} · ${esc(r.at.slice(0, 10))}</span></div>`).join("")
    : `<div class="sub">Sin códigos canjeados. Cada canje queda registrado con fecha.</div>`;
  body.appendChild(aud);
};

function rotateAvatar(delta) {
  const av = UI.W?.avatar;
  if (!av) return;
  if (av.group) av.group.rotation.y += delta;
}

/** Arrastre horizontal sobre el lienzo → rotación (accesible con botones además). */
let dragX = null;
if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", (e) => {
    if (e.target && e.target.id === "scene") dragX = e.clientX;
  });
  window.addEventListener("pointermove", (e) => {
    if (dragX == null || !UI.W?.avatar?.group) return;
    UI.W.avatar.group.rotation.y += (e.clientX - dragX) * 0.01;
    dragX = e.clientX;
  });
  window.addEventListener("pointerup", () => { dragX = null; });
}

function phygitalFlow(it) {
  showModal(`
    <div class="cine-tag">GEMELO DIGITAL</div>
    <div class="cine-title" style="font-size:20px">${esc(it.name)}</div>
    <div class="sub">${S.isOwned(it.id) ? "" : "Introduce el código único del producto físico para desbloquear su gemelo digital. Cada código solo se usa una vez."}</div>
    <input id="pf-code" maxlength="18" placeholder="BAY-XXXX-XXXX-XXXX" style="text-transform:uppercase" />
    <div class="sub" id="pf-msg" style="min-height:18px"></div>
    <div style="display:flex;gap:8px">
      <button class="btn grow" id="pf-cancel">CANCELAR</button>
      <button class="btn btn-primary grow" id="pf-ok">VERIFICAR Y DESBLOQUEAR</button>
    </div>
    <div style="height:8px"></div>
    <button class="btn btn-block" id="pf-demo">GENERAR CÓDIGO DE DEMO</button>
    <div class="sub">Demo local: genera un código válido para probar el flujo (los códigos reales los lleva el producto físico).</div>
  `, () => {
    $("#pf-cancel").onclick = hideModal;
    $("#pf-demo").onclick = () => {
      $("#pf-code").value = makeCode(); // síncrono: el código aparece al instante
    };
    $("#pf-ok").onclick = () => {
      const raw = $("#pf-code").value;
      const v = validateCode(raw);
      const msg = $("#pf-msg");
      if (!v.ok) { msg.textContent = v.reason; msg.style.color = "var(--danger)"; return; }
      const r = verifyAndRedeem(S, raw, it.id);
      if (!r.ok) { msg.textContent = r.reason; msg.style.color = "var(--danger)"; return; }
      hideModal();
      S.equip(it.id);
      toast("GEMELO DESBLOQUEADO", `${it.name} · ${r.note}`, "gold");
      BUILDERS.armory();
    };
  });
}
