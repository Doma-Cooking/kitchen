# Configuration

Kitchen uses a layered configuration system:

1. **YAML configuration** (`.github/kitchen.yml`) for all settings
2. **Markdown files** for template and prompt content—easier to edit with syntax highlighting

> **Default values** are defined in [`default_configuration.yml`](../defaults/default_configuration.yml).
> **Default templates/prompts** are in [`defaults/`](../defaults/).

---

## Configuration Sections

### Agent Settings

Controls AI agent execution.

| Field | Purpose |
|-------|---------|
| `provider` | Which AI backend to use |
| `model` | Model identifier |
| `timeout_minutes` | Max session duration |

### Interaction

Configures how users communicate with the agent.

| Field | Purpose |
|-------|---------|
| `trigger` | Prefix for agent-directed comments |

### Columns

Maps logical workflow states to your project board column names.

| Field | Purpose |
|-------|---------|
| `todo` | Backlog / ready for pickup |
| `planning` | Agent should analyze and create plan |
| `ready` | Plan approved, ready for implementation |
| `implementing` | Agent should implement the plan |
| `done` | Work complete |

### Labels

Labels applied to issues to indicate agent state.

| Field | Purpose |
|-------|---------|
| `enabled` | Only issues with this label are processed |
| `needs_input` | Applied when agent asks questions; removed when user responds |

### Templates

All templates are markdown files in `defaults/templates/`.

| Field | Purpose |
|-------|---------|
| `branch` | Branch naming pattern |
| `commit` | Commit message format |
| `pr_title` | Pull request title |
| `plan` | Expected plan format |
| `sub_issue` | Expected sub-issue body format |
| `questions` | Expected questions format |
| `pr_body` | Expected PR body format |

**Values:**
- `default` — Use the built-in template from `defaults/templates/`
- `path/to/file.md` — Use a custom markdown file (relative to repo root)

### Prompts

System prompts and tool restrictions for each workflow phase.

| Field | Purpose |
|-------|---------|
| `planning.prompt` | System prompt for planning phase |
| `planning.allowed_tools` | Tools available during planning |
| `implementation.prompt` | System prompt for implementation phase |
| `implementation.allowed_tools` | Tools available during implementation |

**Prompt values:**
- `default` — Use the built-in prompt from `defaults/prompts/`
- `path/to/file.md` — Use a custom markdown file (relative to repo root)

**Tool categories:**

| Category | Examples | Description |
|----------|----------|-------------|
| Claude Code tools | Read, Glob, Grep, Write, Edit, Bash | Built-in Claude Code tools for file/code operations |
| Platform read tools | get_issue, get_comments, get_pull_request | Fetch data from GitHub |
| Platform write tools | post_comment, create_issue, create_pull_request | Perform actions on GitHub |

See [Architecture — Agent Tools](./architecture.md#agent-tools) for the full tool reference.

### Notifications

External notification integrations.

| Field | Purpose |
|-------|---------|
| `slack.enabled` | Toggle Slack notifications |
| `slack.webhook_url` | Slack incoming webhook URL |
| `slack.events` | Which events trigger notifications |

Valid events: `agent_started`, `plan_ready`, `pr_ready`, `questions_asked`, `session_failed`

---

## Secrets

Use `${VAR_NAME}` syntax to reference secrets in configuration values:

```yaml
notifications:
  slack:
    webhook_url: ${SLACK_WEBHOOK_URL}
```

Resolution order:
1. Docker secrets (`/run/secrets/VAR_NAME`)
2. Environment variable (`process.env.VAR_NAME`)

---

## Variable Substitution

Templates and prompts support variable substitution using namespaced `{{namespace.key}}` syntax.

### Namespaces

| Namespace | Purpose | Example |
|-----------|---------|---------|
| `templates` | Load template file content | `{{templates.plan}}` |
| `context` | Runtime values from current session | `{{context.issue_number}}` |
| `config` | Configuration values | `{{config.trigger}}` |

### Available Variables

**`templates.*`** — Loads the configured template content:
- `{{templates.plan}}` — Plan format template
- `{{templates.questions}}` — Questions format template
- `{{templates.sub_issue}}` — Sub-issue format template
- `{{templates.pr_body}}` — PR body format template

**`context.*`** — Runtime values:
- `{{context.issue_number}}` — Current issue number (e.g., `42`)
- `{{context.issue_title}}` — Current issue title
- `{{context.issue_slug}}` — Slugified issue title (e.g., `add-user-auth`)
- `{{context.repo}}` — Repository (e.g., `owner/repo`)
- `{{context.approved_plan}}` — The approved plan content (implementation phase)
- `{{context.summary}}` — Agent-provided summary (for commit/PR title)
- `{{context.plan_title}}` — First line of plan (for PR title)

**`config.*`** — Configuration values:
- `{{config.trigger}}` — Trigger prefix (e.g., `@agent`)
- `{{config.labels.enabled}}` — Enabled label name
- `{{config.labels.needs_input}}` — Needs input label name

---

## Deep Merge Behavior

YAML configuration uses **deep merge**: your file overrides defaults field-by-field.

```yaml
# .github/kitchen.yml - only override what you need
columns:
  todo: "Backlog"
  ready: "Approved"
```

Result: Only `todo` and `ready` are overridden; other columns keep defaults.

**Arrays replace entirely** (not merged):

```yaml
notifications:
  slack:
    events: [plan_ready]  # Replaces default array
```

---

## Examples

### Minimal: Just Change the Trigger

```yaml
# .github/kitchen.yml
interaction:
  trigger: "@bot"
```

### Custom Column and Label Names

```yaml
# .github/kitchen.yml
columns:
  todo: "Backlog"
  ready: "Approved"

labels:
  enabled: "ai-ready"
  needs_input: "waiting-for-feedback"
```

### Custom Planning Prompt

First, create your prompt file (e.g., `docs/prompts/planning.md`):

```markdown
You are a senior engineer analyzing issue #{{context.issue_number}} in {{context.repo}}.

Focus on:
- Security implications
- Performance impact
- Test coverage requirements

Be thorough but concise.

## Output Format

{{templates.plan}}
```

Then reference it in your configuration:

```yaml
# .github/kitchen.yml
prompts:
  planning:
    prompt: docs/prompts/planning.md
```

### Custom Templates and Prompts

```yaml
# .github/kitchen.yml
templates:
  plan: docs/templates/detailed-plan.md
  pr_body: docs/templates/pr-template.md

prompts:
  planning:
    prompt: docs/prompts/security-planning.md
  implementation:
    prompt: docs/prompts/security-implementation.md
```

### Custom Branch Naming

Create a custom branch template (e.g., `docs/templates/branch.md`):

```markdown
feature/{{context.issue_slug}}-{{context.issue_number}}
```

Then reference it:

```yaml
# .github/kitchen.yml
templates:
  branch: docs/templates/branch.md
```

Creates branches like `feature/add-user-authentication-42`.

### Restricted Tools

Restrict tools for a phase (e.g., no web access during planning):

```yaml
# .github/kitchen.yml
prompts:
  planning:
    prompt: default
    allowed_tools: [Read, Glob, Grep, get_issue, get_comments]
```

---

## Infrastructure

See [Deployment](./deployment.md) for Docker deployment, required secrets, and infrastructure configuration.
