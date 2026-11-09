import { MON } from "@/data/factories";
import { expect, test } from "@/support/fixtures";
import { flow } from "@/support/flow";

const start = flow.define({
    id: "draft.ui-start",
    title: "The commissioner starts the draft from the overview",
    module: "draft",
    kind: "ui",
    requires: ["league.drafting"],
    pins: { "league.drafting": "ui" },
});
test(...flow.case(start, async ({ given, ui }) => {
    const d = given("league.drafting");
    await ui.draft.open(d.leagueId);
    await expect(ui.draft.onTheClock()).toContainText("is on the clock");
    await expect(ui.draft.current()).toHaveAttribute("data-slot", "1");
}));

const pick = flow.define({
    id: "draft.ui-pick",
    title: "The coach on the clock drafts from the board and the turn passes",
    module: "draft",
    kind: "ui",
    requires: ["league.drafting"],
    tags: ["@smoke"],
});
test(...flow.case(pick, async ({ given, ui }) => {
    const d = given("league.drafting");
    await ui.signInAs(given("account.coach"));
    await ui.draft.open(d.leagueId);
    await expect(ui.draft.yourTurn()).toBeVisible();
    await expect(ui.draft.maxPoints()).toHaveText("98 points");
    await ui.draft.pick(MON.garchomp);
    await ui.toasts.expect("success", "You drafted Garchomp!");
    await expect(ui.draft.logEntry(1)).toContainText("Garchomp");
    await expect(ui.draft.yourTurn()).toBeHidden();
    await expect(ui.draft.teamBudget(d.coachEntryId)).toHaveText("80");
}));

const waiting = flow.define({
    id: "draft.ui-wait-for-turn",
    title: "A coach who isn't on the clock can't pick, and the board updates when the turn comes",
    module: "draft",
    kind: "ui",
    requires: ["league.drafting"],
});
test(...flow.case(waiting, async ({ given, ui, api }) => {
    const d = given("league.drafting");
    const rival = given("league.rival");
    await ui.signInAs(rival.coach);
    await ui.draft.open(d.leagueId);
    await expect(ui.draft.yourTurn()).toBeHidden();
    await expect(ui.draft.pickButton(MON.pikachu)).toHaveCount(0);
    // The coach picks through the API; the rival's board refreshes on its own
    await api.as(given("account.coach")).draft.pick(d.leagueId, MON.pikachu.id);
    await expect(ui.draft.yourTurn()).toBeVisible({ timeout: 10_000 });
}));

const overBudget = flow.define({
    id: "draft.ui-over-budget",
    title: "Pokémon over the coach's budget can't be drafted from the board",
    module: "draft",
    kind: "ui",
    requires: ["entry.approved", "league.rival"],
});
test(...flow.case(overBudget, async ({ given, ui, api }) => {
    const coach = given("entry.approved");
    const commissioner = api.as(given("league.setup").commissioner);
    await commissioner.leagues.update(coach.leagueId, { settings: { budget: 20 } });
    await commissioner.leagues.startDraft(coach.leagueId, [coach.id, given("league.rival").id]);
    await ui.signInAs(coach.coach);
    await ui.draft.open(coach.leagueId);
    await expect(ui.draft.maxPoints()).toHaveText("18 points");
    await ui.draft.search(MON.garchomp.name);
    await expect(ui.draft.pickButton(MON.garchomp)).toBeDisabled();
    await expect(ui.draft.pickButton(MON.garchomp)).toHaveText("Over budget");
}));

const skip = flow.define({
    id: "draft.ui-skip",
    title: "The commissioner skips a pick, which moves to the end as a makeup pick",
    module: "draft",
    kind: "ui",
    requires: ["league.drafting"],
});
test(...flow.case(skip, async ({ given, ui }) => {
    const d = given("league.drafting");
    await ui.signInAs(given("league.setup").commissioner);
    await ui.draft.open(d.leagueId);
    await ui.draft.skip();
    await ui.toasts.expect("success", "pick was skipped");
    await expect(ui.draft.current()).toHaveAttribute("data-slot", "2");
    await expect(ui.draft.upcoming()).toContainText("makeup");
}));

const firstPickUi = flow.define({
    id: "draft.ui-first-pick",
    title: "The whole way to the first pick through the UI",
    module: "draft",
    kind: "ui",
    requires: ["draft.first-pick"],
    pins: { "league.drafting": "ui", "draft.first-pick": "ui" },
});
test(...flow.case(firstPickUi, async ({ given, ui }) => {
    const first = given("draft.first-pick");
    await ui.signInAs(given("league.rival").coach);
    await ui.draft.open(first.leagueId);
    await expect(ui.draft.logEntry(1)).toContainText(first.pokemonName);
    await expect(ui.draft.yourTurn()).toBeVisible();
}));

const complete = flow.define({
    id: "draft.ui-complete",
    title: "A finished draft shows every roster",
    module: "draft",
    kind: "ui",
    requires: ["league.season"],
    pins: { "league.season": "api" },
});
test(...flow.case(complete, async ({ given, ui, page }) => {
    const season = given("league.season");
    await ui.signInAs(given("account.coach"));
    await ui.draft.open(season.leagueId);
    await expect(ui.draft.complete()).toBeVisible();
    await expect(page.getByTestId("draft-final-rosters")).toBeVisible();
}));
