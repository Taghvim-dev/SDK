# SPDX-License-Identifier: Apache-2.0
"""Contract-backed widgets: invoke the Taghvim REST API through the SERVER SDK.

Browser widgets must call the host application's authorized gateway instead.
Preview-only: deliberately block booking/availability until canonical endpoints exist.
"""
import re
from urllib.parse import quote

WIDGET_OPERATIONS = {
    "date-picker": ("POST", "/v1/dates/convert", False),
    "dual-calendar-badge": ("POST", "/v1/dates/convert", False),
    "date-reconciliation": ("POST", "/v1/dates/convert", False),
    "holiday-month": ("GET", "/v1/holidays", False),
    "holiday-badge": ("GET", "/v1/holidays/{date}", False),
    "business-day-badge": ("GET", "/v1/business-days/check", False),
    "deadline-calculator": ("POST", "/v1/business-days/add", False),
    "deadline-create": ("POST", "/v1/deadlines", True),
    "sla-calculator": ("POST", "/v1/sla/due", False),
    "reminder-preview": ("POST", "/v1/reminders/preview", False),
    "recurrence-builder": ("POST", "/v1/schedules/preview", False),
    "agent-schedule-preview": ("POST", "/v1/schedules/preview", False),
    "webhook-test": ("POST", "/v1/webhooks/{id}/test", True),
}
WIDGET_BLOCKED = frozenset(("booking", "availability", "workflow-run", "agent-execution"))


class WidgetUnavailable(ValueError):
    """The requested widget does not have a published canonical API endpoint."""


def invoke_widget(client, widget, input=None, *, idempotency_key=None):
    """Call the canonical Engine operation using an authenticated Python SDK.

    The caller is responsible for user/session authorization and per-tenant
    metering. Never inject an SDK key into browser JavaScript.
    """
    if widget not in WIDGET_OPERATIONS:
        raise WidgetUnavailable("Widget is not available in Engine API 2.1.0")
    if input is None:
        input = {}
    if not isinstance(input, dict):
        raise TypeError("Widget input must be a dictionary")
    if not hasattr(client, "call") or not callable(client.call):
        raise TypeError("A server-side TaghvimClient is required")
    if widget == "date-reconciliation":
        if not callable(getattr(client, "reconcile_dates", None)):
            raise TypeError("Reconciliation requires the authenticated Python SDK")
        return client.reconcile_dates(input)
    method, path, side_effect = WIDGET_OPERATIONS[widget]
    if side_effect and (not isinstance(idempotency_key, str)
                        or not 8 <= len(idempotency_key) <= 128
                        or not idempotency_key.isascii()):
        raise ValueError("Side-effecting widgets require an idempotency key")
    payload = input.copy()
    for name in re.findall(r"\{([a-z_]+)\}", path):
        value = payload.pop(name, None)
        if not isinstance(value, str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,128}", value):
            raise ValueError("Invalid widget path parameter")
        path = path.replace("{" + name + "}", quote(value, safe=""))
    return client.call(method, path,
                       body=payload if method != "GET" else None,
                       idempotency_key=idempotency_key,
                       query=payload if method == "GET" else None)
