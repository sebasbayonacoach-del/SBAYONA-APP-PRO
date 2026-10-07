// BAYONA — Planning Studio UI
// Planificación profesional: Macro → Meso → Micro → Sesión.
// Cargas y resultados solo aparecen cuando el Coach los registra.

import { S } from "../state.js";
import {
  SPORT_TEMPLATES, PROGRAM_TEST_TYPES, buildProgramDraft, programStats, programCalendar,
  setMicrocycleLoad, addProgramTest, recordProgramTestResult, addSessionToWeek,
  searchExercises, exerciseFacets,
} from "../coach-lab.js";
import { $, el, showModal, hideModal, toast } from "./shared.js";
import { esc } from "../i18n.js";

let catalogPromise=null;
async function loadCatalog(){
  if(!catalogPromise){
    catalogPromise=fetch("./trainingym/catalog.json",{cache:"force-cache"})
      .then((r)=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();})
      .then((rows)=>Array.isArray(rows)?rows:[])
      .catch(()=>[]);
  }
  return catalogPromise;
}

const clientName=(id)=>S.data.coachCrm?.clients?.find((c)=>c.id===id)?.name||"Cliente";
const shortDate=(v)=>{
  if(!v)return "—";
  const d=new Date(String(v).includes("T")?v:v+"T12:00:00");
  return Number.isNaN(d.getTime())?"—":d.toLocaleDateString("es-ES");
};

export function renderPlanningStudio(body,onBack){
  body=body||$("#drawer-body");
  body.textContent="";

  const back=el("button","btn btn-ghost btn-block","← VOLVER A COACH OS");
  back.onclick=()=>onBack?.();
  body.appendChild(back);

  const programs=Array.isArray(S.data.coachPrograms)?S.data.coachPrograms:[];
  const hero=el("section","planning-hero");
  hero.innerHTML=`
    <div><small>PLANNING STUDIO</small><h3>De la temporada a la sesión.</h3><p>Macrociclos, mesociclos, microciclos, cargas, tests y 3.141 ejercicios del catálogo PROPLAYER.</p></div>
    <div class="planning-kpis">
      <article><small>PROGRAMAS</small><strong>${programs.length}</strong></article>
      <article><small>ACTIVOS</small><strong>${programs.filter((p)=>p.id===S.data.activeCoachProgramId).length}</strong></article>
      <article><small>CLIENTES CRM</small><strong>${S.data.coachCrm?.clients?.length||0}</strong></article>
    </div>`;
  body.appendChild(hero);

  const actions=el("div","planning-actions");
  const create=el("button","btn btn-primary","NUEVO PROGRAMA");
  const catalog=el("button","btn","BUSCAR EJERCICIOS");
  create.onclick=()=>programModal(body,onBack);
  catalog.onclick=()=>exerciseBrowser(body,onBack);
  actions.append(create,catalog);
  body.appendChild(actions);

  body.appendChild(el("div","sec-label","PROGRAMAS"));
  const list=el("section","planning-card");
  if(!programs.length)list.appendChild(el("div","planning-empty","Aún no hay programas. Crea el primero desde datos explícitos del cliente."));
  programs.slice().sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))).forEach((p)=>{
    const stats=programStats(p);
    const row=el("button","planning-program-row");
    row.type="button";
    row.innerHTML=`
      <span><strong>${esc(p.name||"Programa sin nombre")}</strong><small>${esc(clientName(p.clientId))} · ${esc(p.sport||"General")}</small></span>
      <span><b>${stats.weeks}</b><small>semanas</small></span>
      <span><b>${stats.sessions}</b><small>sesiones</small></span>
      <span><b>${stats.tests}</b><small>tests</small></span>
      <span class="pill ${p.safetyGate?.autoRecommend===false?"danger":"gold"}">${esc((p.safetyGate?.clearance||"standard").toUpperCase())}</span>`;
    row.onclick=()=>{S.setActiveCoachProgram(p.id);renderProgram(body,p.id,()=>renderPlanningStudio(body,onBack));};
    list.appendChild(row);
  });
  body.appendChild(list);
}

function renderProgram(body,programId,onBack){
  const p=S.coachProgram(programId);
  if(!p)return onBack?.();
  body.textContent="";

  const back=el("button","btn btn-ghost btn-block","← VOLVER A PLANNING STUDIO");
  back.onclick=()=>onBack?.();
  body.appendChild(back);

  const stats=programStats(p);
  const head=el("section","planning-program-head");
  head.innerHTML=`
    <div><small>PROGRAMA · ${esc(clientName(p.clientId).toUpperCase())}</small><h3>${esc(p.name||p.generalObjective)}</h3><p>${esc(p.generalObjective)} · ${esc(shortDate(p.startDate))} → ${esc(shortDate(p.endDate))}</p></div>
    <div class="planning-program-meta">
      <span class="pill gold">${esc((p.sport||"General").toUpperCase())}</span>
      <span class="pill">${stats.weeks} SEMANAS</span>
      <span class="pill">${esc((p.templateId||"").toUpperCase())}</span>
    </div>`;
  body.appendChild(head);

  const gate=el("section",p.safetyGate?.autoRecommend===false?"planning-gate danger":"planning-gate");
  gate.innerHTML=p.safetyGate?.autoRecommend===false
    ? `<strong>REVISIÓN MANUAL REQUERIDA</strong><span>Contexto: ${esc((p.safetyGate.reasonCodes||[]).join(", "))}. Planning Studio no genera recomendaciones automáticas para este caso; el Coach decide y documenta.</span>`
    : `<strong>GATE · ${esc((p.safetyGate?.clearance||"standard").toUpperCase())}</strong><span>La planificación sigue siendo una decisión del Coach. Las cargas no se rellenan automáticamente.</span>`;
  body.appendChild(gate);

  if(p.sportFocus?.length){
    const focus=el("section","planning-focus");
    focus.appendChild(el("strong","","FOCOS DE LA PLANTILLA"));
    p.sportFocus.forEach((x)=>focus.appendChild(el("span","pill",String(x).replaceAll("_"," ").toUpperCase())));
    body.appendChild(focus);
  }

  const actions=el("div","planning-actions planning-actions-wrap");
  [
    ["DEFINIR CARGA",()=>loadModal(body,p,onBack)],
    ["AÑADIR TEST",()=>testModal(body,p,onBack)],
    ["AÑADIR SESIÓN",()=>sessionModal(body,p,onBack)],
  ].forEach(([label,fn],i)=>{const b=el("button",i===2?"btn btn-primary":"btn",label);b.onclick=fn;actions.appendChild(b);});
  const del=el("button","btn","ELIMINAR PROGRAMA");
  del.onclick=()=>{
    showModal(`<div class="cine-tag">PLANNING STUDIO</div><div class="cine-title" style="font-size:22px">ELIMINAR PROGRAMA</div><div class="cine-sub">Esta acción elimina la copia local del programa. No borra sesiones ya registradas por el cliente.</div><button class="btn btn-primary btn-block" id="plan-del-ok">CONFIRMAR</button><div style="height:8px"></div><button class="btn btn-block" id="plan-del-cancel">CANCELAR</button>`,()=>{
      $("#plan-del-cancel").onclick=hideModal;
      $("#plan-del-ok").onclick=()=>{S.deleteCoachProgram(p.id);hideModal();onBack?.();};
    });
  };
  actions.appendChild(del);
  body.appendChild(actions);

  renderCalendar(body,p,onBack);
  renderTests(body,p,onBack);
}

function renderCalendar(body,p,onBack){
  body.appendChild(el("div","sec-label","MACRO → MESO → MICRO"));
  const wrap=el("section","planning-calendar");
  const rows=programCalendar(p);
  rows.forEach((w)=>{
    const row=el("article","planning-week");
    const load=w.loadTarget||{};
    const loadText=[load.volumePct!=null?`VOL ${load.volumePct}%`:null,load.intensityPct!=null?`INT ${load.intensityPct}%`:null,load.rpe!=null?`RPE ${load.rpe}`:null].filter(Boolean).join(" · ");
    row.innerHTML=`
      <span><small>SEMANA</small><strong>${w.week}</strong></span>
      <span><small>FASE</small><strong>${esc(String(w.stageId).replaceAll("_"," "))}</strong></span>
      <span><small>FECHAS</small><strong>${esc(shortDate(w.startDate))} → ${esc(shortDate(w.endDate))}</strong></span>
      <span><small>CARGA</small><strong>${esc(loadText||"SIN DEFINIR")}</strong></span>
      <span><small>CONTENIDO</small><strong>${w.sessions} sesión(es) · ${w.tests} test(s)</strong></span>`;
    row.onclick=()=>weekModal(body,p,w.week,onBack);
    wrap.appendChild(row);
  });
  body.appendChild(wrap);
}

function renderTests(body,p,onBack){
  body.appendChild(el("div","sec-label","TESTS"));
  const card=el("section","planning-card");
  if(!p.tests?.length)card.appendChild(el("div","planning-empty","Sin tests planificados."));
  (p.tests||[]).forEach((test)=>{
    const row=el("div","planning-test-row");
    row.innerHTML=`<span><strong>${esc(test.name)}</strong><small>S${esc(test.scheduledWeek)} · ${esc(test.metric||"métrica")} ${test.target!=null?"· objetivo "+esc(test.target)+" "+esc(test.unit||""):""}</small></span><span class="pill ${test.status==="completed"?"gold":""}">${esc(test.status.toUpperCase())}</span>`;
    if(test.status==="planned"){
      const b=el("button","btn","REGISTRAR RESULTADO");
      b.onclick=()=>resultModal(body,p,test,onBack);
      row.appendChild(b);
    }else{
      row.appendChild(el("strong","planning-result",`${test.result} ${test.unit||""}`));
    }
    card.appendChild(row);
  });
  body.appendChild(card);
}

function programModal(body,onBack){
  const clients=S.data.coachCrm?.clients?.filter((c)=>c.status!=="archived")||[];
  if(!clients.length)return toast("PLANNING STUDIO","Añade primero un cliente al Coach CRM.","danger");
  const today=new Date();
  const pad=(n)=>String(n).padStart(2,"0");
  const date=`${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;
  const sports=Object.values(SPORT_TEMPLATES).map((x)=>`<option value="${x.id}">${esc(x.label)} · ${x.defaultWeeks} sem.</option>`).join("");
  const clientOpts=clients.map((c)=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
  showModal(`
    <div class="cine-tag">PLANNING STUDIO · NUEVO</div>
    <div class="cine-title" style="font-size:22px">CREAR PROGRAMA</div>
    <label>CLIENTE<select id="ps-client">${clientOpts}</select></label>
    <label>NOMBRE<input id="ps-name" maxlength="100" placeholder="Ej. Preparación pretemporada"></label>
    <label>DEPORTE / PLANTILLA<select id="ps-sport">${sports}</select></label>
    <label>OBJETIVO GENERAL<textarea id="ps-goal" maxlength="180"></textarea></label>
    <div class="sf-row">
      <label>INICIO<input id="ps-start" type="date" value="${date}"></label>
      <label>SEMANAS · vacío = plantilla<input id="ps-weeks" type="number" min="4" max="52" placeholder="Automático por plantilla"></label>
    </div>
    <div class="planning-context">
      <strong>CONTEXTO · MARCA SOLO LO DECLARADO</strong>
      <label><input type="checkbox" data-ps-flag value="return_after_inactivity"> RETORNO TRAS INACTIVIDAD</label>
      <label><input type="checkbox" data-ps-flag value="current_pain"> DOLOR ACTUAL</label>
      <label><input type="checkbox" data-ps-flag value="medical_condition"> CONDICIÓN MÉDICA DECLARADA</label>
      <label><input type="checkbox" data-ps-flag value="post_injury"> RETORNO POST-LESIÓN</label>
      <label><input type="checkbox" data-ps-flag value="post_surgery"> RETORNO POST-CIRUGÍA</label>
      <label><input type="checkbox" data-ps-flag value="pregnancy_postpartum"> EMBARAZO / POSPARTO</label>
    </div>
    <button class="btn btn-primary btn-block" id="ps-create">CREAR BORRADOR</button>`,()=>{
      $("#ps-create").onclick=()=>{
        const weeks=$("#ps-weeks").value?+$("#ps-weeks").value:null;
        const flags=[...document.querySelectorAll("[data-ps-flag]:checked")].map((x)=>x.value);
        if(!flags.length)flags.push("healthy_adult");
        const p=buildProgramDraft({
          clientId:$("#ps-client").value,
          name:$("#ps-name").value,
          sportTemplateId:$("#ps-sport").value,
          generalObjective:$("#ps-goal").value,
          durationWeeks:weeks,
          startDate:$("#ps-start").value,
          contextFlags:flags,
        });
        const saved=S.saveCoachProgram(p);
        if(!saved.ok)return toast("PLANNING STUDIO","Completa objetivo y datos del programa.","danger");
        hideModal();
        renderProgram(body,p.id,()=>renderPlanningStudio(body,onBack));
      };
    });
}

function weekModal(body,p,week,onBack){
  const micro=p.mesocycles.flatMap((m)=>m.microcycles).find((x)=>x.week===week);
  showModal(`
    <div class="cine-tag">SEMANA ${week}</div>
    <div class="cine-title" style="font-size:22px">MICROCICLO</div>
    <div class="cine-sub">${esc(shortDate(micro.startDate))} → ${esc(shortDate(micro.endDate))}</div>
    <div class="kv"><span class="k">SESIONES</span><span class="v">${micro.sessions.length}</span></div>
    <div class="kv"><span class="k">TESTS MICRO</span><span class="v">${micro.tests.length}</span></div>
    <button class="btn btn-primary btn-block" id="ps-week-load">DEFINIR CARGA</button>
    <div style="height:8px"></div>
    <button class="btn btn-block" id="ps-week-session">AÑADIR SESIÓN AQUÍ</button>`,()=>{
      $("#ps-week-load").onclick=()=>{hideModal();loadModal(body,p,onBack,week);};
      $("#ps-week-session").onclick=()=>{hideModal();sessionModal(body,p,onBack,week);};
    });
}

function loadModal(body,p,onBack,preselect){
  const weeks=programCalendar(p).map((x)=>`<option value="${x.week}" ${x.week===preselect?"selected":""}>SEMANA ${x.week} · ${esc(x.stageId)}</option>`).join("");
  showModal(`
    <div class="cine-tag">PLANNING STUDIO · CARGA</div>
    <div class="cine-title" style="font-size:22px">OBJETIVO DE MICROCICLO</div>
    <div class="cine-sub">Nada se calcula solo: registra el objetivo que tú has decidido.</div>
    <label>SEMANA<select id="ps-load-week">${weeks}</select></label>
    <div class="sf-row">
      <label>VOLUMEN %<input id="ps-vol" type="number" min="0" max="200"></label>
      <label>INTENSIDAD %<input id="ps-int" type="number" min="0" max="100"></label>
      <label>RPE OBJETIVO<input id="ps-rpe" type="number" min="1" max="10" step="0.5"></label>
    </div>
    <button class="btn btn-primary btn-block" id="ps-load-save">GUARDAR CARGA</button>`,()=>{
      $("#ps-load-save").onclick=()=>{
        const out=setMicrocycleLoad(p,+$("#ps-load-week").value,{volumePct:$("#ps-vol").value,intensityPct:$("#ps-int").value,rpe:$("#ps-rpe").value});
        if(!out.ok)return toast("PLANNING STUDIO","Semana no encontrada.","danger");
        S.saveCoachProgram(out.program);hideModal();renderProgram(body,p.id,onBack);
      };
    });
}

function testModal(body,p,onBack){
  const weeks=programCalendar(p).map((x)=>`<option value="${x.week}">SEMANA ${x.week}</option>`).join("");
  const types=PROGRAM_TEST_TYPES.map((x)=>`<option value="${x}">${x.toUpperCase()}</option>`).join("");
  showModal(`
    <div class="cine-tag">PLANNING STUDIO · TEST</div>
    <div class="cine-title" style="font-size:22px">PLANIFICAR TEST</div>
    <label>NOMBRE<input id="ps-test-name" maxlength="100"></label>
    <div class="sf-row">
      <label>TIPO<select id="ps-test-type">${types}</select></label>
      <label>SEMANA<select id="ps-test-week">${weeks}</select></label>
    </div>
    <div class="sf-row">
      <label>MÉTRICA<input id="ps-test-metric" maxlength="80" placeholder="Ej. distancia"></label>
      <label>UNIDAD<input id="ps-test-unit" maxlength="30" placeholder="cm, s, kg…"></label>
      <label>OBJETIVO · OPCIONAL<input id="ps-test-target" type="number" step="any"></label>
    </div>
    <button class="btn btn-primary btn-block" id="ps-test-save">AÑADIR TEST</button>`,()=>{
      $("#ps-test-save").onclick=()=>{
        const out=addProgramTest(p,{name:$("#ps-test-name").value,type:$("#ps-test-type").value,scheduledWeek:+$("#ps-test-week").value,metric:$("#ps-test-metric").value,unit:$("#ps-test-unit").value,target:$("#ps-test-target").value});
        if(!out.ok)return toast("PLANNING STUDIO","Revisa el test.","danger");
        S.saveCoachProgram(out.program);hideModal();renderProgram(body,p.id,onBack);
      };
    });
}

function resultModal(body,p,test,onBack){
  showModal(`
    <div class="cine-tag">TEST · RESULTADO</div>
    <div class="cine-title" style="font-size:22px">${esc(test.name)}</div>
    <label>RESULTADO · ${esc(test.unit||"unidad")}<input id="ps-result" type="number" step="any"></label>
    <label>NOTA<textarea id="ps-result-note" maxlength="180"></textarea></label>
    <button class="btn btn-primary btn-block" id="ps-result-save">REGISTRAR RESULTADO</button>`,()=>{
      $("#ps-result-save").onclick=()=>{
        const out=recordProgramTestResult(p,test.id,$("#ps-result").value,$("#ps-result-note").value);
        if(!out.ok)return toast("PLANNING STUDIO","Introduce un resultado numérico.","danger");
        S.saveCoachProgram(out.program);hideModal();renderProgram(body,p.id,onBack);
      };
    });
}

async function sessionModal(body,p,onBack,preselect){
  const rows=await loadCatalog();
  const facets=exerciseFacets(rows);
  const selected=[];
  const weeks=programCalendar(p).map((x)=>`<option value="${x.week}" ${x.week===preselect?"selected":""}>SEMANA ${x.week}</option>`).join("");
  showModal(`
    <div class="cine-tag">PLANNING STUDIO · SESIÓN</div>
    <div class="cine-title" style="font-size:22px">CONSTRUIR SESIÓN</div>
    <div class="sf-row">
      <label>SEMANA<select id="ps-session-week">${weeks}</select></label>
      <label>DÍA<input id="ps-session-day" maxlength="16" placeholder="Lunes"></label>
      <label>MIN<input id="ps-session-min" type="number" min="5" max="240" value="60"></label>
    </div>
    <label>NOMBRE<input id="ps-session-name" maxlength="100"></label>
    <div class="planning-search-grid">
      <label>BUSCAR<input id="ps-ex-q" placeholder="Ej. press pecho"></label>
      <label>MÚSCULO<select id="ps-ex-muscle"><option value="">TODOS</option>${facets.muscles.map((x)=>`<option value="${esc(x)}">${esc(x)}</option>`).join("")}</select></label>
      <label>TIPO<select id="ps-ex-type"><option value="">TODOS</option>${facets.types.map((x)=>`<option value="${esc(x)}">${esc(x)}</option>`).join("")}</select></label>
      <label>RESISTENCIA<select id="ps-ex-res"><option value="">TODAS</option>${facets.resistances.map((x)=>`<option value="${esc(x)}">${esc(x)}</option>`).join("")}</select></label>
    </div>
    <div id="ps-ex-results" class="planning-ex-results"></div>
    <div id="ps-ex-selected" class="planning-selected"></div>
    <button class="btn btn-primary btn-block" id="ps-session-save">GUARDAR SESIÓN</button>`,()=>{
      const resultBox=$("#ps-ex-results"),selectedBox=$("#ps-ex-selected");
      const repaintSelected=()=>{
        selectedBox.textContent="";
        selected.forEach((x,i)=>{
          const row=el("button","planning-selected-item",`${i+1}. ${x.nombre}`);
          row.type="button";row.title="Quitar";
          row.onclick=()=>{selected.splice(i,1);repaintSelected();};
          selectedBox.appendChild(row);
        });
      };
      const run=()=>{
        const found=searchExercises(rows,{
          q:$("#ps-ex-q").value,
          muscle:$("#ps-ex-muscle").value||null,
          type:$("#ps-ex-type").value||null,
          resistance:$("#ps-ex-res").value||null,
          availability:"video",
        },30);
        resultBox.textContent="";
        found.forEach((x)=>{
          const b=el("button","planning-exercise-result");
          b.type="button";
          b.innerHTML=`<strong>${esc(x.nombre)}</strong><small>${esc(x.grupo_muscular||"—")} · ${esc(x.tipo||"—")} · ${esc((x.perfil_resistencia||[]).join(", ")||"—")}</small>`;
          b.onclick=()=>{
            if(!selected.some((s)=>s.source_id===x.source_id))selected.push({source_id:x.source_id,nombre:x.nombre,pos:x.pos,video_url:x.video_url||null});
            repaintSelected();
          };
          resultBox.appendChild(b);
        });
        if(!found.length)resultBox.appendChild(el("div","planning-empty","Sin coincidencias con esos filtros."));
      };
      ["ps-ex-q","ps-ex-muscle","ps-ex-type","ps-ex-res"].forEach((id)=>$("#"+id).addEventListener(id==="ps-ex-q"?"input":"change",run));
      run();
      $("#ps-session-save").onclick=()=>{
        if(!selected.length)return toast("PLANNING STUDIO","Selecciona al menos un ejercicio.","danger");
        const out=addSessionToWeek(p,+$("#ps-session-week").value,{
          name:$("#ps-session-name").value||"Sesión",
          day:$("#ps-session-day").value,
          durationMin:+$("#ps-session-min").value,
          exercises:selected,
        });
        if(!out.ok)return toast("PLANNING STUDIO","No se pudo añadir la sesión.","danger");
        S.saveCoachProgram(out.program);hideModal();renderProgram(body,p.id,onBack);
      };
    });
}

async function exerciseBrowser(body,onBack){
  const rows=await loadCatalog();
  const facets=exerciseFacets(rows);
  body.textContent="";
  const back=el("button","btn btn-ghost btn-block","← VOLVER A PLANNING STUDIO");
  back.onclick=()=>renderPlanningStudio(body,onBack);
  body.appendChild(back);
  const head=el("section","planning-program-head");
  head.innerHTML=`<div><small>CATÁLOGO PROPLAYER</small><h3>Buscador de ejercicios</h3><p>${rows.length.toLocaleString("es-ES")} ejercicios disponibles · resultados con vídeo local/CDN cuando existe.</p></div>`;
  body.appendChild(head);
  const filters=el("section","planning-search-panel");
  filters.innerHTML=`
    <input id="ps-browser-q" placeholder="Buscar por nombre, músculo, tipo, etiqueta o resistencia">
    <select id="ps-browser-muscle"><option value="">TODOS LOS MÚSCULOS</option>${facets.muscles.map((x)=>`<option value="${esc(x)}">${esc(x)}</option>`).join("")}</select>
    <select id="ps-browser-type"><option value="">TODOS LOS TIPOS</option>${facets.types.map((x)=>`<option value="${esc(x)}">${esc(x)}</option>`).join("")}</select>
    <select id="ps-browser-effort"><option value="">TODO ESFUERZO</option>${facets.efforts.map((x)=>`<option value="${esc(x)}">${esc(x)}</option>`).join("")}</select>
    <select id="ps-browser-res"><option value="">TODA RESISTENCIA</option>${facets.resistances.map((x)=>`<option value="${esc(x)}">${esc(x)}</option>`).join("")}</select>
    <select id="ps-browser-media"><option value="">CUALQUIER MEDIA</option><option value="video">CON VÍDEO</option><option value="no_video">SIN VÍDEO</option></select>`;
  body.appendChild(filters);
  const out=el("section","planning-browser-results");
  body.appendChild(out);
  const paint=()=>{
    const found=searchExercises(rows,{
      q:$("#ps-browser-q").value,
      muscle:$("#ps-browser-muscle").value||null,
      type:$("#ps-browser-type").value||null,
      effort:$("#ps-browser-effort").value||null,
      resistance:$("#ps-browser-res").value||null,
      availability:$("#ps-browser-media").value||null,
    },120);
    out.textContent="";
    found.forEach((x)=>{
      const row=el("article","planning-browser-row");
      row.innerHTML=`<span><strong>${esc(x.nombre)}</strong><small>#${esc(x.pos)} · ${esc(x.grupo_muscular||"—")} · ${esc(x.tipo||"—")}</small></span><span><small>ESFUERZO</small><b>${esc((x.nivel_esfuerzo||[]).join(", ")||"—")}</b></span><span><small>RESISTENCIA</small><b>${esc((x.perfil_resistencia||[]).join(", ")||"—")}</b></span><span class="pill ${x.video_disponible_local?"gold":""}">${x.video_disponible_local?"VÍDEO":"SIN VÍDEO"}</span>`;
      out.appendChild(row);
    });
    if(!found.length)out.appendChild(el("div","planning-empty","Sin resultados."));
  };
  ["ps-browser-q","ps-browser-muscle","ps-browser-type","ps-browser-effort","ps-browser-res","ps-browser-media"].forEach((id)=>$("#"+id).addEventListener(id==="ps-browser-q"?"input":"change",paint));
  paint();
}
