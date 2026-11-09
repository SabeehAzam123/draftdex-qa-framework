import { MON } from "@/data/factories";
import { expectApiError } from "@/support/expect-api";
import { expect, test } from "@/support/fixtures";
import { flow } from "@/support/flow";

const pick = flow.define({
    id: "draft.pick",
    title: "The coach on the clock drafts a Pokémon, and the turn passes",
    module: "draft",
    kind: "api",
    requires: ["league.drafting"],
    tags: ["@smoke"],
});
test(...flow.case(pick, async ({ given, api }) => {
    const draft = given("league.drafting");
    const state = await api.as(given("account.coach")).draft.pick(draft.leagueId, MON.garchomp.id);
    expect(state.picks[0]).toMatchObject({ slotNo: 1, round: 1, entryId: draft.coachEntryId, points: 20, pickedBy: "coach", pokemon: { name: "Garchomp" } });
    expect(state.current).toMatchObject({ slotNo: 2, entryId: draft.rivalEntryId });
    expect(state.teams.find((t) => t.entryId === draft.coachEntryId)).toMatchObject({ spent: 20, budgetLeft: 80, picksMade: 1 });
}));

const outOfTurn = flow.define({
    id: "draft.pick-out-of-turn",
    title: "A coach can't pick when it isn't their turn",
    module: "draft",
    kind: "api",
    requires: ["league.drafting"],
});
test(...flow.case(outOfTurn, async ({ given, api }) => {
    const draft = given("league.drafting");
    const rival = given("league.rival");
    await expectApiError(api.as(rival.coach).draft.pick(draft.leagueId, MON.pikachu.id), 409, "DRAFT_NOT_YOUR_TURN");
    const state = await api.as(rival.coach).draft.state(draft.leagueId);
    expect(state.picks, "nothing was drafted").toHaveLength(0);
}));

const taken = flow.define({
    id: "draft.pick-taken",
    title: "A Pokémon can be drafted only once per league",
    module: "draft",
    kind: "api",
    requires: ["draft.first-pick"],
});
test(...flow.case(taken, async ({ given, api }) => {
    const first = given("draft.first-pick");
    const rival = given("league.rival");
    const err = await expectApiError(api.as(rival.coach).draft.pick(first.leagueId, first.pokemonId), 409, "DRAFT_POKEMON_TAKEN");
    expect(err.message).toContain(`${first.pokemonName} was already drafted`);
}));
