import { MON } from "@/data/factories";
import { expectApiError } from "@/support/expect-api";
import { expect, test } from "@/support/fixtures";
import { flow } from "@/support/flow";

const needsTwo = flow.define({
    id: "draft.start-needs-coaches",
    title: "A draft needs two approved coaches and no pending applications",
    module: "draft",
    kind: "api",
    requires: ["entry.approved"],
});
test(...flow.case(needsTwo, async ({ given, api }) => {
    const entry = given("entry.approved");
    const commissioner = api.as(given("league.setup").commissioner);
    await expectApiError(commissioner.leagues.startDraft(entry.leagueId), 409, "LEAGUE_NOT_ENOUGH_COACHES");
    const waiting = await api.newAccount("waiting");
    await api.as(waiting).entries.apply(entry.leagueId, "Waiting Room");
    const pending = await expectApiError(commissioner.leagues.startDraft(entry.leagueId), 409, "ENTRY_PENDING_EXISTS");
    expect(pending.message).toBe("Approve or reject the 1 pending application(s) first");
    await expectApiError(api.as(entry.coach).leagues.startDraft(entry.leagueId), 403, "RBAC_FORBIDDEN");
}));

const badOrder = flow.define({
    id: "draft.start-order",
    title: "A given draft order must list every approved coach exactly once",
    module: "draft",
    kind: "api",
    requires: ["entry.approved", "league.rival"],
});
test(...flow.case(badOrder, async ({ given, api }) => {
    const coach = given("entry.approved");
    const rival = given("league.rival");
    const commissioner = api.as(given("league.setup").commissioner);
    await expectApiError(commissioner.leagues.startDraft(coach.leagueId, [coach.id, coach.id]), 422, "DRAFT_ORDER_INVALID");
    const state = await commissioner.leagues.startDraft(coach.leagueId, [rival.id, coach.id]);
    expect(state.order.map((o) => o.entryId)).toEqual([rival.id, coach.id]);
}));

const snake = flow.define({
    id: "draft.snake-order",
    title: "The order snakes: it reverses every round",
    module: "draft",
    kind: "api",
    requires: ["league.drafting"],
});
test(...flow.case(snake, async ({ given, api }) => {
    const d = given("league.drafting");
    const state = await api.as(given("account.coach")).draft.state(d.leagueId);
    const [A, B] = [d.coachEntryId, d.rivalEntryId];
    // 2 coaches x 3 rounds: A B | B A | A B
    expect([state.current!.entryId, ...state.upcoming.map((u) => u.entryId)]).toEqual([A, B, B, A, A, B]);
    expect(state.me).toEqual({ entryId: A, isMyTurn: true, canManage: false });
}));

const banned = flow.define({
    id: "draft.pick-banned",
    title: "Banned and unknown Pokémon can't be drafted",
    module: "draft",
    kind: "api",
    requires: ["league.drafting"],
});
test(...flow.case(banned, async ({ given, api }) => {
    const d = given("league.drafting");
    const coach = api.as(given("account.coach"));
    await expectApiError(coach.draft.pick(d.leagueId, MON.mewtwo.id), 409, "DRAFT_POKEMON_BANNED");
    await expectApiError(coach.draft.pick(d.leagueId, 5000), 404, "DRAFT_NOT_IN_POOL");
    const outsider = await api.newAccount("outsider");
    await expectApiError(api.as(outsider).draft.pick(d.leagueId, MON.pikachu.id), 403, "RBAC_FORBIDDEN");
}));

const overBudget = flow.define({
    id: "draft.pick-over-budget",
    title: "A pick is refused if it would leave the coach unable to fill their roster",
    module: "draft",
    kind: "api",
    requires: ["entry.approved", "league.rival"],
});
test(...flow.case(overBudget, async ({ given, api }) => {
    const coach = given("entry.approved");
    const rival = given("league.rival");
    const commissioner = api.as(given("league.setup").commissioner);
    // 20 points for 3 picks: the first may cost at most 20 - 2 x 1 = 18
    await commissioner.leagues.update(coach.leagueId, { settings: { budget: 20 } });
    const state = await commissioner.leagues.startDraft(coach.leagueId, [coach.id, rival.id]);
    expect(state.teams.find((t) => t.entryId === coach.id)?.maxForNextPick).toBe(18);
    const err = await expectApiError(api.as(coach.coach).draft.pick(coach.leagueId, MON.garchomp.id), 422, "DRAFT_OVER_BUDGET");
    expect(err.message).toContain("can spend at most 18 on this pick");
}));

const byCommissioner = flow.define({
    id: "draft.commissioner-picks",
    title: "The commissioner can pick for the coach on the clock",
    module: "draft",
    kind: "api",
    requires: ["league.drafting"],
});
test(...flow.case(byCommissioner, async ({ given, api }) => {
    const d = given("league.drafting");
    const state = await api.as(given("league.setup").commissioner).draft.pick(d.leagueId, MON.magikarp.id);
    expect(state.picks[0]).toMatchObject({ entryId: d.coachEntryId, pickedBy: "commissioner", pokemon: { name: MON.magikarp.name } });
}));

const skip = flow.define({
    id: "draft.skip",
    title: "Skipping a pick moves the coach's turn to the end of the draft",
    module: "draft",
    kind: "api",
    requires: ["league.drafting"],
});
test(...flow.case(skip, async ({ given, api }) => {
    const d = given("league.drafting");
    await expectApiError(api.as(given("account.coach")).draft.skip(d.leagueId), 403, "RBAC_FORBIDDEN");
    const state = await api.as(given("league.setup").commissioner).draft.skip(d.leagueId);
    expect(state.current).toMatchObject({ slotNo: 2, entryId: d.rivalEntryId });
    expect(state.skipped).toEqual([expect.objectContaining({ slotNo: 1, entryId: d.coachEntryId, status: "skipped" })]);
    expect(state.upcoming.at(-1)).toMatchObject({ slotNo: 7, kind: "makeup", entryId: d.coachEntryId });
}));

const race = flow.define({
    id: "draft.pick-race",
    title: "Two simultaneous picks of the same Pokémon: exactly one wins",
    module: "draft",
    kind: "api",
    requires: ["league.drafting"],
});
test(...flow.case(race, async ({ given, api }) => {
    const d = given("league.drafting");
    const commissioner = api.as(given("league.setup").commissioner);
    const results = await Promise.allSettled([commissioner.draft.pick(d.leagueId, MON.garchomp.id), commissioner.draft.pick(d.leagueId, MON.garchomp.id)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const lost = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    await expectApiError(Promise.reject(lost.reason), 409, "DRAFT_POKEMON_TAKEN");
    expect((await commissioner.draft.state(d.leagueId)).picks).toHaveLength(1);
}));

const complete = flow.define({
    id: "draft.complete",
    title: "Filling the last slot ends the draft and starts the season",
    module: "draft",
    kind: "api",
    requires: ["league.season"],
    pins: { "league.season": "api" },
});
test(...flow.case(complete, async ({ given, api }) => {
    const season = given("league.season");
    const coach = api.as(given("account.coach"));
    const state = await coach.draft.state(season.leagueId);
    expect(state).toMatchObject({ status: "season", current: null, upcoming: [] });
    expect(state.picks).toHaveLength(6);
    expect(state.teams.every((t) => t.picksMade === 3 && t.spent <= state.settings.budget)).toBe(true);
    expect((await coach.leagues.get(season.leagueId)).status).toBe("season");
    await expectApiError(coach.draft.pick(season.leagueId, MON.garchomp.id), 409, "LEAGUE_INVALID_STATE");
}));

const timer = flow.define({
    id: "draft.timer-skip",
    title: "When the pick timer runs out, the turn is skipped and made up at the end",
    module: "draft",
    kind: "api",
    requires: ["entry.approved", "league.rival"],
    tags: ["@slow"],
});
test(...flow.case(timer, async ({ given, api }) => {
    test.setTimeout(60_000);
    const coach = given("entry.approved");
    const rival = given("league.rival");
    const commissioner = api.as(given("league.setup").commissioner);
    await commissioner.leagues.update(coach.leagueId, { settings: { pickTimerSeconds: 10 } });
    const started = await commissioner.leagues.startDraft(coach.leagueId, [coach.id, rival.id]);
    expect(started.current?.deadline, "the first pick has a deadline").not.toBeNull();
    // The clock is settled on the next read after the deadline: poll the board
    await expect
        .poll(async () => (await commissioner.draft.state(coach.leagueId)).skipped.length, { timeout: 25_000, intervals: [1000] })
        .toBeGreaterThanOrEqual(1);
    const state = await commissioner.draft.state(coach.leagueId);
    expect(state.skipped[0]).toMatchObject({ slotNo: 1, entryId: coach.id });
    expect(state.upcoming.some((u) => u.kind === "makeup" && u.entryId === coach.id) || state.current?.kind === "makeup").toBe(true);
}));
