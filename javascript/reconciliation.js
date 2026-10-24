/** Native governed Taghvim date reconciliation: one metered, tenant-scoped API call. */
const systems=new Set(["jalali","gregorian","hijri"]);
const expectedFields=new Set(["iso","weekday","business_day","calendar_data_version"]);
function assertion(input,label){
 if(!input||typeof input!=="object"||Array.isArray(input)||!systems.has(input.calendar_system)||
    typeof input.date!=="string"||input.date.trim().length<6||input.date.length>48)
  throw new TypeError(label+": explicit date and calendar_system required");
 if(Object.keys(input).some(k=>!["date","calendar_system","expected"].includes(k)))
  throw new TypeError(label+": unknown assertion property");
 const out={date:input.date.trim(),calendar_system:input.calendar_system};
 if(Object.hasOwn(input,"expected")){
  if(!input.expected||typeof input.expected!=="object"||Array.isArray(input.expected)||
     Object.keys(input.expected).some(k=>!expectedFields.has(k)))
   throw new TypeError(label+": unknown expected policy field");
  out.expected={...input.expected};
 }
 return out;
}
export async function reconcileCalendarDates(client,input,options={}){
 if(!client||typeof client.request!=="function")throw new TypeError("Authenticated API client required");
 if(!input||typeof input!=="object"||Array.isArray(input)||
    Object.keys(input).some(k=>!["left","right"].includes(k)))
  throw new TypeError("Expected left/right assertions");
 const body={left:assertion(input.left,"left"),right:assertion(input.right,"right")};
 const result=await client.request("POST","/v1/dates/reconcile",{body,signal:options.signal});
 const data=result?.data;
 if(result.status!==200||!["equivalent","different","policy_conflict"].includes(data?.status)||
   !Number.isInteger(data.day_delta)||data.scope!=="calendar_day_not_instant"||
   data.evidence?.operation!=="POST /v1/dates/reconcile"||
   data.evidence?.meter_units!==2||!Array.isArray(data.evidence?.request_ids)||
   data.evidence.request_ids.length!==1||!/^req_[A-Za-z0-9]+$/.test(data.evidence.request_ids[0])||
   !Array.isArray(data.evidence.calendar_data_versions)||data.evidence.calendar_data_versions.length!==2||
   !data.left?.date?.iso||!data.right?.date?.iso)
  throw new Error("Native canonical reconciliation contract invalid");
 if((data.status==="policy_conflict")!==(data.equivalent===null))
  throw new Error("Native policy conflict semantics invalid");
 if(result.requestId&&result.requestId!==data.evidence.request_ids[0])
  throw new Error("Native reconciliation request identity mismatch");
 return result;
}
