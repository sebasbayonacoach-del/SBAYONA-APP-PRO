// ============================================================
// BAYONA — RECOVERY + SLEEP
// Sueño, recuperación y carga con datos reales. Sin wearables simulados.
// ============================================================
import { S } from "../state.js";
import { WORKOUTS } from "../data.js";
import { esc, fmtDec, t } from "../i18n.js";
import {
  NIGHT_STEPS, RECOVERY_TAGS, recoverySnapshot, sleepRecordFromTimes,
} from "../recovery-sleep.js";
import { hasFeature, planFromProfile, PLAN_META } from "../entitlements.js";
import {
  UI, $, el, showModal, hideModal, toast, BUILDERS,
} from "./shared.js";

const NIGHT_LABELS={
  pantallas:"SIN PANTALLAS 30 MIN ANTES",
  estiramiento:"ESTIRAMIENTO SUAVE",
  respiracion:"RESPIRACIÓN",
  hora:"HORA DE DORMIR DECIDIDA",
};
const ACTIVITY_KEY={
  easy:"recovery.activity.easy",
  moderate:"recovery.activity.moderate",
  hard:"recovery.activity.hard",
};
const PRACTICE_KEY={
  walk:"recovery.practice.walk",
  mobility:"recovery.practice.mobility",
  breathing:"recovery.practice.breathing",
  cold_water:"recovery.practice.cold_water",
  sauna:"recovery.practice.sauna",
  nap:"recovery.practice.nap",
  outdoors:"recovery.practice.outdoors",
  stretching:"recovery.practice.stretching",
};
const EVENT_KEY={
  windDown:"recovery.sleep.windDown",
  bedtime:"recovery.sleep.bedtime",
  wake:"recovery.sleep.wake",
};

const val=(v,suffix="")=>v==null?"—":`${fmtDec(v,1)}${suffix}`;

function snapshot(){
  return recoverySnapshot({
    today:S.data.today,
    history:S.data.history,
    recovery:S.data.recovery,
    integrations:S.data.integrations,
    readiness:S.readinessDetail(),
    now:new Date(),
  });
}

function hero(snap){
  const card=el("section","recovery-hero");
  const p=snap.preferences;
  const schedule=p.configured
    ? t("recovery.sleep.window",{hours:snap.sleepWindowHours})
    : t("recovery.sleep.unscheduled");
  const next=snap.nextEvent
    ? `${t(EVENT_KEY[snap.nextEvent.id])} · ${snap.nextEvent.time}`
    : "—";
  const registered=[snap.today.sleep,snap.today.soreness,snap.today.energy,snap.today.stress].filter((x)=>x!=null).length;
  card.innerHTML=`
    <div class="recovery-hero-copy">
      <small>${esc(t("recovery.hero.kicker"))}</small>
      <h3>${esc(t("recovery.hero.title"))}</h3>
      <p>${esc(t("recovery.hero.sub"))}</p>
    </div>
    <div class="recovery-hero-grid">
      <article><small>${esc(t("recovery.coverage"))}</small><strong>${registered}/4</strong><span>${esc(t("recovery.coverage.value",{registered}))}</span></article>
      <article><small>${esc(t("recovery.sleep.schedule"))}</small><strong>${p.bedtime||"—"} → ${p.wakeTime||"—"}</strong><span>${esc(schedule)}</span></article>
      <article><small>${esc(t("recovery.sleep.next"))}</small><strong>${esc(next)}</strong><span>${snap.nextEvent?`${snap.nextEvent.minutes} min`:"—"}</span></article>
      <article><small>${esc(t("recovery.readiness.label"))}</small><strong>${snap.readiness?.score==null?"—":snap.readiness.score+"%"}</strong><span>${esc(snap.readiness?.score==null?t("state.notLogged"):snap.readiness?.estimated?"ESTIMADA":"REGISTRADA")}</span></article>
    </div>`;
  return card;
}

function readinessCard(snap){
  const det=snap.readiness||{score:null,parts:[]};
  const card=el("section","recovery-readiness");
  card.innerHTML=`
    <div class="recovery-section-head">
      <span><small>${esc(t("recovery.readiness.label"))}</small><strong>${det.score==null?"—":det.score+"%"}</strong></span>
      <em>${esc(t("recovery.readiness.why"))}</em>
    </div>
    <p>${esc(t("recovery.readiness.disclaimer"))}</p>
    <div class="recovery-readiness-parts"></div>`;
  const parts=card.querySelector(".recovery-readiness-parts");
  if(!det.parts?.length){
    parts.appendChild(el("div","recovery-empty",esc(t("recovery.readiness.none"))));
  }else{
    det.parts.forEach((p)=>{
      parts.appendChild(el("article","",`<span>${esc(p.k)}</span><strong>${p.delta>=0?"+":""}${esc(p.delta)} pts</strong><small>${esc(p.note)}</small>`));
    });
  }
  return card;
}

function sleepCard(snap){
  const p=snap.preferences;
  const card=el("section","recovery-sleep-card");
  const timeline=snap.timeline.map((e)=>`
    <article><small>${esc(t(EVENT_KEY[e.id]))}</small><strong>${esc(e.time)}</strong></article>`).join("");
  card.innerHTML=`
    <div class="recovery-section-head">
      <span><small>${esc(t("recovery.sleep.schedule"))}</small><strong>${p.configured?`${p.bedtime} → ${p.wakeTime}`:esc(t("recovery.sleep.unscheduled"))}</strong></span>
      <em>${p.configured?`${snap.sleepWindowHours} h`:"—"}</em>
    </div>
    <div class="recovery-sleep-timeline">${timeline||'<div class="recovery-empty">—</div>'}</div>
    <div class="recovery-sleep-actions">
      <button type="button" class="btn" data-sleep-edit>${esc(t("recovery.sleep.edit"))}</button>
      <button type="button" class="btn btn-primary" data-sleep-record>${esc(t("recovery.sleep.record"))}</button>
    </div>
    <p>${esc(t("recovery.sleep.reminderNote"))}</p>`;
  card.querySelector("[data-sleep-edit]").onclick=editSleepSchedule;
  card.querySelector("[data-sleep-record]").onclick=recordNight;
  return card;
}

function editSleepSchedule(){
  const p=S.data.recovery?.preferences||{};
  showModal(`
    <div class="cine-tag">${esc(t("recovery.sleep.schedule"))}</div>
    <div class="cine-title" style="font-size:22px">${esc(t("recovery.sleep.edit"))}</div>
    <div class="sf-row">
      <label>DORMIR<input id="rs-bed" type="time" value="${esc(p.bedtime||"23:00")}" /></label>
      <label>DESPERTAR<input id="rs-wake" type="time" value="${esc(p.wakeTime||"07:00")}" /></label>
      <label>DESACELERAR (MIN)<input id="rs-wind" type="number" min="10" max="180" value="${esc(p.windDownMin||45)}" /></label>
    </div>
    <label class="check-row"><input id="rs-rem-wind" type="checkbox" ${p.reminders?.windDown?"checked":""}> RECORDAR DESACELERACIÓN EN BAYONA</label>
    <label class="check-row"><input id="rs-rem-bed" type="checkbox" ${p.reminders?.bedtime?"checked":""}> RECORDAR HORA DE DORMIR EN BAYONA</label>
    <div class="sub">${esc(t("recovery.sleep.reminderNote"))}</div>
    <button class="btn btn-primary btn-block" id="rs-save">GUARDAR HORARIO</button>`,()=>{
      $("#rs-save").onclick=()=>{
        S.setSleepSchedule({
          bedtime:$("#rs-bed").value,
          wakeTime:$("#rs-wake").value,
          windDownMin:+$("#rs-wind").value,
          reminders:{windDown:$("#rs-rem-wind").checked,bedtime:$("#rs-rem-bed").checked},
        });
        hideModal(); BUILDERS.recovery();
      };
    });
}

function recordNight(){
  const p=S.data.recovery?.preferences||{};
  showModal(`
    <div class="cine-tag">${esc(t("recovery.sleep.record"))}</div>
    <div class="cine-title" style="font-size:22px">¿CÓMO FUE LA NOCHE?</div>
    <div class="sf-row">
      <label>TE DORMISTE<input id="rn-bed" type="time" value="${esc(p.bedtime||"23:00")}" /></label>
      <label>DESPERTASTE<input id="rn-wake" type="time" value="${esc(p.wakeTime||"07:00")}" /></label>
    </div>
    <div class="sub">La duración se calcula con esas horas. Edita lo que realmente pasó, no el horario ideal.</div>
    <button class="btn btn-primary btn-block" id="rn-save">REGISTRAR NOCHE</button>`,()=>{
      $("#rn-save").onclick=()=>{
        const rec=sleepRecordFromTimes(S.data.today.date,$("#rn-bed").value,$("#rn-wake").value);
        if(!rec)return toast("SUEÑO","Revisa las horas introducidas.","danger");
        S.logSleepWindow(rec);
        hideModal();
        toast("SUEÑO",t("recovery.sleep.saved",{hours:rec.hours}),"gold");
        BUILDERS.recovery();
      };
    });
}

function todayState(td){
  const wrap=el("section","recovery-today");
  wrap.innerHTML=`<div class="recovery-section-head"><span><small>${esc(t("recovery.today.label"))}</small><strong>REGISTRO MANUAL</strong></span></div>`;
  wrap.append(
    sliderRow("MOLESTIA",0,10,1,td.soreness??3,td.soreness==null,(v)=>S.logSoreness(v)),
    sliderRow("ENERGÍA",0,10,1,td.energy??6,td.energy==null,(v)=>S.logEnergy(v)),
    sliderRow("ESTRÉS",0,10,1,td.stress??4,td.stress==null,(v)=>S.logStress(v))
  );
  return wrap;
}

function trendCard(snap){
  const x=snap.trend7;
  const card=el("section","recovery-trend");
  card.innerHTML=`
    <div class="recovery-section-head"><span><small>${esc(t("recovery.trend.label"))}</small><strong>${x.days} días con historial</strong></span></div>
    <div class="recovery-trend-grid">
      <article><small>${esc(t("recovery.trend.sleep"))}</small><strong>${val(x.sleep," h")}</strong></article>
      <article><small>${esc(t("recovery.trend.energy"))}</small><strong>${val(x.energy)}</strong></article>
      <article><small>${esc(t("recovery.trend.stress"))}</small><strong>${val(x.stress)}</strong></article>
      <article><small>${esc(t("recovery.trend.soreness"))}</small><strong>${val(x.soreness)}</strong></article>
      <article><small>${esc(t("recovery.trend.pauses"))}</small><strong>${x.activePauses}</strong></article>
      <article><small>${esc(t("recovery.trend.other"))}</small><strong>${x.otherActivityMin} min</strong></article>
    </div>`;
  return card;
}

function wearableCard(snap){
  const plan=planFromProfile(S.data.profile);
  const allowed=hasFeature(plan,"wearable.sync");
  const w=snap.wearable;
  const card=el("section","recovery-wearable"+(!allowed?" locked":""));
  if(!allowed){
    card.innerHTML=`
      <div class="recovery-section-head"><span><small>${esc(t("recovery.wearable.label"))}</small><strong>${esc(t("recovery.wearable.locked"))}</strong></span><b>${esc(PLAN_META.performance.label)}</b></div>
      <p>${esc(t("recovery.wearable.truth"))}</p>`;
    return card;
  }
  if(!w.connected){
    card.innerHTML=`
      <div class="recovery-section-head"><span><small>${esc(t("recovery.wearable.label"))}</small><strong>${esc(t("recovery.wearable.disconnected"))}</strong></span></div>
      <p>${esc(t("recovery.wearable.noProvider"))}</p><p>${esc(t("recovery.wearable.truth"))}</p>`;
    return card;
  }
  const metrics=Object.entries(w.metrics||{}).map(([k,v])=>`<span><small>${esc(k.toUpperCase())}</small><strong>${esc(v)}</strong></span>`).join("");
  card.innerHTML=`
    <div class="recovery-section-head"><span><small>${esc(t("recovery.wearable.label"))}</small><strong>${esc(w.provider)} · ${esc(t("recovery.wearable.connected"))}</strong></span><em>${w.lastSyncAt?esc(new Date(w.lastSyncAt).toLocaleString("es-ES")):"—"}</em></div>
    <div class="recovery-wearable-grid">${metrics||'<div class="recovery-empty">Sin métricas sincronizadas.</div>'}</div>`;
  return card;
}

function pauseCard(snap){
  const p=snap.activePause;
  const card=el("section","recovery-pauses");
  card.innerHTML=`
    <div class="recovery-section-head"><span><small>${esc(t("recovery.pause.label"))}</small><strong>${esc(t("recovery.pause.count",{count:snap.today.activePauses}))}</strong></span><em>${p.enabled?`${p.intervalMin} min`:"OFF"}</em></div>
    <div class="recovery-actions">
      <button type="button" class="btn btn-primary" data-pause-log>${esc(t("recovery.pause.log"))}</button>
      <button type="button" class="btn" data-pause-settings>${esc(t("recovery.pause.settings"))}</button>
    </div>`;
  card.querySelector("[data-pause-log]").onclick=()=>{
    const r=S.logActivePause();
    toast("PAUSA ACTIVA",r?`+${r.xp} XP · registrada`:"Ya alcanzaste el máximo de XP por pausas de hoy.");
    BUILDERS.recovery();
  };
  card.querySelector("[data-pause-settings]").onclick=editPauseSettings;
  return card;
}

function editPauseSettings(){
  const p=S.data.recovery?.activePause||{};
  showModal(`
    <div class="cine-tag">${esc(t("recovery.pause.label"))}</div>
    <div class="cine-title" style="font-size:22px">${esc(t("recovery.pause.settings"))}</div>
    <label class="check-row"><input id="rp-on" type="checkbox" ${p.enabled?"checked":""}> USAR INTERVALO OBJETIVO</label>
    <label>${esc(t("recovery.pause.config"))}<input id="rp-min" type="number" min="30" max="240" value="${esc(p.intervalMin||90)}" /></label>
    <div class="sub">BAYONA registra el objetivo. No crea una alarma del sistema operativo.</div>
    <button class="btn btn-primary btn-block" id="rp-save">GUARDAR</button>`,()=>{
      $("#rp-save").onclick=()=>{
        S.setActivePauseSchedule({enabled:$("#rp-on").checked,intervalMin:+$("#rp-min").value});
        hideModal(); BUILDERS.recovery();
      };
    });
}

function practicesCard(snap){
  const card=el("section","recovery-practices");
  card.innerHTML=`
    <div class="recovery-section-head"><span><small>${esc(t("recovery.practice.label"))}</small><strong>${snap.today.recoveryPractices.length} hoy</strong></span></div>
    <div class="recovery-practice-grid"></div>
    <div class="recovery-log-list"></div>`;
  const grid=card.querySelector(".recovery-practice-grid");
  RECOVERY_TAGS.forEach((tag)=>{
    const b=el("button","",esc(t(PRACTICE_KEY[tag])));
    b.type="button"; b.onclick=()=>logPractice(tag);
    grid.appendChild(b);
  });
  const list=card.querySelector(".recovery-log-list");
  snap.today.recoveryPractices.slice(-4).reverse().forEach((x)=>{
    list.appendChild(el("div","recovery-log-row",`<span>${esc(t(PRACTICE_KEY[x.tag]||x.tag))}</span><strong>${x.minutes} min</strong><small>${esc(x.note||"")}</small>`));
  });
  return card;
}

function logPractice(tag){
  showModal(`
    <div class="cine-tag">${esc(t("recovery.practice.label"))}</div>
    <div class="cine-title" style="font-size:22px">${esc(t(PRACTICE_KEY[tag]))}</div>
    <label>MINUTOS<input id="rprac-min" type="number" min="1" max="240" value="${tag==="nap"?20:5}" /></label>
    <label>NOTA OPCIONAL<textarea id="rprac-note" maxlength="160"></textarea></label>
    <button class="btn btn-primary btn-block" id="rprac-save">${esc(t("recovery.practice.add"))}</button>`,()=>{
      $("#rprac-save").onclick=()=>{
        const rec=S.addRecoveryPractice({tag,minutes:+$("#rprac-min").value,note:$("#rprac-note").value});
        if(!rec)return toast("RECUPERACIÓN","Revisa los datos.","danger");
        hideModal(); BUILDERS.recovery();
      };
    });
}

function activitiesCard(snap){
  const card=el("section","recovery-activities");
  card.innerHTML=`
    <div class="recovery-section-head"><span><small>${esc(t("recovery.activity.label"))}</small><strong>${snap.today.otherActivities.length||0} hoy</strong></span></div>
    <div class="recovery-log-list"></div>
    <button type="button" class="btn btn-block" data-act-add>${esc(t("recovery.activity.add"))}</button>`;
  const list=card.querySelector(".recovery-log-list");
  if(!snap.today.otherActivities.length)list.appendChild(el("div","recovery-empty",esc(t("recovery.activity.empty"))));
  snap.today.otherActivities.slice(-5).reverse().forEach((x)=>{
    list.appendChild(el("div","recovery-log-row",`<span>${esc(x.name)}</span><strong>${x.minutes} min</strong><small>${esc(t(ACTIVITY_KEY[x.intensity]||"recovery.activity.moderate"))}</small>`));
  });
  card.querySelector("[data-act-add]").onclick=addActivity;
  return card;
}

function addActivity(){
  showModal(`
    <div class="cine-tag">${esc(t("recovery.activity.label"))}</div>
    <div class="cine-title" style="font-size:22px">${esc(t("recovery.activity.add"))}</div>
    <label>ACTIVIDAD<input id="ra-name" maxlength="60" placeholder="Ej. fútbol, natación, senderismo..." /></label>
    <div class="sf-row">
      <label>MINUTOS<input id="ra-min" type="number" min="1" max="720" value="45" /></label>
      <label>INTENSIDAD<select id="ra-int"><option value="easy">${esc(t("recovery.activity.easy"))}</option><option value="moderate" selected>${esc(t("recovery.activity.moderate"))}</option><option value="hard">${esc(t("recovery.activity.hard"))}</option></select></label>
    </div>
    <button class="btn btn-primary btn-block" id="ra-save">GUARDAR</button>`,()=>{
      $("#ra-save").onclick=()=>{
        const rec=S.addOtherActivity({name:$("#ra-name").value,minutes:+$("#ra-min").value,intensity:$("#ra-int").value});
        if(!rec)return toast("ACTIVIDAD","Pon un nombre y una duración válida.","danger");
        hideModal(); BUILDERS.recovery();
      };
    });
}

function noteCard(){
  const card=el("section","recovery-note");
  card.innerHTML=`
    <div class="recovery-section-head"><span><small>${esc(t("recovery.note.label"))}</small><strong>CONTEXTO PARA TU COACH</strong></span></div>
    <textarea maxlength="240" placeholder="${esc(t("recovery.note.placeholder"))}">${esc(S.data.today.recoveryNote||"")}</textarea>
    <button type="button" class="btn btn-block">${esc(t("recovery.note.save"))}</button>`;
  card.querySelector("button").onclick=()=>{
    S.setRecoveryNote(card.querySelector("textarea").value);
    toast("RECUPERACIÓN","Nota guardada.");
  };
  return card;
}

function nightCard(td){
  const card=el("section","recovery-night");
  card.innerHTML=`<div class="recovery-section-head"><span><small>${esc(t("recovery.night.label"))}</small><strong>${esc(t("recovery.night.sub"))}</strong></span></div><div class="recovery-night-grid"></div>`;
  const grid=card.querySelector(".recovery-night-grid");
  const done=td.nightRoutine||[];
  NIGHT_STEPS.forEach((id)=>{
    const b=el("button",done.includes(id)?"on":"",`${done.includes(id)?"✓ ":""}${esc(NIGHT_LABELS[id])}`);
    b.type="button"; b.setAttribute("aria-pressed",String(done.includes(id)));
    b.onclick=()=>{S.nightRoutineToggle(id);BUILDERS.recovery();};
    grid.appendChild(b);
  });
  return card;
}

function healthWarnings(){
  const hf=S.data.healthFlags;
  if(!hf||( !hf.redFlags?.length && !hf.pain?.length))return null;
  const warn=el("section","recovery-health-warning");
  warn.innerHTML=`<strong>AVISOS DE SALUD ACTIVOS</strong><p>${(hf.redFlags||[]).map(esc).join("<br>")}${hf.pain?.length?`<br>Molestias declaradas: ${hf.pain.map(esc).join(", ")}`:""}<br>Ante dolor agudo o síntomas de alarma: detente y consulta a un profesional.</p>`;
  return warn;
}

function mobilityCard(td){
  const card=el("section","recovery-mobility");
  card.innerHTML=`
    <div class="recovery-section-head"><span><small>LABORATORIO DE RECUPERACIÓN</small><strong>FLUJO DE MOVILIDAD · 15 MIN</strong></span></div>
    <p>Descarga muscular y movilidad guiada. Registra solo lo que realmente completas.</p>`;
  const b=el("button","btn btn-primary btn-block",td.mobility?"COMPLETADO HOY":"EMPEZAR SESIÓN");
  b.disabled=td.mobility;
  b.onclick=()=>UI.actions.startWorkout?.(WORKOUTS.mobility_flow);
  card.appendChild(b);
  return card;
}

BUILDERS.recovery=(body)=>{
  body=body||$("#drawer-body");
  const td=S.data.today;
  const snap=snapshot();
  body.textContent="";
  body.append(
    hero(snap),
    sleepCard(snap),
    readinessCard(snap),
    todayState(td),
    trendCard(snap),
    wearableCard(snap),
    pauseCard(snap),
    practicesCard(snap),
    activitiesCard(snap),
    noteCard(),
    nightCard(td)
  );
  const warning=healthWarnings();
  if(warning)body.appendChild(warning);
  body.appendChild(mobilityCard(td));

  if(S.data.streak>2){
    body.appendChild(el("section","recovery-freeze",`<strong>CONGELAR RACHA</strong><p>Disponibles: ${esc(S.data.freeze)}. Un día duro no destruye tu historia.</p>`));
  }
};

function sliderRow(label,min,max,step,value,untouched,cb){
  const row=el("div","recovery-slider");
  row.innerHTML=`<label><span>${esc(label)}</span><b>${esc(value)}${untouched?` <small>${esc(t("state.notLogged"))}</small>`:""}</b></label>`;
  const input=el("input");
  input.type="range";input.min=min;input.max=max;input.step=step;input.value=value;
  input.setAttribute("aria-label",label);
  input.oninput=()=>{
    const n=parseFloat(input.value);
    row.querySelector("b").textContent=String(n);
    cb(n);
  };
  row.appendChild(input);
  return row;
}
