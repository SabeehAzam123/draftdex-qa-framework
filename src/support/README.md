# src/support/

- `flow.ts`: the flow DSL (`flow.define`, `flow.case`). See [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md#flows).
- `fixtures.ts`: `test` with `run` (per worker), `api` and `ui` (per test). API flows never request `page`, so no browser starts for them.
- `expect-api.ts`: `expectApiError(attempt, status, code)` checks a refusal's status, code, error-body contract and trace id.
