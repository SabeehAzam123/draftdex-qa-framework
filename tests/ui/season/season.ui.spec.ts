import { SHOWDOWN_REPLAY } from "@/data/factories";
import { expect, test } from "@/support/fixtures";
import { flow } from "@/support/flow";


const report = flow.define({
    id: "season.ui-report",
    title: "A coach reports a result with a replay link from the schedule",
    module: "season",
    kind: "ui",
    requires: ["league.season"],
    pins: { "league.season": "api" },
    tags: ["@smoke"],
});
test(...flow.case(report, async ({ given, ui, api }) => {
    const d = given("league.drafting");
    const coach = given("account.coach");
    const m = (await api.as(coach).season.schedule(d.leagueId)).weeks[0]!.matches[0]!;
    const [h, a] = m.home.entryId === d.coachEntryId ? [2, 0] : [0, 2];
    await ui.signInAs(coach);
    await ui.schedule.open(d.leagueId);
    await expect(ui.schedule.status(m.id)).toHaveText("To play");
    await ui.schedule.report(m.id, h, a, SHOWDOWN_REPLAY);
    await ui.toasts.expect("success", "Result reported");
    await expect(ui.schedule.status(m.id)).toHaveText("Awaiting confirmation");
    await expect(ui.schedule.score(m.id)).toHaveText(`${h} – ${a}`);
    await expect(ui.schedule.match(m.id).getByTestId("match-replay")).toHaveAttribute("href", SHOWDOWN_REPLAY);
    await expect(ui.schedule.action(m.id, "confirm")).toHaveCount(0);
}));

const confirm = flow.define({
    id: "season.ui-confirm",
    title: "The opponent confirms from the schedule, and the standings update",
    module: "season",
    kind: "ui",
    requires: ["match.reported"],
});
test(...flow.case(confirm, async ({ given, ui }) => {
    const r = given("match.reported");
    await ui.signInAs(given("league.rival").coach);
    await ui.schedule.open(r.leagueId);
    await ui.schedule.confirm(r.matchId);
    await expect(ui.schedule.status(r.matchId)).toHaveText("Confirmed");
    await expect(ui.schedule.summary()).toContainText("Every match is decided");
    await ui.standings.open(r.leagueId);
    await expect(ui.standings.row(r.coachEntryId)).toHaveAttribute("data-rank", "1");
    await expect(ui.standings.row(r.coachEntryId).getByTestId("standings-wins")).toHaveText("1");
}));

const dispute = flow.define({
    id: "season.ui-dispute-resolve",
    title: "A disputed result is settled by the commissioner from the schedule",
    module: "season",
    kind: "ui",
    requires: ["match.reported"],
});
test(...flow.case(dispute, async ({ given, ui }) => {
    const r = given("match.reported");
    await ui.signInAs(given("league.rival").coach);
    await ui.schedule.open(r.leagueId);
    await ui.schedule.dispute(r.matchId, "Game three was mine");
    await expect(ui.schedule.status(r.matchId)).toHaveText("Disputed");
    await expect(ui.schedule.match(r.matchId).getByTestId("match-dispute-reason")).toContainText("Game three was mine");

    await ui.signInAs(given("league.setup").commissioner);
    await ui.schedule.open(r.leagueId);
    await ui.schedule.resolve(r.matchId, 2, 1);
    await expect(ui.schedule.status(r.matchId)).toHaveText("Decided by commissioner");
}));

const complete = flow.define({
    id: "season.ui-complete",
    title: "The commissioner completes the season and the champion is paid",
    module: "season",
    kind: "ui",
    requires: ["match.reported"],
});
test(...flow.case(complete, async ({ given, ui, api }) => {
    const r = given("match.reported");
    await api.as(given("league.rival").coach).season.confirm(r.leagueId, r.matchId);
    await ui.signInAs(given("league.setup").commissioner, `/leagues/${r.leagueId}`);
    await expect(ui.league.seasonStatus()).toContainText("Every match is decided");
    await ui.league.completeSeason();
    await ui.standings.open(r.leagueId);
    await expect(ui.standings.champion()).toContainText("won 140 cr");
    await expect(ui.standings.row(r.coachEntryId).getByTestId("standings-prize")).toHaveText("140 cr");

    await ui.signInAs(given("account.coach"), "/wallet");
    await expect(ui.wallet.rows("prize").getByTestId("wallet-row-amount")).toHaveText("+140");
}));

const throughUi = flow.define({
    id: "season.ui-report-through-ui",
    title: "Reporting through the screens as the setup, confirming through the API",
    module: "season",
    kind: "ui",
    requires: ["match.reported"],
    pins: { "match.reported": "ui" },
});
test(...flow.case(throughUi, async ({ given, api }) => {
    const r = given("match.reported");
    const confirmed = await api.as(given("league.rival").coach).season.confirm(r.leagueId, r.matchId);
    expect(confirmed).toMatchObject({ status: "confirmed", winnerEntryId: r.coachEntryId });
}));
