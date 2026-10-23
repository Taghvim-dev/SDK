# Python SDK (preview)

Apache-2.0 Python client using standard-library HTTP calls; not published to PyPI. A separately issued test key is required.

```python
import os
from taghvim_sdk import TaghvimClient
client = TaghvimClient(api_key=os.environ["TAGHVIM_TEST_API_KEY"])
print(client.convert_date("1405-07-15"))
```

From this repository root run `PYTHONPATH=python python -m unittest discover -s python/tests -v`. Keep keys private and never treat demo responses as live API activation. [Release policy](../docs/RELEASE-POLICY.md).

The Python client identifies itself as `TaghvimSDK-Python/2.1.0` in `User-Agent`, rather than Python urllib's default. This supports observability and policy-based CDN access. API credentials remain in the Authorization header, never the URL or user agent. Real remote Sandbox acceptance must be proven before public integration is certified.
