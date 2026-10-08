import { securityHeaders, json, readRaw } from "./_security.js";
import {
  normalizeStripeSubscription, stripeConfig, stripeRequest, verifyStripeSignature,
} from "./_billing.js";
import { adminSelect, adminUpsert } from "./_supabase-admin.js";

export const config={api:{bodyParser:false}};

async function alreadyProcessed(id){
  const rows=await adminSelect("billing_webhook_events",{event_id:`eq.${id}`,select:"event_id",limit:"1"});
  return Boolean(rows?.length);
}

async function saveSubscription(sub){
  const row=normalizeStripeSubscription(sub);
  if(!row)return false;
  await adminUpsert("billing_subscriptions",[row],"user_id");
  return true;
}

export default async function handler(req,res){
  securityHeaders(res);
  if(req.method!=="POST")return json(res,405,{ok:false,error:"method_not_allowed"});

  const cfg=stripeConfig();
  if(!cfg.webhookConfigured)return json(res,503,{ok:false,error:"webhook_not_configured"});

  let raw;
  try{raw=await readRaw(req,1024*1024);}catch{return json(res,400,{ok:false,error:"invalid_body"});}
  const signature=req.headers?.["stripe-signature"];
  if(!verifyStripeSignature(raw,signature,cfg.webhookSecret)){
    return json(res,400,{ok:false,error:"invalid_signature"});
  }

  let event;
  try{event=JSON.parse(raw);}catch{return json(res,400,{ok:false,error:"invalid_json"});}
  if(!event?.id||!event?.type)return json(res,400,{ok:false,error:"invalid_event"});

  try{
    if(await alreadyProcessed(event.id))return json(res,200,{ok:true,duplicate:true});

    const obj=event.data?.object||{};
    if(event.type==="checkout.session.completed"&&obj.subscription){
      const sub=await stripeRequest(`/subscriptions/${encodeURIComponent(obj.subscription)}`);
      await saveSubscription(sub);
    }else if([
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
    ].includes(event.type)){
      await saveSubscription(obj);
    }

    await adminUpsert("billing_webhook_events",[{
      event_id:event.id,type:event.type,processed_at:new Date().toISOString(),
    }],"event_id");

    return json(res,200,{ok:true});
  }catch{
    // Stripe reintenta los webhooks no 2xx.
    return json(res,500,{ok:false,error:"webhook_processing_failed"});
  }
}
