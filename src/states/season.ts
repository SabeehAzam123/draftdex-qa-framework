import { expect } from "@playwright/test";
import { defineState } from "@/prereq/define";
import type { ProviderContext } from "@/prereq/context";

/**
 * Season states work on the flow's own league (the one league.drafting built), so they also
 * require it: with league.season built from the demo data instead, they'd fail clearly as BLOCKED.
 */

async function theMatch(ctx: ProviderContext) {
    const draft = ctx.get("league.drafting");
    const coach = ctx.api.as(ctx.get("account.coach"));
    const schedule = await coach.season.schedule(draft.leagueId);
    const m = schedule.weeks.flatMap((w) => w.matches).find((x) => [x.home.entryId, x.away.entryId].includes(draft.coachEntryId));
    if (!m) throw new Error("The coach has no match in this league's schedule");
    const coachSide = m.home.entryId === draft.coachEntryId ? ("home" as const) : ("away" as const);
    // The coach wins 2–1
    const [homeWins, awayWins] = coachSide === "home" ? [2, 1] : [1, 2];
    return { draft, m, coachSide, homeWins, awayWins };
}

export const reported = defineState({
    id: "match.reported",
    title: "The coach reported a win over the rival",
    requires: ["league.season", "league.drafting"],
    providers: {
        api: {
            build: async (ctx) => {
                const { draft, m, coachSide, homeWins, awayWins } = await theMatch(ctx);
                await ctx.api.as(ctx.get("account.coach")).season.report(draft.leagueId, m.id, homeWins, awayWins);
                return { leagueId: draft.leagueId, matchId: m.id, coachEntryId: draft.coachEntryId, rivalEntryId: draft.rivalEntryId, coachSide, homeWins, awayWins };
            },
        },
        ui: {
            build: async (ctx) => {
                const { draft, m, coachSide, homeWins, awayWins } = await theMatch(ctx);
                const { pages } = ctx.ui!;
                await pages.signInAs(ctx.get("account.coach"));
                await pages.schedule.open(draft.leagueId);
                await pages.schedule.report(m.id, homeWins, awayWins);
                await expect(pages.schedule.status(m.id)).toHaveText("Awaiting confirmation");
                return { leagueId: draft.leagueId, matchId: m.id, coachEntryId: draft.coachEntryId, rivalEntryId: draft.rivalEntryId, coachSide, homeWins, awayWins };
            },
        },
    },
});

async function firstOfEach(ctx: ProviderContext) {
    const draft = ctx.get("league.drafting");
    const coach = ctx.api.as(ctx.get("account.coach"));
    const mine = await coach.teams.get(draft.leagueId, draft.coachEntryId);
    const theirs = await coach.teams.get(draft.leagueId, draft.rivalEntryId);
    const give = [mine.roster[0]!.pokemon.id];
    const get = [theirs.roster[0]!.pokemon.id];
    return { draft, give, get };
}

export const proposed = defineState({
    id: "trade.proposed",
    title: "The coach offered the rival a 1-for-1 trade",
    requires: ["league.season", "league.drafting"],
    providers: {
        api: {
            build: async (ctx) => {
                const { draft, give, get } = await firstOfEach(ctx);
                const t = await ctx.api.as(ctx.get("account.coach")).trades.propose(draft.leagueId, { toEntryId: draft.rivalEntryId, give, get });
                ctx.record({ type: "trade", id: t.id, label: `${t.give[0]?.name} for ${t.get[0]?.name}` });
                return { leagueId: draft.leagueId, tradeId: t.id, fromEntryId: draft.coachEntryId, toEntryId: draft.rivalEntryId, give, get };
            },
        },
        ui: {
            build: async (ctx) => {
                const { draft, give, get } = await firstOfEach(ctx);
                const { pages } = ctx.ui!;
                await pages.signInAs(ctx.get("account.coach"));
                await pages.trades.open(draft.leagueId);
                const tradeId = await pages.trades.propose({ partnerEntryId: draft.rivalEntryId, give, get });
                ctx.record({ type: "trade", id: tradeId, label: "1-for-1" });
                return { leagueId: draft.leagueId, tradeId, fromEntryId: draft.coachEntryId, toEntryId: draft.rivalEntryId, give, get };
            },
        },
    },
});

export const accepted = defineState({
    id: "trade.accepted",
    title: "The rival accepted the trade",
    requires: ["trade.proposed", "league.rival"],
    providers: {
        api: {
            build: async (ctx) => {
                const t = ctx.get("trade.proposed");
                await ctx.api.as(ctx.get("league.rival").coach).trades.act(t.leagueId, t.tradeId, "accept");
                return t;
            },
        },
        ui: {
            build: async (ctx) => {
                const t = ctx.get("trade.proposed");
                const { pages } = ctx.ui!;
                await pages.signInAs(ctx.get("league.rival").coach);
                await pages.trades.open(t.leagueId);
                await pages.trades.act(t.tradeId, "accept");
                return t;
            },
        },
    },
});
