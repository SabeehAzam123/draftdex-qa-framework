import type { Page, TestDetails, TestInfo } from "@playwright/test";
import type { RunConfig } from "@/config/schema";
import type { ApiFactory } from "@/prereq/context";
import type { ProviderKind } from "@/prereq/define";
import { plan, PlanError, type PlanStep } from "@/prereq/planner";
import { resolvePlan, type Given } from "@/prereq/resolver";
import { REGISTRY } from "@/states/registry";
import type { StateId } from "@/states/values";
import type { Ui } from "@/ui";

/**
 * The flow DSL. A flow is one thing a user can do, declared once:
 *
 *   const f = flow.define({ id: "draft.pick", title: "A coach drafts on their turn", module: "draft",
 *                           kind: "api", requires: ["league.drafting"] });
 *   test(...flow.case(f, async ({ given, api }) => { ... }));
 *
 * The declaration becomes Playwright tags (@flow:, @module:, @kind:, @requires:, @pin:), so the
 * catalog is read back from `playwright test --list` and can never drift from the specs.
 */

export type FlowKind = "api" | "ui";

export type FlowDef<K extends FlowKind = FlowKind> = {
    /** `<module>.<name>`, lower-case, e.g. "draft.pick-over-budget" */
    id: string;
    title: string;
    module: string;
    kind: K;
    /** Prerequisite states, built before the flow runs */
    requires?: StateId[];
    /** Build these states with this provider (e.g. through the UI, because the flow is about that screen) */
    pins?: Partial<Record<StateId, ProviderKind>>;
    /** Extra tags, e.g. ["@smoke"] */
    tags?: string[];
};

export type Flow<K extends FlowKind = FlowKind> = Required<Omit<FlowDef<K>, "tags">> & { tags: string[]; plan: PlanStep[] };

const FLOW_ID = /^([a-z][a-z0-9-]*)\.[a-z0-9][a-z0-9-]*$/;

/** API flows never plan a UI provider, so they never open a browser. */
export const allowedProviders = (kind: FlowKind): ProviderKind[] => (kind === "api" ? ["api", "existing"] : ["api", "ui", "existing"]);

function define<K extends FlowKind>(def: FlowDef<K>): Flow<K> {
    const m = FLOW_ID.exec(def.id);
    if (!m) throw new PlanError(`Flow id "${def.id}" must look like "<module>.<name>" (lower-case, dashes)`);
    if (m[1] !== def.module) throw new PlanError(`Flow "${def.id}" starts with "${m[1]}" but its module is "${def.module}"`);
    for (const t of def.tags ?? []) if (!/^@[\w:.-]+$/.test(t)) throw new PlanError(`Flow "${def.id}": tag "${t}" must start with @ and have no spaces`);
    const requires = def.requires ?? [];
    const pins = def.pins ?? {};
    // Plan now, at load time: an unknown state, a cycle or an impossible pin fails `--list` instead of a run
    const steps = plan({ targets: requires, registry: REGISTRY, allowed: allowedProviders(def.kind), pins });
    const tags = [
        `@flow:${def.id}`,
        `@module:${def.module}`,
        `@kind:${def.kind}`,
        ...requires.map((r) => `@requires:${r}`),
        ...Object.entries(pins).map(([state, kind]) => `@pin:${state}:${kind}`),
        ...(def.tags ?? []),
    ];
    return { id: def.id, title: def.title, module: def.module, kind: def.kind, requires, pins, tags, plan: steps };
}

type ApiArgs = { api: ApiFactory; run: RunConfig; given: Given };
type UiArgs = ApiArgs & { page: Page; ui: Ui };
type Body<K extends FlowKind> = (args: K extends "ui" ? UiArgs : ApiArgs, testInfo: TestInfo) => Promise<void>;

/**
 * The real plan uses this run's request and checks each provider's availability. The flow's
 * structure was already checked at load time, so a PlanError here means this environment can't
 * run it (e.g. no admin account in .env): skipped, with the reason, rather than failed.
 */
function planFor(f: Flow, run: RunConfig, testInfo: TestInfo): PlanStep[] {
    try {
        return plan({ targets: f.requires, registry: REGISTRY, allowed: allowedProviders(f.kind), pins: f.pins, request: run.runRequest.providers, run });
    } catch (err) {
        if (err instanceof PlanError) testInfo.skip(true, `Can't run in "${run.env.name}": ${err.message}`);
        throw err;
    }
}

// Playwright's TestBody type is generic over every fixture; the wrapper only names the ones it uses.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TestFn = (fixtures: any, testInfo: TestInfo) => Promise<void>;

/**
 * Turns a flow into Playwright's test(title, details, body). The body's fixtures are written out
 * (Playwright reads them from the parameter list): API flows don't ask for `page`, so no browser starts.
 */
function caseOf<K extends FlowKind>(f: Flow<K>, body: Body<K>): [string, TestDetails, TestFn] {
    const details: TestDetails = { tag: f.tags, annotation: [{ type: "flow", description: f.id }] };
    if (f.kind === "api") {
        const fn = async ({ api, run }: { api: ApiFactory; run: RunConfig }, testInfo: TestInfo) => {
            const given = await resolvePlan(planFor(f, run, testInfo), REGISTRY, { api, run, ui: null });
            await (body as Body<"api">)({ api, run, given }, testInfo);
        };
        return [f.title, details, fn];
    }
    const fn = async ({ api, run, page, ui }: { api: ApiFactory; run: RunConfig; page: Page; ui: Ui }, testInfo: TestInfo) => {
        const given = await resolvePlan(planFor(f, run, testInfo), REGISTRY, { api, run, ui: { page, pages: ui } });
        await (body as Body<"ui">)({ api, run, given, page, ui }, testInfo);
    };
    return [f.title, details, fn];
}

export const flow = { define, case: caseOf };
