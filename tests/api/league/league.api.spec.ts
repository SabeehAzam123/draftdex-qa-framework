import { leagueName } from "@/data/factories";
import { expectApiError } from "@/support/expect-api";
import { expect, test } from "@/support/fixtures";
import { flow } from "@/support/flow";

const create = flow.define({
    id: "league.create",
    title: "Creating a league makes you its commissioner, with the default rules",
    module: "league",
    kind: "api",
    requires: ["account.commissioner"],
    tags: ["@smoke"],
});
test(...flow.case(create, async ({ given, api, run }) => {
    const commissioner = given("account.commissioner");
    const name = leagueName(run);
    const league = await api.as(commissioner).leagues.create({ name, settings: { budget: 120 } });
    expect(league).toMatchObject({
        name,
        status: "setup",
        format: "singles",
        settings: { budget: 120, rosterSize: 10, maxCoaches: 8, entryFee: 100, pickTimerSeconds: 0, prizeSplit: [60, 30, 10] },
        commissioner: { id: commissioner.id },
        prizePool: 0,
        webhook: { configured: false, masked: null },
        me: { canManage: true, entry: null },
    });
}));

const invalidSettings = flow.define({
    id: "league.create-invalid",
    title: "League rules are validated, with the failing field named",
    module: "league",
    kind: "api",
    requires: ["account.commissioner"],
});
test(...flow.case(invalidSettings, async ({ given, api, run }) => {
    const c = api.as(given("account.commissioner"));
    const split = await expectApiError(c.leagues.create({ name: leagueName(run), settings: { prizeSplit: [50, 30] } }), 422, "VALIDATION_ERROR");
    expect(split.details).toEqual([{ path: "settings.prizeSplit", message: "The split must add up to 100" }]);
    const roster = await expectApiError(c.leagues.create({ name: leagueName(run), settings: { rosterSize: 2 } }), 422, "VALIDATION_ERROR");
    expect(roster.details?.[0]?.path).toBe("settings.rosterSize");
}));

const commissionerOnly = flow.define({
    id: "league.commissioner-only",
    title: "Only the commissioner can change a league",
    module: "league",
    kind: "api",
    requires: ["league.setup", "account.coach"],
});
test(...flow.case(commissionerOnly, async ({ given, api }) => {
    const league = given("league.setup");
    await expectApiError(api.as(given("account.coach")).leagues.update(league.id, { name: "Hijacked League" }), 403, "RBAC_FORBIDDEN");
    await expectApiError(api.as(given("account.coach")).leagues.openRegistration(league.id), 403, "RBAC_FORBIDDEN");
    expect(await api.as(league.commissioner).leagues.update(league.id, { name: `${league.name} v2` })).toMatchObject({ name: `${league.name} v2` });
}));

const openRegistration = flow.define({
    id: "league.open-registration",
    title: "Registration opens once, from setup",
    module: "league",
    kind: "api",
    requires: ["league.setup"],
});
test(...flow.case(openRegistration, async ({ given, api }) => {
    const league = given("league.setup");
    const c = api.as(league.commissioner);
    expect((await c.leagues.openRegistration(league.id)).status).toBe("registration");
    const again = await expectApiError(c.leagues.openRegistration(league.id), 409, "LEAGUE_INVALID_STATE");
    expect(again.message).toBe("You can't open registration while the league is open for registration");
}));

const feeLocked = flow.define({
    id: "league.fee-locked",
    title: "The entry fee locks once a coach has paid it",
    module: "league",
    kind: "api",
    requires: ["entry.pending"],
});
test(...flow.case(feeLocked, async ({ given, api }) => {
    const { commissioner, id } = given("league.setup");
    const c = api.as(commissioner);
    await expectApiError(c.leagues.update(id, { settings: { entryFee: 10 } }), 409, "LEAGUE_SETTING_LOCKED");
    // Other rules can still change during registration
    expect((await c.leagues.update(id, { settings: { rosterSize: 4 } })).settings.rosterSize).toBe(4);
}));

const cancel = flow.define({
    id: "league.cancel",
    title: "Cancelling a league refunds every coach",
    module: "league",
    kind: "api",
    requires: ["entry.approved"],
});
test(...flow.case(cancel, async ({ given, api }) => {
    const entry = given("entry.approved");
    const { commissioner } = given("league.setup");
    const coach = api.as(entry.coach);
    expect((await coach.auth.me()).balance).toBe(900);
    const cancelled = await api.as(commissioner).leagues.cancel(entry.leagueId);
    expect(cancelled).toMatchObject({ status: "cancelled", prizePool: 0, counts: { approved: 0, pending: 0 } });
    expect((await coach.auth.me()).balance).toBe(1000);
    const wallet = await coach.auth.wallet();
    expect(wallet.history[0]).toMatchObject({ amount: 100, kind: "refund", ref: entry.id });
    await expectApiError(api.as(commissioner).leagues.cancel(entry.leagueId), 409, "LEAGUE_INVALID_STATE");
}));

const listMine = flow.define({
    id: "league.list-mine",
    title: "A coach's leagues list shows the leagues they applied to",
    module: "league",
    kind: "api",
    requires: ["entry.pending"],
});
test(...flow.case(listMine, async ({ given, api }) => {
    const entry = given("entry.pending");
    const mine = await api.as(entry.coach).leagues.list({ mine: true });
    expect(mine.data.map((l) => l.id)).toEqual([entry.leagueId]);
    expect(mine.data[0]?.me).toEqual({ canManage: false, entry: { id: entry.id, teamName: entry.teamName, status: "pending" } });
    const registration = await api.as(entry.coach).leagues.list({ status: "registration", pageSize: 50 });
    expect(registration.data.every((l) => l.status === "registration")).toBe(true);
}));
