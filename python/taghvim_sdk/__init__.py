# SPDX-License-Identifier: Apache-2.0
"""Taghvim.dev Python client, early access preview; Apache-2.0."""
import json
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
    def __init__(self, api_key, base_url="https://api.taghvim.dev", timeout=15):
        if not isinstance(api_key, str) or not api_key.startswith(("tgv_test_", "tgv_live_")):
            raise ValueError("An issued Taghvim API key is required")
        parsed = urlsplit(base_url)
        if parsed.scheme != "https" or parsed.username or parsed.password or parsed.query or parsed.fragment or not parsed.netloc:
            raise ValueError("API endpoint must use HTTPS")
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def call(self, method, path, body=None, idempotency_key=None, query=None):
        """Backwards-compatible API response payload (not a synthetic SDK result)."""
        return self.call_with_meta(method, path, body, idempotency_key, query)["data"]

    def call_with_meta(self, method, path, body=None, idempotency_key=None, query=None):
        """Canonical payload and HTTP evidence; never put the API key into a response."""
        if method not in ("GET", "POST", "DELETE") or not path.startswith("/v1/") or "?" in path or "#" in path or ".." in path or "//" in path:
            raise ValueError("Invalid API route")
        # Explicit SDK identity: default Python-urllib User-Agent can be classified
        # as a bot at CDN edges even when a valid API bearer key is present.
        # Never impersonate a browser; use a stable versioned client identity.
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/json",
            "User-Agent": "TaghvimSDK-Python/2.1.0",
        }
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
                return {
                    "data": json.load(res),
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
