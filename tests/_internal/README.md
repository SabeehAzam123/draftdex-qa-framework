# tests/_internal/

The framework's self-tests (`npm run test:internal`): no app, no browser, no network, a few seconds.

| File | Checks |
| --- | --- |
| `planner.internal.spec.ts` | The planner on a made-up graph: order, default API-first, pins, run requests, fallbacks with reasons, unavailable providers, cycles, unknown states |
| `framework.internal.spec.ts` | The real graph is sound; the catalog builds; flow ids are unique; each flow sits in its module's folder; API flows never plan the UI; config files are valid |
| `rules.internal.spec.ts` | No URLs, passwords or demo accounts in code; `process.env` only in `src/config`; no fixed sleeps; a README per folder; UI layers apart; nothing generated or secret tracked by git |
