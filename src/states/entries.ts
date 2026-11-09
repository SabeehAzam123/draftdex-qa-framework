import { teamName } from "@/data/factories";
import { defineState } from "@/prereq/define";

export const pending = defineState({
    id: "entry.pending",
    title: "The coach has applied to the league",
    requires: ["league.registration", "account.coach"],
    providers: {
        api: {
            build: async (ctx) => {
                const league = ctx.get("league.registration");
                const coach = ctx.get("account.coach");
                const entry = await ctx.api.as(coach).entries.apply(league.id, teamName());
                ctx.record({ type: "entry", id: entry.id, label: entry.teamName });
                return { id: entry.id, leagueId: league.id, teamName: entry.teamName, coach };
            },
        },
        ui: {
            build: async (ctx) => {
                const league = ctx.get("league.registration");
                const coach = ctx.get("account.coach");
                const { pages } = ctx.ui!;
                const name = teamName();
                await pages.signInAs(coach, `/leagues/${league.id}`);
                const id = await pages.league.apply(name);
                ctx.record({ type: "entry", id, label: name });
                return { id, leagueId: league.id, teamName: name, coach };
            },
        },
    },
});

export const approved = defineState({
    id: "entry.approved",
    title: "The coach is approved",
    requires: ["entry.pending"],
    providers: {
        api: {
            build: async (ctx) => {
                const entry = ctx.get("entry.pending");
                const { commissioner } = ctx.get("league.setup");
                await ctx.api.as(commissioner).entries.approve(entry.leagueId, entry.id);
                return entry;
            },
        },
        ui: {
            build: async (ctx) => {
                const entry = ctx.get("entry.pending");
                const { commissioner } = ctx.get("league.setup");
                const { pages } = ctx.ui!;
                await pages.signInAs(commissioner, `/leagues/${entry.leagueId}`);
                await pages.league.approve(entry.teamName);
                return entry;
            },
        },
    },
});

/** Background: a second approved coach so the draft can start. API only; no flow is about it. */
export const rival = defineState({
    id: "league.rival",
    title: "A second approved coach",
    requires: ["league.registration"],
    providers: {
        api: {
            build: async (ctx) => {
                const league = ctx.get("league.registration");
                const coach = await ctx.api.newAccount("rival");
                const entry = await ctx.api.as(coach).entries.apply(league.id, teamName());
                await ctx.api.as(league.commissioner).entries.approve(league.id, entry.id);
                ctx.record({ type: "entry", id: entry.id, label: entry.teamName });
                return { id: entry.id, leagueId: league.id, teamName: entry.teamName, coach };
            },
        },
    },
});
