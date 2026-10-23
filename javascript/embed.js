/**
 * Taghvim.dev 2.1.0 API-backed embeddable widgets.
 * No fallback to local mocked engine or placeholder booking receipts.
 * The embedding application must expose an authenticated same-origin gateway.
 */
import {WIDGET_OPERATIONS, createBrowserWidgetClient} from "./widgets.js";

export const WIDGET_INPUTS = Object.freeze({
  "date-picker": [{name:"date",label:"تاریخ شمسی یا میلادی",value:"1405-07-15"}],
  "dual-calendar-badge": [{name:"date",label:"تاریخ",value:"1405-07-15"}],
  "date-reconciliation": [{name:"left",label:"تاریخ اول (JSON)",value:'{"date":"1405-07-15","calendar_system":"jalali"}',type:"json"},
    {name:"right",label:"تاریخ دوم (JSON)",value:'{"date":"2026-10-07","calendar_system":"gregorian"}',type:"json"}],
  "holiday-month": [{name:"year",label:"سال شمسی",value:"1405",type:"integer"},{name:"month",label:"ماه",value:"7",type:"integer"}],
  "holiday-badge": [{name:"date",label:"تاریخ",value:"1405-07-15"}],
  "business-day-badge": [{name:"date",label:"تاریخ",value:"1405-07-15"}],
  "deadline-calculator": [{name:"date",label:"تاریخ مبنا",value:"1405-07-15"},{name:"days",label:"روز کاری",value:"30",type:"integer"}],
  "deadline-create": [{name:"anchor",label:"تاریخ مبنا",value:"1405-07-15"},{name:"days",label:"روز",value:"10",type:"integer"},{name:"type",label:"نوع روز",value:"business"}],
  "sla-calculator": [{name:"start",label:"تاریخ",value:"1405-07-15"},{name:"time",label:"ساعت شروع",value:"15:00"},{name:"hours",label:"ساعت کاری",value:"24",type:"integer"},{name:"open",label:"شروع کار",value:"08:00"},{name:"close",label:"پایان کار",value:"16:00"}],
  "reminder-preview": [{name:"due",label:"سررسید",value:"1405-08-20"},{name:"time",label:"ساعت",value:"09:00"},{name:"offsets",label:"فواصل JSON",value:'[{"n":7,"unit":"calendar"},{"n":3,"unit":"business"},{"n":0,"unit":"calendar"}]',type:"json"}],
  "recurrence-builder": [{name:"rule",label:"قاعده",value:"last-business"},{name:"from",label:"شروع",value:"1405-07-01"},{name:"count",label:"تعداد",value:"4",type:"integer"}],
  "agent-schedule-preview": [{name:"rule",label:"قاعده",value:"every-business"},{name:"from",label:"شروع",value:"1405-07-01"},{name:"count",label:"تعداد",value:"4",type:"integer"}],
  "webhook-test": [{name:"id",label:"شناسهٔ وب‌هوک",value:"",type:"text"}]
});
function labelOf(s){return String(s).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));}
function parseField(input,spec){
  const v=input.value.trim();
  if(!v)throw new TypeError("ورودی «"+spec.label+"» الزامی است.");
  if(spec.type==="integer"){
    if(!/^-?(0|[1-9]\d*)$/.test(v)||!Number.isSafeInteger(Number(v)))throw new TypeError("عدد معتبر لازم است.");
    return Number(v);
  }
  if(spec.type==="json"){
    const j=JSON.parse(v);
    if(!Array.isArray(j)&&(!j||typeof j!=="object"))throw new TypeError("ساختار JSON باید آرایه یا شیء باشد.");
    return j;
  }
  return v;
}
/**
 * Register a zero-dependency Web Component.
 * Usage (ESM): registerTaghvimWidgets(); <taghvim-api-widget kind="date-picker"></taghvim-api-widget>
 * No API key accepted or rendered by this element.
 */
export function registerTaghvimWidgets({registry=globalThis.customElements, HTMLElementType=globalThis.HTMLElement, createClient=createBrowserWidgetClient}={}){
  if(!registry || typeof registry.define!=="function" || typeof HTMLElementType!=="function")
    throw new TypeError("Web Components require a supported browser");
  if(registry.get("taghvim-api-widget"))return registry.get("taghvim-api-widget");
  class TaghvimApiWidget extends HTMLElementType {
    static get observedAttributes(){return ["kind","endpoint"];}
    constructor(){
      super();
      this.attachShadow({mode:"open"});
      this.pending=false;
      this.replayKey=null;
      this.lastPayload=null;
      this.revision=0;
      this.controller=null;
      this.formIdentity=null;
      this.draftValues=null;
      this.fieldNodes=null;
    }
    connectedCallback(){this.render();}
    disconnectedCallback(){this.revision++;this.controller?.abort();this.controller=null;this.pending=false;}
    attributeChangedCallback(){if(this.isConnected)this.render();}
    render(){
      this.revision++;
      this.controller?.abort();
      this.controller=null;
      this.pending=false;
      const kind=this.getAttribute("kind")||"date-picker";
      const identity=JSON.stringify([kind,this.getAttribute("endpoint")||"/__taghvim/widgets"]);
      if(identity===this.formIdentity && this.fieldNodes){
        this.draftValues=Object.fromEntries(Object.entries(this.fieldNodes).map(([name,input])=>[name,input.value]));
      }else{
        // A different operation or gateway must never inherit an idempotency key.
        this.replayKey=null;this.lastPayload=null;this.draftValues=null;
      }
      this.formIdentity=identity;
      const descriptor=WIDGET_OPERATIONS[kind];
      const defs=WIDGET_INPUTS[kind];
      const root=this.shadowRoot;
      if(!descriptor || descriptor.unavailable || !defs){
        root.textContent="";
        const msg=this.ownerDocument.createElement("p");
        msg.setAttribute("role","status");
        msg.textContent="این ویجت هنوز API عملیاتی منتشرشده ندارد؛ پاسخ نمایشی تولید نمی‌شود.";
        root.append(msg);
        this.setAttribute("data-api-state","unavailable");
        return;
      }
      this.setAttribute("data-api-state","ready");
      const styles=this.ownerDocument.createElement("style");
      styles.textContent=":host{display:block;font:inherit;color:inherit}form{display:grid;gap:.75rem;border:1px solid #a7a7a7;border-radius:.6rem;padding:1rem}label{display:grid;gap:.25rem}input{font:inherit;padding:.6rem;border:1px solid #999;border-radius:.4rem;max-width:100%;box-sizing:border-box}button{font:inherit;padding:.7rem 1rem;border-radius:.4rem;cursor:pointer}button:disabled{cursor:wait;opacity:.65}pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:20rem;overflow:auto;direction:ltr;text-align:left}output{display:block;min-height:1.5rem}";
      const form=this.ownerDocument.createElement("form");
      form.setAttribute("dir","rtl");
      form.noValidate=true;
      const fields={};
      for(const spec of defs){
        const label=this.ownerDocument.createElement("label");
        label.textContent=spec.label;
        const input=this.ownerDocument.createElement("input");
        input.name=spec.name;
        input.required=true;
        input.value=this.draftValues?.[spec.name]??spec.value;
        input.type=spec.type==="integer"?"number":"text";
        if(spec.type==="integer")input.step="1";
        input.setAttribute("autocomplete","off");
        input.addEventListener("input",()=>{this.replayKey=null;this.lastPayload=null;});
        label.append(input);form.append(label);fields[spec.name]=input;
      }
      this.fieldNodes=fields;
      const action=this.ownerDocument.createElement("button");
      action.type="submit";
      action.textContent="فراخوانی API";
      const status=this.ownerDocument.createElement("output");
      status.setAttribute("role","status");
      status.setAttribute("aria-live","polite");
      const payload=this.ownerDocument.createElement("pre");
      payload.setAttribute("aria-label","پاسخ واقعی API");
      form.append(action,status,payload);
      form.addEventListener("submit",async e=>{
        e.preventDefault();
        if(this.pending)return;
        this.pending=true;action.disabled=true;
        const revision=this.revision;
        const controller=new AbortController();
        this.controller=controller;
        status.textContent="در حال فراخوانی API...";
        try {
          const input={};
          for(const spec of defs)input[spec.name]=parseField(fields[spec.name],spec);
          const fingerprint=JSON.stringify([kind,input]);
          if(fingerprint!==this.lastPayload){this.replayKey=null;this.lastPayload=fingerprint;}
          const gateway=createClient({endpoint:this.getAttribute("endpoint")||"/__taghvim/widgets"});
          const options={signal:controller.signal};
          if(descriptor.sideEffect){
            if(!this.replayKey){
              if(!globalThis.crypto?.randomUUID)throw new Error("مرورگر از شناسهٔ امن برای درخواست پشتیبانی نمی‌کند.");
              this.replayKey=globalThis.crypto.randomUUID();
            }
            options.idempotencyKey=this.replayKey;
          }
          const result=await gateway.invoke(kind,input,options);
          if(revision!==this.revision)return;
          payload.textContent=JSON.stringify(result.data,null,2);
          status.textContent="پاسخ API: "+String(result.status)+" · Request ID: "+String(result.requestId||"—");
          this.setAttribute("data-api-state","succeeded");
        }catch(error){
          if(revision!==this.revision)return;
          payload.textContent="";
          status.textContent="خطای API: "+String(error?.code||error?.message||"network_error");
          this.setAttribute("data-api-state","failed");
        }finally{
          if(revision===this.revision){
            action.disabled=false;this.pending=false;this.controller=null;
          }
        }
      });
      root.replaceChildren(styles,form);
    }
  }
  registry.define("taghvim-api-widget",TaghvimApiWidget);
  return TaghvimApiWidget;
}
