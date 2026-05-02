# Project Overview

uptime-reactor is a small Bun/TypeScript webhook service. Uptime Kuma sends custom JSON webhook events with `monitorKey` and `status`. The service maps `monitorKey` to a configured Cloudflare DNS A record. The legacy `monitorId` field is still accepted.

Behavior:
- `status: 0` means DOWN: delete all Cloudflare DNS records matching `zoneId + name + type=A + content`.
- `status: 1` means UP: create the configured A record if no matching record exists.
- Unknown `monitorKey` returns `200 ignored` and does not call Cloudflare.
- Unsupported numeric status returns `200 ignored`.
- Text status from Uptime Kuma (`✅ Up` / `🔴 Down`) is supported; `⚠️ Test` is rejected as not a real state.
- Cloudflare API errors are logged and do not change the webhook HTTP response from success semantics.
- In-memory status cache tracks last seen status per `monitorKey`; repeated same status is ignored and does not call Cloudflare.
- Cache is rebuilt after restart by first webhook per monitor.
- Same `monitorKey` uses latest-event-wins queue for status changes: one running task and at most one pending task; new pending replaces old pending.

No auth by design; expected deployment is colocated/internal with Uptime Kuma.