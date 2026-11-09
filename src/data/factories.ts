import { faker } from "@faker-js/faker";
import type { RunConfig } from "@/config/schema";
import type { LeagueSettings } from "@/contracts/leagues";

/**
 * Test data. Every value is unique per run (run id + a random suffix), so workers running in
 * parallel never collide, and anything a run creates is easy to find afterwards (it carries "e2e").
 */

const suffix = () => faker.string.alphanumeric({ length: 5, casing: "lower" });
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export type NewAccount = { email: string; password: string; displayName: string };

export function newAccount(run: RunConfig, role: string): NewAccount {
    const tag = suffix();
    return {
        // .test is reserved for testing: these addresses can never reach a real inbox
        email: `e2e.${role}.${run.runId}.${tag}@draftdex.test`,
        password: `E2e-${faker.string.alphanumeric(8)}7`,
        displayName: `${faker.person.firstName()} ${faker.person.lastName()}`.slice(0, 40),
    };
}

export function leagueName(run: RunConfig): string {
    return `E2E ${cap(faker.word.adjective({ length: { min: 3, max: 9 } }))} League ${run.runId}-${suffix()}`;
}

export function teamName(): string {
    return `${cap(faker.color.human())} ${cap(faker.animal.type())}s ${suffix()}`.slice(0, 40);
}

/**
 * A league small enough to draft in a few calls: 3 rounds, up to 4 coaches.
 * Flows that need other rules change them in their own steps.
 */
export const TEST_LEAGUE_SETTINGS: Partial<LeagueSettings> = {
    budget: 100,
    rosterSize: 3,
    maxCoaches: 4,
    entryFee: 100,
    pickTimerSeconds: 0,
};

/** A well-formed Pokémon Showdown replay link: data the app stores with a result, never an address we call. */
export const SHOWDOWN_REPLAY = "https://replay.pokemonshowdown.com/gen9ou-2101234567";

/** Deliberately invalid sign-up input: each field breaks one rule (the self-tests allow such values only here). */
export const INVALID_SIGNUP = { email: "not-an-email", password: "short", displayName: "X" } as const;

/** Pokémon the flows refer to, by name, with why they're useful. */
export const MON = {
    /** 20 points (base stats 600): the priciest normal tier */
    garchomp: { name: "Garchomp", id: 445 },
    /** 1 point (base stats 320) */
    pikachu: { name: "Pikachu", id: 25 },
    /** 1 point (base stats 200) */
    magikarp: { name: "Magikarp", id: 129 },
    /** legendary: banned by default */
    mewtwo: { name: "Mewtwo", id: 150 },
    /** Showdown spells it "Nidoran-F" */
    nidoranF: { name: "Nidoran♀", id: 29 },
} as const;
