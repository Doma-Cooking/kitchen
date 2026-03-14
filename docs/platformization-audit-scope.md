# KIT-21: Hardcoding Audit — Scope and Criteria

*Output of the scope definition phase for the Hardcoding Audit project. Defines what counts as a finding, how to classify it, and what "resolved" looks like in each category. All scan issues (KIT-22–KIT-26) operate against this criteria. Informed by [KIT-20: Ideal Platformized State](./platformization-ideal-state.md).*

---

## What counts as a finding

A finding is any place in the Kitchen codebase where:

1. **An org-specific value is hardcoded** — a Slack channel ID, GitHub org name, Linear workspace ID, Doma team name, or any other value that belongs to Doma and would need to change for a second org.
2. **Doma-specific logic lives in Kitchen core** — agent prompts, plugin code, or tool definitions that implement Doma workflows and don't belong in a generic platform.
3. **A second org would need to edit source to onboard** — any file outside of `.kitchen.yaml` and env vars that a new org would need to modify.
4. **An infrastructure assumption blocks multi-org deployment** — CI/CD, deployment scripts, or infra config that assumes Doma-specific resource names, secrets, or environments.

If a value is already sourced from `.kitchen.yaml` or env vars with no Doma-specific default hardcoded in source — it is **not a finding**.

---

## Scan categories

### 1. Env vars and config files
What to look for:
- Doma-specific values as default fallbacks in code (e.g. `process.env.SLACK_TOKEN ?? 'xoxb-doma-...'`)
- Required env var names that are hardcoded to Doma conventions and not configurable
- Config files outside `.kitchen.yaml` that contain org-specific values

Resolved state: All org-specific values sourced from `.kitchen.yaml` or env vars with no hardcoded defaults.

### 2. Agent definitions and prompts
What to look for:
- System prompt files that reference Doma by name, reference Doma's team members, or describe Doma-specific workflows
- Agent config (plugin paths, tool registrations) that hardcodes Doma-specific paths or identifiers
- Base prompt content that assumes Doma's org context

Resolved state: Agent prompts and configs are org-specific content that lives outside Kitchen core, loaded via configurable paths. Kitchen core ships with no agent prompts — those are tenant-provided.

### 3. Integrations and API clients
What to look for:
- Hardcoded Slack channel IDs, workspace IDs, or team identifiers
- Hardcoded GitHub org names, repo names, or installation IDs
- Hardcoded Linear workspace or team IDs
- Hardcoded webhook URLs or API endpoints specific to Doma's accounts

Resolved state: All integration identifiers sourced from `.kitchen.yaml` config or env vars. No Doma-specific values in source.

### 4. Database schema and seed data
What to look for:
- Column names or table structures that imply a single tenant (e.g. a `doma_` prefix)
- Seed data or fixtures that populate Doma-specific values
- Migration scripts that hardcode org-specific identifiers
- Schema assumptions that would conflict with a second org's deployment

Resolved state: Schema is fully org-agnostic. No org-specific values in migrations or seed data. Each deployment runs the same schema against its own database.

### 5. CI/CD and infrastructure config
What to look for:
- GitHub Actions workflow files that hardcode Doma's org name, repo names, or environment names
- Secret names in workflows that are Doma-specific and not documented as operator-configurable
- Deployment scripts that target Doma-specific infrastructure (hostnames, cloud project IDs, container registries)
- Infrastructure-as-code with Doma-specific resource names or labels

Resolved state: CI/CD and infra config is either fully parameterized (values injected via secrets/vars) or documented as the operator's responsibility to configure for their own deployment.

---

## Blast radius classification

Use these definitions consistently across all scan issues.

| Severity | Definition | Examples |
|---|---|---|
| **High** | Blocks a second org from deploying Kitchen or running any agents | Hardcoded Doma Slack token in source; deploy script that targets Doma-only infra; schema that fails migration for a fresh DB |
| **Medium** | Second org can deploy but requires a manual workaround or undocumented step | Base prompt that mentions Doma by name; env var with no documentation; config value with a Doma-specific default |
| **Low** | Cosmetic coupling; no functional impact on a second org's deployment | Comments referencing Doma; non-functional log strings; test fixtures with Doma-specific names |

When in doubt between two severities, assign the higher one. It's easier to downgrade during the findings review than to miss a blocker.

---

## Findings format

Each finding documented in the running findings doc (KIT-27) should include:

```
**Location:** <file path and line number or section>
**Category:** <env-config | agent-prompts | integrations | schema | cicd>
**Description:** <one sentence: what the hardcoding is and where>
**Severity:** <High | Medium | Low>
**Decoupling effort:** <Small (hours) | Medium (days) | Large (week+)>
**Resolved state:** <one sentence: what it looks like when fixed>
```

---

## Out of scope

The following are explicitly **not** in scope for this audit:

- Fixing any findings — the audit produces an inventory, not a fix
- Evaluating whether Kitchen's overall architecture is correct — that's settled in KIT-20
- Scanning third-party dependencies or vendored code
- Anything outside the `kitchen` repository (Doma app, landing page, etc.)
