import {
  applyCors, clientIp, json, rateLimited, sameOrigin, verifySupabaseUser,
} from "./_security.js";
import { adminSelect } from "./_supabase-admin.js";
import { stripeRequest } from "./_billing.js";

function appOrigin(req){
  const env=String(process.env.BAYONA_PUBLIC_URL||"").trim();
  if(env){try{return new URL(env).origin;}catch{}}
  return sameOrigin(req);
}

export default async function handler(req,res){
  if(!applyCors(req,res,"POST,OPTIONS"))return json(res,403,{ok:false,error:"origin_not_allowed"});
  if(req.method==="OPTIONS"){res.statusCode=204;return res.end();}
  if(req.method!=="POST")return json(res,405,{ok:false,error:"method_not_allowed"});

  const auth=await verifySupabaseUser(req);
  if(!auth.ok)return json(res,auth.status,{ok:false,error:auth.reason});
  if(rateLimited(`billing-portal:${auth.user.id}:${clientIp(req)}`,{max:5,windowMs:10*60_000})){
    return json(res,429,{ok:false,error:"rate_limited"});
  }

  try{
    const rows=await adminSelect("billing_subscriptions",{
      user_id:`eq.${auth.user.id}`,select:"customer_id",limit:"1",
    });
    const customer=rows?.[0]?.customer_id;
    const origin=appOrigin(req);
    if(!customer||!origin)return json(res,404,{ok:false,error:"subscription_not_found"});
    const form=new URLSearchParams({customer,return_url:`${origin}/?billing=portal-return`});
    const session=await stripeRequest("/billing_portal/sessions",{method:"POST",form});
    if(!session?.url)return json(res,502,{ok:false,error:"portal_url_missing"});
    return json(res,200,{ok:true,url:session.url});
  }catch{
    return json(res,503,{ok:false,error:"billing_portal_unavailable"});
  }
}
