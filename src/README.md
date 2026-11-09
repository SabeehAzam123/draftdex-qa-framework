# src/

The framework. Tests (`tests/`) use it; nothing here is a test.

| Folder | What |
| --- | --- |
| `config/` | Builds the RunConfig from `config/` and the run variables. **The only place that reads `process.env`** |
| `core/` | The HTTP client, `checkReply` and the error types |
| `contracts/` | zod schemas for every DraftDex reply (strict) |
| `services/` | One class per API family (auth, leagues, entries, pool, draft, teams, …) |
| `prereq/` | The prerequisite engine: `defineState`, the planner, the resolver |
| `states/` | Every prerequisite state DraftDex flows can ask for, and the registry |
| `ui/` | Page-object interfaces (`types.ts`) and the New UI's implementation (`new/`) |
| `support/` | The `flow` DSL, fixtures, `expectApiError` |
| `data/` | Test-data factories and named Pokémon |
| `catalog/` | Builds the flow catalog from `playwright test --list` |
| `cli/` | `npm run catalog`, `npm run plan` |

Imports use the `@/` alias (`@/services`, `@/ui`). Specs and states import UI code only from `@/ui`, never from a specific UI (a self-test checks).
