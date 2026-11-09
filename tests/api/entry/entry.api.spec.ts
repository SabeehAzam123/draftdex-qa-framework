import { leagueName, teamName } from "@/data/factories";
import { expectApiError } from "@/support/expect-api";
import { expect, test } from "@/support/fixtures";
import { flow } from "@/support/flow";

const apply = flow.define({
    id: "entry.apply",
    title: "Applying to a league charges the entry fee into its prize pool",
    module: "entry",
    kind: "api",
    requires: ["league.registration", "account.coach"],
    tags: ["@smoke"],
});
test(...flow.case(apply, async ({ given, api }) => {
    const league = given("league.registration");
    const coach = api.as(given("account.coach"));
    const name = teamName();
    const entry = await coach.entries.apply(league.id, name);
    expect(entry).toMatchObject({ teamName: name, status: "pending", coach: { id: given("account.coach").id } });
    expect((await coach.auth.me()).balance).toBe(900);
    expect((await coach.leagues.get(league.id)).prizePool).toBe(100);
    expect((await coach.auth.wallet()).history[0]).toMatchObject({ amount: -100, kind: "entry_fee", ref: entry.id });
}));

const applyTwice = flow.define({
    id: "entry.apply-twice",
    title: "A coach can apply to a league only once, and team names are unique in a league",
    module: "entry",
    kind: "api",
    requires: ["entry.pending"],
});
test(...flow.case(applyTwice, async ({ given, api }) => {
    const entry = given("entry.pending");
    await expectApiError(api.as(entry.coach).entries.apply(entry.leagueId, teamName()), 409, "ENTRY_ALREADY_EXISTS");
    const other = await api.newAccount("other");
    await expectApiError(api.as(other).entries.apply(entry.leagueId, entry.teamName.toUpperCase()), 409, "ENTRY_TEAM_NAME_TAKEN");
}));

const full = flow.define({
    id: "entry.league-full",
    title: "A full league refuses more applications",
    module: "entry",
    kind: "api",
    requires: ["league.registration"],
});
test(...flow.case(full, async ({ given, api }) => {
    const league = given("league.registration");
    await api.as(league.commissioner).leagues.update(league.id, { settings: { maxCoaches: 2 } });
    for (let i = 0; i < 2; i++) await api.as(await api.newAccount("filler")).entries.apply(league.id, teamName());
    const late = await expectApiError(api.as(await api.newAccount("late")).entries.apply(league.id, teamName()), 409, "ENTRY_LEAGUE_FULL");
    expect(late.message).toBe("This league is full (2 coaches)");
    // and the limit can't drop below the applicants
    await expectApiError(api.as(league.commissioner).leagues.update(league.id, { settings: { maxCoaches: 2, entryFee: 5 } }), 409, "LEAGUE_SETTING_LOCKED");
}));

const broke = flow.define({
    id: "entry.insufficient-credits",
    title: "A coach who can't pay the entry fee is refused",
    module: "entry",
    kind: "api",
    requires: ["league.registration", "account.coach"],
});
test(...flow.case(broke, async ({ given, api, run }) => {
    const league = given("league.registration");
    const commissioner = api.as(league.commissioner);
    const coach = api.as(given("account.coach"));
    // Spend all 1,000 credits on one league…
    await commissioner.leagues.update(league.id, { settings: { entryFee: 1000 } });
    await coach.entries.apply(league.id, teamName());
    // …then try another
    const second = await commissioner.leagues.create({ name: leagueName(run), settings: { entryFee: 50 } });
    await commissioner.leagues.openRegistration(second.id);
    const err = await expectApiError(coach.entries.apply(second.id, teamName()), 422, "ENTRY_INSUFFICIENT_CREDITS");
    expect(err.message).toBe("The entry fee is 50 credits; you have 0");
}));

const decide = flow.define({
    id: "entry.approve-reject",
    title: "The commissioner approves or rejects; a rejection refunds the fee",
    module: "entry",
    kind: "api",
    requires: ["entry.pending"],
});
test(...flow.case(decide, async ({ given, api }) => {
    const entry = given("entry.pending");
    const commissioner = api.as(given("league.setup").commissioner);
    const coach = api.as(entry.coach);
    await expectApiError(coach.entries.approve(entry.leagueId, entry.id), 403, "RBAC_FORBIDDEN");

    expect((await commissioner.entries.reject(entry.leagueId, entry.id)).status).toBe("rejected");
    expect((await coach.auth.me()).balance).toBe(1000);
    await expectApiError(commissioner.entries.approve(entry.leagueId, entry.id), 409, "ENTRY_INVALID_STATE");

    // A rejected coach may apply again (and pays again), then be approved
    const again = await coach.entries.apply(entry.leagueId, entry.teamName);
    expect(again).toMatchObject({ id: entry.id, status: "pending" });
    expect((await coach.auth.me()).balance).toBe(900);
    expect((await commissioner.entries.approve(entry.leagueId, entry.id)).status).toBe("approved");
    const list = await coach.entries.list(entry.leagueId);
    expect(list.find((e) => e.id === entry.id)?.status).toBe("approved");
}));

const withdraw = flow.define({
    id: "entry.withdraw",
    title: "A coach can leave before the draft and gets the fee back",
    module: "entry",
    kind: "api",
    requires: ["entry.approved"],
});
test(...flow.case(withdraw, async ({ given, api }) => {
    const entry = given("entry.approved");
    const coach = api.as(entry.coach);
    await expectApiError(api.as(given("league.setup").commissioner).entries.withdraw(entry.leagueId, entry.id), 403, "RBAC_FORBIDDEN");
    expect((await coach.entries.withdraw(entry.leagueId, entry.id)).status).toBe("withdrawn");
    expect((await coach.auth.me()).balance).toBe(1000);
    expect((await coach.leagues.get(entry.leagueId)).prizePool).toBe(0);
    await expectApiError(coach.entries.withdraw(entry.leagueId, entry.id), 409, "ENTRY_INVALID_STATE");
}));
