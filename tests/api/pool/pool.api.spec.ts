import { MON } from "@/data/factories";
import { expectApiError } from "@/support/expect-api";
import { expect, test } from "@/support/fixtures";
import { flow } from "@/support/flow";

const defaults = flow.define({
    id: "pool.defaults",
    title: "A new league's tier list costs every species by its base stats, legendaries banned",
    module: "pool",
    kind: "api",
    requires: ["league.setup"],
    tags: ["@smoke"],
});
test(...flow.case(defaults, async ({ given, api }) => {
    const league = given("league.setup");
    const c = api.as(league.commissioner);
    expect(await c.pool.row(league.id, MON.garchomp.name)).toMatchObject({ points: 20, banned: false, takenBy: null });
    expect(await c.pool.row(league.id, MON.magikarp.name)).toMatchObject({ points: 1, banned: false });
    expect(await c.pool.row(league.id, MON.mewtwo.name)).toMatchObject({ banned: true });
    const summary = await c.pool.summary(league.id);
    expect(summary.banned).toBe(94);
    expect(summary.tiers.reduce((n, t) => n + t.n, 0) + summary.banned).toBe(1025);
    const banned = await c.pool.list(league.id, { status: "banned", pageSize: 200 });
    expect(banned.data.every((r) => r.pokemon.isLegendary || r.pokemon.isMythical)).toBe(true);
}));

const update = flow.define({
    id: "pool.update",
    title: "The commissioner changes costs and bans",
    module: "pool",
    kind: "api",
    requires: ["league.setup"],
});
test(...flow.case(update, async ({ given, api }) => {
    const league = given("league.setup");
    const c = api.as(league.commissioner);
    expect(await c.pool.update(league.id, [{ pokemonId: MON.garchomp.id, points: 15 }, { pokemonId: MON.mewtwo.id, banned: false }])).toEqual({ updated: 2 });
    expect((await c.pool.row(league.id, MON.garchomp.name)).points).toBe(15);
    expect((await c.pool.row(league.id, MON.mewtwo.name)).banned).toBe(false);
}));

const allOrNothing = flow.define({
    id: "pool.update-all-or-nothing",
    title: "A batch with one unknown Pokémon changes nothing",
    module: "pool",
    kind: "api",
    requires: ["league.setup"],
});
test(...flow.case(allOrNothing, async ({ given, api }) => {
    const league = given("league.setup");
    const c = api.as(league.commissioner);
    const err = await expectApiError(c.pool.update(league.id, [{ pokemonId: MON.garchomp.id, points: 3 }, { pokemonId: 99999, points: 3 }]), 422, "VALIDATION_ERROR");
    expect(err.details).toEqual([{ path: "changes.pokemonId", message: "No Pokémon #99999" }]);
    expect((await c.pool.row(league.id, MON.garchomp.name)).points, "the valid change was rolled back too").toBe(20);
}));

const importCsv = flow.define({
    id: "pool.import-csv",
    title: "A tier list imports from CSV, all or nothing, with errors by line",
    module: "pool",
    kind: "api",
    requires: ["league.setup"],
});
test(...flow.case(importCsv, async ({ given, api }) => {
    const league = given("league.setup");
    const c = api.as(league.commissioner);
    const err = await expectApiError(c.pool.importCsv(league.id, "dex,points\n445,12\nNotAMon,4\n25,99\n"), 422, "POOL_IMPORT_INVALID");
    expect(err.details).toEqual([
        { path: "line 3", message: 'Unknown Pokémon "NotAMon"' },
        { path: "line 4", message: "Points must be 1–20, got 99" },
    ]);
    expect((await c.pool.row(league.id, MON.garchomp.name)).points).toBe(20);

    expect(await c.pool.importCsv(league.id, "dex,points\n445,12\npikachu,4\nMEWTWO,banned\n")).toEqual({ updated: 3 });
    expect((await c.pool.row(league.id, MON.pikachu.name)).points).toBe(4);
}));

const coachReadOnly = flow.define({
    id: "pool.coach-read-only",
    title: "Coaches can read the tier list but not change it",
    module: "pool",
    kind: "api",
    requires: ["entry.pending"],
});
test(...flow.case(coachReadOnly, async ({ given, api }) => {
    const entry = given("entry.pending");
    const coach = api.as(entry.coach);
    expect((await coach.pool.row(entry.leagueId, MON.garchomp.name)).points).toBe(20);
    await expectApiError(coach.pool.update(entry.leagueId, [{ pokemonId: MON.garchomp.id, points: 1 }]), 403, "RBAC_FORBIDDEN");
}));

const locked = flow.define({
    id: "pool.locked-after-draft",
    title: "The tier list locks when the draft starts",
    module: "pool",
    kind: "api",
    requires: ["league.drafting"],
});
test(...flow.case(locked, async ({ given, api }) => {
    const draft = given("league.drafting");
    const c = api.as(given("league.setup").commissioner);
    await expectApiError(c.pool.update(draft.leagueId, [{ pokemonId: MON.garchomp.id, points: 1 }]), 409, "LEAGUE_INVALID_STATE");
    await expectApiError(c.pool.importCsv(draft.leagueId, "445,1"), 409, "LEAGUE_INVALID_STATE");
}));
