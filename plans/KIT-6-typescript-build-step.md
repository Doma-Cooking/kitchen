# One Pager: TypeScript Build Step (esbuild)

## Context

**Ticket:** https://linear.app/doma-cooking/issue/KIT-6/tech-plan-add-typescript-build-step-esbuild

The kitchen service currently runs all TypeScript via `npx tsx` JIT compilation. Every process invocation — the main server and each of the six CLI tool binaries — recompiles TypeScript at startup. This adds latency to every CLI call and provides no compile-time safety guarantee at deploy time. The goal is to pre-compile all TypeScript to JavaScript in `dist/` before execution.

## Approach

Add an **esbuild** build step via `scripts/build.mjs` that compiles all `.ts` files under `src/` to `dist/` in per-file mode (no bundling). Update `package.json`, `Dockerfile`, and two runtime paths to consume the compiled output.

**Why esbuild instead of tsc emit:**
`tsconfig.json` has `allowImportingTsExtensions: true`, which prevents `tsc` from emitting. All imports use `.ts` extensions (`import { Foo } from './foo.ts'`). esbuild resolves `.ts` imports natively. A post-build rewrite step converts `.ts` → `.js` in all emitted import paths so Node.js ESM resolution works correctly.

**Why `bundle: false`:**
Per-file transform preserves the directory layout, so `import.meta.dirname` in `migrator.ts` continues to resolve to the correct directory (`dist/data/migration/`). Bundling would collapse the file layout and break this.

**Type checking is unchanged:**
`tsc --noEmit` continues as the type checker. esbuild only handles emit. A dedicated `typecheck` script is added to `package.json` for clarity.

**Local dev is unchanged:**
`npm run dev` continues to use `tsx src/index.ts`. The build step is only required for Docker/production.

### Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Compiler | esbuild | tsc cannot emit with `allowImportingTsExtensions: true` |
| Bundle mode | `bundle: false` | Preserves layout; keeps `import.meta.dirname` correct |
| Import rewriting | Post-process regex | esbuild preserves `.ts` paths verbatim in non-bundle mode |
| Shebang injection | Post-process | esbuild preserves original shebang; replace with `#!/usr/bin/env node` |
| Build script format | `scripts/build.mjs` | esbuild CLI glob support is shell-dependent; JS API is reliable |

## Implementation Steps

1. **Install esbuild** — `npm install --save-dev esbuild`

2. **Write `scripts/build.mjs`** — Node.js script using the esbuild JS API:
   - Collect all `.ts` files under `src/` recursively
   - Run `esbuild.build({ bundle: false, platform: 'node', format: 'esm', target: 'node22' })`
   - Post-process all `.js` output files: rewrite `from '…/foo.ts'` → `from '…/foo.js'` (covers `import`, `export`, and type-only import statements)
   - Inject `#!/usr/bin/env node` shebang into the 6 CLI binary outputs (stripping any existing shebang first)
   - Copy `src/data/migration/migrations/*.sql` → `dist/data/migration/migrations/` if any exist

3. **Update `package.json`**:
   - `"build"`: `"tsc"` → `"node scripts/build.mjs"`
   - Add `"typecheck"`: `"tsc --noEmit"`
   - All 6 `bin` entries: `src/…/*.ts` → `dist/…/*.js`

4. **Update `Dockerfile`**:
   - Add `COPY scripts/ ./scripts/` and `COPY tsconfig.json ./` before the build step
   - Add `RUN npm run build` after `COPY src/`
   - Change `CMD` from `["npx", "tsx", "src/index.ts"]` → `["node", "dist/index.js"]`

5. **Update `agent-config.ts`** (credential helper, L49–52):
   - Path: `src/plugins/shared/scripts/git-credential-github-app.ts` → `dist/plugins/shared/scripts/git-credential-github-app.js`
   - Runtime: `tsx` → `node` (drop the `tsxPath` variable)

6. **Remove `*-cli` SKILL.md files** — replace with `--help` + compact tool index:
   - Delete: `src/plugins/shared/skills/{kitchen,linear,notion,slack}-cli/`
   - Delete: `src/plugins/domains/engineering/skills/{github,typescript}-cli/`
   - Add CLI tool index table to `src/plugins/agents/agents/zuko.md` (binary name + one-liner + `--help` reference)

## Testing Strategy

- `npm run typecheck` — zero errors
- `npm run build` — completes without errors; `dist/` populated with 32 files
- Shebang check: `head -1 dist/plugins/shared/tools/github.js` → `#!/usr/bin/env node`
- Import check: `grep -r "from '.*\.ts'" dist/` → zero matches
- CLI smoke test: `node dist/plugins/shared/tools/github.js list-pull-requests --owner Doma-Cooking --repo kitchen` — returns PR list
- Server: `node dist/index.js` starts successfully (requires Postgres + Redis env)
- Docker: `docker build` completes; container starts and responds to health check
- Credential helper: agent subprocess can `git push` using the compiled helper

## Risks & Open Questions

| Risk | Mitigation |
|---|---|
| `.ts` import rewrite misses edge cases (dynamic imports, re-exports) | The regex `\bfrom\s+(['"])([^'"]+)\.ts\1` covers `import`, `export`, and type-only imports. Dynamic `import()` calls don't use `.ts` extensions in this codebase (verified). |
| SQL migrations not found at runtime | Build script copies `.sql` files; directory structure mirrors `src/`. Graceful no-op if no migrations exist yet. |
| `dist/` checked into git accidentally | Add `dist/` to `.gitignore` if not already present. |
| Plugin markdown assets needed at runtime | `COPY src/ ./src/` in Dockerfile is retained — markdown files remain accessible via `CLAUDE_PLUGIN_ROOT`. |
| CLI skill files deleted before `--help` is ergonomic | Acceptable: bins are now on PATH after `npm link` or Docker install, making `kitchen-github --help` fully usable. |
