import { expectApiError } from "@/support/expect-api";
import { expect, test } from "@/support/fixtures";
import { flow } from "@/support/flow";

// A syntactically valid Discord webhook. Never called by these flows: they only set and read it.
const HOOK_TOKEN = "e2e-not-a-real-token";
const hookUrl = (id: string) => `https://discord.com/api/webhooks/${id}/${HOOK_TOKEN}`;

const masked = flow.define({
    id: "notify.webhook-masked",
    title: "A league's webhook URL is never shown back in full, and only to the commissioner",
    module: "notify",
    kind: "api",
    requires: ["league.setup", "account.coach"],
});
test(...flow.case(masked, async ({ given, api }) => {
    const league = given("league.setup");
    const c = api.as(league.commissioner);
    const saved = await c.leagues.setWebhook(league.id, hookUrl("1234"));
    expect(saved.webhook).toEqual({ configured: true, masked: "https://discord.com/api/webhooks/****" });
    const raw = await c.client.send("GET", `/leagues/${league.id}`);
    expect(raw.text, "the token never appears in a reply").not.toContain(HOOK_TOKEN);
    expect((await api.as(given("account.coach")).leagues.get(league.id)).webhook).toBeNull();
    expect((await c.leagues.setWebhook(league.id, null)).webhook).toEqual({ configured: false, masked: null });
}));

const guarded = flow.define({
    id: "notify.webhook-guarded",
    title: "Webhooks only go to allowed hosts over https (no internal addresses)",
    module: "notify",
    kind: "api",
    requires: ["league.setup"],
});
test(...flow.case(guarded, async ({ given, api }) => {
    const league = given("league.setup");
    const c = api.as(league.commissioner);
    for (const url of ["https://169.254.169.254/latest/meta-data", "https://evil.example/hook", "http://discord.com/api/webhooks/1/x", "https://user:pw@discord.com/api/webhooks/1/x"]) {
        await expectApiError(c.leagues.setWebhook(league.id, url), 422, "WEBHOOK_URL_NOT_ALLOWED");
    }
}));

const testMessage = flow.define({
    id: "notify.test-needs-webhook",
    title: "Sending a test message needs a webhook and the commissioner",
    module: "notify",
    kind: "api",
    requires: ["league.setup", "account.coach"],
});
test(...flow.case(testMessage, async ({ given, api }) => {
    const league = given("league.setup");
    await expectApiError(api.as(league.commissioner).leagues.testWebhook(league.id), 409, "WEBHOOK_NOT_CONFIGURED");
    await expectApiError(api.as(given("account.coach")).leagues.testWebhook(league.id), 403, "RBAC_FORBIDDEN");
    await expectApiError(api.as(given("account.coach")).leagues.notifications(league.id), 403, "RBAC_FORBIDDEN");
    expect(await api.as(league.commissioner).leagues.notifications(league.id)).toEqual([]);
}));
