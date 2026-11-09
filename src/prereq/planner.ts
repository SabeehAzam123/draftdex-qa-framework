import type { RunConfig } from "@/config/schema";
import type { StateId } from "@/states/values";
import { DEFAULT_ORDER, PROVIDER_KINDS, type ProviderKind, type StateDef } from "./define";

/**
 * The planner: a pure function from "what the flow needs" to "what to build, in what order, how,
 * and why". No I/O, so `npm run plan` previews exactly what a run will do, and the self-tests can
 * check every flow's plan without the app.
 */

export type PlanStep = { state: StateId; title: string; provider: ProviderKind; reason: string };

export type PlanInput = {
    targets: StateId[];
    registry: Readonly<Record<string, StateDef<StateId>>>;
    /** Providers this flow may use. API flows exclude "ui", so they never open a browser. */
    allowed: ProviderKind[];
    /** The flow's own choices. Always win; an impossible pin is a mistake in the flow. */
    pins?: Partial<Record<string, ProviderKind>>;
    /** The run's choices (DRAFTDEX_RUN_REQUEST). Used when possible, else the default with a reason. */
    request?: Partial<Record<string, ProviderKind>>;
    /** For providers' `available()` checks. Without it every provider counts as available. */
    run?: RunConfig;
};

/** A mistake in the states or the flow (unknown state, cycle, impossible pin): never a test failure. */
export class PlanError extends Error {
    override name = "PlanError";
}

export function plan(input: PlanInput): PlanStep[] {
    const { registry, allowed, pins = {}, request = {}, run } = input;
    for (const [state, kind] of Object.entries({ ...pins, ...request })) {
        if (!PROVIDER_KINDS.includes(kind as ProviderKind)) throw new PlanError(`"${kind}" for "${state}" isn't a provider kind`);
    }
    const steps: PlanStep[] = [];
    const done = new Set<string>();

    function whyNot(def: StateDef<StateId>, kind: ProviderKind): string | null {
        const provider = def.providers[kind];
        if (!provider) return `no ${kind} provider`;
        if (!allowed.includes(kind)) return `${kind} isn't allowed in this flow`;
        if (run && provider.available) {
            const ok = provider.available(run);
            if (ok !== true) return ok;
        }
        return null;
    }

    function choose(def: StateDef<StateId>): { kind: ProviderKind; reason: string } {
        const pin = pins[def.id];
        if (pin) {
            const problem = whyNot(def, pin);
            if (problem) throw new PlanError(`The flow pins "${def.id}" to ${pin}, but ${problem}`);
            return { kind: pin, reason: "pinned by the flow" };
        }
        const notes: string[] = [];
        const asked = request[def.id];
        if (asked) {
            const problem = whyNot(def, asked);
            if (!problem) return { kind: asked, reason: "requested for this run" };
            notes.push(`requested ${asked}, but ${problem}`);
        }
        for (const kind of def.defaultOrder ?? DEFAULT_ORDER) {
            const problem = whyNot(def, kind);
            if (!problem) {
                if (notes.length === 0) return { kind, reason: "default" };
                return { kind, reason: `fallback: ${notes.join("; ")}` };
            }
            // a provider that doesn't exist isn't worth mentioning; one that can't be used is
            if (def.providers[kind]) notes.push(`${kind}: ${problem}`);
        }
        throw new PlanError(`No provider can build "${def.id}"${notes.length ? ` (${notes.join("; ")})` : ""}`);
    }

    function visit(id: StateId, path: StateId[]) {
        if (done.has(id)) return;
        if (path.includes(id)) throw new PlanError(`Cycle in prerequisites: ${[...path, id].join(" → ")}`);
        const def = registry[id];
        if (!def) throw new PlanError(`Unknown state "${id}"${path.length ? ` (needed by "${path.at(-1)}")` : ""}`);
        // Choose first, so we only visit what the chosen provider needs (an API flow never plans a UI sign-in)
        const { kind, reason } = choose(def);
        const needs = [...def.requires, ...(def.providers[kind]?.requires ?? [])];
        for (const need of needs) visit(need, [...path, id]);
        done.add(id);
        steps.push({ state: id, title: def.title, provider: kind, reason });
    }

    for (const target of input.targets) visit(target, []);
    return steps;
}

/** The plan as aligned text, for the CLI and test annotations. */
export function formatPlan(steps: PlanStep[]): string {
    if (steps.length === 0) return "(nothing to set up)";
    const w = Math.max(...steps.map((s) => s.state.length));
    return steps.map((s, i) => `${String(i + 1).padStart(2)}. ${s.state.padEnd(w)}  ${s.provider.padEnd(8)}  ${s.reason}`).join("\n");
}
