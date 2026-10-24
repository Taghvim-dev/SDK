"""Real API-backed calendar-day reconciliation, using a separately issued key."""
import os
from taghvim_sdk import TaghvimClient
from taghvim_sdk.widgets import invoke_widget

client = TaghvimClient(api_key=os.environ["TAGHVIM_TEST_API_KEY"])
data = {
    "left": {"date": "1405-07-15", "calendar_system": "jalali"},
    "right": {"date": "2026-10-07", "calendar_system": "gregorian"},
}
result = invoke_widget(client, "date-reconciliation", data)
if result["data"]["status"] != "equivalent":
    raise RuntimeError("Canonical calendars differ")
print(result["data"]["status"], result["data"]["evidence"]["request_ids"])
