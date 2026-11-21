import test from "node:test";
import assert from "node:assert/strict";
import {PassThrough} from "node:stream";
import {readFileSync} from "node:fs";
import {createTaghvimMcpBridge,mcpFromEnvironment,serveMcpStdio,MCP_VERSION} from "../mcp.js";
import {TaghvimClient} from "../index.js";
const catalog=JSON.parse(readFileSync(new URL("../../contracts/operation-index.json",import.meta.url),"utf8"));
const META={"io.modelcontextprotocol/protocolVersion":MCP_VERSION,"io.modelcontextprotocol/clientInfo":{name:"taghvim-conformance",version:"1.0.0"},"io.modelcontextprotocol/clientCapabilities":{}};
const req=(id,method,params={})=>({jsonrpc:"2.0",id,method,params:{...params,_meta:META}});
const mk=(calls=[],options={})=>createTaghvimMcpBridge({client:{request:async(method,path,opts)=>{calls.push({method,path,opts});return{status:200,requestId:"req_test",data:{status:"equivalent"}};}},...options});

test("MCP 2026-07-28 modern discovery is stateless and protocol-bound",async()=>{
 const b=mk(),result=(await b.handle(req(1,"server/discover"))).result;
 assert.equal(result.resultType,"complete");
 assert.deepEqual(result.supportedVersions,[MCP_VERSION]);
 assert.equal(result.capabilities.tools.listChanged,false);
 assert.equal(result._meta["io.modelcontextprotocol/serverInfo"].name,"taghvim-mcp-bridge");
 const v=await b.handle({...req(2,"tools/list"),params:{_meta:{"io.modelcontextprotocol/protocolVersion":"2025-11-25"}}});
 assert.equal(v.error.code,-32022);assert.deepEqual(v.error.data.supported,[MCP_VERSION]);
 assert.equal((await b.handle(req(3,"initialize"))).error.code,-32601);
});
test("MCP catalog is a strict subset of canonical API operations; no payment, admin or fabricated tools",async()=>{
 const bridge=mk();
 const names=bridge.tools.map(t=>t.name);
 assert.ok(names.length>10);
 assert.deepEqual(names.slice(),names.slice().sort());
 assert.ok(names.every(n=>catalog.operations.some(op=>n==="taghvim_"+op.operationId)));
 for(const p of ["createPaymentIntent","verifyPaymentIntent","paymentCallback","createTenant","createApiKey","revokeApiKey"])
  assert.ok(!names.includes("taghvim_"+p));
 assert.ok(!names.includes("taghvim_publishCalendar"),"write actions must be denied by default");
 assert.ok(names.includes("taghvim_getPublicCalendarIcs"));
 assert.equal((await bridge.handle(req(2,"tools/list"))).result.tools.length,bridge.tools.length);
 assert.equal((await bridge.handle(req(3,"tools/call",{name:"taghvim_createPaymentIntent",arguments:{}}))).error.code,-32602);
});
test("MCP delegates authenticated private reads through canonical SDK only",async()=>{
 let calls=[];
 const fetcher=async(url,options)=>{
  calls.push({url,options});
  return new Response(JSON.stringify({workspace_id:"ws_test"}),{status:200,headers:{"content-type":"application/json","Taghvim-Request-Id":"req_mcp_real"}});
 };
 const client=new TaghvimClient({apiKey:"tgv_test_ValidForConformance123",fetch:fetcher});
 const bridge=createTaghvimMcpBridge({client});
 const out=await bridge.handle(req(4,"tools/call",{name:"taghvim_getWorkspace",arguments:{path:{workspace_id:"ws_test"},workspaceId:"ws_test"}}));
 assert.equal(out.result.isError,false);assert.equal(calls.length,1);
 assert.equal(calls[0].url,"https://api.taghvim.dev/v1/workspaces/ws_test");
 assert.equal(calls[0].options.headers.authorization,"Bearer tgv_test_ValidForConformance123");
 assert.equal(calls[0].options.headers["Taghvim-Workspace-Id"],"ws_test");
 assert.equal(JSON.parse(out.result.content[0].text).request_id,"req_mcp_real");
});
test("MCP public calendar read stays public and never attaches bearer key",async()=>{
 const calls=[];const client=new TaghvimClient({apiKey:"tgv_test_ValidForConformance123",fetch:async(url,opts)=>{
  calls.push(opts);return new Response(JSON.stringify({calendar_id:"cal_test"}),{status:200,headers:{"content-type":"application/json"}});
 }});
 const b=createTaghvimMcpBridge({client});
 const r=await b.handle(req(5,"tools/call",{name:"taghvim_getPublicCalendar",arguments:{path:{calendar_id:"cal_test"}}}));
 assert.equal(r.result.isError,false);
 assert.equal(calls[0].headers.authorization,undefined);
});
test("MCP mutations require explicit opt-in and caller idempotency before any remote request",async()=>{
 const calls=[];const b=mk(calls,{writeEnabled:true});
 assert.ok(b.tools.some(x=>x.name==="taghvim_publishCalendar"));
 const zero=await b.handle(req(6,"tools/call",{name:"taghvim_publishCalendar",arguments:{path:{calendar_id:"cal_test"},body:{expected_version:1}}}));
 assert.equal(zero.error.code,-32602);assert.equal(calls.length,0);
 const safe=await b.handle(req(7,"tools/call",{name:"taghvim_publishCalendar",arguments:{path:{calendar_id:"cal_test"},body:{expected_version:1},idempotencyKey:"mcp-release-0001",workspaceId:"ws_valid"}}));
 assert.equal(safe.result.isError,false);
 assert.equal(calls[0].method,"POST");assert.equal(calls[0].path,"/v1/calendars/cal_test/publish");
 assert.equal(calls[0].opts.idempotencyKey,"mcp-release-0001");
 assert.equal(calls[0].opts.workspaceId,"ws_valid");
});
test("MCP blocks path traversal, extra arguments and mismatched path parameters before effects",async()=>{
 const calls=[],b=mk(calls,{writeEnabled:true});
 const attack=[
 {path:{workspace_id:".."}},
 {path:{workspace_id:"other",calendar_id:"extra"}},
 {path:{workspace_id:"ws_valid"},query:{unexpected:{nested:true}}},
 {path:{workspace_id:"ws_valid"},body:{evil:true}},
 {path:{workspace_id:"ws_valid"},workspaceId:"../foreign"}
 ];
 for(let i=0;i<attack.length;i++){
  const r=await b.handle(req(20+i,"tools/call",{name:"taghvim_getWorkspace",arguments:attack[i]}));
  assert.equal(r.error.code,-32602);
 }
 assert.equal(calls.length,0);
});
test("MCP keeps upstream secrets out of JSON-RPC errors and stdout",async()=>{
 const secret="tgv_test_ThisShouldNeverBeReturned";
 const b=createTaghvimMcpBridge({client:{request:async()=>{throw new Error("Unexpected secret: "+secret);}}});
 const r=await b.handle(req(30,"tools/call",{name:"taghvim_getWorkspace",arguments:{path:{workspace_id:"ws_valid"}}}));
 assert.equal(r.result.isError,true);
 assert.ok(!JSON.stringify(r).includes(secret));
 assert.equal(JSON.parse(r.result.content[0].text).code,"upstream_unavailable");
 assert.throws(()=>mcpFromEnvironment({}),/REQUIRED/);
});
test("MCP stdio emits one JSON-RPC result per newline and no extra stdout chatter",async()=>{
 const input=new PassThrough(),output=new PassThrough();let result="";
 output.on("data",b=>result+=b.toString());
 const serving=serveMcpStdio(mk(),{input,output});
 input.end(JSON.stringify(req(40,"server/discover"))+"\n"+JSON.stringify(req(41,"tools/list"))+"\n");
 await serving;
 const lines=result.trim().split("\n").map(JSON.parse);
 assert.equal(lines.length,2);assert.equal(lines[0].id,40);assert.equal(lines[1].id,41);
 assert.equal(lines[1].result.tools.length>0,true);
});

test("semantic reconciliation and date calculations are effect-free MCP POST tools",async()=>{
 const calls=[],b=mk(calls);
 const tools=b.tools;
 assert.ok(tools.some(x=>x.name==="taghvim_reconcileDates"&&x.annotations.readOnlyHint===true));
 assert.ok(tools.some(x=>x.name==="taghvim_convertDate"&&x.annotations.readOnlyHint===true));
 assert.ok(!tools.some(x=>x.name==="taghvim_publishCalendar"),"effectful publication stays denied");
 const body={left:{date:"1405-07-15",calendar_system:"jalali"},right:{date:"2026-10-07",calendar_system:"gregorian"}};
 const r=await b.handle(req(60,"tools/call",{name:"taghvim_reconcileDates",arguments:{body}}));
 assert.equal(r.result.isError,false);
 assert.deepEqual(calls,[{method:"POST",path:"/v1/dates/reconcile",opts:{body,auth:true}}]);
 const invalid=await b.handle(req(61,"tools/call",{name:"taghvim_reconcileDates",arguments:{body,idempotencyKey:"not-an-effect"}}));
 assert.equal(invalid.error.code,-32602);
 assert.equal(calls.length,1);
});
