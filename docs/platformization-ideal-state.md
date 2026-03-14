# KIT-20: Ideal Platformized State

*Output of the ideation phase for the Kitchen Platformization initiative. This document defines the target architecture that all subsequent audit, scoping, and build work should navigate toward.*

---

## What does a Kitchen instance look like for a new company?

**One Kitchen deployment per organization.** Not a shared multi-tenant platform.

Each company runs their own Kitchen process, pointing at their own `.kitchen.yaml`, their own database, and their own credentials. There is no shared infrastructure between orgs.

This is the right model because:
- Credential isolation is automatic — each deployment owns its own Slack tokens, GitHub credentials, Linear keys. No cross-tenant credential access is possible by design.
- No database schema changes needed — the current schema is already correct for single-tenancy; we just need to make it easy to spin up a fresh instance.
- Simple to reason about — a company's Kitchen is a self-contained process. Debugging, upgrading, and operating it doesn't require understanding another company's setup.
- Consistent with the current design — Kitchen already works this way for Doma. Platformization means making this setup repeatable, not redesigning the deployment model.

The output of platformization is a Kitchen distribution that any company can deploy against their own infrastructure, configure with their own `.kitchen.yaml`, and run without touching Kitchen core.

---

## Canonical patterns we're moving toward

**Config-over-code.** Everything org-specific belongs in `.kitchen.yaml` and environment variables — never in source files. Kitchen core should be fully agnostic to the values it processes. If a new org can't configure something without editing source code, that's a platformization gap.

**Platform code separated from tenant code.** Kitchen core (the platform) and Doma's agents, prompts, and plugins (the tenant configuration) should be clearly separated. Today they may be entangled. The target is: Kitchen ships as a platform artifact; Doma's agent configs live in a separate repository or directory that Kitchen is pointed at via config.

**Credential isolation by deployment.** All credentials are owned by the deployment, resolved from environment variables at startup, and never stored in source or shared between deployments. The existing per-agent env var convention (`{AGENT_PREFIX}_SLACK_BOT_TOKEN`, etc.) is correct and should be the standard.

**Org-agnostic schema.** The database schema should make no assumptions about the org running on it. Station IDs are already opaque strings — this is correct. No org names, team IDs, or Doma-specific values should appear in schema or seed data.

**Onboarding by configuration.** A new org should be able to go from zero to a running agent by: (1) deploying the Kitchen container, (2) writing a `.kitchen.yaml` describing their agents, (3) setting the required env vars. No code changes, no forking, no bespoke setup steps.

---

## Anti-patterns we're eliminating

**Hardcoded org identifiers in source.** Any Slack channel IDs, GitHub org names, Linear workspace IDs, or Doma team references baked directly into Kitchen's TypeScript, SQL, or config files. These should always come from `.kitchen.yaml` or env vars.

**Doma agent logic in Kitchen core.** Agent prompts, plugin code, or tool definitions that are specific to Doma's workflows should not live inside the Kitchen platform repository. Platform code is generic; agent code is tenant-specific.

**Setup steps that require editing Kitchen source.** If onboarding a new org requires a developer to modify files in the kitchen repo (beyond `.kitchen.yaml` and env vars), that's a hard dependency on Doma's engineering team and a blocker for self-service adoption.

**CI/CD that assumes Doma infrastructure.** Deployment scripts, GitHub Actions workflows, and infrastructure definitions that hardcode Doma-specific environment names, secret names, or deployment targets. These should be parameterized or documented as the operator's responsibility.

**Single-instance assumptions in infra.** Any infrastructure code that assumes only one Kitchen deployment will ever run (e.g., globally unique resource names, single-org secret stores) needs to be generalized.

---

## Audit implications

When scanning the codebase, assess each finding against these questions:

1. **Is this value org-specific?** If yes, it should come from config or env — not be hardcoded.
2. **Is this code platform or tenant?** If it's Doma-specific logic, it shouldn't be in Kitchen core.
3. **Would a second org need to change this to onboard?** If yes, it's a platformization gap regardless of how it's currently stored.
4. **Does this assume a single deployment?** If yes, it needs to be generalized or documented as operator-owned.

Blast radius classification:
- **High**: Blocks a second org from deploying or running agents at all
- **Medium**: Requires workaround or manual step during onboarding, but doesn't block deployment
- **Low**: Cosmetic or minor coupling that doesn't affect correctness
