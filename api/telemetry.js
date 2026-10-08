import {
  applyCors, clientIp, json, rateLimited, readJson, serviceSupabaseEnv, verifySupabaseUser,
} from "./_security.js";
import { adminInsert } from "./_supabase-admin.js";

const KINDS=new Set([
  "client_error","unhandled_rejection","optional_load_error",
  "sync_error","api_error","web_vital","release",
]);
const SEVERITY=new Set(["info","warn","error"]);
const DETAIL_KEYS=new Set([
  "code","name","metric","value","durationMs","count","online",
  "section","status","viewportWidth","viewportHeight",
]);

function cleanText(v,max=100){return String(v??"").replace(/[^a-zA-Z0-9_.:/-]/g,"_").slice(0,max);}
function cleanDetails(input){
  const out={};
  if(!input||typeof input!=="object"||Array.isArray(input))return out;
  for(const [k,v] of Object.entries(input)){
    if(!DETAIL_KEYS.has(k))continue;
    if(typeof v==="number"&&Number.isFinite(v))out[k]=Math.round(v*100)/100;
    else if(typeof v==="boolean")out[k]=v;
    else if(typeof v==="string")out[k]=cleanText(v,100);
  }
  return out;
}

export default async function handler(req,res){
  if(!applyCors(req,res,"POST,OPTIONS"))return json(res,403,{ok:false,error:"origin_not_allowed"});
  if(req.method==="OPTIONS"){res.statusCode=204;return res.end();}
  if(req.method!=="POST")return json(res,405,{ok:false,error:"method_not_allowed"});
  if(rateLimited(`telemetry:${clientIp(req)}`,{max:60,windowMs:60_000})){
    return json(res,429,{ok:false,error:"rate_limited"});
  }

  let body;
  try{body=await readJson(req,12*1024);}catch{return json(res,400,{ok:false,error:"invalid_request"});}
  const kind=String(body.kind||"");
  if(!KINDS.has(kind))return json(res,400,{ok:false,error:"invalid_kind"});

  const env=serviceSupabaseEnv();
  if(!env.serviceConfigured)return json(res,202,{ok:true,stored:false});

  let userId=null;
  if(req.headers?.authorization){
    const auth=await verifySupabaseUser(req);
    if(auth.ok)userId=auth.user.id;
  }

  const route=cleanText(body.route,120)||null;
  const release=cleanText(body.release,80)||null;
  const severity=SEVERITY.has(body.severity)?body.severity:"info";
  const details=cleanDetails(body.details);

  try{
    await adminInsert("telemetry_events",[{
      user_id:userId,kind,severity,route,release,details,
    }]);
    return json(res,202,{ok:true,stored:true});
  }catch{
    // Observability must never become an availability dependency.
    return json(res,202,{ok:true,stored:false});
  }
}
