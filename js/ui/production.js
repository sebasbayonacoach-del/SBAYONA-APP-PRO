// BAYONA — Production controls shown from Más.
// Billing and cloud backup remain server/rollout-authoritative.

import { S } from "../state.js";
import { t, esc, fmtDate } from "../i18n.js";
import { PLAN_META } from "../entitlements.js";
import { billingStatus, hydrateBillingEntitlement, openBillingPortal, startCheckout } from "../billing.js";
import { rolloutEnabled } from "../rollout.js";
import { listCloudBackups, restoreCloudBackup, saveCloudBackup } from "../cloud-backup.js";
import { currentSession } from "../sync/supabase.js";
import { el, showModal, hideModal, toast, $ } from "./shared.js";

const alive=(node)=>Boolean(node?.isConnected);

export function renderProductionControls(body){
  renderBilling(body);
  renderCloudBackup(body);
}

function renderBilling(body){
  body.appendChild(el("div","sec-label",t("prod.billing.label")));
  const card=el("section","card shine prod-billing");
  const top=el("div","card-row");
  top.append(el("h4","",t("prod.billing.title")),el("span","pill gold","SERVER"));
  const status=el("div","sub",currentSession()?t("prod.billing.loading"):t("prod.billing.signedOut"));
  const note=el("div","media-caption",t("prod.billing.note"));
  const plans=el("div","opt-row");
  card.append(top,status,note,plans);
  body.appendChild(card);

  if(!currentSession())return;

  (async()=>{
    const bill=await hydrateBillingEntitlement(S,{force:true});
    if(!alive(card))return;
    plans.textContent="";
    if(bill?.ok&&bill.active){
      status.innerHTML=`${esc(t("prod.billing.active",{plan:String(bill.plan).toUpperCase()}))}
        <div class="kv"><span class="k">${esc(t("prod.billing.status"))}</span><span class="v">${esc(String(bill.status).toUpperCase())}</span></div>
        <div class="kv"><span class="k">${esc(t("prod.billing.period"))}</span><span class="v">${esc(bill.currentPeriodEnd?fmtDate(bill.currentPeriodEnd):"—")}</span></div>`;
      const manage=el("button","btn btn-primary btn-block",t("prod.billing.manage"));
      manage.onclick=async()=>{
        manage.disabled=true;
        const out=await openBillingPortal();
        if(!out.ok){manage.disabled=false;toast(t("prod.billing.label"),t("prod.billing.unavailable"),"danger");}
      };
      card.appendChild(manage);
      return;
    }
    status.textContent=bill?.ok?t("prod.billing.none"):t("prod.billing.unavailable");

    for(const id of ["raiz","performance","elite"]){
      const meta=PLAN_META[id];
      const enabled=await rolloutEnabled("billing_checkout",{plan:id});
      if(!alive(card))return;
      const b=el("button",enabled?"opt on":"opt",enabled?t("prod.billing.checkout",{plan:meta.label}):t("prod.billing.rollout"));
      b.disabled=!enabled;
      b.onclick=async()=>{
        b.disabled=true;b.textContent=t("prod.billing.redirecting");
        const out=await startCheckout(id);
        if(!out.ok){b.disabled=false;b.textContent=t("prod.billing.checkout",{plan:meta.label});toast(t("prod.billing.label"),t("prod.billing.unavailable"),"danger");}
      };
      plans.appendChild(b);
    }
  })().catch(()=>{if(alive(card))status.textContent=t("prod.billing.unavailable");});
}

function renderCloudBackup(body){
  body.appendChild(el("div","sec-label",t("prod.backup.label")));
  const card=el("section","card prod-backup");
  card.append(
    el("h4","",t("prod.backup.title")),
    el("div","sub",t("prod.backup.body")),
    el("div","media-caption",t("prod.backup.localFirst"))
  );
  const state=el("div","media-caption",currentSession()?t("prod.rollout.note"):t("prod.backup.signedOut"));
  card.appendChild(state);
  body.appendChild(card);
  if(!currentSession())return;

  (async()=>{
    const enabled=await rolloutEnabled("cloud_backup",{plan:S.data.profile.membershipPlan||"free"});
    if(!alive(card))return;
    if(!enabled){state.textContent=t("prod.backup.rollout");return;}

    state.textContent="";
    const create=el("button","btn btn-primary btn-block",t("prod.backup.create"));
    create.onclick=async()=>{
      create.disabled=true;create.textContent=t("prod.backup.creating");
      try{
        await saveCloudBackup(S);
        toast(t("prod.backup.created"),t("prod.backup.createdNote"),"gold");
        await paintBackups(list,card);
      }catch{
        toast(t("prod.backup.label"),t("prod.backup.failed"),"danger");
      }finally{
        if(alive(create)){create.disabled=false;create.textContent=t("prod.backup.create");}
      }
    };
    card.appendChild(create);
    card.appendChild(el("div","sec-label",t("prod.backup.list")));
    const list=el("div","data-shots");
    card.appendChild(list);
    await paintBackups(list,card);
  })().catch(()=>{if(alive(card))state.textContent=t("prod.backup.failed");});
}

async function paintBackups(list,card){
  if(!alive(list)||!alive(card))return;
  list.textContent="";
  let rows=[];
  try{rows=await listCloudBackups();}catch{}
  if(!rows.length){list.appendChild(el("div","sub",t("prod.backup.empty")));return;}
  for(const row of rows){
    const line=el("div","data-shot");
    line.innerHTML=`<div><strong>${esc(fmtDate(row.created_at))}</strong><small>schema ${esc(row.schema_version)} · ${esc((Number(row.bytes)/1024).toFixed(1))} KB · SHA-256</small></div>`;
    const b=el("button","btn-mini",t("prod.backup.restore"));
    b.onclick=()=>{
      showModal(`
        <div class="cine-tag">${esc(t("prod.backup.label"))}</div>
        <div class="cine-title" style="font-size:20px">${esc(t("prod.backup.restoreTitle"))}</div>
        <div class="sub">${esc(t("prod.backup.restoreText"))}</div>
        <div style="display:flex;gap:8px">
          <button class="btn grow" id="cloud-restore-no">${esc(t("prod.backup.cancel"))}</button>
          <button class="btn btn-primary grow" id="cloud-restore-yes">${esc(t("prod.backup.confirm"))}</button>
        </div>`,()=>{
        $("#cloud-restore-no").onclick=hideModal;
        $("#cloud-restore-yes").onclick=async()=>{
          const yes=$("#cloud-restore-yes");yes.disabled=true;
          try{
            await restoreCloudBackup(S,row.id);
            location.reload();
          }catch{
            yes.disabled=false;
            toast(t("prod.backup.label"),t("prod.backup.failed"),"danger");
          }
        };
      });
    };
    line.appendChild(b);list.appendChild(line);
  }
}
