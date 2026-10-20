# Cohesive API + SDK release policy

**Current state: preview; publishing an installable package, opening self-service accounts or declaring GA is not authorized by this document.**

1. Engine's versioned OpenAPI schema is authoritative. Export the exact approved SHA and customer-visible operations to `contracts/operation-index.json`; admin and payment callbacks never enter the SDK registry.
2. Run language-specific tests, Unicode/RTL public-copy checks, license/NOTICE scanning, and deterministic generation tests.
3. Compare the candidate with the **deployed** API contract and execute scoped test-key, tenant isolation, error, quota, retry and idempotency integration scenarios.
4. Update public quickstarts and sister `cookbooks` examples in the **same release bundle**. Record all Git SHAs, exact manifest hashes, CI results and required migrations in a durable evidence registry.
5. Publish a tagged, independently installable package only after explicit owner authorization and a verifiable rollback and support policy.

## Optional OpenAPI code generators

Any code generator is an adapter, not the owner of the canonical contract. Generated SDKs must pass the same operation-coverage and runtime-behavior tests as handwritten SDKs. No unstable upstream generator is a release-critical dependency until deterministic output and version pinning are verified.

## Data governance

Never commit API keys, private tenant records, payment secrets or user-submitted data. The source license does not grant rights to product names or trademarks.
