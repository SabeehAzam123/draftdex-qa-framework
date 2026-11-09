import { expectApiError } from "@/support/expect-api";
import { expect, test } from "@/support/fixtures";
import { flow } from "@/support/flow";

const propose = flow.define({
    id: "trade.propose",
    title: "A coach offers a trade; it must be even, of Pokémon each side owns",
    module: "trade",
    kind: "api",
    requires: ["league.season"],
    pins: { "league.season": "api" },
});
test(...flow.case(propose, async ({ given, api }) => {
    const d = given("league.drafting");
    const coach = api.as(given("account.coach"));
    const mine = (await coach.teams.get(d.leagueId, d.coachEntryId)).roster.map((r) => r.pokemon.id);
    const theirs = (await coach.teams.get(d.leagueId, d.rivalEntryId)).roster.map((r) => r.pokemon.id);
    const to = d.rivalEntryId;

    await expectApiError(coach.trades.propose(d.leagueId, { toEntryId: to, give: [mine[0]!, mine[1]!], get: [theirs[0]!] }), 422, "TRADE_INVALID");
    await expectApiError(coach.trades.propose(d.leagueId, { toEntryId: to, give: [theirs[1]!], get: [theirs[0]!] }), 422, "TRADE_INVALID");
    await expectApiError(coach.trades.propose(d.leagueId, { toEntryId: d.coachEntryId, give: [mine[0]!], get: [mine[1]!] }), 422, "TRADE_INVALID");
    const outsider = await api.newAccount("outsider");
    await expectApiError(api.as(outsider).trades.propose(d.leagueId, { toEntryId: to, give: [mine[0]!], get: [theirs[0]!] }), 403, "RBAC_FORBIDDEN");

    const t = await coach.trades.propose(d.leagueId, { toEntryId: to, give: [mine[0]!], get: [theirs[0]!], note: "Fair?" });
    expect(t).toMatchObject({ status: "proposed", from: { entryId: d.coachEntryId }, to: { entryId: to }, note: "Fair?" });
    expect(t.me).toEqual({ canAccept: false, canDecline: false, canCancel: true, canApprove: false, canReject: false });
}));

const approve = flow.define({
    id: "trade.approve",
    title: "An accepted trade, approved by the commissioner, swaps the Pokémon",
    module: "trade",
    kind: "api",
    requires: ["trade.accepted"],
    tags: ["@smoke"],
});
test(...flow.case(approve, async ({ given, api }) => {
    const t = given("trade.accepted");
    await expectApiError(api.as(given("account.coach")).trades.act(t.leagueId, t.tradeId, "approve"), 403, "RBAC_FORBIDDEN");
    const done = await api.as(given("league.setup").commissioner).trades.act(t.leagueId, t.tradeId, "approve");
    expect(done.status).toBe("approved");

    const coach = api.as(given("account.coach"));
    const mine = await coach.teams.get(t.leagueId, t.fromEntryId);
    expect(mine.roster.map((r) => r.pokemon.id)).toContain(t.get[0]);
    expect(mine.roster.map((r) => r.pokemon.id)).not.toContain(t.give[0]);
    expect(mine.roster.find((r) => r.pokemon.id === t.get[0])?.viaTrade).toBe(true);
    // The tier list shows the new owner
    const taken = await coach.pool.list(t.leagueId, { status: "taken", pageSize: 200 });
    expect(taken.data.find((r) => r.pokemon.id === t.get[0])?.takenBy?.entryId).toBe(t.fromEntryId);
}));

const lifecycle = flow.define({
    id: "trade.decline-cancel",
    title: "The receiver can decline, the proposer can cancel, and a closed trade stays closed",
    module: "trade",
    kind: "api",
    requires: ["trade.proposed"],
});
test(...flow.case(lifecycle, async ({ given, api }) => {
    const t = given("trade.proposed");
    const rival = api.as(given("league.rival").coach);
    const coach = api.as(given("account.coach"));
    await expectApiError(coach.trades.act(t.leagueId, t.tradeId, "accept"), 403, "RBAC_FORBIDDEN");
    await expectApiError(rival.trades.act(t.leagueId, t.tradeId, "cancel"), 403, "RBAC_FORBIDDEN");
    expect((await rival.trades.act(t.leagueId, t.tradeId, "decline")).status).toBe("declined");
    await expectApiError(rival.trades.act(t.leagueId, t.tradeId, "accept"), 409, "TRADE_INVALID_STATE");

    const again = await coach.trades.propose(t.leagueId, { toEntryId: t.toEntryId, give: t.give, get: t.get });
    expect((await coach.trades.act(t.leagueId, again.id, "cancel")).status).toBe("cancelled");
    expect((await rival.trades.list(t.leagueId)).map((x) => x.status).sort()).toEqual(["cancelled", "declined"]);
}));

const stale = flow.define({
    id: "trade.stale",
    title: "A trade whose Pokémon already moved can't be approved",
    module: "trade",
    kind: "api",
    requires: ["trade.accepted"],
});
test(...flow.case(stale, async ({ given, api }) => {
    const t = given("trade.accepted");
    const coach = api.as(given("account.coach"));
    const rival = api.as(given("league.rival").coach);
    const commissioner = api.as(given("league.setup").commissioner);
    // A second offer for the same Pokémon, also accepted
    const theirs = (await coach.teams.get(t.leagueId, t.toEntryId)).roster.map((r) => r.pokemon.id);
    const second = await coach.trades.propose(t.leagueId, { toEntryId: t.toEntryId, give: t.give, get: [theirs[1]!] });
    await rival.trades.act(t.leagueId, second.id, "accept");
    await commissioner.trades.act(t.leagueId, t.tradeId, "approve");
    const err = await expectApiError(commissioner.trades.act(t.leagueId, second.id, "approve"), 409, "TRADE_STALE");
    expect(err.message).toContain("any more");
    expect((await commissioner.trades.act(t.leagueId, second.id, "reject")).status).toBe("rejected");
}));
