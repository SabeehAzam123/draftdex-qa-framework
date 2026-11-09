# Architecture

How the framework fits together, as of 2026-11-09 (phase 2: framework core + end-to-end tests for DraftDex phase 1a).

## Layers

```text
tests/                      flows: one thing a user can do, declared once, run as a Playwright test
  └─ src/support/flow.ts    the DSL: requires, pins, tags → catalog
       ├─ src/prereq/       plans and builds the prerequisite states the flow requires
       │    └─ src/states/  every state, with api / ui / existing providers
       ├─ src/services/     API families (auth, leagues, entries, pool, draft, teams, …)
       │    ├─ src/core/http/api-client.ts   one HTTP client (Playwright request context)
       │    └─ src/contracts/                strict zod schemas for every reply
       └─ src/ui/           page-object interfaces; src/ui/new implements them
src/config/                 the RunConfig: config/*.yaml + run variables (the only process.env reader)
src/catalog/, src/cli/      the flow catalog and the plan preview
```

Arrows only point down. Specs never touch `fetch` or selectors; they speak in services and page-object interfaces.

## Flows

A flow is declared once:

```ts
const pick = flow.define({
    id: "draft.pick",
    title: "The coach on the clock drafts a Pokémon, and the turn passes",
    module: "draft",
    kind: "api",
    requires: ["league.drafting"],
    tags: ["@smoke"],
});
test(...flow.case(pick, async ({ given, api }) => { ... }));
```

- `define` checks the id (`<module>.<name>`), then **plans the flow at load time**. An unknown state, a cycle or an impossible pin fails `playwright test --list`, not a run three hours later.
- The declaration becomes tags: `@flow:draft.pick @module:draft @kind:api @requires:league.drafting`, plus `@pin:<state>:<provider>` and extras. `npm run catalog` reads the flows back from `--list`, so **there's no registry to keep in step**.
- `case` builds Playwright's `test(title, details, body)`. The body's fixtures are written out in its parameter list, which is how Playwright decides what to set up. **API flows don't ask for `page`, so no browser starts for them.**
- Before the body runs, the flow's plan is built (with this run's request and provider availability) and executed. The body reads results with `given("league.drafting")`. Asking for a state the flow didn't require is an error.

## A run

```text
playwright.config.ts → loadRunConfig() → projects:
  internal   tests/_internal   self-tests, no app
  app-check  tests/_setup      one health check: a clear message if DraftDex is down
  api        tests/api         depends on app-check
  ui         tests/ui          depends on app-check (Chrome locally, bundled Chromium in CI)
```

- `DRAFTDEX_APP_DIR` lets the run start the app itself (Playwright's `webServer`, reusing one that's already up).
- Every worker shares one run id (`shareRunId()` in the config), which goes into test-data names.
- Reports: `reports/html` (HTML with traces on failure), `reports/results.json`, `reports/junit.xml`.

## Where every value lives

| Value | Where |
| --- | --- |
| Addresses, timeouts, browser, capture, UI | `config/defaults.yaml`, `config/environments/<name>.yaml` |
| Account emails and passwords | `.env` only; the YAML holds the variable **names** |
| Which environment / UI / providers for a run | `TEST_ENV`, `DRAFTDEX_UI`, `DRAFTDEX_RUN_REQUEST` |
| Test data | Generated per run (`src/data/factories.ts`); named Pokémon in `MON` |
| What a reply must look like | `src/contracts/` |
| Selectors | `src/ui/new/*.locators.ts`, all `data-testid` |

Self-tests enforce the boundaries: no URLs or passwords in code, `process.env` only in `src/config`, no fixed sleeps, UI layers apart, a README per folder, nothing generated tracked by git.

## Waiting

Nothing waits on time. A UI action is done when the API call it triggers has answered (`expectOk(page, call("POST", /\/entries$/), click)`), and checks use Playwright's retrying `expect(locator)`. Page objects return locators instead of reading values once: a one-off read of the current pick raced the draft board's refresh in the first run, so `DraftPage.current()` is a locator.

## The API client's two guards

- **Bearer only.** Playwright's request context keeps cookies from every reply, so after a sign-up an "anonymous" call would quietly be signed in. The client sends an explicit empty `cookie` header, which stops that; a flow checks it.
- **Bytes for raw bodies.** With a JSON content type, Playwright re-encodes a string that isn't valid JSON as a JSON string literal, so "broken JSON" tests would send valid JSON. Raw bodies go out as a `Buffer`.

## Coming next

Phase 3 adds DraftDex's Classic UI and `src/ui/classic/` behind the same interfaces. Phase 4 adds network capture, masking, a leak check, the repetition gate and CI. Phase 5 adds the Streamlit runner, which reads `npm run catalog` and `npm run plan -- --json`.
