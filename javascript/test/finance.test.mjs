import {test} from "node:test";
import assert from "node:assert/strict";
import {TaghvimClient} from "../index.js";
import {invokeWidget,WIDGET_OPERATIONS} from "../widgets.js";
import {readFileSync} from "node:fs";
const index=JSON.parse(readFileSync(new URL("../../contracts/operation-index.json",import.meta.url)));
test("finance SDK routes and widget permissions derive from pinned canonical contract",async()=>{
 for(const [id,path,method] of [["listFinanceCountries","/v1/finance/countries","GET"],["getFinanceBusinessDayQuote","/v1/finance/business-days/quote","POST"]])
  assert.ok(index.operations.some(x=>x.operationId===id&&x.path===path&&x.method===method));
 assert.equal(WIDGET_OPERATIONS["finance-countries"].public,true);
 assert.equal(WIDGET_OPERATIONS["finance-business-day-quote"].public,undefined);
 const requests=[];
 const fetcher=async(url,options)=>{requests.push({url,options});return new Response(JSON.stringify({status:"preview",business_date:"2026-12-29",financial_decision_allowed:false}),{status:200,headers:{"content-type":"application/json","Taghvim-Request-Id":"req_finance_sdk"}})};
 const client=new TaghvimClient({apiKey:"tgv_test_finance_sdk",fetch:fetcher});
 await client.financeCountries();
 const r=await client.financeBusinessDayQuote({markets:["GB-EW"],date:"2026-12-24",offset_business_days:1});
 assert.equal(r.data.financial_decision_allowed,false);
 assert.equal(requests[0].options.headers.authorization,undefined);
 assert.equal(requests[1].options.headers.authorization,"Bearer tgv_test_finance_sdk");
 assert.deepEqual(JSON.parse(requests[1].options.body),{markets:["GB-EW"],date:"2026-12-24",offset_business_days:1});
 let call;
 const clientForWidget={request:async(...args)=>{call=args;return{status:200,data:{financial_decision_allowed:false},requestId:"req_finance_widget"}}};
 await invokeWidget(clientForWidget,"finance-countries");
 assert.deepEqual(call,["GET","/v1/finance/countries",{query:{},auth:false}]);
 await invokeWidget(clientForWidget,"finance-business-day-quote",{markets:["GB-EW"],date:"2026-12-24",offset_business_days:1});
 assert.equal(call[0],"POST");
 assert.equal(call[1],"/v1/finance/business-days/quote");
 assert.equal(call[2].auth,undefined);
});
