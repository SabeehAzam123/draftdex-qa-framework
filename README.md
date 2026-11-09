# DraftDex QA Framework

A **Playwright + TypeScript** test framework built around a **typed prerequisite engine**: each test declares the app state it needs ("a draft under way, with this coach on the clock"), and the framework plans and builds that state, through the API by default or through the UI when the test is about those screens, and reports how and why.

It tests **[DraftDex](https://github.com/SabeehAzam123/draftdex)**, a Pokémon draft-league app: accounts and roles, leagues, a tier list, registration with an entry-fee ledger, and a snake draft with a points budget and a pick timer.

**Stack:** Playwright Test · TypeScript (strict, `noUncheckedIndexedAccess`) · zod · YAML config · faker · tsx

## At a glance

- **97 end-to-end flows** (57 API, 40 UI) covering every rule of DraftDex, from sign-up through the draft, the season, trades and the prize payout, plus **24 self-tests** of the framework itself.
- **Prerequisite engine:** states with `api` / `ui` / `existing` providers; a **pure planner** (API first, UI fallback, flow pins, per-run requests, every choice with a reason); a failed setup step is reported as **BLOCKED**, not as the feature failing; a flow this environment can't run is **skipped with the reason**.
- **`npm run plan`** previews exactly what a flow will set up and why, without running anything.
- **Tags are the single source of truth.** `flow.define` writes `@flow:`, `@module:`, `@requires:` and `@pin:` tags; `npm run catalog` reads every flow back from `playwright test --list`. No registry to keep in step.
- **Strict zod contracts** on every reply: a field added, renamed or dropped fails with its path.
- **API flows never start a browser**; UI flows use page-object **interfaces** (a Classic UI implementation comes in phase 3, behind the same interfaces).
- **Self-tests enforce the rules:** no URLs or passwords in code, `process.env` read in one place, no fixed sleeps, a README in every folder, nothing generated tracked by git.

## Run it

**Needs:** Node.js 22+ and DraftDex running locally (`npm install && npm run dev` in its repo; no database to install).

```bash
npm install
cp .env.example .env              # the admin account for admin flows (DraftDex's local demo admin)
npm run test:internal             # self-tests: no app needed, ~5 s
npm test                          # everything: self-tests, API flows, UI flows (~3 min)
```

Set `DRAFTDEX_APP_DIR=../draftdex` in `.env` and the run starts DraftDex itself if it isn't up. Local runs use your installed Chrome (`config/defaults.yaml`); `npm run browsers` installs Playwright's Chromium instead.

| Command | What it runs |
| --- | --- |
| `npm run test:api` / `test:ui` / `test:internal` | One project |
| `npm run test:smoke` | Flows tagged `@smoke` |
| `npx playwright test --grep @module:draft` | One module (any tag works: `@flow:draft.pick`, `@requires:league.drafting`) |
| `npm run test:headed` | UI flows with the browser visible |
| `npm run catalog -- --table` | Every flow, its kind, requirements and pins |
| `npm run plan -- draft.pick` | What a flow would set up, how and why |
| `npm run report` | The last HTML report |
| `npm run lint` | TypeScript |

## A flow

```ts
const overBudget = flow.define({
    id: "draft.pick-over-budget",
    title: "A pick is refused if it would leave the coach unable to fill their roster",
    module: "draft",
    kind: "api",
    requires: ["entry.approved", "league.rival"],
});
test(...flow.case(overBudget, async ({ given, api }) => {
    const coach = given("entry.approved");
    const commissioner = api.as(given("league.setup").commissioner);
    await commissioner.leagues.update(coach.leagueId, { settings: { budget: 20 } });
    await commissioner.leagues.startDraft(coach.leagueId, [coach.id, given("league.rival").id]);
    const err = await expectApiError(api.as(coach.coach).draft.pick(coach.leagueId, MON.garchomp.id), 422, "DRAFT_OVER_BUDGET");
    expect(err.message).toContain("can spend at most 18 on this pick");
}));
```

Before the body runs, the engine signs up a commissioner and a coach, creates a league, opens registration, has the coach apply and be approved, and adds a rival coach, each as its own `PREREQ ›` step in the report. Pin a step to `ui` and the same setup happens through the screens:

```text
$ npm run plan -- draft.ui-first-pick
 1. account.commissioner  api       default
 ...
 8. league.drafting       ui        pinned by the flow
 9. draft.first-pick      ui        pinned by the flow
```

## Coverage

| Module | API | UI | Highlights |
| --- | ---: | ---: | --- |
| auth | 7 | 4 | sign-up/in/out, validation, one answer for wrong password and unknown email, Bearer vs cookie, JSON-only writes |
| league | 7 | 5 | defaults, rule validation, commissioner-only, fee locked once paid, cancel refunds, created entirely through the UI |
| pool | 6 | 3 | default tiers, all-or-nothing updates, CSV import errors by line, read-only for coaches, locked after the draft |
| entry | 6 | 6 | fees into the prize pool, duplicate names, full league, insufficient credits, approve/reject/withdraw refunds |
| draft | 13 | 7 | snake order, turn, banned/taken, the budget rule, commissioner picks and skips, **a simultaneous-pick race**, **the pick timer (real clock)**, finishing the draft |
| season | 5 | 5 | the round-robin schedule, best-of-three and replay-link rules, confirm vs dispute, the commissioner's final word, standings, **the payout by place (140 / 60 from a 200 pool)** |
| trade | 4 | 3 | even swaps of owned Pokémon only, accept → approve swaps ownership, decline / cancel, **a stale trade can't be approved** |
| team | 2 | 1 | roster order, Showdown export text |
| notify | 3 | 2 | webhook URL masked and never returned, SSRF guard, commissioner-only |
| admin, pokemon, wallet | 4 | 4 | admin-only user management, self-guards, browsing, the ledger in the wallet |

## How it's organized

```text
config/          defaults.yaml + environments/*.yaml (no secrets: accounts name .env variables)
src/
├── config/      RunConfig: the only reader of process.env
├── core/http/   the HTTP client (Playwright request context), ApiError, ContractError
├── contracts/   strict zod schemas for every reply
├── services/    one class per API family
├── prereq/      defineState, the planner, the resolver
├── states/      every prerequisite state and the registry
├── ui/          page-object interfaces + the New UI's locators and pages
├── support/     the flow DSL, fixtures, expectApiError
├── data/        test-data factories, named Pokémon
├── catalog/     the flow catalog
└── cli/         npm run catalog / plan
tests/
├── api/<module>/     API flows (no browser)
├── ui/<module>/      UI flows
├── _internal/        self-tests
└── _setup/           app check before api and ui
docs/            ARCHITECTURE.md, PREREQ_ENGINE.md
```

Every folder has a README with its rules (and a template where it helps). Start with [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/PREREQ_ENGINE.md](docs/PREREQ_ENGINE.md).

## Roadmap

1. ✅ DraftDex app core, with unit tests (in the app repo)
2. ✅ This framework's core, and end-to-end flows for everything in it
3. ✅ DraftDex's season, results, standings, trades and payouts, with unit tests and flows
4. **Groundwork:** the engine (planner, flow DSL, catalog, plan, config, HTTP client, self-tests) moves into its own product, a package plus `npm create groundwork` to start testing any app or website. This repo becomes the first project built on it
5. DraftDex's Classic UI, and every UI flow running on both UIs behind the same page-object interfaces
6. In Groundwork: network capture per step, secret masking, a post-run leak check, a repetition gate, CI with a published report, and one Streamlit runner for every Groundwork project
7. Bug Lab (switchable planted bugs in the app) and a `learn/` path from manual testing to writing flows; BDD scenarios return here as the on-ramp
8. Hosted demo and screenshots
