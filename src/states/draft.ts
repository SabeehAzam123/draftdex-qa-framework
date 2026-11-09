import { expect } from "@playwright/test";
import { MON } from "@/data/factories";
import { defineState } from "@/prereq/define";

export const drafting = defineState({
    id: "league.drafting",
    title: "The draft has started, the coach first",
    requires: ["entry.approved", "league.rival"],
    providers: {
        api: {
            build: async (ctx) => {
                const coach = ctx.get("entry.approved");
                const rival = ctx.get("league.rival");
                const { commissioner } = ctx.get("league.setup");
                const order = [coach.id, rival.id];
                const state = await ctx.api.as(commissioner).leagues.startDraft(coach.leagueId, order);
                if (state.current?.entryId !== coach.id) throw new Error("The coach isn't first on the clock");
                return { leagueId: coach.leagueId, order, coachEntryId: coach.id, rivalEntryId: rival.id };
            },
        },
        ui: {
            build: async (ctx) => {
                const coach = ctx.get("entry.approved");
                const rival = ctx.get("league.rival");
                const { commissioner } = ctx.get("league.setup");
                const { pages } = ctx.ui!;
                await pages.signInAs(commissioner, `/leagues/${coach.leagueId}`);
                // "As listed" = application order: the coach applied before the rival
                await pages.league.startDraft("listed");
                return { leagueId: coach.leagueId, order: [coach.id, rival.id], coachEntryId: coach.id, rivalEntryId: rival.id };
            },
        },
    },
});

export const firstPick = defineState({
    id: "draft.first-pick",
    title: "The coach made the first pick",
    requires: ["league.drafting"],
    providers: {
        api: {
            build: async (ctx) => {
                const draft = ctx.get("league.drafting");
                const coach = ctx.get("account.coach");
                const state = await ctx.api.as(coach).draft.pick(draft.leagueId, MON.pikachu.id);
                const pick = state.picks.find((p) => p.slotNo === 1)!;
                return { leagueId: draft.leagueId, entryId: draft.coachEntryId, pokemonId: pick.pokemon.id, pokemonName: pick.pokemon.name, points: pick.points };
            },
        },
        ui: {
            build: async (ctx) => {
                const draft = ctx.get("league.drafting");
                const coach = ctx.get("account.coach");
                const { pages } = ctx.ui!;
                await pages.signInAs(coach, `/leagues/${draft.leagueId}/draft`);
                await expect(pages.draft.yourTurn()).toBeVisible();
                await pages.draft.pick(MON.pikachu);
                await expect(pages.draft.logEntry(1)).toContainText(MON.pikachu.name);
                return { leagueId: draft.leagueId, entryId: draft.coachEntryId, pokemonId: MON.pikachu.id, pokemonName: MON.pikachu.name, points: 1 };
            },
        },
    },
});
