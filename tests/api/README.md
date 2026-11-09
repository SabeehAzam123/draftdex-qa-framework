# tests/api/

API flows, one folder per module. Template:

```ts
import { expect, test } from "@/support/fixtures";
import { flow } from "@/support/flow";

const pick = flow.define({
    id: "draft.pick",                       // <module>.<name>
    title: "The coach on the clock drafts a Pokémon",
    module: "draft",
    kind: "api",
    requires: ["league.drafting"],          // built before the body runs
});
test(...flow.case(pick, async ({ given, api }) => {
    const draft = given("league.drafting");
    const state = await api.as(given("account.coach")).draft.pick(draft.leagueId, 445);
    expect(state.current?.entryId).toBe(draft.rivalEntryId);
}));
```

Refusals: `await expectApiError(call, 409, "DRAFT_NOT_YOUR_TURN")` (from `@/support/expect-api`).
