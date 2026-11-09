import type { StateDef } from "@/prereq/define";
import * as accounts from "./accounts";
import * as draft from "./draft";
import * as entries from "./entries";
import * as league from "./league";
import * as season from "./season";
import type { StateId } from "./values";

const ALL: StateDef<StateId>[] = [
    accounts.commissioner,
    accounts.coach,
    accounts.admin,
    league.setup,
    league.registration,
    league.season,
    entries.pending,
    entries.approved,
    entries.rival,
    draft.drafting,
    draft.firstPick,
    season.reported,
    season.proposed,
    season.accepted,
] as StateDef<StateId>[];

/** Every prerequisite state, by id. A self-test checks each one is listed once and the graph is sound. */
export const REGISTRY: Readonly<Record<string, StateDef<StateId>>> = Object.freeze(
    Object.fromEntries(
        ALL.map((s) => {
            if (ALL.filter((o) => o.id === s.id).length > 1) throw new Error(`State "${s.id}" is defined twice`);
            return [s.id, s];
        }),
    ),
);

export const STATE_IDS = ALL.map((s) => s.id);
