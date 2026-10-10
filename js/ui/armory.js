// ============================================================
// BAYONA — ARMARIO: inventario personal + gemelos físicos de Tienda.
// Un objeto digital y un producto comercial NO son dos catálogos distintos:
// shopId enlaza cada prenda/equipo físico con el producto canónico de la web.
// ============================================================
import { S } from "../state.js";
import { ITEMS, SLOTS, SLOT_LABEL, RARITY } from "../data.js";
import { SHOP_PRODUCTS, shopProduct, shopProductUrl } from "../shop-catalog.js";
import { validateCode, verifyAndRedeem, makeCode } from "../phygital.js";
import { esc } from "../i18n.js";
import {
  UI, $, el, showModal, hideModal, toast, BUILDERS,
} from "./shared.js";

function storeLink(label, productId = null, cls = "btn btn-block") {
  const a = el("a", cls, label);
  a.href = shopProductUrl(productId);
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.setAttribute("aria-label", productId ? `${label}. Abre la tienda BAYONA` : label);
  return a;
}

function itemStatus(it, owned, product) {
  if (product) return owned ? "EN TU ARMARIO + DISPONIBLE EN TIENDA" : "DISPONIBLE EN TIENDA";
  return owned ? "DESBLOQUEADO" : "SE DESBLOQUEA CON TU PROGRESO";
}

BUILDERS.armory = (body) => {
  body = body || $("#drawer-body");
  body.textContent = "";

  const ownedCount = ITEMS.filter((item) => S.isOwned(item.id)).length;
  const linkedCount = ITEMS.filter((item) => item.shopId && shopProduct(item.shopId)).length;

  const intro = el("section", "card armory-intro");
  intro.innerHTML = `
    <div class="armory-context">
      <span class="armory-context-kicker">MI ARMARIO</span>
      <h4>Tu equipo digital, conectado con la tienda real.</h4>
      <div class="sub">Aquí equipas lo que ya tienes. Los artículos físicos muestran exactamente el mismo nombre y precio publicado en bayona-jet.vercel.app. Lo que es solo digital se consigue con tu progreso, no con un código de compra.</div>
      <div class="armory-stats" aria-label="Resumen del armario">
        <span><b>${ownedCount}</b> desbloqueados</span>
        <span><b>${linkedCount}</b> gemelos físicos</span>
        <span><b>${SHOP_PRODUCTS.length}</b> productos en tienda</span>
      </div>
    </div>`;
  intro.appendChild(storeLink(`VER TIENDA BAYONA · ${SHOP_PRODUCTS.length} PRODUCTOS`, null, "btn btn-primary btn-block armory-store-main"));
  body.appendChild(intro);

  // ---------- ROTACIÓN 360° (accesible: botones + arrastre) ----------
  const rot = el("div", "card armory-view-card");
  rot.innerHTML = `<h4>VISTA 360°</h4><div class="sub">Gira a tu personaje para comprobar cómo queda lo equipado.</div>`;
  const row = el("div", "card-row");
  row.style.marginTop = "10px";
  const bL = el("button", "btn grow", "◀ GIRAR");
  const bR = el("button", "btn grow", "GIRAR ▶");
  bL.type = bR.type = "button";
  bL.onclick = () => rotateAvatar(-Math.PI / 8);
  bR.onclick = () => rotateAvatar(Math.PI / 8);
  row.append(bL, bR);
  rot.appendChild(row);
  body.appendChild(rot);

  SLOTS.forEach((slot) => {
    const slotItems = ITEMS.filter((i) => i.slot === slot);
    if (!slotItems.length) return;

    body.appendChild(el("div", "sec-label", SLOT_LABEL[slot] || slot.toUpperCase()));
    const grid = el("div", "items armory-items");

    slotItems.forEach((it) => {
      const owned = S.isOwned(it.id);
      const equipped = S.data.inventory.equipped[slot] === it.id;
      const rar = RARITY[it.rarity] || { color: "#8a8a8a", label: it.rarity };
      const product = it.shopId ? shopProduct(it.shopId) : null;
      const card = el("article", `item armory-item ${equipped ? "equipped" : ""} ${owned ? "" : "locked"}`);
      const col = it.vis.color || "#141414";
      const acc = it.vis.accent || col;

      card.innerHTML = `
        <div class="swatch" style="background:linear-gradient(135deg,${col},${acc})"></div>
        <div class="armory-item-copy">
          <div class="nm">${esc(it.name)}</div>
          <span class="rar" style="color:${rar.color}">${esc(rar.label)}</span>
          <div class="armory-item-status">${esc(itemStatus(it, owned, product))}</div>
          ${product ? `<div class="armory-shop-meta"><strong>${esc(product.priceDisplay)}</strong><span>${esc(product.eurDisplay)}</span><small>${esc(product.collection)} · ${esc(product.category)}</small></div>` : ""}
        </div>`;

      const actions = el("div", "armory-item-actions");

      if (owned) {
        const equip = el("button", `btn ${equipped ? "" : "btn-primary"} grow`, equipped ? "EQUIPADO" : "EQUIPAR");
        equip.type = "button";
        equip.disabled = equipped;
        equip.setAttribute("aria-pressed", String(equipped));
        equip.onclick = () => {
          S.equip(it.id);
          UI.W?.avatar.setAction("wave");
          setTimeout(() => UI.W?.avatar.setAction("idle"), 1400);
          toast("EQUIPADO", it.name);
          BUILDERS.armory();
        };
        actions.appendChild(equip);
      } else if (product) {
        const redeem = el("button", "btn grow", "YA LO TENGO · CANJEAR");
        redeem.type = "button";
        redeem.onclick = () => phygitalFlow(it, product);
        actions.appendChild(redeem);
      } else {
        const progress = el("span", "armory-progress-lock", "DESBLOQUEO POR PROGRESO");
        actions.appendChild(progress);
      }

      if (product) {
        actions.appendChild(storeLink("VER EN TIENDA ↗", product.id, "btn grow armory-shop-link"));
      }

      card.appendChild(actions);
      grid.appendChild(card);
    });

    body.appendChild(grid);
  });

  const legend = el("div", "media-caption");
  legend.textContent = "RAREZAS: " + Object.values(RARITY).map((r) => r.label).join(" · ");
  body.appendChild(legend);

  body.appendChild(el("div", "sec-label", "CÓDIGOS PHYGITAL"));
  const aud = el("div", "card");
  const red = S.data.phygital?.redeemed || [];
  aud.innerHTML = red.length
    ? red.slice(0, 5).map((r) => `<div class="kv"><span class="k">${esc(r.code)}</span><span class="v">${esc(S.item(r.itemId)?.name || r.itemId)} · ${esc(r.at.slice(0, 10))}</span></div>`).join("")
    : `<div class="sub">Cuando compres un producto BAYONA con gemelo digital, su código podrá desbloquear aquí la versión vinculada. Esta beta valida el código localmente; la validación de fabricación seguirá necesitando backend antes de producción.</div>`;
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

function phygitalFlow(it, product = null) {
  // Nunca se ofrece un código físico para un objeto digital sin producto real.
  if (!it?.physical || !product) {
    toast("OBJETO DIGITAL", "Este objeto se desbloquea con tu progreso.");
    return;
  }

  showModal(`
    <div class="cine-tag">GEMELO DIGITAL</div>
    <div class="cine-title" style="font-size:20px">${esc(product.name)}</div>
    <div class="sub">Si ya tienes este producto físico, introduce el código único del paquete para desbloquear su gemelo digital. Cada código solo puede usarse una vez.</div>
    <div class="armory-modal-product"><strong>${esc(product.priceDisplay)}</strong><span>${esc(product.eurDisplay)}</span></div>
    <input id="pf-code" maxlength="18" placeholder="BAY-XXXX-XXXX-XXXX" style="text-transform:uppercase" />
    <div class="sub" id="pf-msg" style="min-height:18px"></div>
    <div style="display:flex;gap:8px">
      <button class="btn grow" id="pf-cancel">CANCELAR</button>
      <button class="btn btn-primary grow" id="pf-ok">VERIFICAR Y DESBLOQUEAR</button>
    </div>
    <div style="height:8px"></div>
    <button class="btn btn-block" id="pf-demo">GENERAR CÓDIGO DE DEMO</button>
    <div class="sub">Solo para probar esta beta. Los códigos comerciales reales deberán validarse contra backend.</div>
  `, () => {
    $("#pf-cancel").onclick = hideModal;
    $("#pf-demo").onclick = () => {
      $("#pf-code").value = makeCode();
    };
    $("#pf-ok").onclick = () => {
      const raw = $("#pf-code").value;
      const v = validateCode(raw);
      const msg = $("#pf-msg");
      if (!v.ok) { msg.textContent = v.reason; msg.style.color = "var(--danger)"; return; }
      const result = verifyAndRedeem(S, raw, it.id);
      if (!result.ok) { msg.textContent = result.reason; msg.style.color = "var(--danger)"; return; }
      hideModal();
      S.equip(it.id);
      toast("GEMELO DESBLOQUEADO", `${product.name} · ${result.note}`, "gold");
      BUILDERS.armory();
    };
  });
}
