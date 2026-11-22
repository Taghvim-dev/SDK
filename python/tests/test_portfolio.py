import unittest
from taghvim_sdk import TaghvimClient

class PortfolioContractTest(unittest.TestCase):
    def test_portfolio_uses_same_key_scoped_generic_client(self):
        client = TaghvimClient(api_key="tgv_test_SyntheticPortfolioKey")
        seen = []
        client.call = lambda *args, **kwargs: seen.append((args, kwargs)) or {"count": 0, "data": []}
        result = client.list_calendar_portfolio({"scope": "granted", "sector_pack": "healthcare"}, "wsp_hospital_001")
        self.assertEqual(result["count"], 0)
        self.assertEqual(seen[0][0], ("GET", "/v1/portfolios/calendars"))
        self.assertEqual(seen[0][1]["query"]["sector_pack"], "healthcare")
        self.assertEqual(seen[0][1]["workspace_id"], "wsp_hospital_001")

    def test_financial_calendar_market_admission_shared_with_js(self):
        from taghvim_sdk import FinancialCalendarClient
        for cls in (TaghvimClient, FinancialCalendarClient):
            client = cls(api_key="tgv_test_SyntheticFinanceKey")
            calls = []
            client.call = lambda *args, **kwargs: calls.append((args, kwargs)) or {"status":"candidate_preview", "financial_decision_allowed":False}
            for market in ("AT-9", "US-CA", "GB-SCT", "AE"):
                result = client.holidays(market, 2026) if cls is FinancialCalendarClient else client.finance_holidays(market, 2026)
                self.assertFalse(result["financial_decision_allowed"])
                self.assertEqual(calls[-1][0], ("GET", "/v1/finance/holidays"))
                self.assertEqual(calls[-1][1]["query"], {"market":market, "year":2026})
            before = len(calls)
            for market in ("AT-", "A-9", "AT-12345", "AT-!9", "at-9", "AT-9/XX"):
                with self.assertRaises(ValueError):
                    client.finance_holidays(market, 2026)
            self.assertEqual(len(calls), before, "Invalid market cannot call API")

if __name__ == "__main__":
    unittest.main()
