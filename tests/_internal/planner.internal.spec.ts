import { expect, test } from "@playwright/test";
import type { RunConfig } from "@/config/schema";
import type { StateDef } from "@/prereq/define";
import { formatPlan, plan, PlanError } from "@/prereq/planner";
import type { StateId } from "@/states/values";

/**
 * The planner with a made-up state graph: no app, no browser. Ids are cast because these states
 * exist only here.
 */
const build = async () => ({}) as never;
const s = (id: string, requires: string[], providers: StateDef<StateId>["providers"], extra: Partial<StateDef<StateId>> = {}) =>
    ({ id, title: id, requires, providers, ...extra }) as unknown as StateDef<StateId>;

const api = { build };
const ui = { build };
const existing = { build };

const REG: Record<string, StateDef<StateId>> = {
    user: s("user", [], { api, ui }),
    login: s("login", ["user"], { ui }),
    team: s("team", ["user"], { api, ui: { build, requires: ["login" as StateId] } }),
    match: s("match", ["team"], { api }),
    seeded: s("seeded", [], { existing: { build, available: (run) => (run.accounts.admin ? true : "no admin account") } }),
    either: s("either", [], { api: { build, available: () => "the API is switched off" }, ui }),
};
const ids = (steps: { state: string }[]) => steps.map((x) => x.state);
const T = (...x: string[]) => x as StateId[];

test.describe("plan()", () => {
    test("orders states so every requirement comes first, each once", () => {
        const steps = plan({ targets: T("match", "team"), registry: REG, allowed: ["api", "ui", "existing"] });
        expect(ids(steps)).toEqual(["user", "team", "match"]);
    });

    test("prefers the API by default, and says so", () => {
        const steps = plan({ targets: T("team"), registry: REG, allowed: ["api", "ui"] });
        expect(steps.map((x) => [x.state, x.provider, x.reason])).toEqual([
            ["user", "api", "default"],
            ["team", "api", "default"],
        ]);
    });

    test("visits only the chosen provider's needs: the API path never plans a UI login", () => {
        expect(ids(plan({ targets: T("team"), registry: REG, allowed: ["api", "ui"] }))).not.toContain("login");
        const viaUi = plan({ targets: T("team"), registry: REG, allowed: ["api", "ui"], pins: { team: "ui" } });
        expect(ids(viaUi)).toEqual(["user", "login", "team"]);
    });

    test("a flow's pin wins over the run's request", () => {
        const steps = plan({ targets: T("team"), registry: REG, allowed: ["api", "ui"], pins: { team: "api" }, request: { team: "ui" } });
        expect(steps.at(-1)).toMatchObject({ provider: "api", reason: "pinned by the flow" });
    });

    test("uses the run's request when it can, and explains a fallback when it can't", () => {
        const asked = plan({ targets: T("user"), registry: REG, allowed: ["api", "ui"], request: { user: "ui" } });
        expect(asked[0]).toMatchObject({ provider: "ui", reason: "requested for this run" });
        const apiFlow = plan({ targets: T("user"), registry: REG, allowed: ["api", "existing"], request: { user: "ui" } });
        expect(apiFlow[0]).toMatchObject({ provider: "api", reason: "fallback: requested ui, but ui isn't allowed in this flow" });
    });

    test("falls back when a provider says it isn't available, with its reason", () => {
        const run = { accounts: {} } as unknown as RunConfig;
        const steps = plan({ targets: T("either"), registry: REG, allowed: ["api", "ui"], run });
        expect(steps[0]).toMatchObject({ provider: "ui", reason: "fallback: api: the API is switched off" });
        expect(() => plan({ targets: T("seeded"), registry: REG, allowed: ["api", "existing"], run })).toThrow(/No provider can build "seeded" \(existing: no admin account\)/);
    });

    test("an impossible pin is the flow's mistake", () => {
        expect(() => plan({ targets: T("match"), registry: REG, allowed: ["api", "ui"], pins: { match: "ui" } })).toThrow(PlanError);
        expect(() => plan({ targets: T("login"), registry: REG, allowed: ["api", "existing"], pins: { login: "ui" } })).toThrow(/ui isn't allowed/);
    });

    test("refuses unknown states and cycles, naming the path", () => {
        expect(() => plan({ targets: T("nope"), registry: REG, allowed: ["api"] })).toThrow('Unknown state "nope"');
        const cyclic = { a: s("a", ["b"], { api }), b: s("b", ["a"], { api }) };
        expect(() => plan({ targets: T("a"), registry: cyclic, allowed: ["api"] })).toThrow("Cycle in prerequisites: a → b → a");
    });

    test("formats a plan as aligned text", () => {
        const text = formatPlan(plan({ targets: T("team"), registry: REG, allowed: ["api"] }));
        expect(text).toBe(" 1. user  api       default\n 2. team  api       default");
        expect(formatPlan([])).toBe("(nothing to set up)");
    });
});
