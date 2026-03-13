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

**Runtime asset copy:**
tsc does not copy non-`.ts` assets. A `scripts/copy-assets.mjs` postbuild script handles two things:
1. Copies `src/data/migration/migrations/*.sql` → `dist/data/migration/migrations/`
2. Copies all non-`.ts` files from `src/plugins/` → `dist/plugins/` (agent prompts, SKILL.md files, SOPs, templates)

This means `dist/` is the single output directory containing everything the runtime needs. The Docker runtime stage only copies `dist/` — no separate `COPY src/plugins/` step and no TS source in the prod image.

**Local dev is unchanged:**
`npm run dev` continues to use `tsx src/index.ts`. The build step is only required for Docker/production.

### Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Compiler | `tsc` | Canonical — already the type checker; per-file output preserves layout |
| Import extension convention | `.js` in source | Required by tsc emit; standard TypeScript ESM practice |
| Shebang | Update in source files | tsc preserves shebangs; no post-processing needed |
| Runtime asset copy | `postbuild` script copies SQL migrations + plugin markdown assets to `dist/` | tsc doesn't copy non-TS files; `dist/` becomes the single self-contained output directory — no TS source in prod image |
| Dockerfile | Multi-stage build | Builder stage gets full `src/` to compile; runtime stage gets only `dist/` (which contains compiled JS + all markdown assets). No TS source in the prod image. |
| Credential helper path | `import.meta.url`-relative | `process.cwd()` breaks if the server is started from a different directory; `import.meta.url` is always relative to the compiled file's location. |

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

4. **Write `scripts/copy-assets.mjs`** (replaces the previously planned `copy-migrations.mjs`):
   - Copies `src/data/migration/migrations/*.sql` → `dist/data/migration/migrations/` (no-op if directory doesn't exist)
   - Recursively copies all non-`.ts` files from `src/plugins/` → `dist/plugins/` (agent prompts, SKILL.md files, SOPs, templates)

5. **Update `package.json`**:
   - `"build"`: `"tsc"`
   - `"postbuild"`: `"node scripts/copy-assets.mjs"`
   - Add `"typecheck"`: `"tsc --noEmit"`
   - All 6 `bin` entries: `src/…/*.ts` → `dist/…/*.js`

6. **Update `Dockerfile`** — convert to multi-stage build:
   ```dockerfile
   # Builder stage: compile TypeScript
   FROM node:22-slim AS builder
   WORKDIR /app
   COPY package.json package-lock.json ./
   RUN npm ci
   COPY src/ ./src/
   COPY scripts/ ./scripts/
   COPY tsconfig.json ./
   RUN npm run build

   # Runtime stage: prod deps + compiled output only
   FROM node:22-slim
   RUN apt-get update && apt-get install -y git gosu zstd && rm -rf /var/lib/apt/lists/*
   WORKDIR /app
   COPY package.json package-lock.json ./
   RUN npm ci --omit=dev
   COPY --from=builder /app/dist ./dist
   COPY entrypoint.sh /app/entrypoint.sh
   RUN chmod +x /app/entrypoint.sh
   ENTRYPOINT ["/app/entrypoint.sh"]
   CMD ["node", "dist/index.js"]
   ```
   `dist/` contains everything the runtime needs — compiled JS, SQL migrations, and plugin markdown assets (all copied by `copy-assets.mjs`). No TS source in the prod image, no separate `COPY src/plugins/`.

7. **Update `.kitchen.yaml` (and `.kitchen.example.yaml`)**:
   - `plugins.path: /app/src/plugins` → `plugins.path: /app/dist/plugins`
   - This is the only config change needed — all agent prompt paths and plugin paths resolve relative to this root.

8. **Update `agent-config.ts`** (credential helper, L49–52):
   - Replace `process.cwd()`-based path construction with `import.meta.url`-relative resolution — robust regardless of the working directory the server is launched from:
     ```typescript
     import { fileURLToPath } from 'url'
     // ...
     const credentialHelperPath = fileURLToPath(
       new URL('../../plugins/shared/scripts/git-credential-github-app.js', import.meta.url)
     )
     env.GIT_CONFIG_COUNT = '1'
     env.GIT_CONFIG_KEY_0 = 'credential.helper'
     env.GIT_CONFIG_VALUE_0 = `!node ${credentialHelperPath}`
     ```
   - Drop the `tsxPath` variable (no longer needed)

9. **Remove `*-cli` SKILL.md files** — replace with `--help` + compact tool index:
   - Delete: `src/plugins/shared/skills/{kitchen,linear,notion,slack,github}-cli/`
   - Delete: `src/plugins/domains/engineering/skills/typescript-cli/`
   - Migrate non-CLI operating notes into **`base.md`** (not `zuko.md`) — e.g. `slack-cli/SKILL.md` contains cross-agent formatting rules (`*bold*` not `**bold**`, no tables, @mention for responses) that apply to all agents
   - Add CLI tool index table to `src/plugins/agents/agents/zuko.md` (binary name + one-liner + `--help` reference)

## Testing Strategy

- `npm run typecheck` — zero errors (uses `tsc --noEmit` explicitly, ignoring tsconfig `noEmit`)
- `npm run build` — tsc emits to `dist/`; postbuild copies SQL migrations
- Shebang check: `head -1 dist/plugins/shared/tools/github.js` → `#!/usr/bin/env node`
- CLI smoke test: `node dist/plugins/shared/tools/github.js list-pull-requests --owner Doma-Cooking --repo kitchen` — returns PR list
- Server: `node dist/index.js` starts successfully (requires Postgres + Redis env)
- Asset copy check: `ls dist/plugins/agents/agents/base.md` exists; `find dist/plugins -name '*.ts'` returns nothing
- Docker: `docker build` completes; container starts and responds to health check
- Credential helper: agent subprocess can `git push` using the compiled helper

## Risks & Open Questions

| Risk | Mitigation |
|---|---|
| Import rename scope | 32 files, all relative imports use `.ts` (verified). A single-pass sed or IDE rename handles this reliably. |
| `tsc` strict mode surfaces new errors after removing `allowImportingTsExtensions` | Run `tsc --noEmit` immediately after tsconfig change to catch any new errors before proceeding. |
| SQL migrations not found at runtime | `postbuild` script copies `.sql` files; directory structure mirrors `src/`. Graceful no-op if no migrations exist. |
| `dist/` checked into git accidentally | `dist/` is already in `.gitignore` — no action needed. |
| Plugin markdown assets needed at runtime | `copy-assets.mjs` copies all non-`.ts` plugin files to `dist/plugins/` — runtime stage only needs `COPY --from=builder /app/dist ./dist`. No TS source in prod image. |
| Credential helper path wrong at runtime | Using `import.meta.url`-relative path — always resolves correctly relative to the compiled file, regardless of launch directory. |
