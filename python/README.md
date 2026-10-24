# Python SDK (preview)

Apache-2.0 Python client using standard-library HTTP calls; not published to PyPI. A separately issued test key is required.

```python
import os
from taghvim_sdk import TaghvimClient
client = TaghvimClient(api_key=os.environ["TAGHVIM_TEST_API_KEY"])
print(client.convert_date("1405-07-15"))
```

From this repository root run `PYTHONPATH=python python -m unittest discover -s python/tests -v`. Keep keys private and never treat demo responses as live API activation. [Release policy](../docs/RELEASE-POLICY.md).

The Python client identifies itself as `TaghvimSDK-Python/2.1.0` in `User-Agent`, rather than Python urllib's default. This supports observability and policy-based CDN access. API credentials remain in the Authorization header, never the URL or user agent. Real remote Sandbox acceptance must be proven before public integration is certified.

## Calendar-day reconciliation (same canonical API as JavaScript SDK)

```python
from taghvim_sdk import TaghvimClient
from taghvim_sdk.widgets import invoke_widget

client = TaghvimClient(api_key=os.environ["TAGHVIM_TEST_API_KEY"])
result = client.reconcile_dates({
    "left": {"date": "1405-07-15", "calendar_system": "jalali"},
    "right": {"date": "2026-10-07", "calendar_system": "gregorian"},
})
print(result["data"]["status"], result["data"]["evidence"]["request_ids"])
# The corresponding server-side widget uses the same SDK: 
widget = invoke_widget(client, "date-reconciliation", {
    "left": {"date": "1405-07-15", "calendar_system": "jalali"},
    "right": {"date": "2026-10-07", "calendar_system": "gregorian"},
})
```

The primary SDK now uses **one authenticated and metered POST /v1/dates/reconcile** operation. A 404 cannot trigger an implicit downgrade. The explicitly named legacy helper `reconcile_calendar_dates(client, pair)` still performs two separately metered POST /v1/dates/convert requests, if an application deliberately opts into the older composite behavior. Reconciliation covers **calendar-day identity**, not timezone-bound instants. Both browser and server must protect API keys, and calendar/policy discrepancies must remain explicit.
