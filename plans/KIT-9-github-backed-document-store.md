# One Pager: GitHub-backed document store (replace Notion)

## Context

**Ticket:** https://linear.app/doma-cooking/issue/KIT-9/tech-plan-github-backed-document-store-replace-notion

Notion's API is too unwieldy for AI agents — hierarchical block structure, pagination, and type-tagged content all add friction to basic read/write operations. Replacing it with a plain GitHub repository gives agents a simple file API and gives humans a clean Obsidian-compatible markdown vault.

## Approach

Four changes, all contained in the `kitchen` repo:

1. **`kitchen-github create-or-update-file`** — new subcommand in `src/plugins/shared/tools/github.ts` using the GitHub REST API (`repos.createOrUpdateFileContents`). Auto-fetches the file SHA if the file already exists so callers don't need to track it.

2. **`docs` config in `.kitchen.yaml`** — new top-level `docs` key (owner, repo, branch, optional path prefix). Parsed in `src/data/repository/config.repository.ts` and `src/domain/entity/kitchen-config.ts`.

3. **Base prompt injection** — when `docs` is configured, inject a "Document Store" section into the base prompt (same pattern as `repositories`). Agents learn the repo location and the write-doc skill name.

4. **`write-doc` skill** — new `src/plugins/shared/skills/write-doc/SKILL.md`. Workflow: derive a file path from the document title, call `create-or-update-file`, report the GitHub URL.

### Key Decisions

**`create-or-update-file` vs. git clone/push:** The GitHub contents API is stateless and works with a single authenticated call — no workspace, no lock, no rebase. Appropriate for docs (small files, low contention). Code changes still use git.

**Auto-fetch SHA:** `repos.createOrUpdateFileContents` requires the current SHA when updating an existing file. We auto-fetch it inside the command (`repos.getContent`) so callers don't need to manage it. If the file doesn't exist, SHA is omitted (create path).

**Top-level `docs` key vs. reusing `repositories`:** A dedicated key makes intent clear and lets us add doc-specific config (path prefix, default folder structure) without polluting the general repository list.

**Path prefix:** Optional `path` field (e.g., `agents/`) lets the docs repo serve multiple purposes (human notes alongside agent docs). Defaults to repo root.

## Implementation Steps

1. **`kitchen-github create-or-update-file` subcommand** — add to `src/plugins/shared/tools/github.ts`:
   - `--owner`, `--repo`, `--path`, `--message`, `--content` (raw string, not base64), `--branch` (optional, defaults to repo default)
   - Internally: try `getContent` to fetch SHA; then call `createOrUpdateFileContents` with base64-encoded content
   - Output: `Created/Updated: <html_url>`

2. **Update `kitchen-config.ts`** — add `DocsConfig` interface and `docs?: DocsConfig` to `KitchenConfig`

3. **Update `config.repository.ts`** — parse `docs` from YAML; inject "Document Store" section into base prompt if configured:
   ```
   ## Document Store
   Documents are stored in the GitHub repository <owner>/<repo> (branch: <branch>).
   Path prefix: <path or "repo root">. Use the write-doc skill to create or update documents.
   ```

4. **Update `.kitchen.example.yaml`** — add example `docs` section:
   ```yaml
   docs:
     owner: Doma-Cooking
     repo: doma-docs
     branch: main
     path: agents/
   ```

5. **`write-doc` skill** — create `src/plugins/shared/skills/write-doc/SKILL.md`:
   - Derive file path: slugify title + `.md`, prepend configured path prefix
   - Check for existing content with `kitchen-github get-file-contents` (to preserve or append)
   - Write with `kitchen-github create-or-update-file`
   - Confirm with the GitHub URL from the output

## Testing Strategy

- Run `kitchen-github create-or-update-file` manually against a test repo (create then update same path — confirm SHA auto-fetch works)
- Run `kitchen-typescript typecheck` — zero errors
- Read the compiled base prompt to confirm "Document Store" section appears when `docs` is configured

## Risks & Open Questions

- **Concurrency:** Two agents writing the same file simultaneously will conflict on SHA. Acceptable for now — docs are rarely contended. Can add optimistic locking later if needed.
- **Docs repo existence:** The docs repo must be created manually before use. Out of scope for this ticket.
- **`write-doc` skill placement:** Added to `shared` so all agents can use it. Domain-specific agents can override with their own skill if needed.
