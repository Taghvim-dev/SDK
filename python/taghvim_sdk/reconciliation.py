# SPDX-License-Identifier: Apache-2.0
"""Fail-closed Taghvim calendar-day reconciliation via authenticated Engine API."""
import re
from datetime import date

_SYSTEMS = frozenset(("jalali", "gregorian", "hijri"))


def _input_date(value, label):
    if not isinstance(value, dict) or value.get("calendar_system") not in _SYSTEMS:
        raise ValueError(f"{label}: explicit calendar_system required")
    text = value.get("date")
    if not isinstance(text, str) or not 6 <= len(text) <= 48 or not text.strip():
        raise ValueError(f"{label}: an explicit date is required")
    return {"date": text.strip(), "calendar_system": value["calendar_system"]}


def _canonical(envelope, label):
    if not isinstance(envelope, dict) or envelope.get("status") != 200:
        raise ValueError(f"Invalid canonical API response for {label}")
    data = envelope.get("data")
    d = data.get("date") if isinstance(data, dict) else None
    if (not isinstance(d, dict)
            or not isinstance(d.get("iso"), str)
            or not re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", d["iso"])
            or type(d.get("weekday")) is not int
            or type(d.get("business_day")) is not bool
            or not isinstance(d.get("holidays"), list)
            or not isinstance(data.get("calendar_data_version"), str)):
        raise ValueError(f"Invalid canonical API response for {label}")
    try:
        parsed = date.fromisoformat(d["iso"])
    except ValueError as exc:
        raise ValueError(f"Invalid canonical ISO date for {label}") from exc
    return {"date": d, "calendar_data_version": data["calendar_data_version"], "_day": parsed}


def reconcile_calendar_dates(client, dates):
    """Compare named calendar DAYS, not UTC instants or unsupported country policies.

    Exactly two authenticated, separately metered POST /v1/dates/convert calls.
    All inputs are validated before quota is consumed. No local date conversion,
    no assumed timezone, no credentials in evidence and no fake request IDs.
    """
    if not callable(getattr(client, "call_with_meta", None)):
        raise TypeError("An authenticated TaghvimClient is required")
    if not isinstance(dates, dict):
        raise TypeError("Expected left/right date inputs")
    left_input = _input_date(dates.get("left"), "left")
    right_input = _input_date(dates.get("right"), "right")
    left_raw = client.call_with_meta("POST", "/v1/dates/convert", body=left_input)
    right_raw = client.call_with_meta("POST", "/v1/dates/convert", body=right_input)
    left = _canonical(left_raw, "left")
    right = _canonical(right_raw, "right")
    same_day = left["_day"] == right["_day"]
    same_policy = (
        left["calendar_data_version"] == right["calendar_data_version"]
        and (not same_day or all(
            left["date"].get(k) == right["date"].get(k)
            for k in ("weekday", "business_day", "predicted_holiday", "holidays")
        ))
    )
    status = "policy_conflict" if not same_policy else ("equivalent" if same_day else "different")
    left_day, right_day = left.pop("_day"), right.pop("_day")
    return {
        "status": 200,
        "requestId": right_raw.get("requestId") or left_raw.get("requestId"),
        "rateLimit": right_raw.get("rateLimit"),
        "data": {
            "status": status,
            "equivalent": None if status == "policy_conflict" else same_day,
            "scope": "calendar_day_not_instant",
            "day_delta": (right_day - left_day).days,
            "left": {"input": left_input, **left},
            "right": {"input": right_input, **right},
            "evidence": {
                "operation": "POST /v1/dates/convert",
                "request_ids": [left_raw.get("requestId"), right_raw.get("requestId")],
                "meter_units": 2,
                "calendar_data_versions": [
                    left["calendar_data_version"], right["calendar_data_version"]
                ],
                "predicted_holiday_dependency": bool(
                    left["date"].get("predicted_holiday")
                    or right["date"].get("predicted_holiday")
                ),
            },
        },
    }
