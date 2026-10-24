# SPDX-License-Identifier: Apache-2.0
"""Native governed calendar-day reconciliation; one authenticated, metered API request."""
import re
_SYSTEMS=frozenset(("jalali","gregorian","hijri"))
_FIELDS=frozenset(("iso","weekday","business_day","calendar_data_version"))

def _assertion(value,side):
    if not isinstance(value,dict) or value.get("calendar_system") not in _SYSTEMS:
        raise ValueError(f"{side}: explicit calendar_system required")
    date=value.get("date")
    if not isinstance(date,str) or not 6<=len(date.strip())<=48:
        raise ValueError(f"{side}: explicit date required")
    if set(value)-{"date","calendar_system","expected"}:
        raise ValueError(f"{side}: unknown assertion property")
    out={"date":date.strip(),"calendar_system":value["calendar_system"]}
    if "expected" in value:
        expected=value["expected"]
        if not isinstance(expected,dict) or set(expected)-_FIELDS:
            raise ValueError(f"{side}: invalid expected policy fields")
        out["expected"]=expected.copy()
    return out

def reconcile_calendar_dates(client,dates):
    """Compare explicit Jalali/Gregorian/Hijri calendar days, never guessed instants."""
    if not callable(getattr(client,"call_with_meta",None)):
        raise TypeError("Authenticated TaghvimClient required")
    if not isinstance(dates,dict) or set(dates)-{"left","right"}:
        raise TypeError("Expected left/right assertions")
    body={side:_assertion(dates.get(side),side) for side in ("left","right")}
    result=client.call_with_meta("POST","/v1/dates/reconcile",body=body)
    data=result.get("data") if isinstance(result,dict) else None
    evidence=data.get("evidence") if isinstance(data,dict) else None
    ids=evidence.get("request_ids") if isinstance(evidence,dict) else None
    if (result.get("status")!=200 or data.get("status") not in ("equivalent","different","policy_conflict")
        or type(data.get("day_delta")) is not int or data.get("scope")!="calendar_day_not_instant"
        or not isinstance(evidence,dict) or evidence.get("operation")!="POST /v1/dates/reconcile"
        or evidence.get("meter_units")!=2 or not isinstance(ids,list) or len(ids)!=1
        or not isinstance(ids[0],str) or not re.fullmatch(r"req_[A-Za-z0-9]+",ids[0])
        or not isinstance(evidence.get("calendar_data_versions"),list)
        or len(evidence["calendar_data_versions"])!=2
        or not isinstance(data.get("left"),dict) or not isinstance(data.get("right"),dict)):
        raise ValueError("Invalid native reconciliation response")
    if (data["status"]=="policy_conflict")!=(data.get("equivalent") is None):
        raise ValueError("Inconsistent native reconciliation policy")
    if result.get("requestId") and result["requestId"]!=ids[0]:
        raise ValueError("Native reconciliation request identity mismatch")
    return result
