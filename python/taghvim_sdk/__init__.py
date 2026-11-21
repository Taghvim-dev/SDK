# SPDX-License-Identifier: Apache-2.0
"""Taghvim.dev Python client, early access preview; Apache-2.0."""
import json
import re
import urllib.error
import urllib.request
from urllib.parse import quote, urlsplit, urlencode
from urllib.parse import urlparse


class TaghvimApiError(Exception):
    def __init__(self, status, code, request_id=None):
        super().__init__(f"Taghvim API error {status}: {code or 'unknown'}")
        self.status = status
        self.code = code
        self.request_id = request_id


class TaghvimClient:
    def __init__(self, api_key=None, base_url="https://api.taghvim.dev", timeout=15):
        if api_key is not None and (not isinstance(api_key, str) or not api_key.startswith(("tgv_test_", "tgv_live_"))):
            raise ValueError("An issued Taghvim API key is required")
        parsed = urlsplit(base_url)
        if parsed.scheme != "https" or parsed.username or parsed.password or parsed.query or parsed.fragment or not parsed.netloc:
            raise ValueError("API endpoint must use HTTPS")
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def call(self, method, path, body=None, idempotency_key=None, query=None, auth=True, workspace_id=None):
        """Backwards-compatible API response payload (not a synthetic SDK result)."""
        return self.call_with_meta(method, path, body, idempotency_key, query, auth=auth, workspace_id=workspace_id)["data"]

    def call_with_meta(self, method, path, body=None, idempotency_key=None, query=None, auth=True, workspace_id=None):
        """Canonical payload and HTTP evidence; never put the API key into a response."""
        if method not in ("GET", "POST", "PATCH", "DELETE") or not path.startswith("/v1/") or "?" in path or "#" in path or ".." in path or "//" in path:
            raise ValueError("Invalid API route")
        # Explicit SDK identity: default Python-urllib User-Agent can be classified
        # as a bot at CDN edges even when a valid API bearer key is present.
        # Never impersonate a browser; use a stable versioned client identity.
        if auth and not self.api_key:
            raise ValueError("An issued Taghvim API key is required for this operation")
        headers = {
            "Accept": "application/json",
            "User-Agent": "TaghvimSDK-Python/2.1.0",
        }
        if auth:
            headers["Authorization"] = f"Bearer {self.api_key}"
        if workspace_id is not None:
            if not isinstance(workspace_id, str) or not re.fullmatch(r"[A-Za-z][A-Za-z0-9_:-]{3,127}", workspace_id):
                raise ValueError("Invalid Workspace selector")
            headers["Taghvim-Workspace-Id"] = workspace_id
        if body is not None:
            headers["Content-Type"] = "application/json"
        if idempotency_key is not None:
            headers["Idempotency-Key"] = idempotency_key
        if query is not None and not isinstance(query, dict):
            raise ValueError("API query must be a dictionary")
        if query:
            if any(not isinstance(k, str) or not k for k in query):
                raise ValueError("Invalid query parameter name")
            path += "?" + urlencode({k: v for k, v in query.items() if v is not None})
        req = urllib.request.Request(self.base_url + path,
            data=None if body is None else json.dumps(body).encode("utf-8"),
            headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as res:
                media = str(res.headers.get("Content-Type", "application/json")).lower()
                payload = json.load(res) if "json" in media else res.read().decode("utf-8")
                return {
                    "data": payload,
                    "status": getattr(res, "status", 200),
                    "requestId": res.headers.get("Taghvim-Request-Id"),
                    "rateLimit": res.headers.get("RateLimit"),
                }
        except urllib.error.HTTPError as err:
            try:
                data = json.load(err)
            except (ValueError, OSError):
                data = {}
            raise TaghvimApiError(err.code, data.get("code"), err.headers.get("Taghvim-Request-Id")) from None

    def convert_date(self, date):
        return self.call("POST", "/v1/dates/convert", {"date": date})

    def usage(self):
        return self.call("GET", "/v1/usage")

    def reconcile_dates(self, dates):
        """One native authenticated and metered Engine request; no implicit composite fallback."""
        from .reconciliation import _input_date
        if not isinstance(dates, dict):
            raise TypeError("Expected left/right date inputs")
        _input_date(dates.get("left"), "left")
        _input_date(dates.get("right"), "right")
        return self.call_with_meta("POST", "/v1/dates/reconcile", dates)

    @staticmethod
    def _calendar_id(value):
        if not isinstance(value, str) or not value or "/" in value or ".." in value:
            raise ValueError("Invalid calendar identifier")
        return quote(value, safe="")

    @staticmethod
    def _mutation_key(key):
        if not isinstance(key, str) or not 8 <= len(key) <= 128:
            raise ValueError("An 8-128 character Idempotency-Key is required")
        return key

    def get_current_workspace(self):
        return self.call("GET", "/v1/workspaces/current")


    def create_workspace(self, body, idempotency_key, workspace_id=None):
        return self.call("POST", "/v1/workspaces", body, self._mutation_key(idempotency_key), workspace_id=workspace_id)

    def get_workspace(self, workspace_id):
        return self.call("GET", "/v1/workspaces/" + self._calendar_id(workspace_id))

    def create_calendar_event(self, calendar_id, body, idempotency_key, workspace_id=None):
        return self.call("POST", "/v1/calendars/" + self._calendar_id(calendar_id) + "/events",
                         body, self._mutation_key(idempotency_key), workspace_id=workspace_id)

    def update_calendar_event(self, calendar_id, event_id, body, idempotency_key, workspace_id=None):
        return self.call("PATCH", "/v1/calendars/" + self._calendar_id(calendar_id) + "/events/" + self._calendar_id(event_id),
                         body, self._mutation_key(idempotency_key), workspace_id=workspace_id)

    def list_calendar_events(self, calendar_id, workspace_id=None):
        return self.call("GET", "/v1/calendars/" + self._calendar_id(calendar_id) + "/events", workspace_id=workspace_id)

    def public_calendar_events(self, calendar_id):
        return self.call("GET", "/v1/public/calendars/" + self._calendar_id(calendar_id) + "/events", auth=False)

    def subscribe_calendar(self, calendar_id, idempotency_key, workspace_id=None):
        return self.call("POST", "/v1/public/calendars/" + self._calendar_id(calendar_id) + "/subscriptions",
                         {"channel": "ics"}, self._mutation_key(idempotency_key), workspace_id=workspace_id)

    def set_calendar_notification_preferences(self, calendar_id, body, idempotency_key, workspace_id=None):
        return self.call("PATCH", "/v1/calendars/" + self._calendar_id(calendar_id) + "/notification-preferences",
                         body, self._mutation_key(idempotency_key), workspace_id=workspace_id)

    def create_calendar(self, graph, idempotency_key):
        return self.call("POST", "/v1/calendars", graph, self._mutation_key(idempotency_key))

    def get_calendar(self, calendar_id):
        return self.call("GET", "/v1/calendars/" + self._calendar_id(calendar_id))

    def update_calendar(self, calendar_id, graph, idempotency_key):
        return self.call("PATCH", "/v1/calendars/" + self._calendar_id(calendar_id),
                         graph, self._mutation_key(idempotency_key))

    def publish_calendar(self, calendar_id, expected_version, idempotency_key):
        return self.call("POST", "/v1/calendars/" + self._calendar_id(calendar_id) + "/publish",
                         {"expected_version": expected_version}, self._mutation_key(idempotency_key))

    def unpublish_calendar(self, calendar_id, expected_version, idempotency_key):
        return self.call("POST", "/v1/calendars/" + self._calendar_id(calendar_id) + "/unpublish",
                         {"expected_version": expected_version}, self._mutation_key(idempotency_key))

    def public_calendar(self, calendar_id):
        return self.call("GET", "/v1/public/calendars/" + self._calendar_id(calendar_id), auth=False)

    def public_calendar_ics(self, calendar_id):
        return self.call("GET", "/v1/public/calendars/" + self._calendar_id(calendar_id) + "/ics",
                         auth=False)

    def search_public_calendar_events(self, query=None):
        return self.call("GET", "/v1/public/calendar-search", query=query or {}, auth=False)
