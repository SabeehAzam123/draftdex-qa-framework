# config/

Settings that aren't secret. Checked by zod (`src/config/schema.ts`): a typo or an unknown key stops the run with the file and key named.

| File | What |
| --- | --- |
| `defaults.yaml` | Timeouts, retries, workers, browser, what to capture, which UI |
| `environments/<name>.yaml` | One per environment: its address, data policy, the **names** of the `.env` variables for accounts, how to start the app. Pick one with `TEST_ENV` (default `local`) |

Rules:

- **No secrets here.** Accounts name `.env` variables (`DRAFTDEX_ADMIN_EMAIL`), never values.
- Adding an environment is adding a file; no code changes.
- `dataPolicy: production` means flows can be previewed (`npm run plan`) but never run there.
