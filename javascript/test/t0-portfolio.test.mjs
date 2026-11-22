import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createTestClient} from "../index.js";

const contract=JSON.parse(readFileSync(new URL("../../contracts/operation-index.json",import.meta.url),"utf8"));
test("T0 portfolio SDK source is pinned to the Engine canonical one-operation diff",()=>{
 assert.equal(contract.openApiGitBlobSHA,"46146dbcec18eadad579dcac50afbf86d15d3276");
 const op=contract.operations.find(x=>x.operationId==="listCalendarPortfolio");
 assert.deepEqual(op,{method:"GET",path:"/v1/portfolios/calendars",operationId:"listCalendarPortfolio",auth:["ApiKey"]});
 assert.equal(contract.operations.filter(x=>x.operationId==="listCalendarPortfolio").length,1);
});
test("T0 portfolio is a single authenticated, read-only, scoped request",async()=>{
 const calls=[];
 const client=createTestClient({apiKey:"tgv_test_SyntheticPortfolioKey",fetch:async(url,options)=>{
  calls.push({url,options});
  return new Response(JSON.stringify({scope:"granted",workspace_id:"wsp_hospital_001",count:0,data:[]}),
   {status:200,headers:{"content-type":"application/json","Taghvim-Request-Id":"req_portfolio"}});
 }});
 const res=await client.listCalendarPortfolio({scope:"granted",status:"published",sector_pack:"healthcare",q:"قلب",limit:7},{workspaceId:"wsp_hospital_001"});
 assert.equal(res.status,200);
 assert.equal(res.requestId,"req_portfolio");
 assert.equal(calls.length,1);
 const u=new URL(calls[0].url);
 assert.equal(u.pathname,"/v1/portfolios/calendars");
 assert.equal(u.searchParams.get("sector_pack"),"healthcare");
 assert.equal(u.searchParams.get("q"),"قلب");
 assert.equal(u.searchParams.get("limit"),"7");
 assert.equal(calls[0].options.method,"GET");
 assert.equal(calls[0].options.body,undefined);
 assert.equal(calls[0].options.headers.authorization,"Bearer tgv_test_SyntheticPortfolioKey");
 assert.equal(calls[0].options.headers["Taghvim-Workspace-Id"],"wsp_hospital_001");
 await assert.rejects(client.listCalendarPortfolio({}, {workspaceId:"../foreign"}),/Workspace/);
 assert.equal(calls.length,1,"invalid selected Workspace cannot reach the network");
});
