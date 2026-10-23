import {test} from "node:test";
import assert from "node:assert/strict";
import {WIDGET_OPERATIONS} from "../widgets.js";
import {WIDGET_INPUTS, registerTaghvimWidgets} from "../embed.js";

test("all advertised Engine-backed widgets have accessible input declarations",()=>{
 for(const [kind,op] of Object.entries(WIDGET_OPERATIONS)){
   if(op.unavailable){assert.equal(WIDGET_INPUTS[kind],undefined,kind+" must never generate fake API UI");continue;}
   const fields=WIDGET_INPUTS[kind];
   assert.ok(Array.isArray(fields)&&fields.length>=1,kind);
   assert.ok(fields.every(x=>typeof x.label==="string"&&x.label.length>0&&typeof x.name==="string"),kind);
 }
});
test("web component registration is idempotent, never bundles upstream credentials",()=>{
 const reg=new Map();
 const registry={get:name=>reg.get(name),define:(name,value)=>reg.set(name,value)};
 class Element {attachShadow(){this.shadowRoot={};}}
 const Widget=registerTaghvimWidgets({registry,HTMLElementType:Element});
 assert.equal(reg.get("taghvim-api-widget"),Widget);
 assert.equal(registerTaghvimWidgets({registry,HTMLElementType:Element}),Widget);
 const widget=new Widget();
 assert.equal(widget.replayKey,null);
 assert.ok(widget.shadowRoot);
 assert.equal(Widget.observedAttributes.includes("kind"),true);
});
test("no widget component may import a raw-key TaghvimClient",async()=>{
 const {readFileSync}=await import("node:fs");
 const s=readFileSync(new URL("../embed.js",import.meta.url),"utf8");
 assert.match(s,/createBrowserWidgetClient|createClient/);
 assert.doesNotMatch(s,/tgv_(test|live)_|new TaghvimClient|Authorization\s*:/);
});


class FakeNode {
 constructor(type="container"){this.localName=type;this.children=[];this.handlers={};this.textContent="";this.disabled=false;this.attrs={};this.value="";}
 setAttribute(name,value){this.attrs[name]=value;}
 addEventListener(type,handler){this.handlers[type]=handler;}
 append(...children){this.children.push(...children);}
 replaceChildren(...children){this.children=children;}
}
class FakeElement {
 constructor(){this.attrs={kind:"date-picker"};this.isConnected=true;this.ownerDocument={createElement:(type)=>new FakeNode(type)};this.shadowRoot=new FakeNode();}
 getAttribute(name){return this.attrs[name]||null;}
 setAttribute(name,value){this.attrs[name]=value;}
 attachShadow(){return this.shadowRoot;}
}
function makeWidget(client){
 const reg=new Map(),registry={get:n=>reg.get(n),define:(n,v)=>reg.set(n,v)};
 return registerTaghvimWidgets({registry,HTMLElementType:FakeElement,createClient:()=>client});
}
test("embedded form submits authenticated gateway request, displays actual API data and request ID",async()=>{
 const calls=[];
 const Widget=makeWidget({invoke:async(...args)=>{calls.push(args);return {data:{date:{jalali:"1405-07-15"}},status:200,requestId:"req_real_001"};}});
 const el=new Widget();el.connectedCallback();
 const form=el.shadowRoot.children[1];
 await form.handlers.submit({preventDefault(){}});
 assert.equal(calls.length,1);
 assert.equal(calls[0][0],"date-picker");
 assert.deepEqual(calls[0][1],{date:"1405-07-15"});
 assert.ok(calls[0][2].signal instanceof AbortSignal);
 assert.match(form.children.at(-2).textContent,/req_real_001/);
 assert.match(form.children.at(-1).textContent,/1405-07-15/);
 assert.equal(el.attrs["data-api-state"],"succeeded");
});
test("API errors cannot be substituted with fake successful widget results",async()=>{
 const Widget=makeWidget({invoke:async()=>{throw Object.assign(Error("forbidden"),{code:"unauthorized"});}});
 const el=new Widget();el.connectedCallback();const form=el.shadowRoot.children[1];
 await form.handlers.submit({preventDefault(){}});
 assert.equal(el.attrs["data-api-state"],"failed");
 assert.match(form.children.at(-2).textContent,/unauthorized/);
 assert.equal(form.children.at(-1).textContent,"");
});
test("stale in-flight API response is ignored after removal from document",async()=>{
 let resolve,seenSignal;
 const wait=new Promise(done=>resolve=done);
 const Widget=makeWidget({invoke:async(_kind,_input,opts)=>{seenSignal=opts.signal;return wait;}});
 const el=new Widget();el.connectedCallback();const form=el.shadowRoot.children[1];
 const pending=form.handlers.submit({preventDefault(){}});
 await Promise.resolve();await Promise.resolve();
 el.disconnectedCallback();
 assert.equal(seenSignal.aborted,true);
 resolve({data:{forbidden:true},status:200,requestId:"req_stale"});
 await pending;
 assert.ok(!form.children.at(-1).textContent.includes("forbidden"));
 assert.equal(el.pending,false);
});


test("lost side-effect response retains idempotency key and edited fields after remount",async()=>{
 const keys=[];let calls=0;
 const Widget=makeWidget({invoke:async(_kind,input,opts)=>{
   calls++;keys.push(opts.idempotencyKey);
   assert.equal(input.days,5);
   if(calls===1)throw Object.assign(Error("network interrupted"),{code:"network_error"});
   return {data:{id:"deadline_saved"},status:201,requestId:"req_after_retry"};
 }});
 const el=new Widget();el.attrs.kind="deadline-create";el.connectedCallback();
 let form=el.shadowRoot.children[1];
 const days=form.children[1].children[0];
 days.value="5";
 days.handlers.input();
 await form.handlers.submit({preventDefault(){}});
 assert.equal(calls,1);assert.ok(keys[0]?.length>=8);
 el.disconnectedCallback();
 el.connectedCallback();
 form=el.shadowRoot.children[1];
 assert.equal(form.children[1].children[0].value,"5");
 await form.handlers.submit({preventDefault(){}});
 assert.equal(calls,2);
 assert.equal(keys[0],keys[1],"Same payload must use the same retry key");
 assert.equal(el.attrs["data-api-state"],"succeeded");
});
