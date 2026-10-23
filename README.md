<h1 lang="fa" dir="rtl">SDKهای رسمی متن‌باز تقویم.dev — نسخهٔ آزمایشی</h1>

## 🧪 درخواست API Key و آزمایش رایگان ۳۰روزه | 30-day developer trial

**[ثبت‌نام برای دریافت API Key آزمایشی](https://taghvim.dev/#access)** · **[Request an API test key](https://taghvim.dev/#access)**

با ثبت درخواست دسترسی زودهنگام، ایمیل تأیید دریافت می‌کنید. پس از **۷ روز**، در صورت آماده‌بودن سرویس و برقرار بودن شرایط دسترسی، دعوت‌نامهٔ یک‌بارمصرف به همان ایمیل فرستاده می‌شود. پیوند دعوت تا **۷۲ ساعت** اعتبار دارد. پس از فعال‌سازی دعوت‌نامه، Tenant آزمایشی و کلید `tgv_test_...` صادر می‌شود که **۳۰ روز از زمان فعال‌سازی** معتبر است (نه از زمان ثبت‌نام). کلید فقط یک‌بار در صفحه فعال‌سازی نمایش داده می‌شود؛ هرگز در GitHub، کد کلاینت یا Issue عمومی قرار ندهید. تمدید یا دسترسی Production نیازمند تأیید جداگانه است.

**English:** Register on the official early-access form and receive an acknowledgement email. The seven-day invitation schedule is activated only after the protected Cloudflare release and email-delivery checks. An emailed one-time invitation (72-hour validity) provisions a test tenant and a **30-day test API key starting on activation**. An invitation is not itself an API key. Product-update emails use a separate, optional consent choice. [Privacy](https://taghvim.dev/#privacy) · [Terms](https://taghvim.dev/#terms) · [Contact](https://taghvim.dev/#contact).


<p lang="fa" dir="rtl">کلاینت‌های JavaScript/TypeScript و Python برای استفادهٔ برنامه‌نویسی از API تقویم.dev، با قرارداد نسخه‌دار، خطاهای قابل‌ردیابی و نمونه‌های ایمن. این مخزن عمومی و دارای مجوز Apache-2.0 است؛ بااین‌حال، <strong>انتشار عمومی SDK به‌معنای فعال‌بودن ثبت‌نام خودکار یا ارائهٔ کلید آزمایشی به همه نیست</strong>. دسترسی فعلاً با دعوت‌نامه انجام می‌شود.</p>

## Start here

- [JavaScript / TypeScript SDK](javascript/README.md)
- [Python SDK](python/README.md)
- [Working examples](examples/README.md)
- [Pinned operation index](contracts/operation-index.json)
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
