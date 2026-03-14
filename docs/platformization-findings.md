# Hardcoding Audit — Running Findings

*Maintained incrementally across KIT-22–KIT-26. Each scan appends its findings here. Final synthesis in KIT-28.*

*Criteria reference: [docs/platformization-audit-scope.md](./platformization-audit-scope.md)*
*Target state reference: [docs/platformization-ideal-state.md](./platformization-ideal-state.md)*

---

## KIT-22: Env Vars and Config Files

*Scan coverage: `src/data/repository/config.repository.ts`, `.env.example`, `.kitchen.example.yaml`, `docker-compose.yml`, `tsconfig.json`, `package.json`, `src/plugins/domains/*/mcp.json`*

### Summary

The config loading architecture (`config.repository.ts`) is well-designed — all credential resolution uses configurable env var names with no Doma-specific values hardcoded in source. One finding, in an example/documentation file rather than runtime code.

**Findings: 1**

---

### KIT-22-001

**Location:** `.env.example` — lines 11–20 (all `TOPH_*` variable names)
**Category:** env-config
**Description:** The `.env.example` file is the primary reference for what environment variables to set. It exclusively uses Doma's agent name `toph` as the variable prefix: `TOPH_SLACK_APP_TOKEN`, `TOPH_SLACK_BOT_TOKEN`, `TOPH_SLACK_USER_TOKEN`, `TOPH_GITHUB_TOKEN`, `TOPH_GITHUB_APP_ID`, `TOPH_GITHUB_PRIVATE_KEY`, `TOPH_GITHUB_INSTALLATION_ID`, `TOPH_LINEAR_CLIENT_ID`, `TOPH_LINEAR_CLIENT_SECRET`. The file contains no comment indicating that `TOPH` is an example agent name that should be replaced. A new org copying this file as-is would set variables with the wrong prefix, causing all agent credentials to silently resolve as `undefined` and no agents to connect to any integrations.
**Severity:** Medium
**Decoupling effort:** Small (hours)
**Resolved state:** `.env.example` uses a generic placeholder prefix (e.g. `MY_AGENT_*`) with an inline comment explaining the naming convention (`# Replace MY_AGENT with your agent's name in uppercase, matching the key in .kitchen.yaml`). No Doma agent names appear in the file.

---

*No further findings in this scan area. The config loading logic in `config.repository.ts` correctly treats all credential env var names as configurable via `.kitchen.yaml` (`appTokenEnv`, `tokenEnv`, `clientIdEnv`, etc.) with the `{AGENT_PREFIX}_{SERVICE}_{KEY}` convention as a safe fallback — no Doma-specific values are hardcoded in runtime source code.*

---

## KIT-23: Agent Definitions and Prompts

*Scan coverage: `src/plugins/agents/agents/base.md`, `src/plugins/agents/agents/toph.md`, `src/plugins/agents/agents/zuko.md`, `src/plugins/agents/agents/sokka.md`, `src/plugins/agents/agents/TEMPLATE.md`, `src/plugins/domains/engineering/` (full directory), `src/plugins/shared/` (full directory)*

### Summary

The highest-severity scan area. The core platform prompt infrastructure (`base.md`) hardcodes Doma's company identity, and three of Doma's agent definitions along with an entire domain plugin live directly in the Kitchen platform repo. These are tenant artifacts — content that belongs to a specific organization's configuration — not platform artifacts. A second org deploying Kitchen inherits Doma's identity, agents, and engineering processes by default.

**Findings: 3**

---

### KIT-23-001

**Location:** `src/plugins/agents/agents/base.md:3`
**Category:** agent-prompts
**Description:** The base prompt injected into every agent contains the literal string: `You are an AI agent at **Doma**, a food company reimagining home cooking.` This is the first substantive line of every agent's system prompt. Any organization running Kitchen — regardless of their own name, industry, or mission — has their agents identify as working for Doma. There is no config key, env var, or template variable to override this. The only fix today is editing source.
**Severity:** High
**Decoupling effort:** Small (hours)
**Resolved state:** `base.md` contains a template variable for company identity (e.g. `You are an AI agent at **{{company.name}}**, {{company.description}}.`), populated at runtime from a required top-level field in `.kitchen.yaml` (e.g. `company.name`, `company.description`). Kitchen startup fails fast with a clear error if the field is absent.

---

### KIT-23-002

**Location:** `src/plugins/agents/agents/toph.md`, `src/plugins/agents/agents/zuko.md`, `src/plugins/agents/agents/sokka.md`
**Category:** agent-prompts
**Description:** Doma's three production agent prompt files live in the Kitchen platform repository. These define Doma's org structure (Head of Operations, CTO, Head of Product), Doma's team communication style, Doma's tool usage patterns, and Doma's internal responsibilities. A fresh `git clone` of Kitchen ships with Doma's agents. `TEMPLATE.md` is already present in the same directory and represents the correct platform artifact. The Doma agent files are tenant config masquerading as platform code.
**Severity:** High
**Decoupling effort:** Medium (days)
**Resolved state:** `toph.md`, `zuko.md`, `sokka.md` are removed from the Kitchen repo. The Kitchen repo ships only `TEMPLATE.md` as the agent authoring reference. Doma maintains its agent definitions in a Doma-owned config repository, loaded into a running Kitchen instance via a config path in `.kitchen.yaml`. Other orgs do the same with their own agents.

---

### KIT-23-003

**Location:** `src/plugins/domains/engineering/` — full directory (7 SOPs, 3 skills, 6 templates)
**Category:** agent-prompts
**Description:** Doma's entire engineering domain plugin ships inside Kitchen core. This includes Doma's sprint SOPs, incident response process, code review guidelines, PR templates, and engineering skills. A new org using Kitchen must either adopt Doma's engineering practices verbatim or overwrite the entire `domains/engineering/` directory. The `domains/` directory has no mechanism to load content from outside the Kitchen repo — everything in it is treated as platform-level.
**Severity:** Medium
**Decoupling effort:** Medium (days)
**Resolved state:** `domains/engineering/` is removed from the Kitchen repo (or moved to a Doma config repo). The `domains/` directory in Kitchen ships empty (or with a `README.md` explaining the authoring convention). Kitchen supports loading domain plugins from a configurable external path (e.g. `domainsPath` in `.kitchen.yaml`), so each org can point to their own domain definitions.

---

*Clean: `src/plugins/shared/` tools and skills are fully org-agnostic — no Doma-specific references in any shared plugin file.*

---

## KIT-24: Integrations and API Clients

*Scan coverage: `src/plugins/shared/tools/slack.ts`, `src/plugins/shared/tools/github.ts`, `src/plugins/shared/tools/linear.ts`, `src/plugins/shared/tools/kitchen.ts`, `src/presentation/routes/slack.routes.ts`, `src/data/repository/event.repository.ts`, `src/presentation/routes/scheduler.routes.ts`, `src/data/source/claude.source.ts`, `.kitchen.example.yaml`*

### Summary

The integration tools are well-positioned for multi-tenancy. Slack, GitHub, Linear, and Redis credentials are all resolved from environment variables at runtime with no Doma-specific values hardcoded in source. One Medium finding in the example configuration file.

**Findings: 1**

---

### KIT-24-001

**Location:** `.kitchen.example.yaml` — `agents` section (entire block)
**Category:** integrations
**Description:** The example configuration uses Doma's agent `toph` as the sole agent entry, with Doma-specific credential env var names (`TOPH_SLACK_APP_TOKEN`, `TOPH_GITHUB_TOKEN`, `TOPH_LINEAR_CLIENT_ID`, etc.), Doma-specific prompt paths (`agents/agents/toph.md`, `agents/agents/base.md`), Doma-specific plugin paths (`domains/operations`), Doma-specific cron skill names (`daily-standup`, `weekly-digest`), and `defaultAgent: toph`. A new org following this example would encounter an immediate runtime failure (`defaultAgent: toph` with no toph config) and would need to identify and replace all Doma-specific values before getting a working deployment.
**Severity:** Medium
**Decoupling effort:** Small (hours)
**Resolved state:** Example YAML uses generic placeholder names throughout — e.g. `defaultAgent: my-agent`, `team: my-agent:`, `MY_AGENT_SLACK_BOT_TOKEN`, `agents/agents/my-agent.md`, `domains/my-domain` — with comments indicating what each value represents. No Doma agent names, prompt paths, plugin paths, or skill names appear in the example.

---

*No further findings in this scan area. All credential resolution (Slack tokens, GitHub tokens, Linear OAuth, Redis URL) is sourced from env vars or `.kitchen.yaml` config with no Doma-specific defaults in source code.*

---

## KIT-25: Database Schema and Seed Data

*Scan coverage: `src/data/migration/migrations/001_create_agent_station.sql`, `src/data/migration/migrator.ts`, `src/data/repository/station.repository.ts`, `src/domain/entity/lock-key.ts`, `src/data/source/redis-lock.source.ts` — full search for `.sql`, `seed*`, and `fixture*` files across the repository*

### Summary

The database schema is clean for multi-tenancy. The single schema migration creates two tables (`schema_migrations` and `agent_station`) with fully opaque, parameterized identifiers and no org-specific values. No seed data or fixture files exist anywhere in the repository. Redis key namespacing uses a platform prefix (`kitchen:lock:station:`), not a Doma-specific one. This is the cleanest scan area in the audit.

**Findings: 0**

---

### Why the schema is already well-positioned

`agent_station` stores `station_id` (TEXT, primary key) and `session_id` (TEXT). Both are opaque runtime values derived from agent configuration — `station_id` defaults to the agent's ID from `.kitchen.yaml`, and `session_id` is the Claude Code session identifier. Neither column assumes a specific org. Each Kitchen deployment runs against its own isolated database instance, so station IDs from different orgs never conflict.

The `schema_migrations` tracking table is a standard migration control structure with no org-specific fields.

Redis lock keys use the prefix `kitchen:lock:station:{stationId}` — `kitchen:` is the platform namespace, not a Doma identifier.

All SQL queries in `station.repository.ts` use parameterized values (`$1`, `$2`) with no hardcoded identifiers. No INSERT statements populate org-specific data.

*No further findings. No seed scripts, fixture files, or hardcoded data initialization exist in the repository.*

---

## KIT-26: CI/CD and Infrastructure Config

*Scan coverage: `.github/` (absent), `Dockerfile`, `entrypoint.sh`, `docker-compose.yml`, `scripts/copy-assets.mjs`, `package.json`*

### Summary

No GitHub Actions workflows exist in the repository — there is no `.github/` directory. No deployment scripts target Doma-specific infrastructure. No IaC files (Terraform, Helm, etc.) are present. The infrastructure files that do exist are generic and well-parameterized. One Low finding in `docker-compose.yml`.

**Notable observation (not a finding per audit criteria):** Kitchen has no automated CI/CD pipeline. No build, test, or deploy workflows exist. This means there are no Doma-specific pipeline assumptions to decouple — but it also means a new org onboarding Kitchen must build their own pipeline from scratch with no reference implementation. This gap should be addressed in the Self-Serve Setup Experience project.

**Findings: 1**

---

### KIT-26-001

**Location:** `docker-compose.yml:33–35` — `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
**Category:** cicd
**Description:** The `docker-compose.yml` hardcodes Postgres credentials as `kitchen`/`kitchen` (user/password) with database name `kitchen`. These values are not Doma-specific (they use the platform name), but they are committed to source as literals with no env var override path. The `.kitchen.example.yaml` postgres URL also hardcodes these same values (`postgres://kitchen:kitchen@postgres:5432/kitchen`). A new org following the provided setup would use these credentials in their local dev environment, which is fine — but there is no clear signal that these must be changed for any non-local deployment, and no mechanism to override them without editing the file.
**Severity:** Low
**Decoupling effort:** Small (hours)
**Resolved state:** Postgres credentials in `docker-compose.yml` are sourced from env vars with documented defaults (e.g. `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-kitchen}`), and the `.kitchen.example.yaml` postgres URL uses a placeholder that makes clear the values should be set by the operator.

---

*No further findings in this scan area. `Dockerfile` is generic (no registry URLs, no Doma-specific base images, no hardcoded secrets). `entrypoint.sh` uses only parameterized env vars. `scripts/copy-assets.mjs` is a pure build utility with no org-specific references.*
