import { leagueName, MON } from "@/data/factories";
import { expectApiError } from "@/support/expect-api";
import { expect, test } from "@/support/fixtures";
import { flow } from "@/support/flow";

const showdown = flow.define({
    id: "team.roster-and-showdown",
    title: "A roster lists picks in order and exports as Showdown text",
    module: "team",
    kind: "api",
    requires: ["league.drafting"],
});
test(...flow.case(showdown, async ({ given, api }) => {
    const d = given("league.drafting");
    const coach = api.as(given("account.coach"));
    const rival = api.as(given("league.rival").coach);
    await coach.draft.pick(d.leagueId, MON.garchomp.id);
    await rival.draft.pick(d.leagueId, MON.pikachu.id);
    await rival.draft.pick(d.leagueId, MON.magikarp.id);
    await coach.draft.pick(d.leagueId, MON.nidoranF.id);

    const team = await rival.teams.get(d.leagueId, d.coachEntryId);
    expect(team.roster.map((r) => [r.slotNo, r.round, r.pokemon.name])).toEqual([
        [1, 1, "Garchomp"],
        [4, 2, "Nidoran♀"],
    ]);
    expect(team).toMatchObject({ spent: 21, budgetLeft: 79, league: { status: "drafting", rosterSize: 3 } });

    const text = await rival.teams.showdown(d.leagueId, d.coachEntryId);
    expect(text.contentType).toMatch(/^text\/plain/);
    expect(text.text).toBe("Garchomp\n\nNidoran-F\n");
}));

const wrongLeague = flow.define({
    id: "team.wrong-league",
    title: "A team is found only in its own league",
    module: "team",
    kind: "api",
    requires: ["entry.approved"],
});
test(...flow.case(wrongLeague, async ({ given, api, run }) => {
    const entry = given("entry.approved");
    const commissioner = api.as(given("league.setup").commissioner);
    const other = await commissioner.leagues.create({ name: leagueName(run) });
    await expectApiError(commissioner.teams.get(other.id, entry.id), 404, "ENTRY_NOT_FOUND");
    expect((await commissioner.teams.get(entry.leagueId, entry.id)).roster).toEqual([]);
}));
