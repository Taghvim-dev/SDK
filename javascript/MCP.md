# Taghvim MCP — canonical API bridge (2026-07-28)

Node.js stdio MCP adapter. DEVELOPMENT CANDIDATE; not a GA or on-prem certification.
Every operation uses the same TaghvimClient and upstream canonical API Gateway, not direct D1, payment, Cloudflare credentials or admin bypass.

## Run
From the javascript package on Node 22+:

    TAGHVIM_API_KEY=<issued-tgv_test_key> node bin/taghvim-mcp.mjs

Supply keys using the MCP host's secure environment store, never in prompts, tool arguments, URLs or GitHub files.
Default is READ ONLY. For canonical nonpayment Workspace/calendar writes:

    TAGHVIM_MCP_ALLOW_MUTATIONS=true TAGHVIM_API_KEY=<issued-key> node bin/taghvim-mcp.mjs

Every write requires a caller-provided idempotencyKey; the actual API enforces RBAC, Workspace, metering, quotas and WORM history.
Payments, callbacks, admin/key creation and unregistered features are not exposed.

Supported JSON-RPC stdio methods: server/discover, tools/list, tools/call. Version: 2026-07-28 only.
Each request must include params._meta['io.modelcontextprotocol/protocolVersion'] = '2026-07-28'.
Tool names derive only from contracts/operation-index.json. Path parameter names and values are validated, never used as arbitrary URLs.
The adapter redacts upstream errors and never writes secrets to stdout.

## GA boundary
This source adapter is NOT a proof of real client interoperability, cross-tenant isolation, or runtime GA.
Before changing platform profiles to runtime_verified, require exact-SHA tested integration with real MCP clients,
protected same-run signed evidence and all 42 constitutional nonpayment GA receipts.
