# Taghvim.dev — T0 development and agent admission

Scope: only Taghvim-dev/{engine,landing,.github,SDK,CLI,cookbooks}.
This file applies to Codex, ActionBot, developers and automated coding agents.

- Never push a branch, create a ready-for-review PR, merge, or deploy to discover a locally predictable failure. Run npm run t0:preflight after installing pinned dependencies and before each push. npm install installs the repository tracked pre-push hook in local clones; GitHub API pushes must perform the equivalent preflight explicitly because Git hooks do not run for API writes.
- Begin every PR as Draft; only mark Ready after all local T0 preflight checks are green, immutable source/contract changes and dependency impact are reconciled and no current-main run/lease is racing. CI remains required for the exact final reviewed SHA.
- Every new commit invalidates previous CI evidence. Never use historical failed runs as current GA blockers, but do not silence actual present-head failures. Deduplicate in the existing six-repository canonical incident controller.
- Enforce Constitution/Contract, identity, policy, explicit Workspace grant, metering reservation, SHA-bound evidence and deny-before-effect at T=0. No automatic cross-tenant grants, live customer checkout, secret exposure, legacy divergent release controller, unapproved Cloudflare write or false GA label.
- Reconcile all six main SHAs and all three central source release ledgers as one gated cohort, not multiple independent source patches. For source changes in Engine/Landing/SDK/CLI/Cookbooks, preserve current production receipts and use the existing owner-approved protected promotion.
