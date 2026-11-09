import { SHOWDOWN_REPLAY } from "@/data/factories";
import { expectApiError } from "@/support/expect-api";
import { expect, test } from "@/support/fixtures";
import { flow } from "@/support/flow";


const schedule = flow.define({
    id: "season.schedule",
    title: "When the draft ends, each pair of coaches gets a match",
    module: "season",
    kind: "api",
    requires: ["league.season"],
    pins: { "league.season": "api" },
    tags: ["@smoke"],
});
test(...flow.case(schedule, async ({ given, api }) => {
    const d = given("league.drafting");
    const s = await api.as(given("account.coach")).season.schedule(d.leagueId);
    expect(s).toMatchObject({ status: "season", openMatches: 1 });
    const m = s.weeks[0]!.matches[0]!;
    expect([m.home.entryId, m.away.entryId].sort()).toEqual([d.coachEntryId, d.rivalEntryId].sort());
    expect(m).toMatchObject({ status: "scheduled", homeWins: null, me: { canReport: true, canConfirm: false, canResolve: false } });
    const asCommissioner = await api.as(given("league.setup").commissioner).season.match(d.leagueId, m.id);
    expect(asCommissioner.me).toMatchObject({ side: null, canReport: false, canResolve: true });
}));

const reportRules = flow.define({
    id: "season.report-rules",
    title: "A result must be a valid best of three, with a real Showdown replay link, from a coach in the match",
    module: "season",
    kind: "api",
    requires: ["league.season"],
    pins: { "league.season": "api" },
});
test(...flow.case(reportRules, async ({ given, api }) => {
    const d = given("league.drafting");
    const coach = api.as(given("account.coach"));
    const m = (await coach.season.schedule(d.leagueId)).weeks[0]!.matches[0]!;
    for (const [h, a] of [[2, 2], [3, 0], [1, 1]] as const) await expectApiError(coach.season.report(d.leagueId, m.id, h, a), 422, "MATCH_SCORE_INVALID");
    await expectApiError(coach.season.report(d.leagueId, m.id, 2, 0, "https://evil.example/replay"), 422, "MATCH_REPLAY_INVALID");
    await expectApiError(api.as(given("league.setup").commissioner).season.report(d.leagueId, m.id, 2, 0), 403, "MATCH_NOT_PARTICIPANT");
    const reported = await coach.season.report(d.leagueId, m.id, 2, 0, SHOWDOWN_REPLAY);
    expect(reported).toMatchObject({ status: "reported", replayUrl: SHOWDOWN_REPLAY, reportedByEntryId: d.coachEntryId });
    await expectApiError(coach.season.report(d.leagueId, m.id, 2, 0), 409, "MATCH_INVALID_STATE");
    await expectApiError(coach.season.confirm(d.leagueId, m.id), 409, "MATCH_CANNOT_CONFIRM_OWN");
}));

const confirm = flow.define({
    id: "season.confirm",
    title: "The opponent confirms a reported result and it counts in the standings",
    module: "season",
    kind: "api",
    requires: ["match.reported"],
});
test(...flow.case(confirm, async ({ given, api }) => {
    const r = given("match.reported");
    const rival = api.as(given("league.rival").coach);
    expect((await rival.season.match(r.leagueId, r.matchId)).me).toMatchObject({ canConfirm: true, canDispute: true });
    expect((await rival.season.confirm(r.leagueId, r.matchId)).status).toBe("confirmed");
    const table = await rival.season.standings(r.leagueId);
    expect(table.rows[0]).toMatchObject({ entryId: r.coachEntryId, rank: 1, wins: 1, losses: 0, gamesWon: 2, gamesLost: 1, gameDiff: 1 });
    expect(table.rows[1]).toMatchObject({ entryId: r.rivalEntryId, wins: 0, losses: 1 });
}));

const dispute = flow.define({
    id: "season.dispute-resolve",
    title: "A disputed result waits for the commissioner, who has the final word",
    module: "season",
    kind: "api",
    requires: ["match.reported"],
});
test(...flow.case(dispute, async ({ given, api }) => {
    const r = given("match.reported");
    const rival = api.as(given("league.rival").coach);
    await expectApiError(rival.season.dispute(r.leagueId, r.matchId, "no"), 422, "VALIDATION_ERROR");
    expect(await rival.season.dispute(r.leagueId, r.matchId, "I won the third game")).toMatchObject({ status: "disputed", disputeReason: "I won the third game" });
    await expectApiError(api.as(given("account.coach")).season.resolve(r.leagueId, r.matchId, 2, 1), 403, "RBAC_FORBIDDEN");
    const [h, a] = r.coachSide === "home" ? [1, 2] : [2, 1];
    const resolved = await api.as(given("league.setup").commissioner).season.resolve(r.leagueId, r.matchId, h, a);
    expect(resolved).toMatchObject({ status: "resolved", winnerEntryId: r.rivalEntryId });
    await expectApiError(rival.season.confirm(r.leagueId, r.matchId), 409, "MATCH_INVALID_STATE");
}));

const complete = flow.define({
    id: "season.complete-payout",
    title: "Completing the season pays the prize pool out by place and empties it",
    module: "season",
    kind: "api",
    requires: ["match.reported"],
    tags: ["@smoke"],
});
test(...flow.case(complete, async ({ given, api }) => {
    const r = given("match.reported");
    const commissioner = api.as(given("league.setup").commissioner);
    const coach = api.as(given("account.coach"));
    await expectApiError(commissioner.season.complete(r.leagueId), 409, "SEASON_MATCHES_OPEN");
    await api.as(given("league.rival").coach).season.confirm(r.leagueId, r.matchId);
    await expectApiError(coach.season.complete(r.leagueId), 403, "RBAC_FORBIDDEN");

    // 2 coaches x 100 = 200 in the pool; split 60/30/10 with no 3rd place: 1st 140, 2nd 60
    const before = (await coach.auth.me()).balance;
    const final = await commissioner.season.complete(r.leagueId);
    expect(final).toMatchObject({ final: true, prizePool: 0, status: "completed" });
    expect(final.rows.map((x) => [x.entryId, x.prize])).toEqual([
        [r.coachEntryId, 140],
        [r.rivalEntryId, 60],
    ]);
    expect((await coach.auth.me()).balance).toBe(before + 140);
    expect((await coach.auth.wallet()).history[0]).toMatchObject({ kind: "prize", amount: 140, ref: r.leagueId });
    expect((await coach.leagues.get(r.leagueId)).status).toBe("completed");
    await expectApiError(commissioner.season.complete(r.leagueId), 409, "LEAGUE_INVALID_STATE");
}));
