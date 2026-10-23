<h1 lang="fa" dir="rtl">SDKهای رسمی متن‌باز تقویم.dev — نسخهٔ آزمایشی</h1>

## 🧪 درخواست API Key و آزمایش رایگان ۳۰روزه | 30-day developer trial

**[ثبت‌نام برای دریافت API Key آزمایشی](https://taghvim.dev/#access)** · **[Request an API test key](https://taghvim.dev/#access)**

با ثبت درخواست دسترسی زودهنگام، ایمیل تأیید دریافت می‌کنید. پس از **۷ روز**، در صورت آماده‌بودن سرویس و برقرار بودن شرایط دسترسی، دعوت‌نامهٔ یک‌بارمصرف به همان ایمیل فرستاده می‌شود. پیوند دعوت تا **۷۲ ساعت** اعتبار دارد. پس از فعال‌سازی دعوت‌نامه، Tenant آزمایشی و کلید `tgv_test_...` صادر می‌شود که **۳۰ روز از زمان فعال‌سازی** معتبر است (نه از زمان ثبت‌نام). کلید فقط یک‌بار در صفحه فعال‌سازی نمایش داده می‌شود؛ هرگز در GitHub، کد کلاینت یا Issue عمومی قرار ندهید. تمدید یا دسترسی Production نیازمند تأیید جداگانه است.

**English:** Register on the official early-access form and receive an acknowledgement email. The seven-day invitation schedule is activated only after the protected Cloudflare release and email-delivery checks. An emailed one-time invitation (72-hour validity) provisions a test tenant and a **30-day test API key starting on activation**. An invitation is not itself an API key. Product-update emails use a separate, optional consent choice. [Privacy](https://taghvim.dev/#privacy) · [Terms](https://taghvim.dev/#terms) · [Contact](https://taghvim.dev/#contact).


<p lang="fa" dir="rtl">کلاینت‌های JavaScript/TypeScript و Python برای استفادهٔ برنامه‌نویسی از API تقویم.dev، با قرارداد نسخه‌دار، خطاهای قابل‌ردیابی و نمونه‌های ایمن. این مخزن عمومی و دارای مجوز Apache-2.0 است؛ بااین‌حال، <strong>انتشار عمومی SDK به‌معنای فعال‌بودن ثبت‌نام خودکار یا ارائهٔ کلید آزمایشی به همه نیست</strong>. دسترسی فعلاً با دعوت‌نامه انجام می‌شود.</p>

## 🧪 دریافت API Key و دورهٔ آزمایشی ۳۰روزه | 30-day API trial

**[ثبت‌نام برای دریافت API Key آزمایشی](https://taghvim.dev/#access)** · **[Request API access](https://taghvim.dev/#access)**

<p dir="rtl" lang="fa">در فرم رسمی دسترسی زودهنگام ثبت‌نام کنید تا تأییدیهٔ ثبت درخواست را با ایمیل دریافت کنید. از <strong>۷ روز پس از ثبت‌نام</strong> و پس از احراز آمادگی سرویس، دعوت‌نامهٔ اختصاصی به همان نشانی فرستاده می‌شود. پیوند دعوت‌نامه <strong>۷۲ ساعت و یک‌بارمصرف</strong> است. پس از فعال‌سازی آن، یک Tenant مستقل و کلید <code>tgv_test_…</code> دریافت می‌کنید. <strong>دورهٔ آزمایشی دقیقاً ۳۰ روز از زمان فعال‌سازی شروع می‌شود</strong>؛ تعویض کلید باعث تمدید آن نمی‌شود. کلید در صفحهٔ فعال‌سازی فقط یک بار نمایش داده می‌شود. پس از پایان دوره، دسترسی نیازمند تأیید جدید است؛ حساب یا کلید Production به‌طور خودکار صادر نمی‌شود.</p>

**English:** [Join the early-access waitlist](https://taghvim.dev/#access) → registration confirmation email → eligibility for a one-time emailed invitation **after seven days**, once the protected email and API services are ready → activate the invitation **within 72 hours** → receive a test-only API key and a **30-day trial counted from activation, not registration**. Rotating keys does not reset this deadline. Do not commit API keys, publish them in GitHub issues, or place shared secrets in public browser code. Product announcements require a separate optional opt-in.

[Developer activation portal](https://api.taghvim.dev/developer) · [Test-key console](https://api.taghvim.dev/developer/console) · [API contract](https://api.taghvim.dev/openapi.json) · [Privacy](https://taghvim.dev/#privacy) · [Terms](https://taghvim.dev/#terms) · [Contact](https://taghvim.dev/#contact)

> **Current availability:** The public form collects early-access requests. Timed invitation delivery is not guaranteed until the Landing D1 migration, protected Engine Cron deployment and real email-delivery checks have passed. A signup acknowledgement is not an API key.

## Start here

- [JavaScript / TypeScript SDK](javascript/README.md)
- [Python SDK](python/README.md)
- [Working examples](examples/README.md)
- [Pinned operation index](contracts/operation-index.json)
- [API-backed widget adapters and real Web Component for JS and Python](docs/WIDGET-INTEGRATION.md) — preview; unsupported capabilities fail closed
- [SDK release and compatibility policy](docs/RELEASE-POLICY.md)
- [Developer cookbooks](https://github.com/Taghvim-dev/cookbooks)
- [Product and early-access request](https://taghvim.dev/)

```js
import {createTestClient} from "./javascript/index.js";
const api = createTestClient({apiKey: process.env.TAGHVIM_TEST_API_KEY});
const result = await api.convertDate({date:"1405-07-15"});
console.log(result.data, result.requestId);
```

## Guarantees and limits

This is **preview source**: no published npm/PyPI package or generally available developer environment is asserted. Never expose tokens in a browser bundle. Test and live keys must be separately authorized. The JavaScript/Python clients intentionally do not auto-create accounts or automatically retry mutations. The operation registry covers discoverable, non-admin operations, while SDK convenience methods cover the documented subset; other operations can use the guarded low-level request methods.

The **canonical API contract** is owned and versioned by Taghvim.dev Engine. Every approved change must reconcile contract → SDK → examples → cookbooks → release evidence before publication. The immutable source contract Git blob SHA is recorded in [the operation index](contracts/operation-index.json).

**License:** [Apache-2.0](LICENSE). [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [Notice](NOTICE). Product names and marks are not licensed by the source-code license.

## Calendar & Date Reconciliation (API-backed early-access)

Date reconciliation compares explicit **calendar days** across Jalali, Gregorian and Umm al-Qura Hijri using **two authenticated `POST /v1/dates/convert` calls** against the same tenant API. It is not yet a standalone `/v1/temporal/reconcile` API endpoint and does not reconcile timestamp instants, arbitrary holiday policies, or cross-country business calendars. `policy_conflict` is returned if the calendar data version or same-day weekday/holiday facts differ between calls; there is no silent correction. The API meters both conversions independently.

```js
import {createTestClient} from '@taghvim/sdk';
const api = createTestClient({apiKey:process.env.TAGHVIM_TEST_API_KEY});
const result = await api.reconcileDates({
  left:{date:'1405-07-15',calendar_system:'jalali'},
  right:{date:'2026-10-07',calendar_system:'gregorian'}
});
console.log(result.data.status, result.data.evidence.request_ids);
```

For server-rendered widgets, call `invokeWidget(client, 'date-reconciliation', {left,right})` from `@taghvim/sdk/widgets` with a tenant-scoped key. Never expose API credentials in a public browser. A public embed requires `createWidgetGateway` with independent authentication, tenant resolution, origin allowlisting and quota admission.
