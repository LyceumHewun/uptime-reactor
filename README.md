# uptime-reactor

Bun service for Uptime Kuma webhook events. It keeps a Cloudflare multi-`A` DNS record set in sync with monitor state:

- `status: 0` removes the configured `A` record for that monitor.
- `status: 1` adds the configured `A` record back if missing.
- Repeated same status for a monitor is ignored from an in-memory cache.
- Unknown `monitorKey` returns `200 ignored` and does not touch Cloudflare.
- Cloudflare API errors are logged and still return `200` to Uptime Kuma.

The status cache is memory-only. After restart, the first webhook per monitor runs once again and rebuilds cache.

## Uptime Kuma webhook body

Configure Uptime Kuma to send custom JSON:

```json
{
  "monitorKey": "{{ name }}",
  "status": "{{ status }}"
}
```

`monitorKey` is the config key. The old `monitorId` field is still accepted for compatibility.
Uptime Kuma renders `status` as text such as `✅ Up` or `🔴 Down`; the notification test button renders `⚠️ Test`, which this service rejects because it is not a real UP/DOWN event.

## Config

Copy `config.example.yaml` to `config.yaml` and edit records:

```yaml
cloudflare:
  apiToken: "cloudflare-api-token"

server:
  host: 127.0.0.1
  port: 8787

records:
  "node-a":
    zoneId: "cloudflare-zone-id"
    name: "app.example.com"
    type: "A"
    content: "1.2.3.4"
    ttl: 60
    proxied: false
```

Cloudflare token needs DNS edit permission for the configured zone.

## Run

```bash
bun install
bun run start
```

Use another config path:

```bash
CONFIG_PATH=/path/to/config.yaml bun run start
```

Endpoint:

```text
POST /webhook/uptime-kuma
```

## Test

```bash
bun test
bun run typecheck
```
