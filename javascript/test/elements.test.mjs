import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {LIVE_WIDGET_KINDS,BLOCKED_WIDGET_KINDS,WIDGET_EXAMPLES,registerTaghvimWidgets} from "../elements.js";
import {WIDGET_OPERATIONS} from "../widgets.js";

test("every supported widget renders via one canonical API operation, never silently a local mock",()=>{
 const index=JSON.parse(readFileSync(new URL("../../contracts/operation-index.json",import.meta.url),"utf8"));
 const routes=new Set(index.operations.map(x=>x.method+" "+x.path));
 assert.equal(LIVE_WIDGET_KINDS.length,12);
 for(const kind of LIVE_WIDGET_KINDS){
   assert.ok(Object.hasOwn(WIDGET_EXAMPLES,kind));
   assert.ok(!WIDGET_OPERATIONS[kind].unavailable,kind);
   const op=WIDGET_OPERATIONS[kind];
   assert.ok(routes.has(op.method+" "+op.path),kind+" requires canonical OpenAPI");
 }
 assert.deepEqual([...BLOCKED_WIDGET_KINDS].sort(),["agent-execution","availability","booking","workflow-run"]);
});
class FakeNode{
 constructor(){this.children=[];this.attributes={};this.listeners={};this.textContent="";this.disabled=false;this.value="";}
 setAttribute(name,value){this.attributes[name]=value;}
 addEventListener(name,cb){this.listeners[name]=cb;}
 append(...children){this.children.push(...children);}
 replaceChildren(...children){this.children=children;}
}
class FakeElement{
 constructor(){this.shadowRoot=new FakeNode();this.isConnected=true;this.attrs={};this.events=[];this.ownerDocument={createElement:()=>new FakeNode()};}
 getAttribute(name){return this.attrs[name]||null;}
 attachShadow(){return this.shadowRoot;}
 dispatchEvent(event){this.events.push(event);return true;}
}
function makeClass(clientFactory){
 const definitions=new Map();
 const registry={get:name=>definitions.get(name),define:(name,klass)=>definitions.set(name,klass)};
 const C=registerTaghvimWidgets({registry,Element:FakeElement,clientFactory});
 assert.equal(registerTaghvimWidgets({registry,Element:FakeElement,clientFactory}),C);
 return C;
}
test("a live date widget invokes server SDK gateway and exposes only real API response",async()=>{
 let calls=[];
 const C=makeClass(({endpoint})=>({invoke:async (...args)=>{
   calls.push({endpoint,args});
   return {data:{date:{jalali:"1405-07-15"}},requestId:"req_live_001"};
 }}));
 const el=new C();el.attrs.kind="date-picker";el.connectedCallback();
 const [,input,button,status,result]=el.shadowRoot.children[0].children;
 assert.equal(status.attributes.role,"status");
 assert.equal(button.disabled,false);
 input.value='{"date":"1405-07-15"}';
 await button.listeners.click();
 assert.equal(calls.length,1);
 assert.equal(calls[0].endpoint,"/__taghvim/widgets");
 assert.equal(calls[0].args[0],"date-picker");
 assert.deepEqual(calls[0].args[1],{date:"1405-07-15"});
 assert.match(status.textContent,/req_live_001/);
 assert.match(result.textContent,/1405-07-15/);
});
test("booking, availability, agent execution, and workflow run cannot fabricate answers",()=>{
 const C=makeClass(()=>{throw Error("No missing operation may make a request");});
 for(const kind of BLOCKED_WIDGET_KINDS){
   const el=new C();el.attrs.kind=kind;el.connectedCallback();
   const nodes=el.shadowRoot.children[0].children;
   assert.equal(nodes[2].disabled,true,kind);
   assert.match(nodes[3].textContent,/Missing|not|Landing-only/i);
 }
});
test("invalid input never invokes an API; server errors never become successful preview values",async()=>{
 let calls=0;
 const C=makeClass(()=>({invoke:async()=>{calls++;throw Object.assign(Error("Denied"),{code:"unauthorized"});}}));
 const el=new C();el.attrs.kind="holiday-month";el.connectedCallback();
 const [,input,button,status,result]=el.shadowRoot.children[0].children;
 input.value="{broken";
 await button.listeners.click();
 assert.equal(calls,0);
 assert.equal(status.textContent,"Invalid JSON request");
 input.value='{"year":1405,"month":7}';
 await button.listeners.click();
 assert.equal(calls,1);
 assert.match(status.textContent,/unauthorized/);
 assert.equal(result.textContent,"");
});
