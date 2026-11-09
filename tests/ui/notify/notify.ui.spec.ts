import { expect, test } from "@/support/fixtures";
import { flow } from "@/support/flow";

const webhook = flow.define({
    id: "notify.ui-webhook",
    title: "The commissioner sets the Discord webhook; it's shown masked, and bad hosts are refused",
    module: "notify",
    kind: "ui",
    requires: ["league.setup"],
});
test(...flow.case(webhook, async ({ given, ui, page }) => {
    const league = given("league.setup");
    await ui.signInAs(league.commissioner);
    await ui.settings.open(league.id);
    await expect(ui.settings.webhookCurrent()).toHaveText("not set");

    await ui.settings.saveWebhook("https://evil.example/hook");
    await expect(ui.settings.webhookError()).toContainText("isn't allowed");

    await ui.settings.saveWebhook("https://discord.com/api/webhooks/77/e2e-not-a-real-token");
    await expect(ui.settings.webhookCurrent()).toHaveText("https://discord.com/api/webhooks/****");
    await expect(page.getByText("e2e-not-a-real-token")).toHaveCount(0);
}));

const commissionerOnly = flow.define({
    id: "notify.ui-settings-commissioner-only",
    title: "Coaches don't see a league's settings",
    module: "notify",
    kind: "ui",
    requires: ["entry.pending"],
});
test(...flow.case(commissionerOnly, async ({ given, ui }) => {
    const entry = given("entry.pending");
    await ui.signInAs(entry.coach);
    await ui.league.open(entry.leagueId);
    await expect(ui.league.tab("settings")).toHaveCount(0);
    await ui.settings.open(entry.leagueId);
    await expect(ui.settings.forbidden()).toBeVisible();
}));
