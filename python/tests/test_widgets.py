import json
import unittest
from pathlib import Path
from taghvim_sdk.widgets import WIDGET_OPERATIONS, WIDGET_BLOCKED, WidgetUnavailable, invoke_widget

class TestWidgetContract(unittest.TestCase):
    def test_all_claimed_routes_are_in_pinned_openapi(self):
        contract = json.loads((Path(__file__).resolve().parents[2] / "contracts" / "operation-index.json").read_text())
        routes = {x["method"] + " " + x["path"] for x in contract["operations"]}
        for kind, (method, path, _) in WIDGET_OPERATIONS.items():
            self.assertIn(method + " " + path, routes, kind)
        self.assertTrue({"booking", "availability", "workflow-run", "agent-execution"} <= WIDGET_BLOCKED)

    def test_invocations_delegate_to_real_python_sdk(self):
        class Client:
            def call(self, method, path, body=None, idempotency_key=None, query=None):
                self.last = (method, path, body, idempotency_key, query)
                return {"actual_api_response": True}
        c = Client()
        self.assertEqual(invoke_widget(c, "deadline-calculator", {"date": "1405-07-15", "days": 30}),
                         {"actual_api_response": True})
        self.assertEqual(c.last, ("POST", "/v1/business-days/add", {"date": "1405-07-15", "days": 30}, None, None))
        invoke_widget(c, "holiday-badge", {"date": "1405-07-15"})
        self.assertEqual(c.last, ("GET", "/v1/holidays/1405-07-15", None, None, {}))
        with self.assertRaises(WidgetUnavailable):
            invoke_widget(c, "booking", {})
        with self.assertRaises(ValueError):
            invoke_widget(c, "webhook-test", {"id": "hook_1"})
        invoke_widget(c, "webhook-test", {"id": "hook_1"}, idempotency_key="stable-webhook-key-001")
        self.assertEqual(c.last, ("POST", "/v1/webhooks/hook_1/test", {}, "stable-webhook-key-001", None))

if __name__=="__main__":
    unittest.main()
