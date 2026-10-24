import unittest
from taghvim_sdk.reconciliation import reconcile_calendar_dates
from taghvim_sdk.widgets import invoke_widget


def day(iso="2026-10-07", version="ir-2026", weekday=3):
    return {
        "date": {
            "iso": iso, "weekday": weekday, "business_day": True,
            "predicted_holiday": False, "holidays": []
        },
        "calendar_data_version": version,
    }


class TestReconciliation(unittest.TestCase):
    left = {"date": "1405-07-15", "calendar_system": "jalali"}
    right = {"date": "2026-10-07", "calendar_system": "gregorian"}

    def test_equivalent_and_two_real_contract_operations(self):
        class Client:
            def __init__(self): self.calls = []
            def call_with_meta(self, method, path, body=None):
                self.calls.append((method, path, body))
                return {"status": 200, "data": day(),
                        "requestId": "req_" + str(len(self.calls)), "rateLimit": "42"}
        c = Client()
        result = reconcile_calendar_dates(c, {"left": self.left, "right": self.right})
        self.assertEqual(result["data"]["status"], "equivalent")
        self.assertEqual(result["data"]["day_delta"], 0)
        self.assertEqual(result["data"]["evidence"]["request_ids"], ["req_1", "req_2"])
        self.assertEqual(result["data"]["evidence"]["meter_units"], 2)
        self.assertEqual(len(c.calls), 2)
        self.assertEqual([x[:2] for x in c.calls], [
            ("POST", "/v1/dates/convert"), ("POST", "/v1/dates/convert")])
        self.assertEqual(c.calls[0][2], self.left)

    def test_day_difference_and_calendar_pack_version_conflict(self):
        class Client:
            def __init__(self, values): self.values = list(values)
            def call_with_meta(self, *_a, **_k):
                return {"status": 200, "data": self.values.pop(0), "requestId": None}
        changed = reconcile_calendar_dates(Client([day(), day("2026-10-08", weekday=4)]),
                                             {"left": self.left, "right": self.right})
        self.assertEqual(changed["data"]["status"], "different")
        self.assertEqual(changed["data"]["day_delta"], 1)
        drift = reconcile_calendar_dates(Client([day(version="v1"), day(version="v2")]),
                                           {"left": self.left, "right": self.right})
        self.assertEqual(drift["data"]["status"], "policy_conflict")
        self.assertIsNone(drift["data"]["equivalent"])

    def test_invalid_input_fails_before_any_API_usage(self):
        class Client:
            def call_with_meta(self, *_a, **_k):
                raise AssertionError("must not spend API quota")
        for invalid in (
            {"left": {"date": "1405-07-15"}, "right": self.right},
            {"left": self.left, "right": {"date": "1448-04-26", "calendar_system": "unknown"}},
            {"left": self.left, "right": {}},
        ):
            with self.assertRaises(ValueError):
                reconcile_calendar_dates(Client(), invalid)

    def test_widget_uses_authenticated_native_sdk_only(self):
        class Client:
            def __init__(self): self.invoked = None
            def call(self, *_a, **_kw):
                raise AssertionError("Do not silently downgrade widget to one conversion")
            def reconcile_dates(self, dates):
                self.invoked = dates
                return {"data": {"status": "equivalent", "evidence": {"meter_units": 2}}}
        c = Client()
        data = {"left": self.left, "right": self.right}
        result = invoke_widget(c, "date-reconciliation", data)
        self.assertEqual(c.invoked, data)
        self.assertEqual(result["data"]["evidence"]["meter_units"], 2)

    def test_python_native_client_uses_single_request_with_meta_and_does_not_fallback(self):
        from taghvim_sdk import TaghvimClient
        requests = []
        c = object.__new__(TaghvimClient)
        def api(method, path, body=None, **_kwargs):
            requests.append((method, path, body))
            return {"status": 200, "requestId": "req_native",
                    "data": {"status": "equivalent", "evidence": {"request_ids": ["req_native"], "meter_units": 2}}}
        c.call_with_meta = api
        pair = {"left": {**self.left, "expected": {"weekday": 3}}, "right": self.right}
        result = c.reconcile_dates(pair)
        self.assertEqual(result["data"]["status"], "equivalent")
        self.assertEqual(requests, [("POST", "/v1/dates/reconcile", pair)])
        with self.assertRaises(ValueError):
            c.reconcile_dates({"left": {"date": "1405-07-15"}, "right": self.right})
        self.assertEqual(len(requests), 1)

if __name__ == "__main__":
    unittest.main()
