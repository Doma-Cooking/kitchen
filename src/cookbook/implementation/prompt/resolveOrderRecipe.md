Resolve the following {{context.event_source}} event into recipe orders.

## Event
- Source: {{context.event_source}}
- Source ID: {{context.event_source_id}}
- Timestamp: {{context.event_timestamp}}

## Payload
```json
{{context.event_payload}}
```

## Pre-resolved Context
```json
{{context.event_context}}
```

## Repositories
{{context.repositories}}

## Instructions
IMPORTANT: Your FIRST action MUST be to invoke the Skill tool with skill: "resolve:order-resolution" (from the resolve plugin). This loads the resolution workflow, available recipes, and response requirements. Do NOT skip this step.

After loading the skill, use it together with the event payload and pre-resolved context to determine which orders to create.