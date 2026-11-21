/**
 * Taghvim MCP stdio bridge for the 2026-07-28 stateless MCP protocol.
 * Delegates EVERY operation to the public TaghvimClient's canonical API Gateway.
 * No private admin keys, direct D1 access, fallback/mock route or alternate quota.
 * Source preview: this is NOT an assertion of GA runtime certification.
 */
import {readFileSync} from "node:fs";
import {createInterface} from "node:readline";
import {TaghvimClient,TaghvimApiError} from "./index.js";

export const MCP_VERSION="2026-07-28";
const INFO=Object.freeze({name:"taghvim-mcp-bridge",version:"2.1.0"});
const META="io.modelcontextprotocol/";
const identity=()=>({[META+"serverInfo"]:INFO});
const complete=value=>({resultType:"complete",...value,_meta:identity()});
const canonical=JSON.parse(readFileSync(new URL("../contracts/operation-index.json",import.meta.url),"utf8"));
const ALLOWED=new Set([
 "listCalendarSystems","convertDate","reconcileDates","resolveDate",
 "addBusinessDays","diffBusinessDays","isBusinessDay",
 "checkBusinessDay","nextBusinessDay","previousBusinessDay",
 "listHolidays","getHolidaysOn","dueSla","previewReminders","previewSchedule",
 "getCurrentWorkspace","getWorkspace","createWorkspace",
 "createCalendar","getCalendar","updateCalendar",
 "createCalendarEvent","updateCalendarEvent","listCalendarEvents",
 "publishCalendar","unpublishCalendar","getPublicCalendar",
 "listPublicCalendarEvents","getPublicCalendarIcs","searchPublicCalendarEvents",
 "subscribeCalendar","setCalendarNotificationPreferences",
 "getUsage","listWebhooks","getWebhook","createWebhook",
 "listWebhookDeliveries","testWebhook","listEventLog"
]);
const PUBLIC=new Set(["getPublicCalendar","getPublicCalendarIcs","listPublicCalendarEvents","searchPublicCalendarEvents"]);
// These POST operations have idempotency:none in the canonical Engine contract:
// they calculate/preview but do not change customer business state.
const PURE_POST=new Set(["convertDate","reconcileDates","resolveDate",
 "addBusinessDays","diffBusinessDays","isBusinessDay","dueSla","previewReminders","previewSchedule"]);
const effectFree=op=>op.method==="GET"||(op.method==="POST"&&PURE_POST.has(op.operationId));
const NEVER_EXPOSE=new Set([
 "createTenant","createApiKey","revokeApiKey","exportBilling",
 "createPaymentIntent","getPaymentIntent","verifyPaymentIntent",
 "cancelPaymentIntent","paymentCallback","getReceipt","listReceiptDeliveries"
]);
const isObject=x=>x!==null&&typeof x==="object"&&!Array.isArray(x);
const validKey=x=>typeof x==="string"&&/^[A-Za-z][A-Za-z0-9_:-]{2,127}$/.test(x);
const error=(code,message,data)=>({code,message,...(data?{data}: {})});
const rpcError=(id,code,message,data)=>({jsonrpc:"2.0",id,error:error(code,message,data)});
const status=(name,op)=>({name:"taghvim_"+name,description:op.method+" "+op.path+" | Canonical Taghvim API Gateway; same API key, workspace, policy and metering.",inputSchema:{
 type:"object",properties:{
  path:{type:"object",additionalProperties:{type:"string"}},
  query:{type:"object",additionalProperties:{type:["string","number","boolean"]}},
  body:{type:"object"},
  workspaceId:{type:"string"},
  idempotencyKey:{type:"string",minLength:8,maxLength:128}
 },additionalProperties:false,
 ...(op.path.includes("{")?{required:["path"]}:{})
},annotations:{readOnlyHint:effectFree(op),destructiveHint:!effectFree(op),openWorldHint:false}});
function routePath(template,values){
 const vars=[...template.matchAll(/{([a-z_]+)}/g)].map(x=>x[1]);
 if(vars.length!==new Set(vars).size)throw new TypeError("Duplicate path parameters");
 if(vars.length){
  if(!isObject(values)||Object.keys(values).sort().join(",")!==vars.slice().sort().join(","))
   throw new TypeError("Exact named path parameters required");
 }else if(values!==undefined&&(!isObject(values)||Object.keys(values).length))
   throw new TypeError("No path parameters accepted");
 return template.replace(/{([a-z_]+)}/g,(_,key)=>{
  const value=values[key];
  if(!(key==="date"?typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value):validKey(value))||value===".."||value===".")throw new TypeError("Invalid path identifier");
  return encodeURIComponent(value);
 });
}
function validateArgs(a,op,writeEnabled){
 if(!isObject(a))throw new TypeError("Tool arguments must be an object");
 const accepted=new Set(["path","query","body","workspaceId","idempotencyKey"]);
 if(Object.keys(a).some(k=>!accepted.has(k)))throw new TypeError("Unknown tool parameter");
 if(a.query!==undefined&&(!isObject(a.query)||Object.values(a.query).some(x=>!["string","number","boolean"].includes(typeof x))))
  throw new TypeError("Invalid query");
 if(a.body!==undefined&&!isObject(a.body))throw new TypeError("Body must be an object");
 if(op.method==="GET"){
  if(a.body!==undefined||a.idempotencyKey!==undefined)throw new TypeError("GET forbids body and idempotency");
 }else if(effectFree(op)){
  if(a.body===undefined||a.idempotencyKey!==undefined)
   throw new TypeError("Pure calculation requires body and forbids mutation idempotency");
 }else{
  if(!writeEnabled)throw new TypeError("MCP mutations denied until explicit write authority");
  if(!a.idempotencyKey||typeof a.idempotencyKey!=="string"||!/^[-_A-Za-z0-9:]{8,128}$/.test(a.idempotencyKey))
   throw new TypeError("Explicit idempotency key required for every effectful call");
 }
 if(a.workspaceId!==undefined&&!validKey(a.workspaceId))throw new TypeError("Invalid workspace selector");
 return {path:routePath(op.path,a.path),options:{
  ...(a.body===undefined?{}:{body:a.body}),
  ...(a.query===undefined?{}:{query:a.query}),
  ...(a.workspaceId===undefined?{}:{workspaceId:a.workspaceId}),
  ...(a.idempotencyKey===undefined?{}:{idempotencyKey:a.idempotencyKey}),
  auth:!PUBLIC.has(op.operationId)
 }};
}
export function createTaghvimMcpBridge({client,writeEnabled=false,operationIndex=canonical}={}){
 if(!client||typeof client.request!=="function"||typeof writeEnabled!=="boolean")
  throw new TypeError("A canonical TaghvimClient and explicit write policy are required");
 if(operationIndex?.contractVersion!=="2.1.0"||!Array.isArray(operationIndex.operations))
  throw new TypeError("Canonical 2.1.0 operation index required");
 const lookup=new Map();
 for(const op of operationIndex.operations){
  if(!ALLOWED.has(op.operationId))continue;
  if(NEVER_EXPOSE.has(op.operationId)||lookup.has(op.operationId)||!/^(GET|POST|PATCH|DELETE)$/.test(op.method)||
     !/^\/v1\/[a-z/{0-9}_-]+$/i.test(op.path)||
     (PUBLIC.has(op.operationId)?op.auth?.length!==0:!op.auth?.includes("ApiKey")))
   throw new TypeError("Unsafe, duplicate or unverifiable MCP operation");
  lookup.set(op.operationId,op);
 }
 const names=[...lookup.keys()].sort();
 if(names.length!==ALLOWED.size)throw new TypeError("Missing canonical MCP operation: block catalog");
 const tools=Object.freeze(names.filter(n=>writeEnabled||effectFree(lookup.get(n))).map(n=>status(n,lookup.get(n))));
 async function handle(req,{signal}={}){
  const id=req?.id??null;
  if(!isObject(req)||req.jsonrpc!=="2.0"||typeof req.method!=="string"||
     (req.id!==undefined&&typeof req.id!=="string"&&typeof req.id!=="number"))
   return rpcError(id,-32600,"Invalid JSON-RPC request");
  if(req.id===undefined)return null;
  const version=req.params?._meta?.[META+"protocolVersion"];
  if(version!==MCP_VERSION)return rpcError(id,-32022,"Unsupported protocol version",{supported:[MCP_VERSION],requested:version||null});
  if(!isObject(req.params))return rpcError(id,-32602,"Invalid parameters");
  if(req.method==="server/discover")return{jsonrpc:"2.0",id,result:complete({
   supportedVersions:[MCP_VERSION],capabilities:{tools:{listChanged:false}},ttlMs:3600000,cacheScope:"private"
  })};
  if(req.method==="tools/list")return{jsonrpc:"2.0",id,result:complete({
   tools,ttlMs:3600000,cacheScope:"private"
  })};
  if(req.method!=="tools/call")return rpcError(id,-32601,"Method not found");
  const name=req.params.name;
  const key=typeof name==="string"&&name.startsWith("taghvim_")?name.slice(8):null;
  const op=lookup.get(key);
  if(!op||(!writeEnabled&&!effectFree(op)))return rpcError(id,-32602,"Tool not admitted by canonical contract");
  let validated;
  try{validated=validateArgs(req.params.arguments??{},op,writeEnabled);}
  catch{return rpcError(id,-32602,"Invalid or unauthorized tool arguments");}
  try{
   const out=await client.request(op.method,validated.path,signal?{...validated.options,signal}:validated.options);
   // Return caller-visible API data only; never attach credentials, environment or session secrets.
   return{jsonrpc:"2.0",id,result:complete({isError:false,
    content:[{type:"text",text:JSON.stringify({status:out.status,request_id:out.requestId,data:out.data})}]})};
  }catch(e){
   const safe=e instanceof TaghvimApiError?
    {code:e.code,status:e.status,request_id:e.requestId}: {code:"upstream_unavailable"};
   return{jsonrpc:"2.0",id,result:complete({isError:true,
    content:[{type:"text",text:JSON.stringify(safe)}]})};
  }
 }
 return Object.freeze({handle,tools});
}
export async function serveMcpStdio(bridge,{input=process.stdin,output=process.stdout}={}){
 if(typeof bridge?.handle!=="function")throw new TypeError("MCP bridge required");
 const lines=createInterface({input,crlfDelay:Infinity,terminal:false});
 // Source of truth for all concurrent JSON-RPC requests. A cancellation is
 // admitted BEFORE any awaiting of the upstream SDK HTTP call. Never serialize
 // stdin processing behind a network operation or let a cancelled reply escape.
 const inflight=new Map(),running=new Set();
 const requestKey=id=>typeof id+":"+String(id);
 const write=result=>{
  if(result!==null&&result!==undefined)output.write(JSON.stringify(result)+"\n");
 };
 for await(const line of lines){
  if(Buffer.byteLength(line,"utf8")>1024*1024){
   write(rpcError(null,-32700,"Message too large"));continue;
  }
  let req;
  try{req=JSON.parse(line);}
  catch{write(rpcError(null,-32700,"Invalid JSON"));continue;}
  // Cancellation is a notification, not a second JSON-RPC request; the exact
  // client protocol version and original request ID must be supplied.
  if(isObject(req)&&req.jsonrpc==="2.0"&&req.method==="notifications/cancelled"&&
     req.id===undefined&&isObject(req.params)&&
     req.params._meta?.[META+"protocolVersion"]===MCP_VERSION){
   const target=req.params.requestId;
   if((typeof target==="string"||typeof target==="number")&&target!==null){
    const pending=inflight.get(requestKey(target));
    if(pending){pending.cancelled=true;pending.controller.abort();}
   }
   continue;
  }
  // Notifications never carry a response; reject malformed RPC only when a
  // response identifier was actually supplied.
  if(isObject(req)&&req.id===undefined)continue;
  const id=req?.id;
  const identifiable=typeof id==="string"||typeof id==="number";
  const key=identifiable?requestKey(id):null;
  if(key&&inflight.has(key)){
   write(rpcError(id,-32600,"Duplicate in-flight request ID"));continue;
  }
  if(inflight.size>=32){
   write(rpcError(identifiable?id:null,-32000,"Maximum concurrent MCP requests exceeded"));continue;
  }
  const controller=new AbortController(),task={controller,cancelled:false,promise:null};
  if(key)inflight.set(key,task);
  // The synchronous task registration above must precede scheduling the
  // Promise: a cancellation on the very next line cannot race past the map.
  const done=Promise.resolve().then(()=>bridge.handle(req,{signal:controller.signal}))
   .then(answer=>{if(!task.cancelled)write(answer);},
     ()=>{if(!task.cancelled)write(rpcError(identifiable?id:null,-32603,"MCP upstream request failed"));})
   .finally(()=>{
    if(key&&inflight.get(key)===task)inflight.delete(key);
    running.delete(done);
   });
  task.promise=done;running.add(done);
 }
 // End-of-stream is a bounded close, not a license for a stuck SDK request to
 // hold the MCP process forever. Abort and suppress outstanding responses.
 // Give already-settled requests one turn to flush normally first.
 await Promise.resolve();
 const pending=[...running];
 if(pending.length){
  const settled=Promise.allSettled(pending);
  const expired=await Promise.race([settled.then(()=>false),
   new Promise(resolve=>{const timer=setTimeout(()=>resolve(true),300);/* bounded EOF drain; timer remains live */})]);
  if(expired){
   for(const entry of inflight.values()){entry.cancelled=true;entry.controller.abort();}
  }
 }
}
export function mcpFromEnvironment(env=process.env){
 if(!env.TAGHVIM_API_KEY)throw new Error("TAGHVIM_API_KEY_REQUIRED");
 const mode=env.TAGHVIM_MCP_MODE||"test";
 if(!["test","live"].includes(mode))throw new Error("INVALID_MCP_MODE");
 const client=new TaghvimClient({apiKey:env.TAGHVIM_API_KEY,mode});
 return createTaghvimMcpBridge({client,writeEnabled:env.TAGHVIM_MCP_ALLOW_MUTATIONS==="true"});
}
