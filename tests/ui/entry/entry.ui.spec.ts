import { teamName } from "@/data/factories";
import { expect, test } from "@/support/fixtures";
import { flow } from "@/support/flow";

const apply = flow.define({
    id: "entry.ui-apply",
    title: "A coach applies with a team name and the fee leaves their wallet",
    module: "entry",
    kind: "ui",
    requires: ["league.registration", "account.coach"],
    tags: ["@smoke"],
});
test(...flow.case(apply, async ({ given, ui }) => {
    const league = given("league.registration");
    const name = teamName();
    await ui.signInAs(given("account.coach"), `/leagues/${league.id}`);
    await ui.league.apply(name);
    await ui.toasts.expect("success", "Application sent");
    await expect(ui.league.entryStatus(name)).toHaveText("Pending");
    await expect(ui.shell.credits()).toHaveText("900 cr");
    await expect(ui.league.action("withdraw")).toBeVisible();
}));

const nameTaken = flow.define({
    id: "entry.ui-name-taken",
    title: "Applying with a team name already in the league shows why it was refused",
    module: "entry",
    kind: "ui",
    requires: ["entry.pending"],
});
test(...flow.case(nameTaken, async ({ given, ui, api }) => {
    const entry = given("entry.pending");
    const second = await api.newAccount("second");
    await ui.signInAs(second, `/leagues/${entry.leagueId}`);
    await ui.league.applyExpectingError(entry.teamName);
    await ui.toasts.expect("error", `Another team in this league is called "${entry.teamName}"`);
    await expect(ui.toasts.last().getByTestId("toast-trace")).toHaveText(/^trace [0-9a-f-]{36}$/);
    await expect(ui.shell.credits()).toHaveText("1,000 cr");
}));

const approve = flow.define({
    id: "entry.ui-approve",
    title: "The commissioner approves a waiting coach",
    module: "entry",
    kind: "ui",
    requires: ["entry.pending"],
});
test(...flow.case(approve, async ({ given, ui }) => {
    const entry = given("entry.pending");
    await ui.signInAs(given("league.setup").commissioner, `/leagues/${entry.leagueId}`);
    await expect(ui.league.entryStatus(entry.teamName)).toHaveText("Pending");
    await ui.league.approve(entry.teamName);
    await ui.toasts.expect("success", `${entry.teamName} approved`);
}));

const reject = flow.define({
    id: "entry.ui-reject",
    title: "The commissioner rejects a coach, who gets the fee back",
    module: "entry",
    kind: "ui",
    requires: ["entry.pending"],
});
test(...flow.case(reject, async ({ given, ui, api }) => {
    const entry = given("entry.pending");
    await ui.signInAs(given("league.setup").commissioner, `/leagues/${entry.leagueId}`);
    await ui.league.reject(entry.teamName);
    expect((await api.as(entry.coach).auth.me()).balance).toBe(1000);
}));

const withdraw = flow.define({
    id: "entry.ui-withdraw",
    title: "A coach withdraws before the draft and sees the refund",
    module: "entry",
    kind: "ui",
    requires: ["entry.approved"],
});
test(...flow.case(withdraw, async ({ given, ui }) => {
    const entry = given("entry.approved");
    await ui.signInAs(entry.coach, `/leagues/${entry.leagueId}`);
    await expect(ui.shell.credits()).toHaveText("900 cr");
    await ui.league.withdraw();
    await ui.toasts.expect("success", "fee was refunded");
    await expect(ui.league.entryStatus(entry.teamName)).toHaveText("Withdrawn");
    await expect(ui.shell.credits()).toHaveText("1,000 cr");
}));

const throughUi = flow.define({
    id: "entry.ui-join-through-ui",
    title: "Applying and approval, both through the screens",
    module: "entry",
    kind: "ui",
    requires: ["entry.approved"],
    pins: { "entry.pending": "ui", "entry.approved": "ui" },
});
test(...flow.case(throughUi, async ({ given, ui }) => {
    const entry = given("entry.approved");
    await ui.signInAs(entry.coach, `/leagues/${entry.leagueId}`);
    await expect(ui.league.entryStatus(entry.teamName)).toHaveText("Approved");
}));
