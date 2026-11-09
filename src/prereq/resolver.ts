import { test, type Page } from "@playwright/test";
import type { RunConfig } from "@/config/schema";
import type { Ui } from "@/ui";
import type { StateId, StateValues } from "@/states/values";
import type { ApiFactory, ProviderContext } from "./context";
import type { StateDef } from "./define";
import { formatPlan, type PlanStep } from "./planner";

/** Reads a state the flow's plan built. Asking for one it didn't declare is a mistake in the flow. */
export type Given = <K extends StateId>(id: K) => StateValues[K];

/**
 * A prerequisite couldn't be built, so the flow never got to test what it's about. Reported as
 * BLOCKED (with an annotation), so a broken setup step isn't mistaken for the feature failing.
 */
export class BlockedError extends Error {
    override name = "BlockedError";
    constructor(step: PlanStep, cause: unknown) {
        const why = cause instanceof Error ? cause.message : String(cause);
        super(`BLOCKED by prerequisite "${step.title}" (${step.provider}): ${why}`, { cause });
    }
}

export async function resolvePlan(
    steps: PlanStep[],
    registry: Readonly<Record<string, StateDef<StateId>>>,
    deps: { api: ApiFactory; run: RunConfig; ui: { page: Page; pages: Ui } | null },
): Promise<Given> {
    const info = test.info();
    info.annotations.push({ type: "plan", description: `\n${formatPlan(steps)}` });
    const values = new Map<StateId, unknown>();

    const ctx: ProviderContext = {
        get: (id) => {
            if (!values.has(id)) throw new Error(`State "${id}" isn't built yet: add it to this state's or provider's requires`);
            return values.get(id) as StateValues[typeof id];
        },
        api: deps.api,
        ui: deps.ui,
        run: deps.run,
        record: (item) => info.annotations.push({ type: "created", description: `${item.type} "${item.label}" (${item.id})` }),
    };

    for (const step of steps) {
        const provider = registry[step.state]?.providers[step.provider];
        if (!provider) throw new Error(`Plan step ${step.state} → ${step.provider} has no provider`);
        await test.step(
            `PREREQ › ${step.title} (${step.provider})`,
            async () => {
                try {
                    values.set(step.state, await provider.build(ctx));
                } catch (err) {
                    const blocked = new BlockedError(step, err);
                    info.annotations.push({ type: "blocked", description: blocked.message });
                    throw blocked;
                }
            },
            { box: true },
        );
    }

    const declared = new Set(steps.map((s) => s.state));
    return (id) => {
        if (!declared.has(id)) throw new Error(`given("${id}"): this flow doesn't require "${id}". Add it to the flow's requires.`);
        return values.get(id) as StateValues[typeof id];
    };
}
