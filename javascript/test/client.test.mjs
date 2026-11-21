import {test} from "node:test";
import assert from "node:assert/strict";
import {TaghvimClient, TaghvimApiError, createTestClient} from "../index.js";
import {readFileSync} from "node:fs";

const key="tgv_test_ExampleApprovedByInvitation";
const contract=JSON.parse(readFileSync(new URL("../../contracts/operation-index.json", import.meta.url)));
test("product preview API routes belong to the pinned contract", () => {
 const allow=new Set(contract.operations.map(x=>x.method+" "+x.path));
 for(const route of ["POST /v1/dates/convert","POST /v1/business-days/add","GET /v1/holidays","POST /v1/deadlines","GET /v1/usage","GET /v1/health"]) assert.ok(allow.has(route),route);
 assert.equal(contract.contractVersion,"2.1.0");
});
test("test client sends an authenticated request and preserves trace metadata",async()=>{
 let call;
 const client=createTestClient({apiKey:key,fetch:async(url,opts)=>{call={url,opts};return new Response(JSON.stringify({date:{iso:"2026-10-07"}}),{status:200,headers:{"content-type":"application/json","Taghvim-Request-Id":"req_sdk_1"}})}});
 const response=await client.convertDate({date:"1405-07-15"},{idempotencyKey:"example-idempotency-001"});
 assert.equal(call.url,"https://api.taghvim.dev/v1/dates/convert");
 assert.equal(call.opts.headers.authorization,"Bearer "+key);
 assert.equal(response.requestId,"req_sdk_1");
 assert.deepEqual(JSON.parse(call.opts.body),{date:"1405-07-15"});
});
test("enforces opt-in to live keys, rejects HTTP remote hosts and never leaks keys", async()=>{
 assert.throws(()=>createTestClient({apiKey:"tgv_live_TestOnly"}),/Test mode requires/);
 assert.throws(()=>new TaghvimClient({apiKey:key,mode:"live"}),/Live mode requires/);
 assert.throws(()=>createTestClient({apiKey:key,baseUrl:"http://example.com"}),/Insecure/);
 const client=new TaghvimClient({apiKey:key,fetch:async()=>new Response(JSON.stringify({code:"quota_exceeded",title:"Quota exceeded"}),{status:429,headers:{"content-type":"application/json","Taghvim-Request-Id":"req_limit","Retry-After":"30"}})});
 await assert.rejects(client.usage(),e=>e instanceof TaghvimApiError && e.code==="quota_exceeded"&&e.status===429&&e.requestId==="req_limit"&&e.retryAfter==="30"&&!String(e).includes(key));
});
test("unauthenticated health request does not send authorization",async()=>{
 let auth="sent";const client=new TaghvimClient({fetch:async(_url,options)=>{auth=options.headers.authorization;return new Response(JSON.stringify({status:"ok"}),{status:200,headers:{"content-type":"application/json"}})}});
 const out=await client.health();
 assert.equal(auth,undefined);assert.equal(out.status,200);
});

test("native reconciliation is exactly one authenticated request; invalid inputs fail before quota and 404 never silently downgrades",async()=>{
 const calls=[];
 const pair={left:{date:"1405-07-15",calendar_system:"jalali",expected:{weekday:3}},
  right:{date:"2026-10-07",calendar_system:"gregorian"}};
 const client=createTestClient({apiKey:key,fetch:async(url,options)=>{
  calls.push({url,options});
  return new Response(JSON.stringify({status:"equivalent",equivalent:true,evidence:{request_ids:["req_native"],meter_units:2}}),
   {status:200,headers:{"content-type":"application/json","Taghvim-Request-Id":"req_native"}});
 }});
 const result=await client.reconcileDates(pair);
 assert.equal(result.data.status,"equivalent");
 assert.equal(calls.length,1);
 assert.equal(new URL(calls[0].url).pathname,"/v1/dates/reconcile");
 assert.equal(calls[0].options.headers.authorization,"Bearer "+key);
 assert.deepEqual(JSON.parse(calls[0].options.body),pair);
 assert.throws(()=>client.reconcileDates({left:{date:"1405-07-15"},right:pair.right}),/calendar_system/);
 assert.equal(calls.length,1);
 let hits=0;
 const unavailable=createTestClient({apiKey:key,fetch:async()=>{hits++;return new Response(JSON.stringify({code:"route_not_found"}),{status:404,headers:{"content-type":"application/problem+json"}});}});
 await assert.rejects(unavailable.reconcileDates(pair),e=>e.status===404&&e.code==="route_not_found");
 assert.equal(hits,1,"no downgrade or second API call on missing native API");
});

test("institutional calendar SDK binds one API transport, exact revision and public no-key ICS",async()=>{
 const seen=[];
 const fetcher=async(url,opts)=>{
  seen.push({url,opts});
  const isIcs=new URL(url).pathname.endsWith("/ics");
  return new Response(isIcs?"BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n":JSON.stringify({status:"draft",version:2}),
    {status:200,headers:{"content-type":isIcs?"text/calendar; charset=utf-8":"application/json",
      "Taghvim-Request-Id":"req_publication_sdk"}});
 };
 const client=createTestClient({apiKey:key,fetch:fetcher});
 assert.throws(()=>client.createCalendar({status:"draft"}),/Idempotency/);
 assert.throws(()=>client.updateCalendar("cal_1",{version:2}),/Idempotency/);
 await client.createCalendar({status:"draft"},{idempotencyKey:"sdk-create-calendar-001"});
 await client.updateCalendar("cal_1",{version:2},{idempotencyKey:"sdk-update-calendar-001"});
 await client.publishCalendar("cal_1",2,{idempotencyKey:"sdk-publish-calendar-001"});
 await client.unpublishCalendar("cal_1",3,{idempotencyKey:"sdk-unpublish-calendar-001"});
 assert.equal(seen[1].opts.method,"PATCH");
 assert.equal(JSON.parse(seen[2].opts.body).expected_version,2);
 assert.equal(seen[3].opts.headers["idempotency-key"],"sdk-unpublish-calendar-001");
 const anon=new TaghvimClient({fetch:fetcher});
 const feed=await anon.publicCalendarIcs("cal_1");
 assert.match(feed.data,/BEGIN:VCALENDAR/);
 assert.equal(seen.at(-1).opts.headers.authorization,undefined);
 await anon.searchPublicCalendarEvents({q:"seminar"});
 assert.equal(seen.at(-1).opts.headers.authorization,undefined);
 assert.match(seen.at(-1).url,/q=seminar/);
});

test("T0 universal GA operation adapters share exact SDK contract, authz workspace and idempotency",async()=>{
 const seen=[];
 const client=createTestClient({apiKey:key,fetch:async(url,opts)=>{
  seen.push({path:new URL(url).pathname,headers:opts.headers,body:opts.body,method:opts.method});
  return new Response(JSON.stringify({ok:true}),{status:200,headers:{"content-type":"application/json","Taghvim-Request-Id":"req_ga_shared"}});
 }});
 const idem={idempotencyKey:"ga-sdk-idem-20261121",workspaceId:"ws_team_123"};
 await client.createWorkspace({kind:"partner"},idem);
 await client.getWorkspace("ws_team_123");
 await client.createCalendarEvent("cal_university_123",{expected_version:1,entity:{id:"event_customer_001"},occurrences:[]},idem);
 await client.updateCalendarEvent("cal_university_123","event_customer_001",{expected_version:2,entity:{id:"event_customer_001"},occurrences:[]},idem);
 await client.listCalendarEvents("cal_university_123",{workspaceId:"ws_team_123"});
 await client.publicCalendarEvents("cal_university_123");
 await client.subscribeCalendar("cal_university_123",{channel:"ics"},idem);
 await client.setCalendarNotificationPreferences("cal_university_123",{expected_version:0,enabled:false,channels:[]},idem);
 const registry=contract.operations.filter(o=>["createWorkspace","getWorkspace","createCalendarEvent","updateCalendarEvent","listCalendarEvents","listPublicCalendarEvents","subscribeCalendar","setCalendarNotificationPreferences"].includes(o.operationId));
 assert.equal(registry.length,8);
 assert.deepEqual(seen.map(x=>x.method+" "+x.path).sort(),registry.map(x=>x.method+" "+x.path.replace(/\{(?:calendar_id|event_id|workspace_id)\}/g,(m)=>m==="\{calendar_id\}"?"cal_university_123":m==="\{event_id\}"?"event_customer_001":"ws_team_123")).sort());
 assert.equal(seen[0].headers["Taghvim-Workspace-Id"],"ws_team_123");
 assert.equal(seen[0].headers["idempotency-key"],idem.idempotencyKey);
 assert.equal(seen[5].headers.authorization,undefined);
 assert.equal(seen[6].headers.authorization,"Bearer "+key);
 assert.throws(()=>client.createCalendarEvent("cal_university_123",{},{}),/Idempotency/);
 await assert.rejects(client.createWorkspace({kind:"partner"},{idempotencyKey:idem.idempotencyKey,workspaceId:"../invalid"}),/Workspace/);
});

test("native Window-like fetch receiver is preserved by default JavaScript SDK transport",async()=>{
 const original=globalThis.fetch;
 let called=0;
 try{
  globalThis.fetch=function(url,options){
   assert.equal(this,globalThis,"native fetch requires the window/global receiver");
   called++;
   assert.equal(new URL(url).pathname,"/v1/me");
   assert.equal(options.headers.authorization,"Bearer "+key);
   return Promise.resolve(new Response(JSON.stringify({tenant:{id:"ten_receiver"}}),{
    status:200,headers:{"content-type":"application/json","Taghvim-Request-Id":"req_brandcheck"}
   }));
  };
  const sdk=createTestClient({apiKey:key});
  const response=await sdk.me();
  assert.equal(response.status,200);
  assert.equal(response.requestId,"req_brandcheck");
  assert.equal(called,1);
 }finally{globalThis.fetch=original}
});
