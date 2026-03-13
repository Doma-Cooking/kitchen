# One Pager: GitHub-backed document store (replace Notion)

## Context

**Ticket:** https://linear.app/doma-cooking/issue/KIT-9/tech-plan-github-backed-document-store-replace-notion

Notion's API is too unwieldy for AI agents — hierarchical block structure, pagination, and type-tagged content all add friction to basic read/write operations. Replacing it with a plain GitHub repository gives agents a simple file API and gives humans a clean Obsidian-compatible markdown vault.

## Approach

Two changes, both in the `kitchen` repo:

1. **`docs` config in `.kitchen.yaml`** — new top-level `docs` key (owner, repo, branch). Parsed in `src/data/repository/config.repository.ts` and `src/domain/entity/kitchen-config.ts`.

2. **Base prompt injection** — when `docs` is configured, inject a "Document Store" section into the base prompt (same pattern as `repositories`). Agents learn the repo location and write to it via git on the main branch — no new tooling required.

### Key Decisions

**Git clone/push over GitHub contents API:** Agents already use git for code. Using the same mechanism for docs keeps the system uniform and requires zero new CLI tooling. Agents clone the docs repo, write markdown files, and push to the main branch directly.

**No path prefix:** The docs repo is dedicated to documentation. No need to segregate by prefix — repo root is the canonical location.

**No `write-doc` skill:** Agents can derive the workflow from the base prompt injection alone (clone → write → push to main). A dedicated skill adds no value over what agents already know how to do with git.

## Implementation Steps

1. **Update `kitchen-config.ts`** — add `DocsConfig` interface and `docs?: DocsConfig` to `KitchenConfig`:
   ```ts
   export interface DocsConfig {
     owner: string
     repo: string
     branch: string
   }
   ```

2. **Update `config.repository.ts`** — parse `docs` from YAML; inject "Document Store" section into base prompt if configured:
   ```
   ## Document Store
   Documents are stored in the GitHub repository <owner>/<repo>.
   Clone the repo, write markdown files, and push to the <branch> branch.
   ```

3. **Update `.kitchen.example.yaml`** — add example `docs` section:
   ```yaml
   docs:
     owner: Doma-Cooking
     repo: doma-docs
     branch: main
   ```

## Testing Strategy

- Run `kitchen-typescript typecheck` — zero errors
- Read the compiled base prompt with `docs` configured and confirm the "Document Store" section appears

## Risks & Open Questions

- **Docs repo existence:** The docs repo must be created manually before use. Out of scope for this ticket.
- **Concurrency:** Two agents pushing to the same branch simultaneously will hit merge conflicts. Acceptable for now — docs are rarely contended and agents can pull/rebase before pushing.
