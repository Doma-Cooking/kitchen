# Hardcoding Audit — Findings Report

*Published: 2026-03-15*
*Audit scope: KIT-21 | Running findings: KIT-22–KIT-26 | This report: KIT-28*

*Source: [docs/platformization-findings.md](./platformization-findings.md)*
*Criteria: [docs/platformization-audit-scope.md](./platformization-audit-scope.md)*
*Target state: [docs/platformization-ideal-state.md](./platformization-ideal-state.md)*

---

## Summary

**6 findings across 5 scan areas.** 2 High, 3 Medium, 1 Low.

The audit revealed a clear split: the Kitchen *runtime* is well-architected for multi-tenancy (config-driven credential resolution, org-agnostic schema, parameterized infrastructure), but the Kitchen *repository* ships with Doma as the default tenant. A new org cloning Kitchen today gets Doma's identity baked into every agent prompt, Doma's agents as the only agent templates, Doma's engineering processes as the only domain plugin, and Doma-specific example files throughout.

The highest-priority work is untangling platform code from tenant content — the two are currently co-located in the same repo.

---

## Findings by Priority

### High

| ID | Location | Description | Effort |
|---|---|---|---|
| KIT-23-001 | `src/plugins/agents/agents/base.md:3` | `base.md` hardcodes Doma's company name and description in the base system prompt injected into every agent. Any org running Kitchen has its agents identify as Doma. | Small (hours) |
| KIT-23-002 | `src/plugins/agents/agents/toph.md`, `zuko.md`, `sokka.md` | Doma's three production agent files live in the Kitchen platform repo. A fresh clone ships with Doma's org structure. `TEMPLATE.md` is the correct platform artifact; the Doma files are tenant config. | Medium (days) |

### Medium

| ID | Location | Description | Effort |
|---|---|---|---|
| KIT-23-003 | `src/plugins/domains/engineering/` | Doma's full engineering domain plugin (7 SOPs, 3 skills, 6 templates) ships in Kitchen core. A new org either inherits Doma's process verbatim or overwrites the directory. | Medium (days) |
| KIT-22-001 | `.env.example` | All credential variable examples use the `TOPH_` prefix with no explanation. A new org copying the file would set variables with the wrong prefix — all credentials silently resolve as `undefined`. | Small (hours) |
| KIT-24-001 | `.kitchen.example.yaml` | The example config uses Doma's agent name, credential var names, prompt paths, plugin paths, and cron skills. A new org following it gets an immediate runtime failure and must identify and replace every Doma-specific value before anything works. | Small (hours) |

### Low

| ID | Location | Description | Effort |
|---|---|---|---|
| KIT-26-001 | `docker-compose.yml:33–35` | Postgres credentials are hardcoded as literals with no env var override path. Not Doma-specific, but no mechanism to override without editing the file. | Small (hours) |

---

## Total Effort Estimate

| Effort band | Count | Findings |
|---|---|---|
| Small (hours) | 4 | KIT-23-001, KIT-22-001, KIT-24-001, KIT-26-001 |
| Medium (days) | 2 | KIT-23-002, KIT-23-003 |

4 of 6 findings are small-effort fixes. The two medium-effort items (moving Doma's agents and domain plugin out of Kitchen core) are the structural changes that require the most coordination — they involve creating the Doma config repo and updating how Kitchen loads external content.

---

## What's Already Clean

The audit scope was comprehensive. These areas have no findings:

- **Config loading architecture** (`config.repository.ts`) — all credential env var names are configurable via `.kitchen.yaml`; no Doma-specific defaults in runtime source
- **Integration tools** (`src/plugins/shared/tools/`) — Slack, GitHub, Linear, Redis clients are fully org-agnostic
- **Database schema** — `agent_station` uses opaque identifiers; no seed data or org-specific values; Redis uses platform namespace
- **Dockerfile / entrypoint** — generic base image, parameterized env vars, no Doma-specific build steps
- **Shared plugins** (`src/plugins/shared/`) — all tools and skills are org-agnostic

---

## Notable Observations (Outside Audit Criteria)

**No CI/CD pipeline exists.** There is no `.github/workflows/` directory. Nothing Doma-specific to decouple, but a new org must build their full deploy pipeline from scratch with no reference implementation. This should be picked up in the Self-Serve Setup Experience project.

---

## Recommended Sequencing

The findings map naturally onto the remaining Hardcoding Audit projects:

### 1. Tenant Credential Isolation
*Fixes: KIT-23-001, KIT-22-001, KIT-24-001, KIT-26-001*

The small-effort fixes. Add `company.name` / `company.description` to the `.kitchen.yaml` schema and populate `base.md` from it (KIT-23-001). Replace Doma-specific prefixes and values in `.env.example` and `.kitchen.example.yaml` with generic placeholders (KIT-22-001, KIT-24-001). Add env var overrides for Postgres credentials in `docker-compose.yml` (KIT-26-001).

All four findings are in config, examples, or documentation — no runtime source changes required outside `base.md`.

**Recommended first.** These are the fastest wins, unblock external evaluation of Kitchen without coordination overhead, and directly inform what fields the config layer needs to expose.

### 2. Multi-tenant Config Layer
*Fixes: KIT-23-002, KIT-23-003*

The structural changes. Move `toph.md`, `zuko.md`, `sokka.md` out of the Kitchen repo into a Doma-owned config repository. Move `domains/engineering/` out as well. Kitchen ships with `TEMPLATE.md` only and an empty `domains/` directory. Requires:
- Creating the Doma config repo (or designating an existing one)
- Adding a `domainsPath` config key to `.kitchen.yaml` for external domain loading
- Updating Kitchen's plugin loader to source content from outside the repo

**Recommended second.** Depends on the credential isolation work (the `domainsPath` mechanism is a config layer addition). Medium effort but the highest structural impact — after this, a Kitchen clone has no Doma content by default.

---

## Sign-off

This report is the gate before starting the Tenant Credential Isolation project. Findings are documented; sequencing is recommended. Ready for review.
