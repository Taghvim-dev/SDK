import unittest
from unittest.mock import patch
from taghvim_sdk import TaghvimClient
from test_client import FakeResponse

class FinanceSdkTests(unittest.TestCase):
    @patch("urllib.request.urlopen")
    def test_preview_country_catalog_public_and_quote_authenticated(self,send):
        calls=[]
        def respond(req,timeout=None):
            calls.append(req)
            return FakeResponse({"status":"preview","country_count":249,"financial_decision_allowed":False,"business_date":"2026-12-29"})
        send.side_effect=respond
        client=TaghvimClient(api_key="tgv_test_finance_python")
        assert client.finance_countries()["country_count"]==249
        value=client.finance_business_day_quote(["GB-EW"],"2026-12-24",1)
        assert value["financial_decision_allowed"] is False
        assert calls[0].get_header("Authorization") is None
        assert calls[1].get_header("Authorization")=="Bearer tgv_test_finance_python"
