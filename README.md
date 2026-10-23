<h1 lang="fa" dir="rtl">SDKهای رسمی متن‌باز تقویم.dev — نسخهٔ آزمایشی</h1>

<p lang="fa" dir="rtl">کلاینت‌های JavaScript/TypeScript و Python برای استفادهٔ برنامه‌نویسی از API تقویم.dev، با قرارداد نسخه‌دار، خطاهای قابل‌ردیابی و نمونه‌های ایمن. این مخزن عمومی و دارای مجوز Apache-2.0 است؛ بااین‌حال، <strong>انتشار عمومی SDK به‌معنای فعال‌بودن ثبت‌نام خودکار یا ارائهٔ کلید آزمایشی به همه نیست</strong>. دسترسی فعلاً با دعوت‌نامه انجام می‌شود.</p>

## ثبت‌نام دسترسی آزمایشی — مسیر رسمی مشترک

<p dir="rtl" lang="fa">برای دریافت کلید API، از <a href="https://taghvim.dev/#access">فرم رسمی دسترسی زودهنگام تقویم.dev</a> ثبت‌نام کنید. درخواست شما در فهرست واحد Early Access ثبت و ایمیل تأیید ارسال می‌شود. <strong>از ۷ روز پس از ثبت‌نام</strong>، در صورت آماده‌بودن سرویس و نبود انصراف یا مسدودسازی، دعوت‌نامهٔ اختصاصی ارسال می‌شود؛ پیوند آن <strong>۷۲ ساعت</strong> معتبر است. بعد از پذیرش دعوت‌نامه، Tenant مستقل و کلید آزمایشی ساخته می‌شود؛ <strong>دورهٔ آزمایشی کامل ۳۰روزه از لحظهٔ فعال‌سازی آغاز می‌شود</strong>، نه از تاریخ ثبت‌نام یا ارسال دعوت‌نامه. چرخش کلید، پایان این دوره را عقب نمی‌اندازد. نیازی به کارت بانکی نیست و دسترسی Production صادر نمی‌شود.</p>

<p dir="rtl" lang="fa">خبرهای محصول فقط با رضایت جداگانه و اختیاری ارسال می‌شوند. کلید API در ایمیل فرستاده نمی‌شود و فقط هنگام فعال‌سازی یک‌بار نمایش داده می‌شود. <a href="https://taghvim.dev/#privacy">حریم خصوصی</a> · <a href="https://taghvim.dev/#terms">شرایط</a> · <a href="https://api.taghvim.dev/developer">پذیرش دعوت‌نامه</a> · <a href="https://api.taghvim.dev/openapi.json">OpenAPI</a>. صدور دعوت‌نامه تابع آمادگی عملیاتی سرویس است؛ صرفِ ثبت درخواست کلید صادر نمی‌کند.</p>

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
