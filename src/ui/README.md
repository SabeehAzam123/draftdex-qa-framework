# src/ui/

- `types.ts`: **what a test can do on each screen**, as interfaces (`LoginPage`, `DraftPage`, …). Specs and states only ever use these.
- `new/`: the New UI's implementation. Per area, a `*.locators.ts` (selectors only, all `data-testid`) and a `*.page.ts` (the steps).
- `index.ts`: `createUi(page, variant)` picks the implementation. Phase 3 adds `classic/` behind the same interfaces, so every UI flow runs on both.

Rules:

- **Wait on signals, never on time.** An action is done when the API call it triggers has answered (`expectOk(page, call("POST", /\/draft\/picks$/), click)`), or when a retrying assertion holds.
- **Return locators; don't read values once.** Tests assert with `expect(locator)`, which retries until the page catches up. (A one-off read of the current pick number raced the board's refresh: that's why `DraftPage.current()` is a locator.)
- Find rows by id (`data-pokemon-id`, `data-entry-id`), never by fuzzy text.
