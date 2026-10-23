import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {WIDGET_OPERATIONS,WidgetCapabilityError,invokeWidget,createWidgetGateway,createBrowserWidgetClient} from "../widgets.js";
const contract=JSON.parse(readFileSync(new URL("../../contracts/operation-index.json",import.meta.url)));
const routes=new Set(contract.operations.map(x=>x.method+" "+x.path));
test("all claimed widget routes exist in canonical SDK OpenAPI operation index",()=>{
  assert.ok(Object.keys(WIDGET_OPERATIONS).length>=12);
  for(const [widget,op] of Object.entries(WIDGET_OPERATIONS)){
    if(op.unavailable){assert.ok(op.unavailable.length>8,widget);continue;}
    assert.ok(routes.has(op.method+" "+op.path),widget+": missing "+op.path);
  }
  for(const x of ["booking","availability","workflow-run","agent-execution"])assert.ok(WIDGET_OPERATIONS[x].unavailable);
});
test("adapter invokes real SDK request, never creates a mock response",async()=>{
  let seen;
  const client={request:async(...args)=>{seen=args;return {data:{ok:true},status:200,requestId:"req_test",rateLimit:"20"};}};
  const response=await invokeWidget(client,"deadline-calculator",{date:"1405-07-15",days:30});
  assert.equal(response.requestId,"req_test");
  assert.deepEqual(seen,["POST","/v1/business-days/add",{body:{date:"1405-07-15",days:30}}]);
  await invokeWidget(client,"holiday-badge",{date:"1405-07-15"});
  assert.deepEqual(seen,["GET","/v1/holidays/1405-07-15",{query:{}}]);
  await assert.rejects(invokeWidget(client,"booking",{}),WidgetCapabilityError);
  await assert.rejects(invokeWidget(client,"webhook-test",{id:"hook_1"}),/Idempotency/);
  await invokeWidget(client,"webhook-test",{id:"hook_1"},{idempotencyKey:"widget-test-retry-001"});
  assert.deepEqual(seen,["POST","/v1/webhooks/hook_1/test",{body:{},idempotencyKey:"widget-test-retry-001"}]);
});
test("gateway enforces origin, session and admission before reaching API",async()=>{
  let count=0;
  const client={request:async()=>{count++;return {data:{ok:true},status:200,requestId:"req_test",rateLimit:"20"};}};
  const factory=(authorize,admit)=>createWidgetGateway({clientForTenant:async tenantId=>tenantId==="tenant_1"?client:null,authorize,admit,allowedOrigins:["https://widgets.example.org"]});
  const request=(origin,widget="date-picker")=>new Request("https://widgets.example.org/__taghvim/widgets",{method:"POST",headers:{origin,"content-type":"application/json"},body:JSON.stringify({widget,input:{date:"1405-07-15"}})});
  assert.equal((await factory(()=>({tenantId:"tenant_1"}),()=>true)(request("https://evil.example"))).status,403);
  assert.equal((await factory(()=>false,()=>true)(request("https://widgets.example.org"))).status,403);
  assert.equal((await factory(()=>({tenantId:"tenant_1"}),()=>false)(request("https://widgets.example.org"))).status,429);
  assert.equal((await factory(()=>({tenantId:"tenant_1"}),()=>true)(request("https://widgets.example.org","booking"))).status,422);
  assert.equal(count,0);
  const out=await factory(()=>({tenantId:"tenant_1"}),()=>true)(request("https://widgets.example.org"));
  assert.equal(out.status,200);assert.equal((await out.json()).requestId,"req_test");assert.equal(count,1);
});
test("browser SDK never accepts cross-origin endpoint or embeds an upstream API key",async()=>{
  let captured;
  const fetcher=async(url,options)=>{captured={url,options};return new Response(JSON.stringify({requestId:"req_browser"}),{status:200,headers:{"content-type":"application/json"}});};
  const browser=createBrowserWidgetClient({fetch:fetcher});
  assert.equal((await browser.invoke("date-picker",{date:"1405-07-15"})).requestId,"req_browser");
  assert.equal(captured.url,"/__taghvim/widgets");
  assert.equal(captured.options.credentials,"same-origin");
  assert.equal(captured.options.mode,"same-origin");
  assert.equal(Object.keys(captured.options.headers).includes("authorization"),false);
  assert.throws(()=>createBrowserWidgetClient({endpoint:"https://api.taghvim.dev/v1"}),/same-origin/);
  await assert.rejects(browser.invoke("availability",{}),WidgetCapabilityError);
});

test("gateway never allows a shared key or unverified tenant to cross ownership boundaries",async()=>{
  assert.throws(()=>createWidgetGateway({
    client:{request:async()=>({})}, authorize:()=>({tenantId:"a"}),admit:()=>true,
    allowedOrigins:["https://widgets.example.org"]
  }),/Gateway requires/);
  const mapped=[];
  const handler=createWidgetGateway({
    clientForTenant: async tenantId => {
      mapped.push(tenantId);
      if(tenantId!=="tenant_valid")return null;
      return {request:async(method,path)=>({data:{path,method},status:200,requestId:"req_isolated",rateLimit:null})};
    },
    authorize: async request => request.headers.get("x-test-identity")==="valid"?
      {tenantId:"tenant_valid"}: {tenantId:"tenant_attack"},
    admit: async ({actor})=>actor.tenantId==="tenant_valid",
    allowedOrigins:["https://widgets.example.org"]
  });
  function req(identity){
    return new Request("https://widgets.example.org/__taghvim/widgets",{
      method:"POST",headers:{origin:"https://widgets.example.org","content-type":"application/json","x-test-identity":identity},
      body:JSON.stringify({widget:"deadline-calculator",input:{date:"1405-07-15",days:4}})
    });
  }
  assert.equal((await handler(req("invalid"))).status,429);
  assert.deepEqual(mapped,[]);
  const good=await handler(req("valid"));
  assert.equal(good.status,200);
  assert.equal((await good.json()).requestId,"req_isolated");
  assert.deepEqual(mapped,["tenant_valid"]);
});
