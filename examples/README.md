# Examples

JavaScript and Python references use separately issued test credentials; no executable example creates an account, starts a paid checkout or exposes a live token.

- [JavaScript conversion](javascript/convert-date.mjs)
- [JavaScript client wrapper](javascript/client.mjs)
- [Python conversion](python/convert_date.py)

Examples are checked statically in CI, with SDK authentication behavior checked using mocked requests. To run against a real test tenant, first receive an authorized `TAGHVIM_TEST_API_KEY`.
