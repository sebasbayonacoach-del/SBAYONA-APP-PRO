import {t} from "../i18n.js";
// BAYONA Coach Studio — visual overview of EXISTING documented data.
// No inferred attendance, client progress or actual video rights.
import {TRAININGYM_OVERVIEW} from "../data/trainingym-overview.js";

const el = (tag, cls = "", value) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (value != null) node.textContent = String(value);
  return node;
};
const fmt = value => Number(value || 0).toLocaleString("es-ES");
const clamp = value => Math.max(0, Math.min(100, Number(value) || 0));
const localRecords = clients => clients.filter(c => c && c.demo !== true);
const demoRecords = clients => clients.filter(c => c && c.demo === true);

export function coachVisualFacts(clients = [], plan = null) {
  const real = localRecords(clients);
  const demo = demoRecords(clients);
  return {
    catalogTotal: TRAININGYM_OVERVIEW.total,
    states: {...TRAININGYM_OVERVIEW.states},
    muscles: TRAININGYM_OVERVIEW.muscles.map(r => ({...r})),
    realCount: real.length,
    demoCount: demo.length,
    realReadyKnown: real.filter(r => Number.isFinite(r.preparacion)).length,
    planWeek: Number.isInteger(plan?.semana) ? plan.semana : null,
    planTotal: Number.isInteger(plan?.totalSemanas) ? plan.totalSemanas : null
  };
}
function button(cls, label, click) {
  const item = el("button", cls, label);
  item.type = "button";
  item.addEventListener("click", click);
  return item;
}
function sectionHead(eyebrow, name, caption) {
  const head=el("div","one-v360-panel-head");
  const copy=el("div");
  copy.append(el("span","one-v360-eyebrow",eyebrow),el("h3","",name));
  if(caption)copy.append(el("p","",caption));
  head.append(copy);
  return head;
}
function metricBar(value, aria) {
  const wrap=el("div","one-v360-meter");
  wrap.setAttribute("role","img");
  wrap.setAttribute("aria-label",aria);
  const fill=el("i");
  fill.style.width=clamp(value)+"%";
  wrap.append(fill);
  return wrap;
}
function coachNavigation(body,target){
  if (target === "clients") body.querySelector(".one-roster")?.scrollIntoView({behavior:"smooth",block:"start"});
  if (target === "cycle") body.querySelector(".one-macro-preview")?.scrollIntoView({behavior:"smooth",block:"start"});
  if (target === "priorities") body.querySelector(".one-core-board")?.scrollIntoView({behavior:"smooth",block:"start"});
}

export function renderCoachVisual360(body,{
  clients=[], plan=null, onLibrary=()=>{}, onMuscle=()=>{},
  onAgenda=()=>{}, onRealClient=()=>{}, onTraining=()=>{}
}={}) {
  const stats=coachVisualFacts(clients,plan);
  const root=el("section","one-v360");
  root.id="coach-visual-360";
  root.setAttribute("aria-label",t("coach.visual.aria"));
  const lead=el("div","one-v360-lead");
  const copy=el("div");
  copy.append(el("span","one-v360-eyebrow","02 / CONTROL GENERAL"),
    el("h2","","Todo tu estudio, de un vistazo."),
    el("p","","Explora el contenido real, visualiza los perfiles de este dispositivo y consulta en qué fase de entrenamiento te encuentras."));
  const shortcuts=el("nav","one-v360-nav");
  shortcuts.setAttribute("aria-label",t("coach.visual.navAria"));
  [["EJERCICIOS",onLibrary],["FICHAS",()=>coachNavigation(body,"clients")],
   ["PRIORIDADES",()=>coachNavigation(body,"priorities")],["MACROCICLO",()=>coachNavigation(body,"cycle")]]
    .forEach(([name,action])=>shortcuts.append(button("one-v360-navlink",name+" ↗",action)));
  lead.append(copy,shortcuts);root.append(lead);

  const layout=el("div","one-v360-layout");
  const exercise=el("article","one-v360-panel one-v360-inventory");
  const inventoryHead=sectionHead("BIBLIOTECA / DATOS VERIFICADOS","Mapa de ejercicios",
    "Las barras cuentan fichas de catálogo, no vídeos distintos ni licencias de reproducción.");
  inventoryHead.append(button("one-v360-open","EXPLORAR BIBLIOTECA ↗",onLibrary));
  exercise.append(inventoryHead);
  const strip=el("div","one-v360-media-strip");
  strip.setAttribute("role","img");
  strip.setAttribute("aria-label",t("coach.visual.stateAria"));
  const statuses=[
    ["ok","OK EN REGISTRO",stats.states.ok],
    ["duplicate","REFERENCIA REUTILIZADA",stats.states.duplicate],
    ["no_video","SIN VÍDEO",stats.states.no_video],
    ["error","INCIDENCIAS",stats.states.error]
  ];
  for(const [id,name,value] of statuses){
    const segment=el("span","one-v360-strip-part one-v360-"+id);
    segment.style.width=(value/stats.catalogTotal*100)+"%";
    segment.title=fmt(value)+" fichas · "+name;
    strip.append(segment);
  }
  exercise.append(strip);
  const legend=el("div","one-v360-legend");
  statuses.forEach(([id,name,value])=>{
    const item=el("div","one-v360-legend-item");
    item.append(el("i","one-v360-dot one-v360-"+id),el("strong","",fmt(value)),el("span","",name));
    legend.append(item);
  });
  exercise.append(legend);
  const muscleHeader=el("div","one-v360-subhead");
  muscleHeader.append(el("strong","","Grupos musculares del catálogo"),
    el("small","","Pulsa un grupo para abrir sus fichas"));
  exercise.append(muscleHeader);
  const muscles=el("div","one-v360-muscles");
  const max=stats.muscles[0]?.count||1;
  const bars=[];
  stats.muscles.forEach((item,index)=>{
    const row=button("one-v360-muscle"+(index>=8?" more":""),"",()=>onMuscle(item.name));
    row.dataset.muscle=item.name;
    const top=el("span","one-v360-muscle-top");
    top.append(el("span","",item.name),el("strong","",fmt(item.count)));
    const graph=metricBar(item.count/max*100,fmt(item.count)+" ejercicios de "+item.name);
    row.append(top,graph);
    muscles.append(row);bars.push(row);
  });
  exercise.append(muscles);
  const toggle=button("one-v360-expand","VER LOS "+fmt(stats.muscles.length)+" GRUPOS ↓",()=>{
    const show=!muscles.classList.contains("expanded");
    muscles.classList.toggle("expanded",show);
    toggle.setAttribute("aria-expanded",String(show));
    toggle.textContent=show?"MOSTRAR MENOS ↑":"VER LOS "+fmt(stats.muscles.length)+" GRUPOS ↓";
  });
  toggle.setAttribute("aria-expanded","false");
  exercise.append(toggle);

  const clientsPanel=el("article","one-v360-panel one-v360-clients");
  clientsPanel.append(sectionHead("PERSONAS / DATOS SEPARADOS","Personas y preparación",
    "Fichas locales y ejemplos se muestran por separado; los números DEMO nunca se presentan como pacientes o clientes reales."));
  const counters=el("div","one-v360-counters");
  for(const [num,label] of [[stats.realCount,"PERFILES LOCALES"],[stats.demoCount,"EJEMPLOS DEMO"]]){
    const box=el("div","one-v360-counter");
    box.append(el("strong","",fmt(num)),el("small","",label));counters.append(box);
  }
  clientsPanel.append(counters);
  const real=localRecords(clients), demos=demoRecords(clients);
  const rows=el("div","one-v360-people");
  function appendPerson(person, demo){
    const card=el("div","one-v360-person"+(demo?" demo":" real"));
    const head=el("div","one-v360-person-head");
    const name=el("strong","",person.nombre||"Sin nombre");
    const flag=el("span","",demo?"EJEMPLO":"LOCAL");
    head.append(name,flag);
    card.append(head);
    const prep=Number.isFinite(person.preparacion)?clamp(person.preparacion):null;
    const known=Number.isFinite(person.adherencia)&&
      (demo||Number(person.adherenciaDias)>0);
    const adherence=known?clamp(person.adherencia):null;
    for(const [label,value] of [["PREPARACIÓN",prep],["ADHERENCIA",adherence]]){
      const display=el("div","one-v360-person-bar");
      const upper=el("div","");
      upper.append(el("span","",label),el("strong","",value==null?"Sin registro":Math.round(value)+"%"));
      display.append(upper,metricBar(value==null?0:value,label+" "+(value==null?"sin datos":Math.round(value)+" por ciento")));
      if(value==null)display.classList.add("unknown");
      card.append(display);
    }
    if(!demo)card.append(button("one-v360-person-open","VER FICHA →",()=>onRealClient(person)));
    rows.append(card);
  }
  real.forEach(item=>appendPerson(item,false));
  if(real.length===0)rows.append(el("p","one-v360-empty","Todavía no hay una ficha local disponible."));
  const example=el("details","one-v360-demo-people");
  const summary=el("summary","","VER "+fmt(demos.length)+" FICHAS DE EJEMPLO");
  example.append(summary);
  const demoRows=el("div","one-v360-demo-rows");
  demos.forEach(item=>{
    const card=el("div","one-v360-demo-mini");
    card.append(el("strong","",item.nombre||"Demo"),
      el("span","",(Number.isFinite(item.preparacion)?Math.round(item.preparacion)+"% preparación":"Sin dato")+
         " · "+(Number.isFinite(item.adherencia)?Math.round(item.adherencia)+"% adherencia":"Sin historial")));
    demoRows.append(card);
  });
  example.append(demoRows);rows.append(example);clientsPanel.append(rows);
  clientsPanel.append(button("one-v360-panel-action","VER TODA LA CARTERA ↗",()=>coachNavigation(body,"clients")));

  layout.append(exercise,clientsPanel);root.append(layout);

  const cycle=el("article","one-v360-panel one-v360-cycle");
  const cycleHead=sectionHead("PLANIFICACIÓN / ESTADO LOCAL","Macrociclo de entrenamiento",
    "Distribución de las fases configuradas en esta APP. Es una planificación local, no un historial de resultados de clientes.");
  cycleHead.append(button("one-v360-open","VER AGENDA ↗",onAgenda));
  cycle.append(cycleHead);
  const phases=Array.isArray(plan?.fases)?plan.fases:[];
  const total=Math.max(1,Number(plan?.totalSemanas)||1);
  if(phases.length){
    const timeline=el("div","one-v360-timeline");
    phases.forEach((phase)=>{
      const weeks=Math.max(1,(phase.to||1)-(phase.from||1)+1);
      const item=el("div","one-v360-phase "+(phase.estado||"futura"));
      item.style.flexGrow=String(weeks);
      item.style.flexBasis="0";
      const header=el("div","");
      header.append(el("strong","",phase.name||"Fase"),el("span","","S"+phase.from+"–"+phase.to));
      item.append(header,el("div","one-v360-phase-fill"),
        el("small","",phase.estado==="actual"?"FASE ACTUAL":phase.estado==="pasada"?"FINALIZADA":"PROGRAMADA"));
      timeline.append(item);
    });
    cycle.append(timeline);
    const footer=el("div","one-v360-cycle-footer");
    footer.append(el("span","","SEMANA "+String(plan.semana)+" / "+total),
      el("strong","","SESIÓN: "+String(plan?.hoy?.sesion||"Sin sesión")));
    cycle.append(footer);
  } else cycle.append(el("p","one-v360-empty","Aún no hay un macrociclo disponible."));
  const menu=el("div","one-v360-footer");
  menu.append(el("span","","VER MÁS, SIN PERDER EL CONTEXTO"));
  [["ENTRENAMIENTO",onTraining],["PRIORIDADES",()=>coachNavigation(body,"priorities")],
   ["FICHAS",()=>coachNavigation(body,"clients")],["AGENDA",onAgenda]]
    .forEach(([label,action])=>menu.append(button("one-v360-menu",label+" ↗",action)));
  cycle.append(menu);root.append(cycle);
  body.append(root);
  return root;
}
