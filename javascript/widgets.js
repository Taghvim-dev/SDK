/** Taghvim 2.1.0 Widget -> SDK -> API adapter. Preview; never embed API keys in HTML. */
import {reconcileCalendarDates} from "./reconciliation.js";
export const WIDGET_OPERATIONS = Object.freeze({
  "date-picker": {method:"POST",path:"/v1/dates/convert"},
  "dual-calendar-badge": {method:"POST",path:"/v1/dates/convert"},
  "date-reconciliation": {method:"POST",path:"/v1/dates/reconcile"},
  "holiday-month": {method:"GET",path:"/v1/holidays"},
  "holiday-badge": {method:"GET",path:"/v1/holidays/{date}"},
  "business-day-badge": {method:"GET",path:"/v1/business-days/check"},
  "deadline-calculator": {method:"POST",path:"/v1/business-days/add"},
  "deadline-create": {method:"POST",path:"/v1/deadlines",sideEffect:true},
  "sla-calculator": {method:"POST",path:"/v1/sla/due"},
  "reminder-preview": {method:"POST",path:"/v1/reminders/preview"},
  "recurrence-builder": {method:"POST",path:"/v1/schedules/preview"},
  "agent-schedule-preview": {method:"POST",path:"/v1/schedules/preview"},
  "webhook-test": {method:"POST",path:"/v1/webhooks/{id}/test",sideEffect:true},
  "booking": {unavailable:"Missing canonical reservation/booking API"},
  "availability": {unavailable:"Missing canonical resource/slot API"},
  "workflow-run": {unavailable:"Landing-only preview is not a public Engine API"},
  "agent-execution": {unavailable:"Missing governed agent execution API"}
});
export class WidgetCapabilityError extends Error {
  constructor(kind,why){super("Widget "+kind+": "+why);this.name="WidgetCapabilityError";this.code="WIDGET_NOT_AVAILABLE";}
}
const obj=x=>!!x&&typeof x==="object"&&!Array.isArray(x);
const idem=x=>typeof x==="string"&&x.length>=8&&x.length<=128&&/^[\x21-\x7e]+$/.test(x);
function operation(kind){
  if(!Object.hasOwn(WIDGET_OPERATIONS,kind))throw new WidgetCapabilityError(kind,"not registered");
  const op=WIDGET_OPERATIONS[kind];
  if(op.unavailable)throw new WidgetCapabilityError(kind,op.unavailable);
  return op;
}
/** Use with a server-side TaghvimClient configured with a tenant-scoped secret key. */
export async function invokeWidget(client,kind,input={},options={}){
  if(!client||typeof client.request!=="function")throw new TypeError("Server-side TaghvimClient required");
  const op=operation(kind);
  if(!obj(input)||!obj(options))throw new TypeError("Widget input must be an object");
  if(kind==="date-reconciliation")return reconcileCalendarDates(client,input,options);
  if(op.sideEffect&&!idem(options.idempotencyKey))throw new TypeError("Idempotency key required");
  let path=op.path;
  for(const m of op.path.matchAll(/\{(\w+)\}/g)){
    const value=input[m[1]];
    if(typeof value!=="string"||!/^[a-zA-Z0-9_-]{1,128}$/.test(value))throw new TypeError("Invalid widget path parameter");
    path=path.replace(m[0],encodeURIComponent(value));
  }
  const payload=Object.fromEntries(Object.entries(input).filter(([k])=>!op.path.includes("{"+k+"}")));
  const optionsOut={};
  if(op.method==="GET")optionsOut.query=payload;else optionsOut.body=payload;
  if(options.idempotencyKey)optionsOut.idempotencyKey=options.idempotencyKey;
  if(options.signal)optionsOut.signal=options.signal;
  return client.request(op.method,path,optionsOut);
}
function json(status,payload){
  return new Response(JSON.stringify(payload),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}});
}
/** Default-deny gateway; host must implement verified session and quota admission. */
export function createWidgetGateway({clientForTenant,client,singleTenant=false,authorize,admit,allowedOrigins}={}){
  // Multi-tenant applications MUST resolve a tenant-bound secret per authenticated actor.
  // The static client is restricted to applications explicitly declaring one tenant.
  if((typeof clientForTenant!=="function" && (!singleTenant || !client || typeof client.request!=="function")) ||
    (typeof clientForTenant==="function" && (client || singleTenant)) ||
    typeof authorize!=="function"||typeof admit!=="function"||
    !Array.isArray(allowedOrigins)||!allowedOrigins.length||!allowedOrigins.every(s=>{try{const u=new URL(s);return u.origin===s&&u.protocol==="https:";}catch{return false;}}))
    throw new TypeError("Gateway requires client, authorize, admit, and HTTPS allowedOrigins");
  const origins=new Set(allowedOrigins);
  return async function gateway(request){
    if(request.method!=="POST")return json(405,{code:"method_not_allowed"});
    if(!origins.has(request.headers.get("origin")))return json(403,{code:"origin_denied"});
    if(!(request.headers.get("content-type")||"").toLowerCase().startsWith("application/json"))return json(415,{code:"unsupported_media_type"});
    if(Number(request.headers.get("content-length")||0)>16384)return json(413,{code:"payload_too_large"});
    let actor;
    try{actor=await authorize(request);}catch{return json(403,{code:"unauthorized"});}
    if(!actor || typeof actor!=="object" || typeof actor.tenantId!=="string" || !/^[A-Za-z0-9_-]{1,128}$/.test(actor.tenantId))return json(403,{code:"unauthorized_tenant"});
    let value;
    try{const body=await request.text();if(body.length>16384)return json(413,{code:"payload_too_large"});value=JSON.parse(body);}catch{return json(400,{code:"invalid_json"});}
    if(!obj(value)||typeof value.widget!=="string"||!obj(value.input))return json(400,{code:"invalid_widget_input"});
    let op;
    try{op=operation(value.widget);}catch{return json(422,{code:"widget_not_available"});}
    let allowed=false;
    try{allowed=await admit({request,actor,widget:value.widget,operation:op});}catch{/* deny */}
    if(allowed!==true)return json(429,{code:"widget_rate_limited"});
    const key=request.headers.get("idempotency-key")||undefined;
    if(op.sideEffect&&!idem(key))return json(400,{code:"idempotency_required"});
    try{
      const scopedClient=typeof clientForTenant==="function"?await clientForTenant(actor.tenantId,actor):client;
      if(!scopedClient||typeof scopedClient.request!=="function")return json(403,{code:"tenant_not_provisioned"});
      const r=await invokeWidget(scopedClient,value.widget,value.input,{idempotencyKey:key});
      return json(200,{data:r.data,status:r.status,requestId:r.requestId,rateLimit:r.rateLimit});
    }catch(e){
      const status=Number.isInteger(e.status)&&e.status>=400&&e.status<=599?e.status:502;
      return json(status,{code:typeof e.code==="string"&&/^[a-z][a-z0-9_]{0,63}$/.test(e.code)?e.code:"upstream_error",requestId:e.requestId||null});
    }
  };
}
/** Browser SDK sends only widget inputs via the embedding application's own origin. */
export function createBrowserWidgetClient({endpoint="/__taghvim/widgets",fetch:fetcher=globalThis.fetch}={}){
  if(typeof endpoint!=="string"||!/^\/(?!\/)[a-zA-Z0-9/_-]+$/.test(endpoint)||endpoint.includes("..")||typeof fetcher!=="function")
    throw new TypeError("Expected same-origin widget endpoint and fetch");
  return Object.freeze({async invoke(widget,input={},options={}){
    const op=operation(widget);
    if(!obj(input)||!obj(options))throw new TypeError("Invalid widget input");
    if(op.sideEffect&&!idem(options.idempotencyKey))throw new TypeError("Idempotency key required");
    const headers={"content-type":"application/json"};
    if(options.idempotencyKey)headers["idempotency-key"]=options.idempotencyKey;
    const res=await fetcher(endpoint,{method:"POST",headers,body:JSON.stringify({widget,input}),credentials:"same-origin",mode:"same-origin",redirect:"error",cache:"no-store",referrerPolicy:"no-referrer",signal:options.signal});
    const payload=await res.json();
    if(!res.ok){const e=new Error("Widget request failed ("+res.status+")");e.code=payload?.code||"widget_request_failed";e.status=res.status;throw e;}
    return payload;
  }});
}
