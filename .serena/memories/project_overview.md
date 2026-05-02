# Project Overview

uptime-reactor is a small Bun/TypeScript webhook service. Uptime Kuma sends custom JSON webhook events with `monitorId` and `status`. The service maps `monitorId` to a configured Cloudflare DNS A record.

Behavior:
- `status: 0` means DOWN: delete all Cloudflare DNS records matching `zoneId + name + type=A + content`.
- `status: 1` means UP: create the configured A record if no matching record exists.
- Unknown `monitorId` returns `200 ignored` and does not call Cloudflare.
- Unsupported numeric status returns `200 ignored`.
- Cloudflare API errors are logged and do not change the webhook HTTP response from success semantics.
- In-memory status cache tracks last seen status per `monitorId`; repeated same status is ignored and does not call Cloudflare.
- Cache is rebuilt after restart by first webhook per monitor.
- Same `monitorId` uses latest-event-wins queue for status changes: one running task and at most one pending task; new pending replaces old pending.

No auth by design; expected deployment is colocated/internal with Uptime Kuma.