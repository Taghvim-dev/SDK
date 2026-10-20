# JavaScript / TypeScript SDK (preview)

Apache-2.0 source, not yet an npm release. Requires Node >=20 or another environment with `fetch`.

```js
import {createTestClient} from "./index.js";
const client = createTestClient({apiKey: process.env.TAGHVIM_TEST_API_KEY});
const {data,requestId,rateLimit} = await client.convertDate({date:"1405-07-15"});
console.log({data,requestId,rateLimit});
```

Run `node --test javascript/test/*.test.mjs` from repository root. Test mode refuses live keys. Pass server-held secrets only; do not embed keys in public frontends. State-changing requests do not automatically retry; supply a documented idempotency key where supported.

See [operation index](../contracts/operation-index.json), [cookbooks](https://github.com/Taghvim-dev/cookbooks) and [release policy](../docs/RELEASE-POLICY.md).
