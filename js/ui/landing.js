// ============================================================
// BAYONA · LUXE — landing pública (nivel motionsites.ai)
// ------------------------------------------------------------
// Una sola cosa que hacer: vender antes de ENTRAR. La estructura
// es la de cualquier producto serio: nav sticky glass, hero con
// la promesa, bento de features, planes y footer. Todo el texto
// vive en js/i18n.js (catálogo cmd.* / luxe.*): aquí solo se
// pinta y se revela con scroll. Sin datos, sin inventar nada.
// ============================================================
import { PLANS, PLAN_META, hasFeature, featureTier } from "../entitlements.js";
import { applyTheme, readTheme } from "../theme.js";
import { t } from "../i18n.js";

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
        { n: "41", k: t("luxe.proof.suites") },
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
    planes: PLANS.map((id) => {
      const meta = PLAN_META[id];
      const perks = {
        free: ["Inicio y registro", "Entrenamiento básico", "Progreso esencial"],
        raiz: ["Plan mensual", "Seguimiento", "Comunidad y personalización"],
        performance: ["IA adaptativa", "Analítica avanzada", "Planificación profesional"],
        elite: ["Prioridad humana", "Sesiones privadas según plan", "Acceso completo"],
      }[id];
      return {
        id,
        nombre: meta.label,
        precio: String(meta.priceEur),
        periodo: "mes",
        cta: id === "free" ? "EMPEZAR" : `VER ${meta.label}`,
        destacado: id === "performance",
        perks,
      };
    }),
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
        <button class="luxe-theme-toggle" id="luxe-theme-toggle" type="button" aria-label="${t("theme.toggle.aria")}">◐</button>
        <button class="luxe-cta" id="luxe-nav-entrar">${e(c.hero.cta)}</button>
      </div>
    </nav>
    <div class="luxe-aurora" aria-hidden="true"></div>
    <header class="luxe-hero">
      ${heroHTML(c)}
    </header>
    <section class="luxe-section luxe-demo-section" id="luxe-demo">
      ${demoHTML("free")}
    </section>
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
  if (demo) demo.addEventListener("click", () => root.querySelector("#luxe-demo")?.scrollIntoView({ behavior:"smooth", block:"start" }));

  const themeToggle = document.getElementById("luxe-theme-toggle");
  if (themeToggle) themeToggle.addEventListener("click", () => {
    const next = readTheme() === "light" ? "dark" : "light";
    applyTheme(next);
  });

  installDemo(root);
  instalarReveal(root);
  return root;
}

const DEMO_SURFACES = [
  ["home",t("demo.nav.home")],
  ["training",t("demo.nav.training")],
  ["nutrition",t("demo.nav.nutrition")],
  ["progress",t("demo.nav.progress")],
  ["coach",t("demo.nav.coach")],
];

function lockMark(plan, feature) {
  if (hasFeature(plan, feature)) return '<span class="luxe-demo-ok">INCLUIDO</span>';
  return `<span class="luxe-demo-lock">BLOQUEADO · ${PLAN_META[featureTier(feature)].label}</span>`;
}

export function demoHTML(plan = "free") {
  const meta = PLAN_META[plan] || PLAN_META.free;
  return `
    <section class="luxe-demo-shell" id="luxe-demo-shell" aria-label="${t("demo.aria")}">
      <div class="luxe-demo-copy">
        <div class="luxe-label">VER CÓMO FUNCIONA</div>
        <h2>Prueba BAYONA antes de entrar.</h2>
        <p>Cambia de plan, luz y zona. El teléfono te enseña qué puedes usar y qué puedes desbloquear.</p>
        <div class="luxe-demo-plan-tabs" role="group" aria-label="${t("demo.plan.aria")}">
          ${PLANS.map((id)=>`<button type="button" data-demo-plan="${id}" class="${id===plan?"on":""}">${PLAN_META[id].label}</button>`).join("")}
        </div>
        <div class="luxe-demo-theme">
          <span>${t("demo.theme.aria")}</span>
          <button type="button" data-demo-theme="dark">NOCHE</button>
          <button type="button" data-demo-theme="light">DÍA</button>
        </div>
        <div class="luxe-demo-meta"><strong>${meta.label}</strong><span>${meta.tagline}</span></div>
      </div>
      <div class="luxe-device-stage">
        <div class="luxe-device">
          <div class="luxe-device-top"><i></i><span>9:41</span><b>BAYONA</b><em>●●●</em></div>
          <div class="luxe-device-screen" data-demo-surface="home"></div>
          <nav class="luxe-device-nav" aria-label="${t("demo.surfaces.aria")}">
            ${DEMO_SURFACES.map(([id,label])=>`<button type="button" data-demo-surface-btn="${id}" class="${id==="home"?"on":""}">${label}</button>`).join("")}
          </nav>
        </div>
      </div>
    </section>`;
}

function paintDemoSurface(root, plan, surface) {
  const meta = PLAN_META[plan] || PLAN_META.free;
  const screen = root.querySelector(".luxe-device-screen");
  if (!screen) return;
  screen.dataset.demoSurface = surface;
  const cards = {
    home:["TU HUB","Tu personaje, tu día y lo que toca ahora.","training.basic"],
    training:["ENTRENAMIENTO","Preparación · trabajo principal · cierre.","training.custom"],
    nutrition:["NUTRICIÓN","Hora, última comida, agua y plan semanal.","nutrition.advanced"],
    progress:["PROGRESO","Fotos, fuerza, volumen y constancia.","progress.advanced"],
    coach:["COACH","Chat contextual dentro de la sesión.","coach.chat"],
  };
  const [kicker,title,feature]=cards[surface]||cards.home;
  screen.innerHTML=`
    <div class="luxe-demo-user"><span class="luxe-demo-avatar">B</span><span><small>${kicker}</small><strong>${title}</strong></span><i>${meta.label}</i></div>
    <div class="luxe-demo-focus">
      <div class="luxe-demo-orbit"><i></i><span>PERSONAJE</span></div>
      <div><small>${surface==="home"?"MARTES · 6 OCT":t("demo.view.label")}</small><h3>${title}</h3><p>${meta.tagline}</p>${lockMark(plan,feature)}</div>
    </div>
    <div class="luxe-demo-grid">
      <article><small>HOY</small><strong>${surface==="training"?"3 bloques":"Tu siguiente acción"}</strong><span>Datos reales</span></article>
      <article><small>COACH</small><strong>${hasFeature(plan,"ai.adaptive")?"IA adaptativa":"Guía esencial"}</strong>${lockMark(plan,"ai.adaptive")}</article>
      <article><small>BACKUP</small><strong>Copia segura</strong>${lockMark(plan,"backup.cloud")}</article>
      <article><small>ANALÍTICA</small><strong>Progreso avanzado</strong>${lockMark(plan,"progress.advanced")}</article>
    </div>`;
}

function installDemo(root) {
  const shell=root.querySelector("#luxe-demo-shell");
  if (!shell) return;
  let plan="free",surface="home";
  const redraw=()=>{
    shell.querySelectorAll("[data-demo-plan]").forEach((b)=>b.classList.toggle("on",b.dataset.demoPlan===plan));
    shell.querySelectorAll("[data-demo-surface-btn]").forEach((b)=>b.classList.toggle("on",b.dataset.demoSurfaceBtn===surface));
    const meta=shell.querySelector(".luxe-demo-meta");
    if(meta) {
      meta.textContent="";
      const strong=document.createElement("strong"), span=document.createElement("span");
      strong.textContent=PLAN_META[plan].label;
      span.textContent=PLAN_META[plan].tagline;
      meta.append(strong,span);
    }
    paintDemoSurface(shell,plan,surface);
  };
  shell.querySelectorAll("[data-demo-plan]").forEach((b)=>b.addEventListener("click",()=>{plan=b.dataset.demoPlan;redraw();}));
  shell.querySelectorAll("[data-demo-surface-btn]").forEach((b)=>b.addEventListener("click",()=>{surface=b.dataset.demoSurfaceBtn;redraw();}));
  shell.querySelectorAll("[data-demo-theme]").forEach((b)=>b.addEventListener("click",()=>{
    const theme=b.dataset.demoTheme; applyTheme(theme);
    shell.querySelectorAll("[data-demo-theme]").forEach((x)=>x.classList.toggle("on",x.dataset.demoTheme===theme));
  }));
  shell.querySelector(`[data-demo-theme="${readTheme()}"]`)?.classList.add("on");
  redraw();
}
