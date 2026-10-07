// BAYONA — Coach CRM UI
// Vista operativa del entrenador: cartera, agenda, cobros registrados,
// referidos, compras, notas y alertas. No procesa pagos.

import { S } from "../state.js";
import {
  coachCrmDefaults, crmSummary, crmClientSnapshot, crmTimeline, crmAlerts,
} from "../coach/crm.js";
import { $, el, showModal, hideModal, toast } from "./shared.js";
import { esc } from "../i18n.js";
import { currentSession, accountRole } from "../sync/supabase.js";
import { syncCoachCrmCloud } from "../sync/coaching.js";

const money=(cents,currency)=>{
  try{return new Intl.NumberFormat("es-ES",{style:"currency",currency}).format((Number(cents)||0)/100);}
  catch{return `${((Number(cents)||0)/100).toFixed(2)} ${currency||""}`;}
};
const dateTime=(v)=>{
  if(!v)return "—";
  const d=new Date(v);
  return Number.isNaN(d.getTime())?"—":d.toLocaleString("es-ES",{dateStyle:"short",timeStyle:"short"});
};
const clientName=(crm,id)=>crm.clients.find((x)=>x.id===id)?.name||"Cliente";
const badge=(text,cls="")=>el("span",`pill ${cls}`.trim(),text);

function crm(){ return coachCrmDefaults(S.data.coachCrm||{}); }

export function registerCloudClientInCrm(client){
  const id=client?.client_id||client?.id;
  if(!id)return null;
  const current=crm().clients.find((x)=>x.id===id);
  const name=client?.name||client?.profile?.display_name||current?.name||"Cliente BAYONA";
  const patch={
    id,name,linkedUserId:id,status:"active",source:"cloud",
    createdAt:client?.accepted_at||client?.created_at||current?.createdAt,
    updatedAt:client?.updated_at||client?.accepted_at||client?.created_at||current?.updatedAt,
  };
  const stable=current&&current.name===patch.name&&current.linkedUserId===id&&current.status==="active"&&current.source==="cloud";
  return stable?current:S.upsertCoachCrmClient(patch);
}

export function renderCoachCrm(body,onBack){
  body=body||$("#drawer-body");
  body.textContent="";
  const data=crm();
  const sum=crmSummary(data,new Date());

  const back=el("button","btn btn-ghost btn-block","← VOLVER A COACH OS");
  back.onclick=()=>onBack?.();
  body.appendChild(back);

  const hero=el("section","coach-crm-hero");
  hero.innerHTML=`
    <div>
      <small>COACH CRM · OPERACIONES</small>
      <h3>Tu cartera, sin hojas sueltas.</h3>
      <p>Agenda, pagos registrados, referidos, compras y seguimiento en una sola ficha.</p>
    </div>
    <div class="coach-crm-kpis">
      <article><small>CLIENTES ACTIVOS</small><strong>${sum.clients}</strong></article>
      <article><small>CITAS HOY</small><strong>${sum.appointmentsToday}</strong></article>
      <article><small>REFERIDOS ABIERTOS</small><strong>${sum.referralsOpen}</strong></article>
      <article><small>ALERTAS</small><strong>${sum.alerts}</strong></article>
    </div>`;
  body.appendChild(hero);

  const due=Object.entries(sum.dueByCurrency);
  const dueCard=el("section","coach-crm-strip");
  dueCard.appendChild(el("strong","", "PENDIENTE REGISTRADO"));
  dueCard.appendChild(el("span","",due.length?due.map(([cur,c])=>money(c,cur)).join(" · "):"Sin saldos pendientes registrados."));
  dueCard.appendChild(el("small","","BAYONA registra el estado; no cobra ni confirma movimientos bancarios."));
  body.appendChild(dueCard);

  const actions=el("div","coach-crm-actions");
  const addClient=el("button","btn btn-primary","+ CLIENTE");
  const addAppointment=el("button","btn","+ CITA");
  addClient.onclick=()=>clientModal(()=>renderCoachCrm(body,onBack));
  addAppointment.onclick=()=>appointmentModal(null,()=>renderCoachCrm(body,onBack));
  actions.append(addClient,addAppointment);
  if(currentSession()&&accountRole()==="coach"){
    const sync=el("button","btn","SINCRONIZAR NUBE");
    sync.title="Acción explícita: fusiona CRM privado con Supabase. No se ejecuta automáticamente.";
    sync.onclick=async()=>{
      const label=sync.textContent;
      sync.disabled=true;sync.textContent="SINCRONIZANDO…";
      try{
        const result=await syncCoachCrmCloud(S);
        toast("CRM NUBE",`Sincronización completada · ${result.total} operaciones.`);
        renderCoachCrm(body,onBack);
      }catch(e){
        toast("CRM LOCAL A SALVO",e?.message||"No se pudo sincronizar la nube.","danger");
        sync.disabled=false;sync.textContent=label;
      }
    };
    actions.appendChild(sync);
  }
  body.appendChild(actions);

  renderAlerts(body,data,onBack);
  renderAgenda(body,data,onBack);
  renderClients(body,data,onBack);
  renderLedgerOverview(body,data,onBack);
}

function renderAlerts(body,data,onBack){
  body.appendChild(el("div","sec-label","ALERTAS OPERATIVAS"));
  const card=el("section","coach-crm-card");
  const alerts=crmAlerts(data,new Date());
  if(!alerts.length){
    card.appendChild(el("div","coach-crm-empty","Sin alertas del CRM."));
  }else{
    for(const a of alerts.slice(0,12)){
      const row=el("button","coach-crm-alert");
      row.type="button";
      row.append(
        badge(a.level==="high"?"ALTA":"MEDIA",a.level==="high"?"danger":""),
        el("span","",clientName(data,a.clientId)),
        el("strong","",a.text)
      );
      row.onclick=()=>renderCoachCrmClient(body,a.clientId,()=>renderCoachCrm(body,onBack));
      card.appendChild(row);
    }
  }
  body.appendChild(card);
}

function renderAgenda(body,data,onBack){
  body.appendChild(el("div","sec-label","AGENDA"));
  const card=el("section","coach-crm-card");
  const rows=data.appointments
    .filter((x)=>x.status==="scheduled")
    .sort((a,b)=>a.startAt.localeCompare(b.startAt))
    .slice(0,12);
  if(!rows.length)card.appendChild(el("div","coach-crm-empty","No hay citas programadas."));
  rows.forEach((a)=>{
    const row=el("div","coach-crm-row");
    const main=el("button","coach-crm-row-main");
    main.type="button";
    main.innerHTML=`<strong>${esc(clientName(data,a.clientId))}</strong><span>${esc(dateTime(a.startAt))} · ${esc(a.durationMin)} min · ${esc(a.kind)}</span>`;
    main.onclick=()=>renderCoachCrmClient(body,a.clientId,()=>renderCoachCrm(body,onBack));
    const done=el("button","btn","HECHA");
    done.onclick=()=>{S.updateCoachCrmStatus("appointments",a.id,"completed");renderCoachCrm(body,onBack);};
    row.append(main,done);
    card.appendChild(row);
  });
  body.appendChild(card);
}

function renderClients(body,data,onBack){
  body.appendChild(el("div","sec-label","CARTERA CRM"));
  const card=el("section","coach-crm-card");
  if(!data.clients.length)card.appendChild(el("div","coach-crm-empty","Aún no hay clientes guardados en el CRM."));
  data.clients
    .filter((c)=>c.status!=="archived")
    .sort((a,b)=>a.name.localeCompare(b.name,"es"))
    .forEach((c)=>{
      const snap=crmClientSnapshot(data,c.id,new Date());
      const row=el("button","coach-crm-client");
      row.type="button";
      const due=Object.entries(snap.dueByCurrency).map(([cur,n])=>money(n,cur)).join(" · ");
      row.innerHTML=`
        <span><strong>${esc(c.name)}</strong><small>${esc(c.source==="cloud"?"NUBE":"LOCAL")} · ${esc(c.status.toUpperCase())}</small></span>
        <span><b>${snap.appointments.filter((x)=>x.status==="scheduled").length}</b><small>citas</small></span>
        <span><b>${snap.alerts.length}</b><small>alertas</small></span>
        <span><b>${esc(due||"—")}</b><small>pendiente</small></span>`;
      row.onclick=()=>renderCoachCrmClient(body,c.id,()=>renderCoachCrm(body,onBack));
      card.appendChild(row);
    });
  body.appendChild(card);
}

function renderLedgerOverview(body,data,onBack){
  body.appendChild(el("div","sec-label","ACTIVIDAD RECIENTE"));
  const card=el("section","coach-crm-card");
  const rows=data.clients.flatMap((c)=>crmTimeline(data,c.id).slice(0,3).map((x)=>({...x,clientId:c.id})))
    .sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,15);
  if(!rows.length)card.appendChild(el("div","coach-crm-empty","El ledger está vacío."));
  rows.forEach((x)=>{
    const row=el("button","coach-crm-ledger-row");
    row.type="button";
    row.innerHTML=`<span class="pill">${esc(x.type.toUpperCase())}</span><strong>${esc(clientName(data,x.clientId))}</strong><span>${esc(x.title)}</span><small>${esc(dateTime(x.at))} · ${esc(x.status)}</small>`;
    row.onclick=()=>renderCoachCrmClient(body,x.clientId,()=>renderCoachCrm(body,onBack));
    card.appendChild(row);
  });
  body.appendChild(card);
}

export function renderCoachCrmClient(body,clientId,onBack){
  body=body||$("#drawer-body");
  const data=crm();
  const snap=crmClientSnapshot(data,clientId,new Date());
  if(!snap.client){toast("CRM","Cliente no encontrado.","danger");return onBack?.();}
  body.textContent="";

  const back=el("button","btn btn-ghost btn-block","← VOLVER AL CRM");
  back.onclick=()=>onBack?.();
  body.appendChild(back);

  const head=el("section","coach-crm-client-head");
  head.innerHTML=`
    <div><small>FICHA CRM</small><h3>${esc(snap.client.name)}</h3><p>${esc(snap.client.email||"Sin email")} · ${esc(snap.client.phone||"Sin teléfono")}</p></div>
    <div><span class="pill">${esc(snap.client.source.toUpperCase())}</span><span class="pill gold">${esc(snap.client.status.toUpperCase())}</span></div>`;
  body.appendChild(head);

  const actions=el("div","coach-crm-actions coach-crm-actions-wrap");
  [
    ["+ CITA",()=>appointmentModal(clientId,()=>renderCoachCrmClient(body,clientId,onBack))],
    ["+ PAGO",()=>paymentModal(clientId,()=>renderCoachCrmClient(body,clientId,onBack))],
    ["+ REFERIDO",()=>referralModal(clientId,()=>renderCoachCrmClient(body,clientId,onBack))],
    ["+ COMPRA",()=>purchaseModal(clientId,()=>renderCoachCrmClient(body,clientId,onBack))],
    ["+ NOTA",()=>noteModal(clientId,()=>renderCoachCrmClient(body,clientId,onBack))],
  ].forEach(([label,fn],i)=>{const b=el("button",i===0?"btn btn-primary":"btn",label);b.onclick=fn;actions.appendChild(b);});
  body.appendChild(actions);

  clientAlerts(body,snap);
  clientAppointments(body,snap,clientId,onBack);
  clientPayments(body,snap,clientId,onBack);
  clientReferrals(body,snap,clientId,onBack);
  clientPurchases(body,snap,clientId,onBack);
  clientNotes(body,snap);
  clientTimeline(body,clientId);
}

function clientAlerts(body,snap){
  body.appendChild(el("div","sec-label","ALERTAS"));
  const card=el("section","coach-crm-card");
  if(!snap.alerts.length)card.appendChild(el("div","coach-crm-empty","Sin alertas CRM para esta ficha."));
  snap.alerts.forEach((a)=>card.appendChild(el("div","coach-crm-alert-static",`<span class="pill ${a.level==="high"?"danger":""}">${a.level==="high"?"ALTA":"MEDIA"}</span><strong>${esc(a.text)}</strong>`)));
  body.appendChild(card);
}

function clientAppointments(body,snap,clientId,onBack){
  body.appendChild(el("div","sec-label","AGENDA"));
  const card=el("section","coach-crm-card");
  if(!snap.appointments.length)card.appendChild(el("div","coach-crm-empty","Sin citas."));
  snap.appointments.slice(-12).reverse().forEach((a)=>{
    const row=el("div","coach-crm-row");
    row.innerHTML=`<span><strong>${esc(dateTime(a.startAt))}</strong><small>${esc(a.kind)} · ${esc(a.durationMin)} min · ${esc(a.status)}</small></span>`;
    if(a.status==="scheduled"){
      const done=el("button","btn","COMPLETAR");
      const noShow=el("button","btn","NO ASISTIÓ");
      done.onclick=()=>{S.updateCoachCrmStatus("appointments",a.id,"completed");renderCoachCrmClient(body,clientId,onBack);};
      noShow.onclick=()=>{S.updateCoachCrmStatus("appointments",a.id,"no_show");renderCoachCrmClient(body,clientId,onBack);};
      row.append(done,noShow);
    }
    card.appendChild(row);
  });
  body.appendChild(card);
}

function clientPayments(body,snap,clientId,onBack){
  body.appendChild(el("div","sec-label","PAGOS REGISTRADOS"));
  const card=el("section","coach-crm-card");
  card.appendChild(el("small","coach-crm-disclaimer","Estado administrativo registrado. BAYONA no ejecuta el cobro ni verifica el banco."));
  if(!snap.payments.length)card.appendChild(el("div","coach-crm-empty","Sin pagos registrados."));
  snap.payments.forEach((p)=>{
    const row=el("div","coach-crm-row");
    row.innerHTML=`<span><strong>${esc(money(p.amountCents,p.currency))}</strong><small>${esc(p.status.toUpperCase())} · vence ${esc(dateTime(p.dueAt))}${p.reference?" · "+esc(p.reference):""}</small></span>`;
    if(["due","overdue"].includes(p.status)){
      const b=el("button","btn btn-primary","MARCAR PAGADO");
      b.onclick=()=>{S.updateCoachCrmStatus("payments",p.id,"paid");renderCoachCrmClient(body,clientId,onBack);};
      row.appendChild(b);
    }
    card.appendChild(row);
  });
  body.appendChild(card);
}

function clientReferrals(body,snap,clientId,onBack){
  body.appendChild(el("div","sec-label","REFERIDOS"));
  const card=el("section","coach-crm-card");
  if(!snap.referrals.length)card.appendChild(el("div","coach-crm-empty","Sin referidos."));
  snap.referrals.forEach((r)=>{
    const row=el("div","coach-crm-row");
    row.innerHTML=`<span><strong>${esc(r.referredName)}</strong><small>${esc(r.status.toUpperCase())}${r.contact?" · "+esc(r.contact):""}</small></span>`;
    if(r.status==="lead"){
      const b=el("button","btn","CONTACTADO");
      b.onclick=()=>{S.updateCoachCrmStatus("referrals",r.id,"contacted");renderCoachCrmClient(body,clientId,onBack);};
      row.appendChild(b);
    }else if(r.status==="contacted"){
      const b=el("button","btn btn-primary","CONVERTIDO");
      b.onclick=()=>{S.updateCoachCrmStatus("referrals",r.id,"converted");renderCoachCrmClient(body,clientId,onBack);};
      row.appendChild(b);
    }
    card.appendChild(row);
  });
  body.appendChild(card);
}

function clientPurchases(body,snap,clientId,onBack){
  body.appendChild(el("div","sec-label","COMPRAS"));
  const card=el("section","coach-crm-card");
  if(!snap.purchases.length)card.appendChild(el("div","coach-crm-empty","Sin compras registradas."));
  snap.purchases.forEach((p)=>{
    const row=el("div","coach-crm-row");
    row.innerHTML=`<span><strong>${esc(p.item)}</strong><small>${esc(money(p.amountCents,p.currency))} · ${esc(p.status.toUpperCase())}</small></span>`;
    if(["ordered","paid"].includes(p.status)){
      const b=el("button","btn","ENTREGADO");
      b.onclick=()=>{S.updateCoachCrmStatus("purchases",p.id,"fulfilled");renderCoachCrmClient(body,clientId,onBack);};
      row.appendChild(b);
    }
    card.appendChild(row);
  });
  body.appendChild(card);
}

function clientNotes(body,snap){
  body.appendChild(el("div","sec-label","NOTAS"));
  const card=el("section","coach-crm-card");
  if(!snap.notes.length)card.appendChild(el("div","coach-crm-empty","Sin notas."));
  snap.notes.slice(0,10).forEach((n)=>card.appendChild(el("div","coach-crm-note",`<strong>${esc(n.text)}</strong><small>${esc(dateTime(n.at))}${n.tags.length?" · "+esc(n.tags.join(", ")): ""}</small>`)));
  body.appendChild(card);
}

function clientTimeline(body,clientId){
  body.appendChild(el("div","sec-label","TIMELINE"));
  const card=el("section","coach-crm-card");
  const rows=crmTimeline(crm(),clientId).slice(0,20);
  if(!rows.length)card.appendChild(el("div","coach-crm-empty","Sin actividad."));
  rows.forEach((x)=>card.appendChild(el("div","coach-crm-ledger-row",`<span class="pill">${esc(x.type.toUpperCase())}</span><strong>${esc(x.title)}</strong><small>${esc(dateTime(x.at))} · ${esc(x.status)}</small>`)));
  body.appendChild(card);
}

function clientOptions(selected){
  return crm().clients.filter((c)=>c.status!=="archived").map((c)=>`<option value="${esc(c.id)}" ${c.id===selected?"selected":""}>${esc(c.name)}</option>`).join("");
}

function clientModal(done){
  showModal(`
    <div class="cine-tag">COACH CRM · CLIENTE</div>
    <div class="cine-title" style="font-size:22px">NUEVA FICHA</div>
    <label>NOMBRE<input id="crm-c-name" maxlength="100"></label>
    <label>EMAIL · OPCIONAL<input id="crm-c-email" maxlength="120" type="email"></label>
    <label>TELÉFONO · OPCIONAL<input id="crm-c-phone" maxlength="40"></label>
    <label>ESTADO<select id="crm-c-status"><option value="active">ACTIVO</option><option value="lead">LEAD</option><option value="paused">PAUSADO</option></select></label>
    <button class="btn btn-primary btn-block" id="crm-c-save">GUARDAR CLIENTE</button>`,()=>{
      $("#crm-c-save").onclick=()=>{
        const rec=S.upsertCoachCrmClient({name:$("#crm-c-name").value,email:$("#crm-c-email").value,phone:$("#crm-c-phone").value,status:$("#crm-c-status").value,source:"manual"});
        if(!rec)return toast("CRM","Escribe un nombre válido.","danger");
        hideModal();done?.();
      };
    });
}

function appointmentModal(clientId,done){
  if(!crm().clients.length)return toast("CRM","Añade primero un cliente.","danger");
  showModal(`
    <div class="cine-tag">COACH CRM · AGENDA</div>
    <div class="cine-title" style="font-size:22px">NUEVA CITA</div>
    <label>CLIENTE<select id="crm-a-client">${clientOptions(clientId)}</select></label>
    <label>FECHA Y HORA<input id="crm-a-at" type="datetime-local"></label>
    <label>DURACIÓN · MIN<input id="crm-a-min" type="number" min="5" max="480" value="60"></label>
    <label>TIPO<select id="crm-a-kind"><option value="session">SESIÓN</option><option value="checkin">CHECK-IN</option><option value="review">REVISIÓN</option><option value="call">LLAMADA</option><option value="other">OTRA</option></select></label>
    <label>NOTA<textarea id="crm-a-note" maxlength="300"></textarea></label>
    <button class="btn btn-primary btn-block" id="crm-a-save">PROGRAMAR</button>`,()=>{
      $("#crm-a-save").onclick=()=>{
        const rec=S.addCoachCrmRecord("appointments",{clientId:$("#crm-a-client").value,startAt:$("#crm-a-at").value,durationMin:+$("#crm-a-min").value,kind:$("#crm-a-kind").value,note:$("#crm-a-note").value});
        if(!rec)return toast("CRM","Revisa fecha y cliente.","danger");
        hideModal();done?.();
      };
    });
}

function paymentModal(clientId,done){
  showModal(`
    <div class="cine-tag">COACH CRM · PAGOS</div>
    <div class="cine-title" style="font-size:22px">REGISTRAR PAGO</div>
    <div class="cine-sub">Esto registra estado administrativo; no realiza ningún cargo.</div>
    <label>IMPORTE<input id="crm-p-amount" type="number" min="0" step="0.01"></label>
    <label>MONEDA<select id="crm-p-cur"><option>EUR</option><option>COP</option><option>USD</option></select></label>
    <label>ESTADO<select id="crm-p-status"><option value="due">PENDIENTE</option><option value="paid">PAGADO</option><option value="overdue">VENCIDO</option></select></label>
    <label>VENCIMIENTO<input id="crm-p-due" type="date"></label>
    <label>REFERENCIA<input id="crm-p-ref" maxlength="100"></label>
    <button class="btn btn-primary btn-block" id="crm-p-save">GUARDAR REGISTRO</button>`,()=>{
      $("#crm-p-save").onclick=()=>{
        const cents=Math.round(Number($("#crm-p-amount").value)*100);
        const due=$("#crm-p-due").value?new Date($("#crm-p-due").value+"T12:00:00"):null;
        const rec=S.addCoachCrmRecord("payments",{clientId,amountCents:cents,currency:$("#crm-p-cur").value,status:$("#crm-p-status").value,dueAt:due,reference:$("#crm-p-ref").value,source:"manual"});
        if(!rec)return toast("CRM","Revisa el importe.","danger");
        hideModal();done?.();
      };
    });
}

function referralModal(clientId,done){
  showModal(`
    <div class="cine-tag">COACH CRM · REFERIDOS</div>
    <div class="cine-title" style="font-size:22px">NUEVO REFERIDO</div>
    <label>NOMBRE<input id="crm-r-name" maxlength="100"></label>
    <label>CONTACTO · OPCIONAL<input id="crm-r-contact" maxlength="120"></label>
    <label>NOTA<textarea id="crm-r-note" maxlength="300"></textarea></label>
    <button class="btn btn-primary btn-block" id="crm-r-save">GUARDAR REFERIDO</button>`,()=>{
      $("#crm-r-save").onclick=()=>{
        const rec=S.addCoachCrmRecord("referrals",{referrerClientId:clientId,referredName:$("#crm-r-name").value,contact:$("#crm-r-contact").value,note:$("#crm-r-note").value});
        if(!rec)return toast("CRM","Escribe el nombre del referido.","danger");
        hideModal();done?.();
      };
    });
}

function purchaseModal(clientId,done){
  showModal(`
    <div class="cine-tag">COACH CRM · COMPRAS</div>
    <div class="cine-title" style="font-size:22px">REGISTRAR COMPRA</div>
    <label>ARTÍCULO / SERVICIO<input id="crm-b-item" maxlength="120"></label>
    <label>IMPORTE<input id="crm-b-amount" type="number" min="0" step="0.01"></label>
    <label>MONEDA<select id="crm-b-cur"><option>EUR</option><option>COP</option><option>USD</option></select></label>
    <label>ESTADO<select id="crm-b-status"><option value="ordered">PEDIDO</option><option value="paid">PAGADO</option><option value="fulfilled">ENTREGADO</option></select></label>
    <label>REFERENCIA<input id="crm-b-ref" maxlength="100"></label>
    <button class="btn btn-primary btn-block" id="crm-b-save">GUARDAR COMPRA</button>`,()=>{
      $("#crm-b-save").onclick=()=>{
        const rec=S.addCoachCrmRecord("purchases",{clientId,item:$("#crm-b-item").value,amountCents:Math.round(Number($("#crm-b-amount").value)*100),currency:$("#crm-b-cur").value,status:$("#crm-b-status").value,reference:$("#crm-b-ref").value});
        if(!rec)return toast("CRM","Revisa artículo e importe.","danger");
        hideModal();done?.();
      };
    });
}

function noteModal(clientId,done){
  showModal(`
    <div class="cine-tag">COACH CRM · NOTA</div>
    <div class="cine-title" style="font-size:22px">AÑADIR NOTA</div>
    <label>NOTA<textarea id="crm-n-text" maxlength="600"></textarea></label>
    <label>ETIQUETAS · separadas por coma<input id="crm-n-tags" maxlength="160"></label>
    <button class="btn btn-primary btn-block" id="crm-n-save">GUARDAR NOTA</button>`,()=>{
      $("#crm-n-save").onclick=()=>{
        const rec=S.addCoachCrmRecord("notes",{clientId,text:$("#crm-n-text").value,tags:$("#crm-n-tags").value.split(",")});
        if(!rec)return toast("CRM","Escribe una nota.","danger");
        hideModal();done?.();
      };
    });
}
