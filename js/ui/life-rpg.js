import {t} from "../i18n.js";
// BAYONA LIFE RPG · optional visual game layer, one existing XP economy.
import {lifeMissions} from "../game/missions.js";
const modes=["simple","adventure","expert"];
const titles={simple:"Sencillo",adventure:"Aventura",expert:"Detallado"};
const areaInfo={
 body:{symbol:"◉",chapter:"MOVIMIENTO",copy:"Moverte, alimentarte y recuperar energía a tu ritmo.",route:"training"},
 mind:{symbol:"✦",chapter:"CLARIDAD",copy:"Leer, aprender o dedicar un momento a la atención.",route:"mind"},
 work:{symbol:"▣",chapter:"PROYECTOS",copy:"Estudiar, crear o completar algo importante.",route:"trabajo"},
 relationships:{symbol:"◇",chapter:"CONEXIONES",copy:"Cuidar a las personas que importan.",route:"planner"},
 purpose:{symbol:"✧",chapter:"SENTIDO",copy:"Reflexionar y actuar de acuerdo con tus valores.",route:"planner"}
};
const node=(tag,cls="",text)=>{
 const el=document.createElement(tag);if(cls)el.className=cls;
 if(text!==undefined)el.textContent=String(text);return el;
};
const button=(text,cls,fn)=>{
 const b=node("button",cls,text);b.type="button";b.addEventListener("click",fn);return b;
};
export function normalizeLifeRpgMode(m){return modes.includes(m)?m:"adventure";}
export function lifeRpgSnapshot({profile={},today={},life={},xp=0,level={},decision={}}={}){
 const missions=lifeMissions({life,today,date:today.date});
 const total=Number.isFinite(xp)?Math.max(0,xp):0;
 const need=Number.isFinite(level.need)&&level.need>0?level.need:1;
 const cur=Number.isFinite(level.cur)?Math.max(0,Math.min(need,level.cur)):0;
 return {
  mode:normalizeLifeRpgMode(profile.lifeRpgView),
  level:Number.isFinite(level.lvl)?Math.max(1,Math.floor(level.lvl)):1,
  totalXp:total, percent:Math.round(cur/need*100),
  toNext:Math.max(0,Math.ceil(need-cur)),areas:missions.areas,
  completed:missions.done,all:missions.total,
  claimable:missions.areas.filter(a=>a.done&&!a.claimed).length,
  recommendation:{
   title:String(decision.title||"Elige tu próximo paso"),
   body:String(decision.body||"Una acción pequeña que puedas realizar ahora."),
   cta:String(decision.actionLabel||"Comenzar")
  }
 };
}
export function lifeRpgAreaRoute(id){return areaInfo[id]?.route||"planner";}

export function renderLifeRpg(body,{snapshot,rank="INICIADO",onMode=()=>{},
 onMain=()=>{},onArea=()=>{},onClaim=()=>{},onExplore=()=>{}}={}){
 const d=snapshot;
 const section=node("section","bayona-rpg");
 section.dataset.mode=d.mode;
 section.setAttribute("aria-label",t("rpg.aria"));
 const header=node("div","bayona-rpg-header");
 const brand=node("div","bayona-rpg-brand");
 brand.append(node("span","bayona-rpg-b","B"));
 const brandInfo=node("div");
 brandInfo.append(node("strong","","BAYONA / LIFE RPG"),
                  node("small","","TU VIDA REAL ES LA AVENTURA"));
 brand.append(brandInfo);
 header.append(brand,node("span","bayona-rpg-edition","CAPÍTULO DE HOY"));
 section.append(header);

 const hero=node("div","bayona-rpg-hero");
 const story=node("div","bayona-rpg-story");
 story.append(node("span","bayona-rpg-kicker","01 / LA AVENTURA EMPIEZA AQUÍ"),
   node("h2","","Tu vida. Tu aventura."),
   node("p","bayona-rpg-lead","No necesitas ser atleta. Avanza a tu ritmo. Tu progreso pertenece a la vida real."));
 const quest=node("div","bayona-rpg-quest");
 quest.append(node("small","","TU SIGUIENTE MISIÓN"),
   node("strong","",d.recommendation.title),
   node("p","",d.recommendation.body));
 const questActions=node("div","bayona-rpg-quest-actions");
 questActions.append(button(d.recommendation.cta+" →","bayona-rpg-primary",onMain),
 button("Ver mis territorios","bayona-rpg-secondary",()=>section.querySelector(".bayona-rpg-map")?.scrollIntoView({behavior:"smooth",block:"nearest"})));
 story.append(quest,questActions);
 const level=node("div","bayona-rpg-level");
 const orb=node("div","bayona-rpg-orb");
 orb.setAttribute("aria-hidden","true");
 orb.innerHTML='<i class="ring ring-1"></i><i class="ring ring-2"></i><i class="ring ring-3"></i><b>B</b>';
 const rankName=node("div","bayona-rpg-rank");
 rankName.append(node("span","","TU EVOLUCIÓN"),
   node("strong","",rank),
   node("small","","NIVEL "+d.level+" · "+d.totalXp.toLocaleString("es-ES")+" XP"));
 const progress=node("div","bayona-rpg-progress");
 progress.setAttribute("role","progressbar");
 progress.setAttribute("aria-label",t("rpg.progressAria"));
 progress.setAttribute("aria-valuemin","0");
 progress.setAttribute("aria-valuemax","100");
 progress.setAttribute("aria-valuenow",String(d.percent));
 const fill=node("i");fill.style.width=d.percent+"%";progress.append(fill);
 level.append(orb,rankName,progress,node("small","bayona-rpg-levelnext",d.toNext+" XP para el próximo nivel"));
 hero.append(story,level);
 section.append(hero);
 const stats=node("div","bayona-rpg-stats");
 for(const [value,caption] of [
  [d.completed+"/"+d.all,"ÁREAS CON ACCIONES REGISTRADAS"],
  [d.claimable,"RECOMPENSAS DISPONIBLES"],
  ["TU RITMO","DESCANSAR TAMBIÉN ESTÁ BIEN"]]){
   const cell=node("div","bayona-rpg-stat");
   cell.append(node("strong","",value),node("small","",caption));stats.append(cell);
 }
 section.append(stats);

 const map=node("div","bayona-rpg-map");
 const maphead=node("div","bayona-rpg-maphead");
 const mapcopy=node("div");
 mapcopy.append(node("span","bayona-rpg-kicker","02 / TU MAPA"),
   node("h3","","Cinco territorios. Una vida."));
 const modeRow=node("div","bayona-rpg-mode-row");
 modeRow.setAttribute("role","group");
 modeRow.setAttribute("aria-label",t("rpg.modesAria"));
 for(const m of modes){
  const b=button(titles[m],"bayona-rpg-mode",()=>onMode(m));
  b.dataset.view=m;b.setAttribute("aria-pressed",String(d.mode===m));modeRow.append(b);
 }
 maphead.append(mapcopy,modeRow);map.append(maphead);
 const zones=node("div","bayona-rpg-zones");
 const detail=node("div","bayona-rpg-detail");
 const buttons=new Map();
 function show(id){
  const mission=d.areas.find(a=>a.id===id);
  if(!mission)return;
  buttons.forEach((b,key)=>{b.classList.toggle("selected",key===id);b.setAttribute("aria-pressed",String(key===id));});
  const meta=areaInfo[id];
  detail.replaceChildren(node("span","bayona-rpg-kicker",meta.chapter),
    node("h4","",mission.short),node("p","",meta.copy));
  const actions=node("div","bayona-rpg-area-actions");
  if(mission.done&&!mission.claimed){
   actions.append(button("Reclamar +"+mission.xp+" XP","bayona-rpg-area-primary",()=>onClaim(id)));
  }else if(mission.claimed){
   actions.append(node("strong","bayona-rpg-claimed","RECOMPENSA CONSEGUIDA ✓"));
  }else{
   actions.append(button(mission.next?"Abrir mi tarea →":"Elegir una acción →","bayona-rpg-area-primary",()=>onArea(id,mission)));
  }
  actions.append(button("Ver mi plan","bayona-rpg-area-minor",()=>onArea(id,mission)));
  detail.append(actions);
 }
 for(const [i,mission] of d.areas.entries()){
  const meta=areaInfo[mission.id];
  if(!meta)continue;
  const b=button("","bayona-rpg-zone",()=>show(mission.id));
  b.dataset.area=mission.id;
  b.dataset.state=mission.claimed?"claimed":mission.done?"done":"open";
  const label=mission.claimed?"RECOMPENSA OBTENIDA":mission.done?"ACCIÓN REGISTRADA":"POR EXPLORAR";
  b.append(node("span","bayona-rpg-zone-icon",meta.symbol),
    node("small","bayona-rpg-zone-no",String(i+1).padStart(2,"0")),
    node("strong","",mission.short),node("small","bayona-rpg-zone-state",label));
  b.setAttribute("aria-label",mission.short+": "+label);
  b.setAttribute("aria-pressed","false");
  zones.append(b);buttons.set(mission.id,b);
 }
 map.append(zones,detail);
 const footer=node("div","bayona-rpg-foot");
 footer.append(node("small","","El XP se gana con acciones registradas, nunca con pagos ni pulsaciones."),
  button("Abrir planificación →","bayona-rpg-plan",onExplore));
 map.append(footer);section.append(map);
 const selected=d.areas.find(a=>a.done&&!a.claimed)?.id || d.areas.find(a=>!a.done)?.id || d.areas[0]?.id;
 if(selected)show(selected);
 body.append(section);
 return section;
}
