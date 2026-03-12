# One Pager: Migrate MCP servers to standalone CLI binaries

## Context

**Ticket:** [KIT-4](https://linear.app/doma/issue/KIT-4)

Kitchen currently delivers integration tools (GitHub, Slack, Linear, Notion, kitchen-internal) as
custom MCP servers, requiring Claude Code's MCP protocol to invoke them. Migrating to standalone CLI
binaries removes the MCP dependency for custom tools, lets agents invoke tools via Bash, and makes
binaries available system-wide after `npm install`.

## Approach

Each `src/plugins/shared/tools/*.ts` file is converted from an MCP server (`McpServer.registerTool`)
to a CLI binary with one subcommand per tool. The shebang (`#!/usr/bin/env npx tsx`) is already
present on all files. Binaries are registered in `package.json` `bin` field and installed via
`npm install` in the Docker build.

**Framework:** `commander` (npm) for subcommand routing and `--help` generation.

**Output format:** Each subcommand prints the same JSON text the MCP handler previously returned, to
stdout. On error, prints to stderr and exits with code 1.

**Files changing:**

| File | Change |
| --- | --- |
| `src/plugins/shared/tools/github.ts` | Rewrite MCP `registerTool` calls → `commander` subcommands |
| `src/plugins/shared/tools/slack.ts` | Same |
| `src/plugins/shared/tools/linear.ts` | Same |
| `src/plugins/shared/tools/notion.ts` | Same |
| `src/plugins/shared/tools/kitchen.ts` | Same |
| `package.json` | Add `bin` field; add `commander` dependency |
| `src/plugins/shared/.mcp.json` | Delete |
| `src/plugins/domains/engineering/.mcp.json` | Delete |
| Skills/SOPs referencing MCP tool names | Update to CLI invocation style |

### Key Decisions

**Commander over yargs:** Commander has a simpler subcommand API and cleaner help output; yargs adds
surface area we don't need.

**Subcommand names derived from tool names:** Underscores replaced with hyphens, prefix stripped.
`notion_search` → `kitchen-notion search`. Consistent and predictable for agents.

**Arguments as `--key value` flags:** All tool inputs map to named flags. Complex objects (e.g.
Notion `properties`, Linear `filter`) are passed as JSON strings and `JSON.parse`d in the handler.
Agents must quote JSON arguments properly.

**No precompilation:** tsx shebangs are sufficient for this phase. esbuild compilation is deferred to
a future ticket once the CLI shape is proven.

**Feature parity only:** No new tools added, no existing tools removed. Exact same operations, new
interface.

**Agent discoverability:** MCP auto-injects tool schemas into the system prompt; CLI has no
equivalent. Agents learn about available CLIs from: (1) their identity file (`zuko.md`), updated to
enumerate available binaries and usage patterns, and (2) skills that reference CLI commands directly.
`--help` provides the full interface schema when needed.

## Implementation Steps

1. Add `commander` to `package.json` dependencies (`npm install commander`)
2. Convert `src/plugins/shared/tools/kitchen.ts` (1 tool — de-risks the pattern)
3. Convert `src/plugins/shared/tools/github.ts` (13 tools)
4. Convert `src/plugins/shared/tools/slack.ts` (12 tools)
5. Convert `src/plugins/shared/tools/linear.ts` (20 tools)
6. Convert `src/plugins/shared/tools/notion.ts` (11 tools)
7. Add `bin` field to `package.json` mapping binary names to tool files:
   - `kitchen-github` → `src/plugins/shared/tools/github.ts`
   - `kitchen-slack` → `src/plugins/shared/tools/slack.ts`
   - `kitchen-linear` → `src/plugins/shared/tools/linear.ts`
   - `kitchen-notion` → `src/plugins/shared/tools/notion.ts`
   - `kitchen-tools` → `src/plugins/shared/tools/kitchen.ts`
8. Delete `.mcp.json` files (`src/plugins/shared/.mcp.json`, `src/plugins/domains/engineering/.mcp.json`)
9. Update skills and SOPs: replace MCP tool-name references with CLI invocation style
   (e.g. `linear_create_issue` → `kitchen-linear create-issue`)
10. Update agent identity files (e.g. `zuko.md`) to enumerate available CLI binaries so agents know
    what tools exist — MCP auto-injects tool schemas into the system prompt; CLI does not

## Testing Strategy

- `kitchen-github --help` lists all subcommands with descriptions
- `kitchen-linear create-issue --help` shows all flags with types
- Run each binary with a representative command against real APIs (dev environment)
- Confirm agents can invoke binaries via Bash in a Claude Code session
- TypeScript type-check passes (`npm run typecheck`)

## Risks & Open Questions

- **Dockerfile bin linking:** Confirmed — `node_modules/.bin` is on `PATH` in the running container
  (inherited from the `npx tsx` process). No Dockerfile changes needed.
- **Complex JSON args:** Notion `children`, Linear `sorts`, GitHub PR `body` — passing nested JSON as
  CLI strings is cumbersome for agents. May warrant a follow-on ticket to support `--input-file` or
  stdin for complex payloads.
- **Skills update scope:** All skills referencing MCP tool names need updating. Risk of missing one
  in a skill or SOP that isn't immediately obvious.
- **MCP removal coordination:** Existing sessions with `.mcp.json` loaded will lose MCP tools upon
  deletion. Coordinate removal with a deployment or session restart.
