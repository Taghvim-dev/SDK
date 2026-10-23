/**
 * Calendar-day reconciliation through the real, metered, tenant-authenticated
 * Taghvim conversion API. Never infer a calendar from the year or compare
 * timestamp instants as though they were dates.
 */
const systems = new Set(["jalali", "gregorian", "hijri"]);
function inputDate(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      !systems.has(value.calendar_system) || typeof value.date !== "string" ||
      value.date.trim().length < 6 || value.date.length > 48)
    throw new TypeError(label + ": explicit date and calendar_system (jalali, gregorian, hijri) required");
  return {date: value.date.trim(), calendar_system: value.calendar_system};
}
function canonical(out, name) {
  const data = out?.data, d = data?.date;
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d.iso) ||
      !Number.isInteger(d.weekday) || typeof d.business_day !== "boolean" ||
      !Array.isArray(d.holidays) || typeof data.calendar_data_version !== "string")
    throw new Error("Invalid canonical calendar API response for " + name);
  return {date:d,calendar_data_version:data.calendar_data_version};
}
/** A composite API-backed operation; exactly two independently metered calls. */
export async function reconcileCalendarDates(client, input, options={}) {
  if (!client || typeof client.request !== "function") throw new TypeError("API client required");
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Expected left/right date inputs");
  const leftInput = inputDate(input.left, "left");
  const rightInput = inputDate(input.right, "right");
  const leftRaw = await client.request("POST","/v1/dates/convert",{body:leftInput,signal:options.signal});
  const rightRaw = await client.request("POST","/v1/dates/convert",{body:rightInput,signal:options.signal});
  const left = canonical(leftRaw,"left"), right = canonical(rightRaw,"right");
  const sameDay = left.date.iso === right.date.iso;
  const samePolicy = left.calendar_data_version === right.calendar_data_version &&
    (!sameDay || (
      left.date.weekday === right.date.weekday &&
      left.date.business_day === right.date.business_day &&
      left.date.predicted_holiday === right.date.predicted_holiday &&
      JSON.stringify(left.date.holidays) === JSON.stringify(right.date.holidays)
    ));
  const status = !samePolicy ? "policy_conflict" : sameDay ? "equivalent" : "different";
  const dayDelta = Math.round((Date.parse(right.date.iso+"T00:00:00Z")-Date.parse(left.date.iso+"T00:00:00Z"))/86400000);
  return {status:200,requestId:rightRaw.requestId||leftRaw.requestId||null,rateLimit:rightRaw.rateLimit??null,
    data:{
      status, equivalent:status==="policy_conflict"?null:sameDay, scope:"calendar_day_not_instant",
      day_delta:dayDelta, left:{input:leftInput,...left}, right:{input:rightInput,...right},
      evidence:{operation:"POST /v1/dates/convert",request_ids:[leftRaw.requestId||null,rightRaw.requestId||null],
        meter_units:2,calendar_data_versions:[left.calendar_data_version,right.calendar_data_version],
        predicted_holiday_dependency:!!(left.date.predicted_holiday||right.date.predicted_holiday)}
    }};
}
