import {test} from "node:test";
import assert from "node:assert/strict";
import {reconcileCalendarDates} from "../reconciliation.js";
import {invokeWidget,createWidgetGateway} from "../widgets.js";
const day=(iso,weekday=3,business=true,pack="ir-2026")=>({data:{date:{iso,weekday,business_day:business,predicted_holiday:false,holidays:[]},calendar_data_version:pack},status:200,requestId:"req_"+iso,rateLimit:"100"});
test("Jalali and Gregorian reconcile through TWO real SDK API request invocations",async()=>{
 const calls=[];
 const c={request:async(method,path,opts)=>{calls.push({method,path,opts});return day("2026-10-07");}};
 const r=await reconcileCalendarDates(c,{left:{date:"1405-07-15",calendar_system:"jalali"},right:{date:"2026-10-07",calendar_system:"gregorian"}});
 assert.equal(r.data.status,"equivalent");assert.equal(r.data.equivalent,true);assert.equal(r.data.day_delta,0);
 assert.equal(r.data.scope,"calendar_day_not_instant");assert.equal(r.data.evidence.meter_units,2);
 assert.equal(calls.length,2);
 assert.deepEqual(calls.map(c=>c.path),["/v1/dates/convert","/v1/dates/convert"]);
 assert.deepEqual(calls.map(c=>c.opts.body.calendar_system),["jalali","gregorian"]);
});
test("difference, policy drift and fail-closed validation",async()=>{
 let count=0;
 const c={request:async()=>{count++;return count%2?day("2026-10-07"):day("2026-10-08",4)}};
 const r=await reconcileCalendarDates(c,{left:{date:"1405-07-15",calendar_system:"jalali"},right:{date:"2026-10-08",calendar_system:"gregorian"}});
 assert.equal(r.data.status,"different");assert.equal(r.data.day_delta,1);
 const drift={request:async()=>{count++;return count%2?day("2026-10-07",3,true,"v1"):day("2026-10-07",3,true,"v2")}};
 const p=await reconcileCalendarDates(drift,{left:{date:"1405-07-15",calendar_system:"jalali"},right:{date:"2026-10-07",calendar_system:"gregorian"}});
 assert.equal(p.data.status,"policy_conflict");assert.equal(p.data.equivalent,null);
 const before=count;
 await assert.rejects(reconcileCalendarDates(drift,{left:{date:"1405-07-15"},right:{date:"2026-10-07",calendar_system:"gregorian"}}),/calendar_system/);
 assert.equal(count,before,"invalid inputs must not spend API quota");
});
test("widget → tenant client → canonical API pair with trace evidence",async()=>{
 const input={left:{date:"1405-07-15",calendar_system:"jalali"},right:{date:"2026-10-07",calendar_system:"gregorian"}};
 let called=0;
 const client={request:async()=>{called++;return day("2026-10-07");}};
 const result=await invokeWidget(client,"date-reconciliation",input);
 assert.equal(result.data.status,"equivalent");assert.equal(called,2);
 const gateway=createWidgetGateway({clientForTenant:async id=>id==="tenant_1"?client:null,
  authorize:()=>({tenantId:"tenant_1"}),admit:()=>true,allowedOrigins:["https://widget.example.org"]});
 const request=new Request("https://widget.example.org/__taghvim/widgets",{method:"POST",
  headers:{origin:"https://widget.example.org","content-type":"application/json"},
  body:JSON.stringify({widget:"date-reconciliation",input})});
 const response=await gateway(request);
 assert.equal(response.status,200);assert.equal((await response.json()).data.status,"equivalent");
 assert.equal(called,4);
});
