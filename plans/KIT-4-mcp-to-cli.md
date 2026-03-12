# One Pager: Migrate MCP servers to standalone CLI binaries

## Context

**Ticket:** [KIT-4](https://linear.app/doma/issue/KIT-4)

Kitchen currently delivers integration tools (GitHub, Slack, Linear, Notion, kitchen-internal) as
custom MCP servers, requiring Claude Code's MCP protocol to invoke them. Migrating to standalone CLI
binaries removes the MCP dependency for custom tools, lets agents invoke tools via Bash, and makes
binaries available system-wide after `npm install`.

## Approach

Each tool file is converted from an MCP server (`McpServer.registerTool`) to a CLI binary with one
subcommand per tool. The shebang (`#!/usr/bin/env npx tsx`) is already present on all files.
Binaries are registered in `package.json` `bin` field and installed via `npm install` in the Docker
build. A brief usage skill is created alongside each binary in its plugin, so agents know what
subcommands are available without relying on MCP's automatic schema injection.

**Framework:** `commander` (npm) for subcommand routing and `--help` generation.

**Output format:** Each subcommand prints the same JSON text the MCP handler previously returned, to
stdout. On error, prints to stderr and exits with code 1.

**Files changing:**

| File | Change |
| --- | --- |
| `src/plugins/domains/engineering/tools/github.ts` | Rewrite MCP `registerTool` calls → `commander` subcommands |
| `src/plugins/shared/tools/slack.ts` | Same |
| `src/plugins/shared/tools/linear.ts` | Same |
| `src/plugins/shared/tools/notion.ts` | Same |
| `src/plugins/shared/tools/kitchen.ts` | Same (`create_agent_event` → `kitchen-tools create-agent-event`) |
| `package.json` | Add `bin` field; add `commander` dependency |
| `src/plugins/shared/.mcp.json` | Delete |
| `src/plugins/domains/engineering/.mcp.json` | Delete |
| Skills/SOPs referencing MCP tool names | Update to CLI invocation style |
| `src/plugins/domains/engineering/skills/github-cli/SKILL.md` | Create — brief usage docs for `kitchen-github` |
| `src/plugins/shared/skills/slack-cli/SKILL.md` | Create — brief usage docs for `kitchen-slack` |
| `src/plugins/shared/skills/linear-cli/SKILL.md` | Create — brief usage docs for `kitchen-linear` |
| `src/plugins/shared/skills/notion-cli/SKILL.md` | Create — brief usage docs for `kitchen-notion` |
| `src/plugins/shared/skills/kitchen-cli/SKILL.md` | Create — brief usage docs for `kitchen-tools` |

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
equivalent. Each CLI binary gets a corresponding usage skill in its plugin (e.g.
`engineering/skills/github-cli/SKILL.md`). Agents invoke the skill when they need the tool; the
skill describes available subcommands and key flags. `--help` covers the full interface schema.

## Implementation Steps

1. Add `commander` to `package.json` dependencies (`npm install commander`)
2. Convert `src/plugins/shared/tools/kitchen.ts` (1 tool — de-risks the pattern)
3. Convert `src/plugins/domains/engineering/tools/github.ts` (13 tools)
4. Convert `src/plugins/shared/tools/slack.ts` (12 tools)
5. Convert `src/plugins/shared/tools/linear.ts` (20 tools)
6. Convert `src/plugins/shared/tools/notion.ts` (11 tools)
7. Add `bin` field to `package.json` mapping binary names to tool files:
   - `kitchen-github` → `src/plugins/domains/engineering/tools/github.ts`
   - `kitchen-slack` → `src/plugins/shared/tools/slack.ts`
   - `kitchen-linear` → `src/plugins/shared/tools/linear.ts`
   - `kitchen-notion` → `src/plugins/shared/tools/notion.ts`
   - `kitchen-tools` → `src/plugins/shared/tools/kitchen.ts`
8. Delete `.mcp.json` files (`src/plugins/shared/.mcp.json`, `src/plugins/domains/engineering/.mcp.json`)
9. Update skills and SOPs: replace MCP tool-name references with CLI invocation style
   (e.g. `linear_create_issue` → `kitchen-linear create-issue`)
10. Create a usage skill per CLI binary in its relevant plugin (brief — subcommands + key flags):
    - `src/plugins/domains/engineering/skills/github-cli/SKILL.md`
    - `src/plugins/shared/skills/slack-cli/SKILL.md`
    - `src/plugins/shared/skills/linear-cli/SKILL.md`
    - `src/plugins/shared/skills/notion-cli/SKILL.md`
    - `src/plugins/shared/skills/kitchen-cli/SKILL.md`

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
