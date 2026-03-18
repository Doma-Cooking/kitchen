# One Pager: Consolidate Slack listeners to HTTP mode

## Context

**Ticket:** https://linear.app/doma-cooking/issue/KIT-56/consolidate-slack-listeners-to-http-mode

Currently each Kitchen agent runs its own Bolt `App` in socket mode — one persistent WebSocket connection to Slack per agent. As we add more agents the cost scales linearly. Migrating to HTTP webhook mode lets a single Hono endpoint handle events for all agents, with zero persistent connections.

## Approach

Replace the per-agent Bolt socket apps with a single Hono route (`POST /slack/events/:agentId`). Each Slack App sends events to a unique URL containing the agent ID, so routing is determined from the URL path before the body is parsed. Request authenticity is verified with HMAC-SHA256 against each agent's signing secret (replacing the current `appToken` which is socket-mode-only).

The existing `fetchRecentMessages` and `HandleEventUseCase` logic is unchanged — only the transport layer changes.

### Key Decisions

**Why not use Bolt's HTTP receiver?**
Bolt's built-in receivers (`ExpressReceiver`, etc.) are designed for a single app. Wrapping N apps in N receivers gives us nothing over the current architecture. Handling the raw HTTP request in Hono and verifying the Slack signature directly is ~30 lines and avoids a framework dependency.

**Routing by URL path vs `api_app_id`**
URL path (`/slack/events/:agentId`) is simpler: we know which agent to use before touching the body, and there's no ambiguity if two agents share a Slack workspace. `api_app_id` routing requires parsing the JSON body first and maintaining a separate `appId → agentId` lookup.

**`appToken` → `signingSecret` config swap**
`appToken` is only meaningful for socket mode. HTTP mode uses a `signingSecret` for request verification. The env var convention changes from `ZUKO_SLACK_APP_TOKEN` to `ZUKO_SLACK_SIGNING_SECRET`. Agents without a `signingSecret` simply don't mount an HTTP listener (same behaviour as missing `appToken` today).

**Dev environment**
Socket mode is convenient locally because it requires no public URL. HTTP mode requires Slack to reach the Kitchen server. The recommended local solution is [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/) (`cloudflared tunnel --url http://localhost:3000`) — zero account required for ephemeral tunnels. A `tunnel` npm script will be added as a convenience. A setup doc will cover end-to-end Slack App configuration for HTTP mode.

## Implementation Steps

1. **Update `SlackBotConfig`** — replace `appToken: string` with `signingSecret: string` in `src/domain/entity/agent-config.ts`
2. **Update config resolution** — in `config.repository.ts`, read `${PREFIX}_SLACK_SIGNING_SECRET` instead of `${PREFIX}_SLACK_APP_TOKEN`; remove `appToken` from the resolved config
3. **Rewrite `SlackRoutes`** — remove Bolt `App` instances; add a single `POST /slack/events/:agentId` Hono handler that:
   - Looks up the agent by ID; returns 404 if not found or no `signingSecret`
   - Verifies the Slack request signature (HMAC-SHA256 over `v0:${timestamp}:${rawBody}` using the agent's `signingSecret`)
   - Returns 200 immediately after enqueuing (Slack requires a <3s acknowledgement)
   - Parses the event and dispatches to `HandleEventUseCase`
4. **Mount the route in `Server`** — add `app.route('/slack', slackRoutes.router)` (currently `SlackRoutes` runs outside the Hono app)
5. **Add `tunnel` npm script** — `"tunnel": "cloudflared tunnel --url http://localhost:3000"` in `package.json`
6. **Write setup doc** — `setup/slack-http-mode.md` covering: creating a Slack App for HTTP mode, configuring the event subscription URL, required bot scopes, env vars (`SIGNING_SECRET`, `BOT_TOKEN`), and the local dev tunnel workflow

## Testing Strategy

- Start Kitchen locally with `npm run tunnel`, configure a test Slack App to point at the tunnel URL, send a DM — verify the agent receives and processes it
- Verify a tampered request (bad signature) returns 403
- Verify a missing agent ID returns 404
- Confirm all existing events (`message`, `app_mention`) continue to fire correctly

## Risks & Open Questions

- **Breaking change for existing deployments**: anyone running Kitchen must update their Slack App config (switch from Socket Mode to HTTP Events) and rotate env vars (`APP_TOKEN` → `SIGNING_SECRET`). The setup doc is essential to make this migration smooth.
- **Slack URL verification challenge**: when a new event subscription URL is saved in the Slack App settings, Slack sends a `url_verification` challenge that must be echoed back. The handler must respond to this before normal events flow.
- **3-second acknowledgement**: Slack requires a 200 response within 3 seconds. The current implementation awaits `HandleEventUseCase.execute()` synchronously — this works today because BullMQ enqueuing is fast, but should be verified under load.
