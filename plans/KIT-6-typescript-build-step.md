# One Pager: TypeScript Build Step (tsc)

## Context

**Ticket:** https://linear.app/doma-cooking/issue/KIT-6/tech-plan-add-typescript-build-step-esbuild

The kitchen service currently runs all TypeScript via `npx tsx` JIT compilation. Every process invocation — the main server and each of the six CLI tool binaries — recompiles TypeScript at startup. This adds latency to every CLI call and provides no compile-time safety guarantee at deploy time. The goal is to pre-compile all TypeScript to JavaScript in `dist/` before execution.

## Approach

Use **`tsc`** to emit compiled JavaScript to `dist/`. This requires two source-level changes first: removing `allowImportingTsExtensions` (so tsc can emit) and renaming all relative import paths from `.ts` → `.js` (the canonical ESM convention TypeScript expects). Once those are in place, the build is just `tsc` — no custom compiler, no post-processing.

**Removing `allowImportingTsExtensions`:**
The flag was added to allow writing `import { Foo } from './foo.ts'`. TypeScript's canonical ESM approach is to write `import { Foo } from './foo.js'` — the compiler resolves `.js` → `.ts` at compile time and emits the `.js` file. Removing the flag unlocks `tsc` emit and aligns the codebase with standard TypeScript conventions.

**Why `tsc` over esbuild:**
tsc is already the type checker; using it for emit keeps the toolchain minimal. Per-file output (one `.js` per `.ts`) preserves the directory layout naturally — no bundling configuration needed, and `import.meta.dirname` in `migrator.ts` continues to resolve correctly without any special handling.

**Shebang handling:**
Update the 6 CLI source files to `#!/usr/bin/env node` before building. tsc preserves shebangs in output, so no post-processing needed.

**SQL migration copy:**
tsc does not copy non-`.ts` assets. A minimal `scripts/copy-migrations.mjs` (~6 lines) copies `src/data/migration/migrations/*.sql` → `dist/data/migration/migrations/` as a `postbuild` npm hook.

**Local dev is unchanged:**
`npm run dev` continues to use `tsx src/index.ts`. The build step is only required for Docker/production.

### Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Compiler | `tsc` | Canonical — already the type checker; per-file output preserves layout |
| Import extension convention | `.js` in source | Required by tsc emit; standard TypeScript ESM practice |
| Shebang | Update in source files | tsc preserves shebangs; no post-processing needed |
| SQL asset copy | `postbuild` npm script + minimal helper | tsc doesn't copy non-TS files; 6-line script is the minimal fix |

## Implementation Steps

1. **Update `tsconfig.json`**:
   - Remove `allowImportingTsExtensions: true`
   - Remove `noEmit: true` (tsc now emits to `outDir: dist`)

2. **Rename all `.ts` import paths to `.js`** across the codebase (~32 files):
   - All relative `from './foo.ts'` → `from './foo.js'`
   - Covers `import`, `export`, and type-only import statements

3. **Update shebangs in all 6 CLI source files**:
   - `#!/usr/bin/env npx tsx` → `#!/usr/bin/env node`
   - Files: `github.ts`, `linear.ts`, `slack.ts`, `notion.ts`, `kitchen.ts`, `typescript.ts`

4. **Write `scripts/copy-migrations.mjs`** — copies `src/data/migration/migrations/` → `dist/data/migration/migrations/` (no-op if directory doesn't exist)

5. **Update `package.json`**:
   - `"build"`: `"tsc"`
   - `"postbuild"`: `"node scripts/copy-migrations.mjs"`
   - Add `"typecheck"`: `"tsc --noEmit"`
   - All 6 `bin` entries: `src/…/*.ts` → `dist/…/*.js`

6. **Update `Dockerfile`**:
   - Add `COPY scripts/ ./scripts/` and `COPY tsconfig.json ./` before the build step
   - Add `RUN npm run build` after `COPY src/`
   - Change `CMD` from `["npx", "tsx", "src/index.ts"]` → `["node", "dist/index.js"]`

7. **Update `agent-config.ts`** (credential helper, L49–52):
   - Path: `src/plugins/shared/scripts/git-credential-github-app.ts` → `dist/plugins/shared/scripts/git-credential-github-app.js`
   - Runtime: `tsx` → `node` (drop the `tsxPath` variable)

8. **Remove `*-cli` SKILL.md files** — replace with `--help` + compact tool index:
   - Delete: `src/plugins/shared/skills/{kitchen,linear,notion,slack,github}-cli/`
   - Delete: `src/plugins/domains/engineering/skills/typescript-cli/`
   - Migrate any non-CLI operating notes from skill files into `zuko.md` before deleting (e.g. `slack-cli/SKILL.md` contains Slack-specific formatting rules — `*bold*` not `**bold**`, no tables, @mention for responses — that belong in the agent prompt)
   - Add CLI tool index table to `src/plugins/agents/agents/zuko.md` (binary name + one-liner + `--help` reference)

## Testing Strategy

- `npm run typecheck` — zero errors (uses `tsc --noEmit` explicitly, ignoring tsconfig `noEmit`)
- `npm run build` — tsc emits to `dist/`; postbuild copies SQL migrations
- Shebang check: `head -1 dist/plugins/shared/tools/github.js` → `#!/usr/bin/env node`
- CLI smoke test: `node dist/plugins/shared/tools/github.js list-pull-requests --owner Doma-Cooking --repo kitchen` — returns PR list
- Server: `node dist/index.js` starts successfully (requires Postgres + Redis env)
- Docker: `docker build` completes; container starts and responds to health check
- Credential helper: agent subprocess can `git push` using the compiled helper

## Risks & Open Questions

| Risk | Mitigation |
|---|---|
| Import rename scope | 32 files, all relative imports use `.ts` (verified). A single-pass sed or IDE rename handles this reliably. |
| `tsc` strict mode surfaces new errors after removing `allowImportingTsExtensions` | Run `tsc --noEmit` immediately after tsconfig change to catch any new errors before proceeding. |
| SQL migrations not found at runtime | `postbuild` script copies `.sql` files; directory structure mirrors `src/`. Graceful no-op if no migrations exist. |
| `dist/` checked into git accidentally | Verify `dist/` is in `.gitignore`. |
| Plugin markdown assets needed at runtime | `COPY src/ ./src/` in Dockerfile is retained — markdown files remain accessible via `CLAUDE_PLUGIN_ROOT`. |
