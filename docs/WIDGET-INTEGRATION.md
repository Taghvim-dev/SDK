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

## RTL Web Component (source preview)

Place the browser SDK sources in your application bundle; **do not pass an API key to the browser**. Install the gateway on your application's own origin and ensure its authorize/admit hooks validate real sessions, CSRF and tenant quotas.

```js
import {registerTaghvimWidgets} from "@taghvim/sdk/embed";
registerTaghvimWidgets();
```

```html
<taghvim-api-widget kind="date-picker"></taghvim-api-widget>
<taghvim-api-widget kind="deadline-calculator"></taghvim-api-widget>
<taghvim-api-widget kind="recurrence-builder"></taghvim-api-widget>
```

Each form submits through `createBrowserWidgetClient` to the same-origin secure gateway and shows the **actual HTTP response and request ID**, without browser-side fake receipts. Available kinds are enumerated in the exported immutable `WIDGET_OPERATIONS` registry. Unsupported kinds render a fail-closed availability warning instead of an imitation response. The component is a preview widget implementation; publication, accessibility sign-off and real tenant/request evidence remain production release gates.


## Real API-powered Web Component (developer preview)

Import the widget SDK browser module in your application, *after* configuring
the server-side \`createWidgetGateway\` documented above.

\`\`\`javascript
import {registerTaghvimWidgets} from "@taghvim/sdk/elements";
registerTaghvimWidgets();
\`\`\`

\`\`\`html
<taghvim-api-widget kind="date-picker" input='{"date":"1405-07-15"}'></taghvim-api-widget>
<taghvim-api-widget kind="holiday-month" input='{"year":1405,"month":7}'></taghvim-api-widget>
<taghvim-api-widget kind="deadline-calculator" input='{"date":"1405-07-15","days":3}'></taghvim-api-widget>
\`\`\`

All twelve declared supported kinds submit through the same-origin
\`/__taghvim/widgets\` route to a real tenant-bound SDK API request, returning
the API payload and request ID. Nothing is computed or faked by the element.
Changing the \`endpoint\` attribute is allowed only for safe same-origin routes.
A webhook test requires the authenticated tenant's own webhook \`id\`.
Persistent deadline creation and webhook tests require a direct button click
and retry-stable idempotency key. API failures visibly fail closed.

The four unavailable kinds (\`booking\`, \`availability\`, \`workflow-run\`,
\`agent-execution\`) render **disabled**, with a clear unavailable reason;
they are *not* production APIs. The engine must add and independently verify
governed endpoints before these may be enabled.

The Web Component is a functional developer-facing API integration,
**not** a polished production booking/calendar UX, nor proof that a customer's
API key has been issued and exercised on Cloudflare.
