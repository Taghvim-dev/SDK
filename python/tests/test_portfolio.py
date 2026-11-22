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

if __name__ == "__main__":
    unittest.main()
