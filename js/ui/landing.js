// ============================================================
// BAYONA · LUXE — landing pública (nivel motionsites.ai)
// ------------------------------------------------------------
// Una sola cosa que hacer: vender antes de ENTRAR. La estructura
// es la de cualquier producto serio: nav sticky glass, hero con
// la promesa, bento de features, planes y footer. Todo el texto
// vive en js/i18n.js (catálogo cmd.* / luxe.*): aquí solo se
// pinta y se revela con scroll. Sin datos, sin inventar nada.
// ============================================================

/** Contenido de la landing (todo en es-ES, desde catálogo). */
export function contenidoLanding(t) {
  return {
    nav: [
      { href: "#luxe-features", label: t("luxe.nav.features") },
      { href: "#luxe-planes", label: t("luxe.nav.planes") },
      { href: "#luxe-faq", label: t("luxe.nav.faq") },
    ],
    hero: {
      kicker: t("luxe.hero.kicker"),
      tituloA: t("luxe.hero.tituloA"),
      tituloB: t("luxe.hero.tituloB"),
      sub: t("luxe.hero.sub"),
      cta: t("luxe.hero.cta"),
      ctaGhost: t("luxe.hero.ctaGhost"),
      proof: [
        { n: "100%", k: t("luxe.proof.local") },
        { n: "0", k: t("luxe.proof.nube") },
        { n: "38", k: t("luxe.proof.suites") },
      ],
      visualHint: t("luxe.hero.visualHint"),
    },
    features: [
      { icon: "🏋️", titulo: t("luxe.f1.titulo"), texto: t("luxe.f1.texto"), meta: t("luxe.f1.meta") },
      { icon: "🥗", titulo: t("luxe.f2.titulo"), texto: t("luxe.f2.texto"), meta: t("luxe.f2.meta") },
      { icon: "😴", titulo: t("luxe.f3.titulo"), texto: t("luxe.f3.texto"), meta: t("luxe.f3.meta") },
      { icon: "📈", titulo: t("luxe.f4.titulo"), texto: t("luxe.f4.texto"), meta: t("luxe.f4.meta") },
      { icon: "🎥", titulo: t("luxe.f5.titulo"), texto: t("luxe.f5.texto"), meta: t("luxe.f5.meta") },
      { icon: "🛡️", titulo: t("luxe.f6.titulo"), texto: t("luxe.f6.texto"), meta: t("luxe.f6.meta") },
    ],
    planes: [
      {
        id: "atleta",
        nombre: t("luxe.plan.atleta.nombre"),
        precio: "0",
        periodo: t("luxe.plan.periodo"),
        cta: t("luxe.plan.atleta.cta"),
        destacado: false,
        perks: [
          t("luxe.plan.atleta.p1"),
          t("luxe.plan.atleta.p2"),
          t("luxe.plan.atleta.p3"),
        ],
      },
      {
        id: "pro",
        nombre: t("luxe.plan.pro.nombre"),
        precio: "9",
        periodo: t("luxe.plan.periodo"),
        cta: t("luxe.plan.pro.cta"),
        destacado: true,
        perks: [
          t("luxe.plan.pro.p1"),
          t("luxe.plan.pro.p2"),
          t("luxe.plan.pro.p3"),
          t("luxe.plan.pro.p4"),
        ],
      },
      {
        id: "centro",
        nombre: t("luxe.plan.centro.nombre"),
        precio: "29",
        periodo: t("luxe.plan.periodo"),
        cta: t("luxe.plan.centro.cta"),
        destacado: false,
        perks: [
          t("luxe.plan.centro.p1"),
          t("luxe.plan.centro.p2"),
          t("luxe.plan.centro.p3"),
          t("luxe.plan.centro.p4"),
        ],
      },
    ],
    faqTitulo: t("luxe.faq.titulo"),
    faq: [
      { q: t("luxe.faq1.q"), a: t("luxe.faq1.a") },
      { q: t("luxe.faq2.q"), a: t("luxe.faq2.a") },
      { q: t("luxe.faq3.q"), a: t("luxe.faq3.a") },
      { q: t("luxe.faq4.q"), a: t("luxe.faq4.a") },
    ],
    footer: {
      marca: t("luxe.footer.marca"),
      nota: t("luxe.footer.nota"),
    },
  };
}

/** HTML del hero (usa esc() en TODO lo dinámico). */
export function heroHTML(c) {
  return `
    <div class="luxe-hero-copy luxe-reveal">
      <div class="luxe-kicker">${c.hero.kicker}</div>
      <h1>${c.hero.tituloA}<br /><em>${c.hero.tituloB}</em></h1>
      <p class="luxe-sub">${c.hero.sub}</p>
      <div class="luxe-hero-actions">
        <button class="luxe-btn-primary" id="luxe-cta-entrar">${c.hero.cta}</button>
        <button class="luxe-btn-ghost" id="luxe-cta-demo">${c.hero.ctaGhost}</button>
      </div>
      <div class="luxe-hero-proof">
        ${c.hero.proof.map((p) => `<span><b>${p.n}</b> ${p.k}</span>`).join("")}
      </div>
    </div>
    <div class="luxe-hero-visual luxe-reveal" aria-hidden="true">
      <div class="luxe-hero-visual-inner">
        <div class="luxe-avatar-placeholder">◈</div>
        <div class="luxe-hint">${c.hero.visualHint}</div>
      </div>
    </div>`;
}

/** HTML del bento de features. */
export function featuresHTML(c) {
  return `
    <div class="luxe-section-head luxe-reveal">
      <div class="luxe-label">${c.nav[0].label.toUpperCase()}</div>
      <h2>${c.hero.tituloA} ${c.hero.tituloB}</h2>
      <p>${c.hero.sub}</p>
    </div>
    <div class="luxe-bento">
      ${c.features
        .map(
          (f, i) => `
        <div class="luxe-bento-card${i === 0 ? " wide" : " third"} luxe-reveal">
          <div class="luxe-card-icon">${f.icon}</div>
          <h3>${f.titulo}</h3>
          <p>${f.texto}</p>
          <div class="luxe-card-meta">${f.meta}</div>
        </div>`
        )
        .join("")}
    </div>`;
}

/** HTML de planes + FAQ. */
export function planesHTML(c) {
  return `
    <div class="luxe-section-head luxe-reveal">
      <div class="luxe-label">${c.nav[1].label.toUpperCase()}</div>
      <h2>${c.planes.length} ${c.nav[1].label.toLowerCase()}</h2>
      <p>${c.footer.nota}</p>
    </div>
    <div class="luxe-pricing">
      ${c.planes
        .map(
          (p) => `
        <div class="luxe-price-card${p.destacado ? " featured" : ""} luxe-reveal">
          <h3>${p.nombre}</h3>
          <div class="luxe-price">${p.precio}€ <span>/${p.periodo}</span></div>
          <ul>${p.perks.map((x) => `<li>${x}</li>`).join("")}</ul>
          <button class="luxe-btn-primary luxe-price-cta" data-plan="${p.id}">${p.cta}</button>
          <div class="luxe-card-meta">${p.destacado ? "★ " : ""}${p.id}</div>
        </div>`
        )
        .join("")}
    </div>
    <div id="luxe-faq" class="luxe-section-head" style="margin-top:48px">
      <div class="luxe-label">FAQ</div>
      <h2>${c.faqTitulo}</h2>
    </div>
    ${c.faq
      .map(
        (f) => `
      <div class="luxe-bento-card luxe-reveal" style="margin-bottom:8px">
        <h3>${f.q}</h3>
        <p>${f.a}</p>
      </div>`
      )
      .join("")}`;
}

/** Instala el IntersectionObserver del reveal (sin librerías). */
export function instalarReveal(root = document) {
  const targets = root.querySelectorAll(".luxe-reveal");
  if (!targets.length) return 0;
  if (typeof IntersectionObserver === "undefined") {
    targets.forEach((n) => n.classList.add("in"));
    return targets.length;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  targets.forEach((n) => io.observe(n));
  return targets.length;
}

/** Monta la landing dentro de #luxe-landing y cablea CTAs. */
export function montarLanding({ t, esc, onEntrar } = {}) {
  const root = document.getElementById("luxe-landing");
  if (!root || typeof t !== "function") return null;

  const c = contenidoLanding(t);
  const e = typeof esc === "function" ? esc : (s) => s;

  root.innerHTML = `
    <nav id="luxe-nav" aria-label="${t("luxe.nav.aria")}">
      <a class="luxe-brand" href="#luxe-landing">
        <span class="luxe-brand-mark">◈</span>
        <span class="luxe-brand-name">BAYONA</span>
      </a>
      <div class="luxe-nav-links">
        ${c.nav.map((n) => `<a href="${e(n.href)}">${e(n.label)}</a>`).join("")}
      </div>
      <div class="luxe-nav-cta">
        <button class="luxe-cta" id="luxe-nav-entrar">${e(c.hero.cta)}</button>
      </div>
    </nav>
    <div class="luxe-aurora" aria-hidden="true"></div>
    <header class="luxe-hero">
      ${heroHTML(c)}
    </header>
    <section class="luxe-section" id="luxe-features">
      ${featuresHTML(c)}
    </section>
    <section class="luxe-section" id="luxe-planes">
      ${planesHTML(c)}
    </section>
    <footer class="luxe-footer">
      <span>${e(c.footer.marca)}</span>
      <span>${e(c.footer.nota)}</span>
    </footer>`;

  // TODO texto dinámico ya pasó por el catálogo; los botones dispara la app
  root.querySelectorAll("[data-plan]").forEach((b) => {
    b.addEventListener("click", () => onEntrar && onEntrar(b.dataset.plan));
  });
  const entrar = document.getElementById("luxe-cta-entrar");
  if (entrar) entrar.addEventListener("click", () => onEntrar && onEntrar(null));
  const navEntrar = document.getElementById("luxe-nav-entrar");
  if (navEntrar) navEntrar.addEventListener("click", () => onEntrar && onEntrar(null));
  const demo = document.getElementById("luxe-cta-demo");
  if (demo) demo.addEventListener("click", () => onEntrar && onEntrar("demo"));

  instalarReveal(root);
  return root;
}
