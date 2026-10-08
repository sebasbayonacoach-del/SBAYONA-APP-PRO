// BAYONA — Stripe helpers. Server only.

import { createHmac, timingSafeEqual } from "node:crypto";

export const PAID_PLANS=Object.freeze(["raiz","performance","elite"]);

export function stripeConfig(){
  const secretKey=String(process.env.STRIPE_SECRET_KEY||"");
  const webhookSecret=String(process.env.STRIPE_WEBHOOK_SECRET||"");
  const prices={
    raiz:String(process.env.STRIPE_PRICE_RAIZ||""),
    performance:String(process.env.STRIPE_PRICE_PERFORMANCE||""),
    elite:String(process.env.STRIPE_PRICE_ELITE||""),
  };
  return {
    secretKey,webhookSecret,prices,
    checkoutConfigured:Boolean(secretKey&&Object.values(prices).some(Boolean)),
    webhookConfigured:Boolean(secretKey&&webhookSecret),
  };
}

export function priceForPlan(plan){
  const cfg=stripeConfig();
  return PAID_PLANS.includes(plan)?cfg.prices[plan]||"": "";
}

export async function stripeRequest(path,{method="GET",form,idempotencyKey}={}){
  const {secretKey}=stripeConfig();
  if(!secretKey)throw new Error("stripe_not_configured");
  const headers={
    authorization:`Bearer ${secretKey}`,
    accept:"application/json",
  };
  let body;
  if(form){
    headers["content-type"]="application/x-www-form-urlencoded";
    body=form instanceof URLSearchParams?form.toString():new URLSearchParams(form).toString();
  }
  if(idempotencyKey)headers["idempotency-key"]=String(idempotencyKey).slice(0,255);
  const r=await fetch("https://api.stripe.com/v1"+path,{method,headers,body,cache:"no-store"});
  const text=await r.text();
  let data={};
  try{data=text?JSON.parse(text):{};}catch{data={error:{message:"invalid_stripe_response"}};}
  if(!r.ok){
    const e=new Error(data?.error?.message||`stripe_${r.status}`);
    e.status=r.status;e.data=data;throw e;
  }
  return data;
}

function safeEqHex(a,b){
  try{
    const aa=Buffer.from(a,"hex"),bb=Buffer.from(b,"hex");
    return aa.length===bb.length&&aa.length>0&&timingSafeEqual(aa,bb);
  }catch{return false;}
}

export function verifyStripeSignature(raw,header,secret,toleranceSec=300){
  const parts=String(header||"").split(",").map((x)=>x.trim());
  const timestamp=parts.find((x)=>x.startsWith("t="))?.slice(2);
  const signatures=parts.filter((x)=>x.startsWith("v1=")).map((x)=>x.slice(3));
  const t=Number(timestamp);
  if(!Number.isFinite(t)||!signatures.length||!secret)return false;
  if(Math.abs(Date.now()/1000-t)>toleranceSec)return false;
  const expected=createHmac("sha256",secret).update(`${timestamp}.${raw}`,"utf8").digest("hex");
  return signatures.some((sig)=>safeEqHex(expected,sig));
}

export function planFromSubscription(sub){
  const meta=String(sub?.metadata?.plan||"").toLowerCase();
  if(PAID_PLANS.includes(meta))return meta;
  const priceId=sub?.items?.data?.[0]?.price?.id||"";
  const {prices}=stripeConfig();
  return PAID_PLANS.find((p)=>prices[p]&&prices[p]===priceId)||null;
}

export function normalizeStripeSubscription(sub){
  const userId=sub?.metadata?.user_id||null;
  const plan=planFromSubscription(sub);
  const status=String(sub?.status||"");
  if(!userId||!plan||!status)return null;
  const end=Number(sub.current_period_end);
  return {
    user_id:userId,
    provider:"stripe",
    customer_id:typeof sub.customer==="string"?sub.customer:sub.customer?.id||null,
    subscription_id:sub.id,
    plan,
    status,
    current_period_end:Number.isFinite(end)&&end>0?new Date(end*1000).toISOString():null,
    cancel_at_period_end:Boolean(sub.cancel_at_period_end),
    updated_at:new Date().toISOString(),
  };
}

export function subscriptionActive(row){
  return Boolean(row&&["active","trialing"].includes(row.status));
}
