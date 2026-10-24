import unittest
from taghvim_sdk.reconciliation import reconcile_calendar_dates
from taghvim_sdk.widgets import invoke_widget
pair={"left":{"date":"1405-07-15","calendar_system":"jalali"},"right":{"date":"2026-10-07","calendar_system":"gregorian"}}
def response(status="equivalent",delta=0):
 return {"status":200,"requestId":"req_native1","rateLimit":"20","data":{
   "status":status,"equivalent":None if status=="policy_conflict" else status=="equivalent",
   "scope":"calendar_day_not_instant","day_delta":delta,
   "left":{"date":{"iso":"2026-10-07"}},"right":{"date":{"iso":"2026-10-07"}},
   "evidence":{"operation":"POST /v1/dates/reconcile","request_ids":["req_native1"],
       "meter_units":2,"calendar_data_versions":["ir-v1","ir-v1"]}}}
class TestReconciliation(unittest.TestCase):
 def test_native_single_request_and_meter(self):
  class Client:
   def __init__(self): self.calls=[]
   def call_with_meta(self,method,path,body=None):
    self.calls.append((method,path,body));return response()
  c=Client();r=reconcile_calendar_dates(c,pair)
  self.assertEqual(r["data"]["status"],"equivalent")
  self.assertEqual(r["data"]["evidence"]["request_ids"],["req_native1"])
  self.assertEqual(r["data"]["evidence"]["meter_units"],2)
  self.assertEqual(c.calls,[("POST","/v1/dates/reconcile",pair)])
 def test_different_and_policy_conflict(self):
  class Client:
   def __init__(self,resp):self.resp=resp
   def call_with_meta(self,*a,**kw):return self.resp
  self.assertEqual(reconcile_calendar_dates(Client(response("different",1)),pair)["data"]["day_delta"],1)
  self.assertIsNone(reconcile_calendar_dates(Client(response("policy_conflict")),pair)["data"]["equivalent"])
 def test_invalid_input_before_api(self):
  class Client:
   def call_with_meta(self,*a,**kw):raise AssertionError("must not call remote")
  for p in ({"left":{"date":"1405-07-15"},"right":pair["right"]},{"left":pair["left"],"right":{}},
            {"left":pair["left"],"right":dict(pair["right"],calendar_system="unknown")}):
   with self.assertRaises(ValueError):reconcile_calendar_dates(Client(),p)
 def test_invalid_response_fail_closed(self):
  class Client:
   def call_with_meta(self,*a,**kw):
    bad=response();bad["data"]["evidence"]["request_ids"]=["req_one","req_two"];return bad
  with self.assertRaises(ValueError):reconcile_calendar_dates(Client(),pair)
 def test_widget_routes_to_native_sdk(self):
  class Client:
   def __init__(self):self.called=None
   def call(self,*a,**kw):raise AssertionError("not direct convert")
   def reconcile_dates(self,dates):self.called=dates;return response()
  c=Client();r=invoke_widget(c,"date-reconciliation",pair)
  self.assertEqual(r["data"]["evidence"]["meter_units"],2)
  self.assertEqual(c.called,pair)
if __name__=="__main__":unittest.main()
