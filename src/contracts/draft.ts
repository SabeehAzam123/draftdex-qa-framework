import { z } from "zod";
import { Id, IsoDate } from "./common";
import { EntryStatus, LeagueSettings, LeagueStatus, Pokemon } from "./leagues";

const SlotKind = z.enum(["regular", "makeup"]);
const Person = z.strictObject({ id: z.string(), displayName: z.string() });

export const DraftState = z.strictObject({
    leagueId: Id("lg"),
    leagueName: z.string(),
    status: LeagueStatus,
    settings: LeagueSettings,
    serverTime: IsoDate,
    minCost: z.number().int().min(1),
    totalRounds: z.number().int(),
    order: z.array(z.strictObject({ entryId: Id("en"), teamName: z.string(), coach: Person })),
    current: z
        .strictObject({ slotNo: z.number().int(), round: z.number().int(), kind: SlotKind, entryId: Id("en"), teamName: z.string(), deadline: IsoDate.nullable() })
        .nullable(),
    upcoming: z.array(z.strictObject({ slotNo: z.number().int(), round: z.number().int(), kind: SlotKind, entryId: Id("en"), teamName: z.string() })),
    picks: z.array(
        z.strictObject({
            slotNo: z.number().int(),
            round: z.number().int(),
            entryId: Id("en"),
            teamName: z.string(),
            points: z.number().int(),
            pickedBy: z.enum(["coach", "commissioner", "timer"]),
            pokemon: Pokemon,
            createdAt: IsoDate,
        }),
    ),
    skipped: z.array(
        z.strictObject({ slotNo: z.number().int(), round: z.number().int(), entryId: Id("en"), teamName: z.string(), status: z.enum(["skipped", "forfeited"]) }),
    ),
    teams: z.array(
        z.strictObject({
            entryId: Id("en"),
            teamName: z.string(),
            coach: Person,
            spent: z.number().int().min(0),
            budgetLeft: z.number().int(),
            picksMade: z.number().int().min(0),
            openSlots: z.number().int().min(0),
            maxForNextPick: z.number().int(),
        }),
    ),
    me: z.strictObject({ entryId: Id("en").nullable(), isMyTurn: z.boolean(), canManage: z.boolean() }),
});
export type DraftState = z.infer<typeof DraftState>;

export const Team = z.strictObject({
    entryId: Id("en"),
    teamName: z.string(),
    status: EntryStatus,
    coach: Person,
    league: z.strictObject({ id: Id("lg"), name: z.string(), status: LeagueStatus, budget: z.number().int(), rosterSize: z.number().int() }),
    roster: z.array(
        z.strictObject({ pokemon: Pokemon, points: z.number().int(), slotNo: z.number().int(), round: z.number().int(), autoPicked: z.boolean() }),
    ),
    spent: z.number().int(),
    budgetLeft: z.number().int(),
});
export type Team = z.infer<typeof Team>;
