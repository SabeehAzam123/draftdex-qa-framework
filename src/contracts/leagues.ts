import { z } from "zod";
import { Id, IsoDate } from "./common";

export const Pokemon = z.strictObject({
    id: z.number().int().min(1),
    slug: z.string(),
    name: z.string(),
    types: z.array(z.string()).min(1).max(2),
    stats: z.strictObject({ hp: z.number(), atk: z.number(), def: z.number(), spa: z.number(), spd: z.number(), spe: z.number() }),
    bst: z.number().int(),
    generation: z.number().int().min(1).max(9),
    isLegendary: z.boolean(),
    isMythical: z.boolean(),
    spriteUrl: z.url(),
});
export type Pokemon = z.infer<typeof Pokemon>;

export const LeagueStatus = z.enum(["setup", "registration", "drafting", "season", "completed", "cancelled"]);
export type LeagueStatus = z.infer<typeof LeagueStatus>;
export const EntryStatus = z.enum(["pending", "approved", "rejected", "withdrawn"]);
export type EntryStatus = z.infer<typeof EntryStatus>;

export const LeagueSettings = z.strictObject({
    budget: z.number().int(),
    rosterSize: z.number().int(),
    maxCoaches: z.number().int(),
    entryFee: z.number().int(),
    pickTimerSeconds: z.number().int(),
    prizeSplit: z.array(z.number().int()),
});
export type LeagueSettings = z.infer<typeof LeagueSettings>;

const Person = z.strictObject({ id: z.string(), displayName: z.string() });

export const League = z.strictObject({
    id: Id("lg"),
    name: z.string(),
    format: z.enum(["singles", "doubles"]),
    status: LeagueStatus,
    settings: LeagueSettings,
    createdAt: IsoDate,
    commissioner: Person,
    counts: z.strictObject({ approved: z.number().int(), pending: z.number().int() }),
    prizePool: z.number().int().min(0),
    // Only the commissioner sees it, and only masked
    webhook: z.strictObject({ configured: z.boolean(), masked: z.string().endsWith("****").nullable() }).nullable(),
    me: z.strictObject({
        canManage: z.boolean(),
        entry: z.strictObject({ id: Id("en"), teamName: z.string(), status: EntryStatus }).nullable(),
    }),
});
export type League = z.infer<typeof League>;

export const Entry = z.strictObject({
    id: Id("en"),
    leagueId: Id("lg"),
    teamName: z.string(),
    status: EntryStatus,
    createdAt: IsoDate,
    coach: Person,
});
export type Entry = z.infer<typeof Entry>;

export const PoolRow = z.strictObject({
    pokemon: Pokemon,
    points: z.number().int().min(1).max(20),
    banned: z.boolean(),
    takenBy: z.strictObject({ entryId: Id("en"), teamName: z.string() }).nullable(),
});
export type PoolRow = z.infer<typeof PoolRow>;

export const PoolSummary = z.strictObject({
    tiers: z.array(z.strictObject({ points: z.number().int(), n: z.number().int() })),
    banned: z.number().int(),
});

export const Notification = z.strictObject({
    id: z.number().int(),
    event: z.string(),
    status: z.enum(["sent", "failed"]),
    httpStatus: z.number().int().nullable(),
    error: z.string().nullable(),
    createdAt: IsoDate,
});
export const Delivery = z.strictObject({ status: z.enum(["sent", "failed"]), httpStatus: z.number().int().nullable(), error: z.string().nullable() });
