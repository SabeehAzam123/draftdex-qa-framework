# tests/

| Folder | Project | What |
| --- | --- | --- |
| `api/<module>/*.api.spec.ts` | `api` | API flows: no browser |
| `ui/<module>/*.ui.spec.ts` | `ui` | UI flows in Chrome |
| `_internal/*.internal.spec.ts` | `internal` | The framework's self-tests: no app, browser or network |
| `_setup/app-check.setup.ts` | `app-check` | Runs before api and ui: one clear message if the app is down |

A flow lives in its module's folder (`draft.pick` → `tests/api/draft/`); a self-test checks.
