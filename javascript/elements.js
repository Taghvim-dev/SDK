/** API-only widget Web Component (no local arithmetic, no public API credentials). */
import {WIDGET_OPERATIONS,createBrowserWidgetClient} from "./widgets.js";

const EXAMPLES=Object.freeze({
  "date-picker":{date:"1405-07-15"},
  "dual-calendar-badge":{date:"1405-07-15"},
  "holiday-month":{year:1405,month:7},
  "holiday-badge":{date:"1405-07-15"},
  "business-day-badge":{date:"1405-07-15"},
  "deadline-calculator":{date:"1405-07-15",days:3},
  "deadline-create":{anchor:"1405-07-15",days:3,type:"business"},
  "sla-calculator":{start:"1405-07-15",time:"15:00",hours:8,open:"08:00",close:"16:00"},
  "reminder-preview":{due:"1405-08-20",time:"09:00",offsets:[{n:3,unit:"business"}]},
  "recurrence-builder":{rule:"last-business",from:"1405-07-01",count:4},
  "agent-schedule-preview":{rule:"every-business",from:"1405-07-01",count:4},
  "webhook-test":{id:""}
});
export const WIDGET_EXAMPLES=EXAMPLES;
export const LIVE_WIDGET_KINDS=Object.freeze(Object.keys(EXAMPLES));
export const BLOCKED_WIDGET_KINDS=Object.freeze(
  Object.keys(WIDGET_OPERATIONS).filter(k=>WIDGET_OPERATIONS[k].unavailable)
);
const validTag=/^[a-z][a-z0-9]*-[a-z0-9-]+$/;
const validEndpoint=/^\/(?!\/)[a-zA-Z0-9/_-]+$/;

export function registerTaghvimWidgets({
 registry=globalThis.customElements,
 Element=globalThis.HTMLElement,
 clientFactory=createBrowserWidgetClient,
 name="taghvim-api-widget"
}={}){
 if(!registry||typeof registry.get!=="function"||typeof registry.define!=="function"||
   typeof Element!=="function"||typeof clientFactory!=="function"||!validTag.test(name))
   throw new TypeError("Web Components registry and element constructor required");
 if(registry.get(name))return registry.get(name);
 class TaghvimApiWidget extends Element {
   static get observedAttributes(){return ["kind","input","endpoint"];}
   constructor(){
     super();
     this._inFlight=false;
     this._revision=0;
     this._controller=null;
     this.attachShadow({mode:"open"});
   }
   connectedCallback(){this.render();}
   disconnectedCallback(){
     this._revision++;
     this._controller?.abort();
   }
   attributeChangedCallback(){
     if(this.isConnected)this.render();
   }
   render(){
     this._revision++;
     this._controller?.abort();
     const root=this.shadowRoot;
     root.replaceChildren();
     const doc=this.ownerDocument;
     const region=doc.createElement("section");
     region.setAttribute("aria-label","Taghvim API widget");
     const label=doc.createElement("label");
     label.textContent="API widget input (JSON)";
     const input=doc.createElement("textarea");
     input.rows=5;
     input.setAttribute("spellcheck","false");
     input.setAttribute("aria-label","Request JSON");
     const kind=this.getAttribute("kind")||"";
     const op=WIDGET_OPERATIONS[kind];
     const available=Boolean(op&&!op.unavailable&&Object.hasOwn(EXAMPLES,kind));
     input.value=this.getAttribute("input")??JSON.stringify(EXAMPLES[kind]||{},null,2);
     const action=doc.createElement("button");
     action.type="button";
     action.textContent=op?.sideEffect?"Confirm and send API request":"Request live API data";
     action.disabled=!available;
     const status=doc.createElement("p");status.setAttribute("role","status");
     status.setAttribute("aria-live","polite");
     const result=doc.createElement("pre");
     result.setAttribute("aria-label","Live API response");
     region.append(label,input,action,status,result);
     root.append(region);
     if(!available){
       status.textContent=op?.unavailable||"Unsupported widget";
       return;
     }
     status.textContent="Ready — requires an authorized same-origin gateway";
     action.addEventListener("click",async()=>{
       if(this._inFlight)return;
       let data;
       try{
         data=JSON.parse(input.value);
         if(!data||typeof data!=="object"||Array.isArray(data))
           throw new TypeError("Expected a JSON object");
       }catch{
         status.textContent="Invalid JSON request";return;
       }
       const endpoint=this.getAttribute("endpoint")||"/__taghvim/widgets";
       if(!validEndpoint.test(endpoint)||endpoint.includes("..")){
         status.textContent="Invalid same-origin gateway route";return;
       }
       const key=op.sideEffect?
         ((globalThis.crypto?.randomUUID?.()||"")||null):undefined;
       if(op.sideEffect&&!key){
         status.textContent="Secure idempotency key generator unavailable";return;
       }
       const current=++this._revision;
       this._inFlight=true;
       action.disabled=true;
       status.textContent="Contacting Taghvim API…";
       result.textContent="";
       const controller=new AbortController();this._controller=controller;
       try{
         const response=await clientFactory({endpoint}).invoke(kind,data,{
           ...(key?{idempotencyKey:key}:{}),signal:controller.signal
         });
         if(current!==this._revision)return;
         const req=response.requestId||"no request ID";
         result.textContent=JSON.stringify(response.data,null,2);
         status.textContent="Live API response · "+req;
         this.dispatchEvent(new CustomEvent("taghvim:result",{
           detail:{kind,data:response.data,requestId:response.requestId},
           bubbles:true,composed:true
         }));
       }catch(e){
         if(current!==this._revision)return;
         status.textContent="API unavailable: "+String(e.code||"request_failed");
       }finally{
         if(current===this._revision){
           this._inFlight=false;
           action.disabled=false;
           this._controller=null;
         }
       }
     });
   }
 }
 registry.define(name,TaghvimApiWidget);
 return TaghvimApiWidget;
}
