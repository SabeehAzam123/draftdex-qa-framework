import { leagueName, TEST_LEAGUE_SETTINGS } from "@/data/factories";
import { defineState } from "@/prereq/define";

export const setup = defineState({
    id: "league.setup",
    title: "A league being set up",
    requires: ["account.commissioner"],
    providers: {
        api: {
            build: async (ctx) => {
                const commissioner = ctx.get("account.commissioner");
                const league = await ctx.api.as(commissioner).leagues.create({ name: leagueName(ctx.run), format: "singles", settings: TEST_LEAGUE_SETTINGS });
                ctx.record({ type: "league", id: league.id, label: league.name });
                return { id: league.id, name: league.name, commissioner };
            },
        },
        ui: {
            build: async (ctx) => {
                const commissioner = ctx.get("account.commissioner");
                const { pages } = ctx.ui!;
                const name = leagueName(ctx.run);
                const s = TEST_LEAGUE_SETTINGS;
                await pages.signInAs(commissioner, "/leagues/new");
                await pages.leagueForm.fill({
                    name,
                    format: "singles",
                    budget: s.budget!,
                    rosterSize: s.rosterSize!,
                    maxCoaches: s.maxCoaches!,
                    entryFee: s.entryFee!,
                    timer: s.pickTimerSeconds!,
                });
                const id = await pages.leagueForm.create();
                ctx.record({ type: "league", id, label: name });
                return { id, name, commissioner };
            },
        },
    },
});

export const registration = defineState({
    id: "league.registration",
    title: "The league, open for registration",
    requires: ["league.setup"],
    providers: {
        api: {
            build: async (ctx) => {
                const league = ctx.get("league.setup");
                await ctx.api.as(league.commissioner).leagues.openRegistration(league.id);
                return league;
            },
        },
        ui: {
            build: async (ctx) => {
                const league = ctx.get("league.setup");
                const { pages } = ctx.ui!;
                await pages.signInAs(league.commissioner, `/leagues/${league.id}`);
                await pages.league.openRegistration();
                return league;
            },
        },
    },
});

/**
 * A drafted league. "api" drafts a fresh one to the end (the cheapest available Pokémon each time);
 * "existing" uses the app's demo league, for read-only flows that don't need their own.
 */
export const season = defineState({
    id: "league.season",
    title: "A league whose draft is complete",
    requires: [],
    providers: {
        api: {
            requires: ["league.drafting"],
            build: async (ctx) => {
                const draft = ctx.get("league.drafting");
                const { commissioner } = ctx.get("league.setup");
                const as = ctx.api.as(commissioner);
                let state = await as.draft.state(draft.leagueId);
                for (let guard = 0; state.current && guard < 100; guard++) {
                    const team = state.teams.find((t) => t.entryId === state.current!.entryId)!;
                    const options = await as.pool.list(draft.leagueId, { status: "available", maxPoints: Math.min(20, team.maxForNextPick), sort: "dex", pageSize: 1 });
                    const mon = options.data[0];
                    if (!mon) throw new Error(`Nothing affordable left for ${team.teamName}`);
                    state = await as.draft.pick(draft.leagueId, mon.pokemon.id);
                }
                if (state.status !== "season") throw new Error(`The draft didn't finish (status ${state.status})`);
                return { leagueId: draft.leagueId, name: state.leagueName };
            },
        },
        existing: {
            requires: ["account.coach"],
            build: async (ctx) => {
                const viewer = ctx.api.as(ctx.get("account.coach"));
                const res = await viewer.leagues.list({ status: "season", pageSize: 50 });
                const league = res.data.find((l) => l.name === "Friends Doubles S2") ?? res.data[0];
                if (!league) throw new Error("No league in its season: load the app's demo data (npm run db:reset)");
                return { leagueId: league.id, name: league.name };
            },
        },
    },
});
