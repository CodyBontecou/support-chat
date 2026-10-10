# Isobot support integration

The v1 client is integrated into myself.md's phone Settings → Contact support and dashboard Support view. The service runs inside Isobot's Cloudflare Worker. The previous client/server API remains available for compatibility.

## Behavior

Each authenticated account has an inbox of independent conversations. Each Pi operation has a separate durable harness and receives that conversation's canonical text plus approved attachment metadata. Pi can read source, answer questions, request data, create GitHub tickets, and dispatch a Codex first pass. Staff use private Discord threads. Their first reply pauses automatic Pi responses; the owner can resume them.

A data request describes a category, reason, time range, and optional operations/outcome filter. Reviewing collects locally. The owner can edit or cancel the preview. Sharing requires an explicit acceptance, matching SHA-256 digest, and current conversation generation. Phone logs default to the last 24 hours; other data can be provided manually in the editable preview. The dashboard supports manual snapshots and directs phone log collection to the phone. This does not automatically read arbitrary native data or change existing OS permissions or diagnostics capture settings.

Attachments are encrypted with AES-GCM before durable storage. Archive fences in-flight operations, aborts and erases the Pi harness, deletes attachment ciphertext, and preserves text and removed-attachment metadata. Reopening requires new snapshots. Deletion removes the canonical conversation and requests deletion of the Discord thread. Account deletion blocks recreation and removes devices and all conversations. External Discord cleanup is asynchronous and retried by the relay. Provider retention and Cloudflare storage backups are outside live-store deletion; approved data already processed by a model cannot be recalled.

Mobile notifications contain generic reply/request text and a conversation ID. Permission is requested only through the owner's enable button. Already-authorized devices re-register on foreground. Logout attempts token removal; delivery failures/receipts retire invalid tokens. Tapping verifies current account ownership before opening the conversation. Push is a delivery hint; inbox reads remain authoritative.

Codex dispatch is fixed to `CodyBontecou/support-chat` and its `main` workflow. It produces a draft PR for review. Bugs in myself.md or Isobot remain staff follow-up. Tickets and tasks must contain sanitized findings, not raw attachments. Retry reconciliation uses deterministic IDs and GitHub/Discord markers; an ambiguous external write is not a distributed transaction.

## Deployment

Deployment on 2026-10-10:

- Isobot Worker: version `8ae4ce01-8b7c-48f8-bbed-24900654d168`, with all three support Durable Object bindings and distinct credentials.
- myself.md Worker/dashboard: version `1eaf0e7a-487d-49b3-a336-a200f9f7785a`. Test at https://myself.md/dashboard?view=support.
- Isobot Discord relay: deployed to the existing Fly machine; bot ready, health check passing, existing support channel verified private.
- support-chat client and workflow: published to `main` at `107b2ef`. Callback secrets configured; Actions draft PR permission enabled with explicit approval. `CODEX_API_KEY` configured with the dedicated restricted Isotech key; expires 2026-11-09. A read-only OpenAI model-list request returned 200. No implementation task has been dispatched yet.
- iPhone preview: EAS build `7409a2e9-4b91-4901-b275-51457cc9382b` failed because the saved profile lacks Push Notifications / `aps-environment`. Refreshing Apple provisioning is pending authorization.

Live service reads returned 200 with the service credential; the bridge credential returned 200 for relay jobs; the service credential was rejected with 401 on the bridge. The deployed dashboard bundle includes the new support UI, and unauthenticated host requests return 401. No test conversations, Discord messages, GitHub issues, or implementation tasks were created during these checks.

| Location                    | Required configuration                                                                                                                                                                                                |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| myself.md service/Worker    | `SUPPORT_ISOBOT_ORIGIN` (exact HTTPS origin), `SUPPORT_ISOBOT_TOKEN` matching Isobot's service token                                                                                                                  |
| Isobot Worker               | `SUPPORT_SERVICE_TOKEN`, `SUPPORT_BRIDGE_TOKEN`, `SUPPORT_TASK_TOKEN` (distinct), `SUPPORT_ENCRYPTION_KEY` (64 hex characters), existing AI/ChatGPT bindings, `GITHUB_TOKEN` with issues and workflow-dispatch access |
| Isobot Discord process      | `ISOBOT_AGENT_URL`, `SUPPORT_BRIDGE_TOKEN`, `SUPPORT_DISCORD_CHANNEL_ID`, comma-separated `SUPPORT_DISCORD_STAFF_IDS`, existing bot login                                                                             |
| support-chat GitHub Actions | Enable draft PR creation; repository secrets `CODEX_API_KEY`, `SUPPORT_ISOBOT_ORIGIN`, `SUPPORT_TASK_TOKEN`; push `.github/workflows/support-codex.yml` and `scripts/support-task.mjs` to `main`                      |
| Mobile app                  | SDK 57 notification plugin/modules, existing Expo EAS project ID, provisioned APNs/FCM credentials, a rebuilt binary                                                                                                  |

Deploy the Isobot Worker with its three new SQLite Durable Object bindings/migration. Deploy the myself.md proxy and built dashboard. Restart the Discord process after configuring a private guild text channel that denies everyone visibility and grants only the bot and named staff. The relay refuses a channel with broader visibility. Install the rebuilt mobile app; an OTA update alone cannot add native notification modules.

## Verification

- `npm run check` in support-chat checks the exported native/web clients.
- `npm run format` and `npm run check` in myself.md cover host and copied package source.
- `node scripts/verify-support-v1.js` in myself.md exercises the real MCP transport and browser approval flow with deterministic fixtures.
- `npm test`, `npm run typecheck`, and `npm run agent:typecheck` in Isobot cover the service and existing integrations. `cloudflare/src/support-integration.test.ts` runs real SQLite Durable Objects in Miniflare with a fake Pi runner.
- `npm run bundle`, `npm run build:ios:debug`, and `ANDROID_HOME=<installed-sdk> npm run build:android` in myself.md verify module resolution and native compilation.

Live Pi inference, production Discord/GitHub delivery, APNs/FCM delivery, and physical-device notification interaction still need configured deployment testing. The fixture does not claim those effects.
