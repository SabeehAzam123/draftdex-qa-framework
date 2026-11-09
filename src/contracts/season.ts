import { z } from "zod";
import { Id, IsoDate } from "./common";
import { LeagueStatus } from "./leagues";

const TeamRef = z.strictObject({ entryId: Id("en"), teamName: z.string(), coach: z.strictObject({ id: z.string(), displayName: z.string() }) });

export const MatchStatus = z.enum(["scheduled", "reported", "confirmed", "disputed", "resolved"]);

export const Match = z.strictObject({
    id: Id("mt"),
    week: z.number().int().min(1),
    status: MatchStatus,
    home: TeamRef,
    away: TeamRef,
    homeWins: z.number().int().min(0).max(2).nullable(),
    awayWins: z.number().int().min(0).max(2).nullable(),
    winnerEntryId: Id("en").nullable(),
    replayUrl: z.url().nullable(),
    reportedByEntryId: Id("en").nullable(),
    reportedAt: IsoDate.nullable(),
    disputeReason: z.string().nullable(),
    decidedAt: IsoDate.nullable(),
    me: z.strictObject({
        side: z.enum(["home", "away"]).nullable(),
        canReport: z.boolean(),
        canConfirm: z.boolean(),
        canDispute: z.boolean(),
        canResolve: z.boolean(),
    }),
});
export type Match = z.infer<typeof Match>;

export const Schedule = z.strictObject({
    leagueId: Id("lg"),
    status: LeagueStatus,
    openMatches: z.number().int().min(0),
    weeks: z.array(z.strictObject({ week: z.number().int(), matches: z.array(Match) })),
});
export type Schedule = z.infer<typeof Schedule>;

export const Standings = z.strictObject({
    leagueId: Id("lg"),
    status: LeagueStatus,
    prizePool: z.number().int().min(0),
    final: z.boolean(),
    rows: z.array(
        TeamRef.extend({
            rank: z.number().int().min(1),
            played: z.number().int(),
            wins: z.number().int(),
            losses: z.number().int(),
            gamesWon: z.number().int(),
            gamesLost: z.number().int(),
            gameDiff: z.number().int(),
            prize: z.number().int().min(0),
        }).strict(),
    ),
});
export type Standings = z.infer<typeof Standings>;

const TradeMon = z.strictObject({ id: z.number().int(), name: z.string(), points: z.number().int() });

export const Trade = z.strictObject({
    id: Id("tr"),
    status: z.enum(["proposed", "accepted", "approved", "rejected", "declined", "cancelled"]),
    from: TeamRef,
    to: TeamRef,
    give: z.array(TradeMon).min(1).max(3),
    get: z.array(TradeMon).min(1).max(3),
    note: z.string().nullable(),
    createdAt: IsoDate,
    updatedAt: IsoDate,
    me: z.strictObject({ canAccept: z.boolean(), canDecline: z.boolean(), canCancel: z.boolean(), canApprove: z.boolean(), canReject: z.boolean() }),
});
export type Trade = z.infer<typeof Trade>;
