# Suggested Commands

Development is on Windows/PowerShell.

Install dependencies:
```powershell
bun install
```

Run tests:
```powershell
bun test
```

Run TypeScript checks:
```powershell
bun run typecheck
```

Run service with default `config.yaml` (Cloudflare token is configured in the YAML file):
```powershell
bun run start
```

Run service with custom config path:
```powershell
$env:CONFIG_PATH="C:\\path\\to\\config.yaml"
bun run start
```

Useful Windows commands:
```powershell
Get-ChildItem -Force
Get-ChildItem -Recurse -File
Get-Content -Raw <path>
git status --short
```