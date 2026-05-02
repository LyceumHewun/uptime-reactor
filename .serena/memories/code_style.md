# Code Style

- Bun + TypeScript ESM.
- Strict TypeScript enabled via `tsconfig.json`.
- Keep modules small and behavior explicit.
- Prefer standard APIs (`Bun.serve`, `fetch`) over frameworks.
- YAML parsing uses `yaml` package.
- Tests use Bun built-in test runner.
- No speculative abstractions. Match existing simple style.
- Do not log secrets; Cloudflare token is read from `config.yaml`.