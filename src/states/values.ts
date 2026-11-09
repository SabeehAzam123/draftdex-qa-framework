/**
 * What each prerequisite state hands to the flow. `given("league.registration")` returns a LeagueRef, etc.
 * Add a state: add its id and value type here, then define it in src/states/ and list it in registry.ts.
 */

/** An account a flow created (or the configured admin), with an API token for it. */
export type Account = { id: string; email: string; password: string; displayName: string; token: string };

export type LeagueRef = { id: string; name: string; commissioner: Account };

export type EntryRef = { id: string; leagueId: string; teamName: string; coach: Account };

/** A draft started with the flow's coach first, then the rival. */
export type DraftRef = { leagueId: string; order: string[]; coachEntryId: string; rivalEntryId: string };

export type PickRef = { leagueId: string; entryId: string; pokemonId: number; pokemonName: string; points: number };

export type SeasonRef = { leagueId: string; name: string };

/** The coach's match against the rival, reported by the coach as a 2–1 win. */
export type MatchRef = {
    leagueId: string;
    matchId: string;
    coachEntryId: string;
    rivalEntryId: string;
    coachSide: "home" | "away";
    homeWins: number;
    awayWins: number;
};

/** A 1-for-1 offer from the coach to the rival: the coach's first Pokémon for the rival's first. */
export type TradeRef = { leagueId: string; tradeId: string; fromEntryId: string; toEntryId: string; give: number[]; get: number[] };

export interface StateValues {
    /** A fresh account that will run a league */
    "account.commissioner": Account;
    /** A fresh account the flow acts as */
    "account.coach": Account;
    /** The configured admin account (from .env) */
    "account.admin": Account;
    /** A league in setup, run by account.commissioner */
    "league.setup": LeagueRef;
    /** The league, open for registration */
    "league.registration": LeagueRef;
    /** account.coach has applied (and paid) */
    "entry.pending": EntryRef;
    /** account.coach is in */
    "entry.approved": EntryRef;
    /** A second approved coach, so a draft can start */
    "league.rival": EntryRef;
    /** The draft has started; account.coach is on the clock */
    "league.drafting": DraftRef;
    /** account.coach made pick 1; the rival is on the clock */
    "draft.first-pick": PickRef;
    /** A league whose draft is complete */
    "league.season": SeasonRef;
    /** The coach reported a 2–1 win over the rival; waiting for the rival */
    "match.reported": MatchRef;
    /** The coach offered a 1-for-1 trade to the rival */
    "trade.proposed": TradeRef;
    /** The rival accepted it; waiting for the commissioner */
    "trade.accepted": TradeRef;
}

export type StateId = keyof StateValues;
