# API-backed Widget SDK (2.1.0 preview)

This SDK has a single pinned registry of advertised widget operations. The registry is checked against the canonical Engine operation index in CI. A route present in the registry is **not** evidence that a real customer API key or deployed endpoint has been proven.

## Mandatory security boundary

Widget (browser, **no Taghvim key**) → app's same-origin POST /__taghvim/widgets → host's authenticated session + Origin check + tenant quota admission → TaghvimClient server SDK (secret key) → Engine REST API → response and request ID.

~~~
import {createTestClient} from "@taghvim/sdk";
import {createWidgetGateway} from "@taghvim/sdk/widgets";

// Server only. Read secret from your host's secure secret store.
const gateway = createWidgetGateway({
  // Each verified session owns one tenant. Never share keys across tenants.
  clientForTenant: async tenantId => {
    const secret = await secureTenantKeyStore.get(tenantId);
    if (!secret) return null;
    return createTestClient({apiKey: secret});
  },
  allowedOrigins: ["https://your-app.example"],
  authorize: request => verifySessionAndTenantId(request),
  admit: ({actor, widget}) => enforceYourTenantQuota(actor, widget)
});
// Route /__taghvim/widgets to gateway(request) in your application.
~~~

~~~
import {createBrowserWidgetClient} from "@taghvim/sdk/widgets";
const widgets=createBrowserWidgetClient();
const result=await widgets.invoke("deadline-calculator",
  {date:"1405-07-15",days:30});
console.log(result.data,result.requestId);
~~~

Keep keys out of HTML, browser bundles, URLs, GitHub, logs and public examples. The application must implement actual session validation, anti-CSRF handling, tenant ownership, secret management, and quota storage. A valid `authorize` callback returns `{tenantId}` from its verified session. `clientForTenant` then fetches *only that tenant's* credential. A static `client` is disallowed unless `singleTenant:true` is explicitly configured, and must never be used in multi-tenant deployments. The SDK's gateway rejects missing security hooks; this is **not** a turnkey identity provider.

## Contract-backed widget operations

Calendar picker and dual calendar badge: POST /v1/dates/convert. Holiday month: GET /v1/holidays; holiday badge: GET /v1/holidays/{date}. Business-day badge: GET /v1/business-days/check. Business deadline calculator: POST /v1/business-days/add. Persistent deadline: POST /v1/deadlines. SLA: POST /v1/sla/due. Reminders: POST /v1/reminders/preview. Recurrence and agent schedule preview: POST /v1/schedules/preview. Webhook test: POST /v1/webhooks/{id}/test.

**Not yet backend-backed:** booking, resource availability, persisted workflow runs, and governed agent execution. These are intentionally blocked with WIDGET_NOT_AVAILABLE; demonstrations must never silently substitute mock data for a live API response. Side-effecting widgets (persistent deadline, webhook test) require explicit idempotency keys.

## Must pass before Production

Add missing Engine endpoints through the canonical OpenAPI and SDK registry; implement host gateway and real embed packages; verify an issued test API key and tenant isolation; migrate and reconcile Cloudflare D1 Sandbox→Production via protected promotion; run negative authorization, quotas, idempotency, receipt, retry and metering tests; verify externally and register evidence, exact commits and deployment SHAs. A green source-level test is not a production certification.
