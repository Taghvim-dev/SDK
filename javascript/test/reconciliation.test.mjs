import {test} from "node:test";
import assert from "node:assert/strict";
import {reconcileCalendarDates} from "../reconciliation.js";
import {invokeWidget,createWidgetGateway} from "../widgets.js";
const pair={left:{date:"1405-07-15",calendar_system:"jalali"},right:{date:"2026-10-07",calendar_system:"gregorian"}};
const response=(status="equivalent",dayDelta=0)=>({status:200,requestId:"req_native1",rateLimit:"10",data:{
 status,equivalent:status==="policy_conflict"?null:status==="equivalent",scope:"calendar_day_not_instant",day_delta:dayDelta,
 left:{date:{iso:"2026-10-07"}},right:{date:{iso:dayDelta?"2026-10-08":"2026-10-07"}},
 evidence:{operation:"POST /v1/dates/reconcile",request_ids:["req_native1"],meter_units:2,calendar_data_versions:["ir-v1","ir-v1"],conflicts:[]}
}});
test("Jalali Gregorian native reconciliation uses ONE tenant metered endpoint",async()=>{
 const calls=[];const client={request:async(...x)=>{calls.push(x);return response();}};
 const r=await reconcileCalendarDates(client,pair);
 assert.equal(r.data.status,"equivalent");assert.equal(r.data.evidence.request_ids.length,1);
 assert.equal(r.data.evidence.meter_units,2);assert.equal(calls.length,1);
 assert.deepEqual(calls[0],["POST","/v1/dates/reconcile",{body:pair,signal:undefined}]);
});
test("native different and policy conflict remain visible",async()=>{
 let n=0;const c={request:async()=>++n===1?response("different",1):response("policy_conflict")};
 assert.equal((await reconcileCalendarDates(c,pair)).data.day_delta,1);
 assert.equal((await reconcileCalendarDates(c,pair)).data.equivalent,null);
});
test("invalid source and inconsistent backend reject before or after exactly one call",async()=>{
 let n=0;const c={request:async()=>{n++;return response();}};
 await assert.rejects(reconcileCalendarDates(c,{left:{date:"1405-07-15"},right:pair.right}),/calendar_system/);
 assert.equal(n,0);
 const bad={request:async()=>({...response(),data:{...response().data,evidence:{...response().data.evidence,request_ids:["req_a","req_b"]}}})};
 await assert.rejects(reconcileCalendarDates(bad,pair),/contract invalid/);
});
test("Widget -> tenant SDK -> native API enforces single request and identity",async()=>{
 let n=0;const c={request:async()=>{n++;return response();}};
 assert.equal((await invokeWidget(c,"date-reconciliation",pair)).data.status,"equivalent");
 assert.equal(n,1);
 const gateway=createWidgetGateway({clientForTenant:async id=>id==="tenant_1"?c:null,
  authorize:()=>({tenantId:"tenant_1"}),admit:()=>true,allowedOrigins:["https://widget.example.org"]});
 const req=new Request("https://widget.example.org/__taghvim/widgets",{method:"POST",
  headers:{origin:"https://widget.example.org","content-type":"application/json"},
  body:JSON.stringify({widget:"date-reconciliation",input:pair})});
 const res=await gateway(req);
 assert.equal(res.status,200);assert.equal((await res.json()).data.evidence.request_ids.length,1);
 assert.equal(n,2);
});
