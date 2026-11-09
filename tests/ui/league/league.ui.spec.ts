import { leagueName } from "@/data/factories";
import { expect, test } from "@/support/fixtures";
import { flow } from "@/support/flow";

const create = flow.define({
    id: "league.ui-create",
    title: "A user creates a league from the form and becomes its commissioner",
    module: "league",
    kind: "ui",
    requires: ["account.commissioner"],
    tags: ["@smoke"],
});
test(...flow.case(create, async ({ given, ui, api, run }) => {
    const commissioner = given("account.commissioner");
    const name = leagueName(run);
    await ui.signInAs(commissioner);
    await ui.leagues.startNew();
    await ui.leagueForm.fill({ name, format: "doubles", budget: 90, rosterSize: 6, maxCoaches: 6, entryFee: 50, timer: 60, prizeSplit: [70, 30] });
    const id = await ui.leagueForm.create();

    await expect(ui.league.name()).toHaveText(name);
    await expect(ui.league.status()).toHaveText("Setting up");
    await expect(ui.league.tab("settings")).toBeVisible();
    // What the form saved is what the API reports
    expect((await api.as(commissioner).leagues.get(id)).settings).toEqual({
        budget: 90,
        rosterSize: 6,
        maxCoaches: 6,
        entryFee: 50,
        pickTimerSeconds: 60,
        prizeSplit: [70, 30],
    });
}));

const invalid = flow.define({
    id: "league.ui-create-invalid",
    title: "The league form shows the API's validation errors on the right fields",
    module: "league",
    kind: "ui",
    requires: ["account.commissioner"],
});
test(...flow.case(invalid, async ({ given, ui, run, page }) => {
    await ui.signInAs(given("account.commissioner"), "/leagues/new");
    await ui.leagueForm.fill({ name: leagueName(run), rosterSize: 2, prizeSplit: [50, 30, 0] });
    await ui.leagueForm.submit();
    await expect(ui.leagueForm.fieldError("roster-size")).toContainText("3");
    await expect(ui.leagueForm.fieldError("prize-split")).toHaveText("The split must add up to 100");
    await expect(page).toHaveURL(/\/leagues\/new$/);
}));

const throughUi = flow.define({
    id: "league.ui-set-up-and-open",
    title: "A league set up and opened entirely through the UI",
    module: "league",
    kind: "ui",
    requires: ["league.registration"],
    // The prerequisites are the point: build them through the screens instead of the API
    pins: { "league.setup": "ui", "league.registration": "ui" },
});
test(...flow.case(throughUi, async ({ given, ui }) => {
    const league = given("league.registration");
    await ui.league.open(league.id);
    await expect(ui.league.name()).toHaveText(league.name);
    await expect(ui.league.status()).toHaveText("Registration open");
    await expect(ui.league.action("start-draft")).toBeDisabled();
}));

const listMine = flow.define({
    id: "league.ui-my-leagues",
    title: "My leagues shows a coach's applications, All leagues shows open ones",
    module: "league",
    kind: "ui",
    requires: ["entry.pending"],
});
test(...flow.case(listMine, async ({ given, ui }) => {
    const entry = given("entry.pending");
    const league = given("league.setup");
    await ui.signInAs(entry.coach);
    await ui.leagues.open();
    await expect(ui.leagues.card(league.name).getByTestId("league-card-role")).toHaveText("Coach · pending");
    await ui.leagues.show("all");
    await ui.leagues.filterStatus("registration");
    await expect(ui.leagues.card(league.name)).toBeVisible();
    await ui.leagues.filterStatus("season");
    await expect(ui.leagues.card(league.name)).toBeHidden();
}));

const cancel = flow.define({
    id: "league.ui-cancel",
    title: "The commissioner cancels a league and coaches get their fee back",
    module: "league",
    kind: "ui",
    requires: ["entry.pending"],
});
test(...flow.case(cancel, async ({ given, ui, api }) => {
    const entry = given("entry.pending");
    await ui.signInAs(given("league.setup").commissioner, `/leagues/${entry.leagueId}`);
    await ui.league.cancelLeague();
    await expect(ui.league.prizePool()).toHaveText("0 cr");
    expect((await api.as(entry.coach).auth.me()).balance).toBe(1000);
}));
