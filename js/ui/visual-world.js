import {t} from "../i18n.js";
// BAYONA Visual World · 9 original illustration scenes, 100% offline.
// Editorial navigation only: never changes role, permissions, training state or XP.
const ART="./media/visual-world/";
export const SCENES=Object.freeze({
 avatar:{labelKey:"visual.avatar.label",titleKey:"visual.avatar.title",descKey:"visual.avatar.desc",accent:"#aa80ff",actionKey:"visual.avatar.action",go:"appearance"},
 training:{labelKey:"visual.training.label",titleKey:"visual.training.title",descKey:"visual.training.desc",accent:"#52d3fa",actionKey:"visual.training.action",go:"library"},
 nutrition:{labelKey:"visual.nutrition.label",titleKey:"visual.nutrition.title",descKey:"visual.nutrition.desc",accent:"#aeed88",actionKey:"visual.nutrition.action",go:"nutrition"},
 recipes:{labelKey:"visual.recipes.label",titleKey:"visual.recipes.title",descKey:"visual.recipes.desc",accent:"#ffc18a",actionKey:"visual.recipes.action",go:"nutrition"},
 habits:{labelKey:"visual.habits.label",titleKey:"visual.habits.title",descKey:"visual.habits.desc",accent:"#5be1cf",actionKey:"visual.habits.action",go:"recovery"},
 progress:{labelKey:"visual.progress.label",titleKey:"visual.progress.title",descKey:"visual.progress.desc",accent:"#bf9cff",actionKey:"visual.progress.action",go:"progress"},
 community:{labelKey:"visual.community.label",titleKey:"visual.community.title",descKey:"visual.community.desc",accent:"#ff86b3",actionKey:"visual.community.action",go:"profile"},
 coach:{labelKey:"visual.coach.label",titleKey:"visual.coach.title",descKey:"visual.coach.desc",accent:"#ffd188",actionKey:"visual.coach.action",go:"library"},
 explore:{labelKey:"visual.explore.label",titleKey:"visual.explore.title",descKey:"visual.explore.desc",accent:"#8bccff",actionKey:"visual.explore.action",go:"planner"}
});
export const PAGE_SCENES=Object.freeze({
 hoy:"explore",home:"explore",training:"training",library:"training",plan:"training",
 nutrition:"nutrition",wellbeing:"habits",recovery:"habits",mind:"habits",rhythm:"habits",daily:"habits",
 progress:"progress",planner:"explore",trabajo:"progress",
 profile:"avatar",appearance:"avatar",account:"avatar",
 armory:"explore",more:"community",core:"explore",
 coachos:"coach",centro:"coach",socios:"coach",cuotas:"coach",agenda:"coach",
 acceso:"coach",portal:"coach",informes:"coach"
});
const WORLD_TILES=[
 ["training","Entrenar","Entrenamiento, técnica y movimiento"],
 ["nutrition","Nutrición","Recetas y vídeos de tu personaje"],
 ["recipes","Recetas","Cocina paso a paso"],
 ["avatar","Mi personaje","Foto, voz y estilo personal"],
 ["progress","Progreso","Historia de tus acciones"],
 ["habits","Bienestar","Recuperación y ritmo"],
 ["explore","Planificación","Misiones y próximos pasos"],
 ["community","Mi espacio","Cuenta y privacidad"]
];
const WORLD_DESTINATIONS={training:"training",nutrition:"nutrition",recipes:"nutrition",avatar:"appearance",
 progress:"progress",habits:"recovery",explore:"planner",community:"profile"};
const make=(tag,className,text)=>{
 const node=document.createElement(tag);if(className)node.className=className;
 if(text!==undefined)node.textContent=text;return node;
};
function imageFor(kind,cls){
 const img=make("img",cls);
 img.src=ART+kind+".svg";
 img.alt="";img.loading=kind==="explore"?"eager":"lazy";
 img.decoding="async";img.draggable=false;
 return img;
}
export function mountVisualWorld(body,section,{coach=false,navigate}={}){
 if(!body || typeof navigate!=="function")return null;
 if(body.querySelector(".bayona-world"))return null;
 const type=PAGE_SCENES[section];
 if(!type)return null;
 const data=SCENES[type];
 const root=make("section","bayona-world "+(section==="hoy"?"bayona-world-home":"bayona-world-compact"));
 root.dataset.visualSection=section;
 root.setAttribute("aria-label","Explora BAYONA: "+t(data.labelKey));
 const hero=make("div","bayona-world-hero");
 hero.append(imageFor(type,"bayona-world-illustration"));
 const content=make("div","bayona-world-content");
 content.append(make("span","bayona-world-eyebrow","BAYONA / LIFE RPG / "+t(data.labelKey)),
  make("h2","",t(data.titleKey)),make("p","",t(data.descKey)));
 const meta=make("div","bayona-world-meta");
 meta.append(make("span","","TU EXPERIENCIA · TU RITMO"),make("span","","100% BAYONA"));
 content.append(meta);hero.append(content);
 const action=make("button","bayona-world-action",t(data.actionKey)+" ↗");
 action.type="button";action.dataset.worldDestination=data.go;
 action.addEventListener("click",()=>navigate(data.go));
 if(data.go!==section)hero.append(action);
 root.style.setProperty("--world-accent",data.accent);
 root.append(hero);
 if(section==="hoy"){
  const label=make("div","bayona-world-directory-title");
  label.append(make("strong","","Explora tu mundo"),
   make("span","","Cada espacio tiene algo distinto para ti"));
  const grid=make("div","bayona-world-directory");
  const tiles=coach?[...WORLD_TILES,["coach","Coach Studio","Organiza clientes y sesiones"]]:WORLD_TILES;
  for(const [kind,title,desc] of tiles){
   const item=make("button","bayona-world-tile");item.type="button";
   item.dataset.worldDestination=kind==="coach"?"coachos":WORLD_DESTINATIONS[kind];
   item.style.setProperty("--world-accent",SCENES[kind].accent);
   item.append(imageFor(kind,"bayona-world-tile-image"));
   const details=make("span","bayona-world-tile-text");
   details.append(make("strong","",title),make("small","",desc));
   item.append(details,make("span","bayona-world-tile-arrow","↗"));
   item.addEventListener("click",()=>navigate(item.dataset.worldDestination));
   grid.append(item);
  }
  root.append(label,grid);
 }
 body.prepend(root);
 return root;
}
