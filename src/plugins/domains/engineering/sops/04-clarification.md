# SOP-04: Clarification Protocol

## When to Clarify

- Vague or incomplete requirements
- Multiple valid interpretations of the same requirement
- Significant trade-offs that need a product/stakeholder decision
- Missing acceptance criteria or context

## How to Ask

1. **State what you understand** — show your interpretation so far
2. **List specific questions** — each with concrete options where possible
3. **Ask all questions at once** — don't drip-feed; batch them

### Example

> Based on the ticket, I understand we need to add a webhook handler for Slack events. A few questions before I start:
>
> 1. **Scope:** Should this handle all Slack event types, or just message events?
> 2. **Auth:** Do we verify the Slack signing secret, or is that handled upstream?
> 3. **Storage:** Should events be persisted to the database, or just processed in-memory?

## Where to Ask

Reply in the originating channel:
- If the request came from a **Slack thread**, reply in that thread
- If the request came from a **Linear comment**, reply as a Linear comment
- If unclear, use the Linear ticket as the default

## Non-Critical Ambiguity

For minor ambiguities that don't significantly affect the outcome:
- State your assumption
- Proceed with implementation
- Note the assumption in the tech plan or PR description

Don't block on questions that have a reasonable default answer.
