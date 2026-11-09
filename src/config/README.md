# src/config/

- `schema.ts`: zod schemas for `config/defaults.yaml` and `config/environments/*.yaml`, the run request, and the `RunConfig` type.
- `env.ts`: `loadRunConfig()`, the **only** reader of `process.env` (a self-test enforces it). It merges the YAML files, resolves account variable names to values, reads the run variables (`TEST_ENV`, `DRAFTDEX_UI`, `DRAFTDEX_RUN_REQUEST`, `DRAFTDEX_HEADED`, `DRAFTDEX_APP_DIR`) and refuses a `production` environment.

A missing account doesn't stop the run: the planner marks the provider unavailable, and flows that need it are skipped with the reason.
