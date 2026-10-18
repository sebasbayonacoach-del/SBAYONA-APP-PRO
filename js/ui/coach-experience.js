// BAYONA Coach Studio · anatomy-inspired, original illustration and interactions.
// Does not copy competitor assets, claim 3D capabilities or expose private videos.
import { t } from "../i18n.js";
const n = (tag, cls = "", text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};
const REGIONS = [
  {id:"upper",label:t("coach.elite.upper"),detail:"Empujes y tracciones",
   copy:"Estudia los músculos protagonistas y la calidad del gesto. Después elige ejercicios y programa la sesión."},
  {id:"core",label:t("coach.elite.core"),detail:"Control y estabilidad",
   copy:"Evalúa el control del tronco, la respiración y la transferencia de fuerza antes de aumentar la carga."},
  {id:"lower",label:t("coach.elite.lower"),detail:"Cadera, rodilla y tobillo",
   copy:"Observa los patrones de sentadilla, bisagra y trabajo unilateral. Busca alternativas según el objetivo."},
];
const anatomy =
'<svg viewBox="0 0 310 370" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+
'<defs><linearGradient id="bayonaBodyFill" x1="77" y1="24" x2="220" y2="340" gradientUnits="userSpaceOnUse"><stop stop-color="#303B40"/><stop offset="1" stop-color="#151A1D"/></linearGradient>'+
'<linearGradient id="bayonaMuscleFill" x1="130" y1="0" x2="195" y2="325" gradientUnits="userSpaceOnUse"><stop stop-color="#F4B476"/><stop offset="1" stop-color="#CB704B"/></linearGradient></defs>'+
'<g stroke="#48545A" stroke-width="2" stroke-linejoin="round" fill="url(#bayonaBodyFill)"><ellipse cx="154" cy="43" rx="29" ry="35"/>'+
'<path d="M131 76L111 84 86 100 64 156 44 222 51 232 61 231 83 181 106 129 111 159 119 220 105 276 102 344 123 350 136 291 153 240 174 291 190 350 209 344 202 276 189 220 198 159 202 129 225 181 247 231 257 232 263 222 243 156 220 100 197 84 177 76 167 95 140 95Z"/></g>'+
'<g class="bayona-anatomy-region region-upper" fill="url(#bayonaMuscleFill)" stroke="#F4A261" stroke-width="1.1"><path d="M111 96L143 104 151 138 124 145 109 127Z"/><path d="M196 96L165 104 158 138 185 145 199 127Z"/><path d="M91 108L76 149 70 174 80 178 100 129Z"/><path d="M214 108L229 149 236 174 226 178 205 129Z"/></g>'+
'<g class="bayona-anatomy-region region-core" fill="url(#bayonaMuscleFill)" stroke="#F4A261" stroke-width=".9"><path d="M128 148L150 144 150 205 126 201Z"/><path d="M156 144L179 148 177 201 156 205Z"/><path d="M115 151L124 151 122 203 114 200Z"/><path d="M190 151L182 151 184 203 192 200Z"/></g>'+
'<g class="bayona-anatomy-region region-lower" fill="url(#bayonaMuscleFill)" stroke="#F4A261" stroke-width="1"><path d="M126 219L151 233 137 284 121 324 108 320 116 272Z"/><path d="M159 233L183 219 195 272 201 320 187 324 172 284Z"/><path d="M118 329L121 341 111 343 110 327Z"/><path d="M190 329L193 343 204 341 201 327Z"/></g>'+
'<path d="M154 88V225" stroke="#F5C5A0" opacity=".26" stroke-width="1.5" stroke-dasharray="3 6"/><circle cx="154" cy="210" r="91" stroke="#E0A477" stroke-opacity=".14" stroke-dasharray="2 7"/><circle cx="154" cy="210" r="129" stroke="#E0A477" stroke-opacity=".08"/></svg>';

export function coachExperienceRegions() { return REGIONS.map(x => ({...x})); }

export function renderCoachExperience(body, {clients=[], metrics={}, openSection=()=>{}, onRoster=()=>{}}={}) {
  const section=n("section","one-elite-deck");
  const header=n("div","one-elite-header"), identity=n("div","one-elite-identity");
  identity.append(n("span","one-elite-symbol","B"),n("div","one-elite-identity-text"));
  identity.lastChild.append(n("strong","","BAYONA / PERFORMANCE STUDIO"),
    n("small","","DIRECCIÓN TÉCNICA · ACCESO DEL ENTRENADOR"));
  header.append(identity,n("span","one-elite-secure","ESPACIO DE ENTRENADOR"));
  section.append(header);

  const grid=n("div","one-elite-grid"), editorial=n("div","one-elite-editorial");
  editorial.append(n("span","one-elite-eyebrow","01 / TU CENTRO DE MOVIMIENTO"),
    n("h2","one-elite-title","Observa el movimiento. Diseña el progreso."),
    n("p","one-elite-lead","Del gesto a la programación. Consulta ejercicios, prepara sesiones y acompaña a tus atletas desde un mismo lugar."));
  const actions=n("div","one-elite-actions");
  const library=n("button","one-elite-cta primary","EXPLORAR 3.141 EJERCICIOS ↗");
  const routine=n("button","one-elite-cta secondary","CREAR UNA RUTINA →");
  library.type=routine.type="button";
  library.addEventListener("click",()=>openSection("library"));
  routine.addEventListener("click",()=>openSection("library"));
  actions.append(library,routine);
  editorial.append(actions);
  const benefits=n("div","one-elite-badges");
  ["BIBLIOTECA TÉCNICA","PLANES PERSONALIZABLES","CONTROL DEL ENTRENADOR"].forEach(x=>benefits.append(n("span","",x)));
  editorial.append(benefits);
  if (clients.some(c => c.demo)) {
    editorial.append(n("p", "one-elite-disclosure",
      "MODO DEMOSTRACIÓN: las métricas de cartera incluyen ejemplos ficticios. La biblioteca y tus herramientas son reales."));
  }
  grid.append(editorial);

  const explorer=n("section","one-elite-explorer");
  explorer.setAttribute("aria-label",t("coach.elite.aria"));
  const head=n("div","one-elite-explorer-top");
  head.append(n("span","","EXPLORADOR DEL MOVIMIENTO"),
    n("small","","ESQUEMA ORIENTATIVO · NO MODELO 3D"));
  explorer.append(head);
  const map=n("div","one-elite-map"), visual=n("div","one-elite-anatomy");
  visual.innerHTML=anatomy; // Fixed authored markup, no user input.
  const rail=n("div","one-elite-muscle-rail"), regionButtons=[];
  const box=n("div","one-elite-region-detail");
  const label=n("span","one-elite-region-label"), detail=n("strong"), explanation=n("p");
  box.append(label,detail,explanation);
  const choose=id=>{
    const found=REGIONS.find(x=>x.id===id)||REGIONS[0];
    visual.dataset.region=found.id;
    label.textContent=found.label.toUpperCase();
    detail.textContent=found.detail;
    explanation.textContent=found.copy;
    regionButtons.forEach(b=>{
      const selected=b.dataset.region===found.id;
      b.classList.toggle("active",selected);
      b.setAttribute("aria-pressed",String(selected));
    });
  };
  REGIONS.forEach(r=>{
    const b=n("button","one-elite-muscle",r.label);
    b.type="button";b.dataset.region=r.id;b.addEventListener("click",()=>choose(r.id));
    regionButtons.push(b);rail.append(b);
  });
  const open=n("button","one-elite-region-open","ABRIR BIBLIOTECA ↗");
  open.type="button";open.addEventListener("click",()=>openSection("library"));
  rail.append(box,open);map.append(visual,rail);explorer.append(map);grid.append(explorer);
  section.append(grid);

  const stats=n("div","one-elite-stats");
  [
    {value:"3.141",label:"FICHAS CATALOGADAS",detail:"Consulta técnica"},
    {value:String(metrics.sesionesHoy??"—"),label:"SESIONES DEMO",detail:"No representa agenda real"},
    {value:String(metrics.alertas??"—"),label:"AVISOS DEMO",detail:"Ejemplos de revisión"},
    {value:String(clients.filter(c=>!c.demo).length),label:"FICHAS LOCALES",detail:"En este dispositivo"}
  ].forEach(x=>{
    const item=n("div","one-elite-stat");
    item.append(n("strong","",x.value),n("span","",x.label),n("small","",x.detail));
    stats.append(item);
  });section.append(stats);

  const bottom=n("div","one-elite-next");
  bottom.append(n("span","","¿POR DÓNDE CONTINUAMOS?"));
  [
    ["BIBLIOTECA","Seleccionar ejercicios",()=>openSection("library")],
    ["CLIENTES","Revisar fichas y contexto",onRoster],
    ["AGENDA","Organizar la semana",()=>openSection("agenda")]
  ].forEach(([name,desc,action])=>{
    const b=n("button","one-elite-next-action");b.type="button";
    b.append(n("strong","",name+" ↗"),n("small","",desc));
    b.addEventListener("click",action);bottom.append(b);
  });
  section.append(bottom);choose("upper");body.append(section);
  return section;
}
