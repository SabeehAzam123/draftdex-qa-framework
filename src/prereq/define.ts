import type { RunConfig } from "@/config/schema";
import { PROVIDER_KINDS, type ProviderKind } from "@/config/schema";
import type { StateId, StateValues } from "@/states/values";
import type { ProviderContext } from "./context";

export { PROVIDER_KINDS, type ProviderKind };

/** One way to build a state: through the API, through the UI, or by finding existing data. */
export type Provider<K extends StateId> = {
    /** States this provider needs on top of the state's own `requires` (e.g. a UI sign-in). */
    requires?: StateId[];
    /** `true`, or why this provider can't be used in this run (e.g. "no admin account in .env"). */
    available?: (run: RunConfig) => true | string;
    build: (ctx: ProviderContext) => Promise<StateValues[K]>;
};

export type StateDef<K extends StateId = StateId> = {
    id: K;
    title: string;
    /** States that must exist first, whichever provider builds this one. */
    requires: StateId[];
    providers: Partial<Record<ProviderKind, Provider<K>>>;
    /** Which provider to try first. Default: api, then ui, then existing. */
    defaultOrder?: ProviderKind[];
};

export const DEFAULT_ORDER: ProviderKind[] = ["api", "ui", "existing"];

/** Declares a prerequisite state. Typed by id: `build` must return that state's value type. */
export function defineState<K extends StateId>(def: StateDef<K>): StateDef<K> {
    if (Object.keys(def.providers).length === 0) throw new Error(`State "${def.id}" has no providers`);
    return def;
}
