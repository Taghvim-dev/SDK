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
