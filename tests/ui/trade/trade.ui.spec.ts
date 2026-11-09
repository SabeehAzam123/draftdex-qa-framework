import { expect, test } from "@/support/fixtures";
import { flow } from "@/support/flow";

const propose = flow.define({
    id: "trade.ui-propose",
    title: "A coach picks Pokémon on both sides and offers a trade",
    module: "trade",
    kind: "ui",
    requires: ["trade.proposed"],
    pins: { "trade.proposed": "ui" },
});
test(...flow.case(propose, async ({ given, ui }) => {
    const t = given("trade.proposed");
    await expect(ui.trades.status(t.tradeId)).toHaveText("Waiting for the other coach");
    await expect(ui.trades.actionButton(t.tradeId, "cancel")).toBeVisible();
    await expect(ui.trades.actionButton(t.tradeId, "accept")).toHaveCount(0);
}));

const acceptApprove = flow.define({
    id: "trade.ui-accept-approve",
    title: "The other coach accepts and the commissioner approves; the Pokémon change teams",
    module: "trade",
    kind: "ui",
    requires: ["trade.accepted"],
    pins: { "trade.accepted": "ui" },
    tags: ["@smoke"],
});
test(...flow.case(acceptApprove, async ({ given, ui }) => {
    const t = given("trade.accepted");
    await expect(ui.trades.status(t.tradeId)).toHaveText("Waiting for the commissioner");

    await ui.signInAs(given("league.setup").commissioner);
    await ui.trades.open(t.leagueId);
    await ui.trades.act(t.tradeId, "approve");
    await expect(ui.trades.status(t.tradeId)).toHaveText("Done");

    await ui.signInAs(given("account.coach"));
    await ui.team.open(t.leagueId, t.fromEntryId);
    await expect(ui.team.rosterCard({ id: t.get[0]! }).getByTestId("roster-via-trade")).toBeVisible();
    await expect(ui.team.rosterCard({ id: t.give[0]! })).toHaveCount(0);
}));

const outsider = flow.define({
    id: "trade.ui-coaches-only",
    title: "Someone who isn't a coach in the league can see trades but not propose one",
    module: "trade",
    kind: "ui",
    requires: ["trade.proposed"],
});
test(...flow.case(outsider, async ({ given, ui, api }) => {
    const t = given("trade.proposed");
    await ui.signInAs(await api.newAccount("visitor"));
    await ui.trades.open(t.leagueId);
    await expect(ui.trades.trade(t.tradeId)).toBeVisible();
    await expect(ui.trades.cannotPropose()).toHaveText("Only coaches in this league can propose trades.");
}));
