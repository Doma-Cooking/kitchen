---
name: typescript-cli
description: TypeScript compiler tools. Use when checking types, resolving types at a position, finding definitions, or finding references.
---

# kitchen-typescript

CLI binary for TypeScript language service operations. Invoke via Bash.

## Subcommands

| Subcommand | Key flags |
|---|---|
| `diagnostics` | `--projectRoot` (required) `--tsconfigPath` `--files` (JSON array of absolute paths) |
| `type-at-position` | `--projectRoot` (required) `--file` `--line` `--column` `--tsconfigPath` |
| `go-to-definition` | `--projectRoot` (required) `--file` `--line` `--column` `--tsconfigPath` |
| `find-references` | `--projectRoot` (required) `--file` `--line` `--column` `--tsconfigPath` |

## Examples

```bash
kitchen-typescript diagnostics --projectRoot /app
kitchen-typescript diagnostics --projectRoot /app --files '["src/index.ts", "src/plugins/shared/tools/slack.ts"]'
kitchen-typescript type-at-position --projectRoot /app --file src/index.ts --line 42 --column 10
kitchen-typescript go-to-definition --projectRoot /app --file src/index.ts --line 42 --column 10
```

Use `kitchen-typescript <subcommand> --help` for full flag details.
