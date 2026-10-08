import {
  applyCors, clientIp, json, rateLimited, readJson, sameOrigin, verifySupabaseUser,
} from "./_security.js";
import { PAID_PLANS, priceForPlan, stripeConfig, stripeRequest } from "./_billing.js";

function appOrigin(req){
  const env=String(process.env.BAYONA_PUBLIC_URL||"").trim();
  if(env){
    try{
      const u=new URL(env);
      if(u.protocol==="https:"||["localhost","127.0.0.1"].includes(u.hostname))return u.origin;
    }catch{}
  }
  return sameOrigin(req);
}

export default async function handler(req,res){
  if(!applyCors(req,res,"POST,OPTIONS"))return json(res,403,{ok:false,error:"origin_not_allowed"});
  if(req.method==="OPTIONS"){res.statusCode=204;return res.end();}
  if(req.method!=="POST")return json(res,405,{ok:false,error:"method_not_allowed"});

  const auth=await verifySupabaseUser(req);
  if(!auth.ok)return json(res,auth.status,{ok:false,error:auth.reason});
  if(rateLimited(`billing-checkout:${auth.user.id}:${clientIp(req)}`,{max:5,windowMs:10*60_000})){
    return json(res,429,{ok:false,error:"rate_limited"});
  }

  let body;
  try{body=await readJson(req,8*1024);}catch{return json(res,400,{ok:false,error:"invalid_request"});}
  const plan=String(body.plan||"").toLowerCase();
  if(!PAID_PLANS.includes(plan))return json(res,400,{ok:false,error:"invalid_plan"});

  const cfg=stripeConfig();
  const price=priceForPlan(plan);
  const origin=appOrigin(req);
  if(!cfg.checkoutConfigured||!price||!origin)return json(res,503,{ok:false,error:"billing_not_configured"});

  const form=new URLSearchParams();
  form.set("mode","subscription");
  form.set("success_url",`${origin}/?billing=success&session_id={CHECKOUT_SESSION_ID}`);
  form.set("cancel_url",`${origin}/?billing=cancelled`);
  form.set("client_reference_id",auth.user.id);
  form.set("line_items[0][price]",price);
  form.set("line_items[0][quantity]","1");
  form.set("allow_promotion_codes","true");
  form.set("metadata[user_id]",auth.user.id);
  form.set("metadata[plan]",plan);
  form.set("subscription_data[metadata][user_id]",auth.user.id);
  form.set("subscription_data[metadata][plan]",plan);
  if(auth.user.email)form.set("customer_email",auth.user.email);

  try{
    const session=await stripeRequest("/checkout/sessions",{
      method:"POST",
      form,
      idempotencyKey:`checkout-${auth.user.id}-${plan}-${Math.floor(Date.now()/60_000)}`,
    });
    if(!session?.url)return json(res,502,{ok:false,error:"checkout_url_missing"});
    return json(res,200,{ok:true,id:session.id,url:session.url});
  }catch(e){
    return json(res,502,{ok:false,error:"checkout_failed"});
  }
}
