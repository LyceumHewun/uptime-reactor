# Completion Checklist

Before finishing code changes:

```powershell
bun test
bun run typecheck
```

Also verify behavior against agreed rules:
- Unknown monitor ID returns 200 ignored.
- Unsupported numeric status returns 200 ignored.
- Invalid JSON or missing/non-numeric fields return 400.
- Cloudflare errors are logged, not surfaced to Uptime Kuma.
- DOWN deletes all duplicate matching records.
- UP is idempotent when matching record exists.
- Same monitor queue keeps only latest pending task.