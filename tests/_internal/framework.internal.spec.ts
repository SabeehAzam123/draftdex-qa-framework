import { expect, test } from "@playwright/test";
import { buildCatalog, flowFromSpec, SCHEMA_VERSION, type Catalog } from "@/catalog/catalog";
import { environmentNames, readDefaults, readEnvironment } from "@/config/env";
import { EnvironmentSchema, PROVIDER_KINDS } from "@/config/schema";
import { DEFAULT_ORDER } from "@/prereq/define";
import { plan } from "@/prereq/planner";
import { REGISTRY, STATE_IDS } from "@/states/registry";
import type { StateId } from "@/states/values";
import { allowedProviders } from "@/support/flow";

test.describe("the state graph", () => {
    test("every state's requirements are real states, and every state can be planned", () => {
        for (const id of STATE_IDS) {
            const def = REGISTRY[id]!;
            const needs = [...def.requires, ...Object.values(def.providers).flatMap((p) => p?.requires ?? [])];
            for (const n of needs) expect(STATE_IDS, `${id} needs "${n}"`).toContain(n);
            for (const kind of Object.keys(def.providers)) expect(PROVIDER_KINDS).toContain(kind);
            // Each state can be built in a UI flow by some provider (its plan has no cycle or dead end)
            const steps = plan({ targets: [id], registry: REGISTRY, allowed: ["api", "ui", "existing"] });
            expect(steps.at(-1)?.state).toBe(id);
        }
    });

    test("every provider listed in a state's defaultOrder exists", () => {
        for (const id of STATE_IDS) {
            for (const kind of REGISTRY[id]!.defaultOrder ?? DEFAULT_ORDER) expect(PROVIDER_KINDS).toContain(kind);
        }
    });
});

test.describe("the flow catalog", () => {
    let catalog: Catalog;
    test.beforeAll(() => {
        // Lists every flow (no test runs). flow.define() plans each one at load, so a broken flow fails here.
        catalog = buildCatalog();
    });

    test("builds, is versioned, and has unique flow ids", () => {
        expect(catalog.schemaVersion).toBe(SCHEMA_VERSION);
        expect(catalog.flows.length).toBeGreaterThanOrEqual(70);
        const ids = catalog.flows.map((f) => f.id);
        expect(new Set(ids).size, "flow ids are unique").toBe(ids.length);
    });

    test("each flow sits in its module's folder and its kind's project", () => {
        for (const f of catalog.flows) {
            expect(f.file, f.id).toMatch(new RegExp(`^tests/${f.kind}/${f.module}/[^/]+\\.${f.kind}\\.spec\\.ts$`));
        }
    });

    test("every flow plans with the default run (API flows never plan the UI)", () => {
        for (const f of catalog.flows) {
            const steps = plan({ targets: f.requires as StateId[], registry: REGISTRY, allowed: allowedProviders(f.kind), pins: f.pins });
            if (f.kind === "api") expect(steps.filter((s) => s.provider === "ui"), f.id).toEqual([]);
        }
    });

    test("reads a flow back from its tags", () => {
        const f = flowFromSpec({
            title: "T",
            tags: ["@flow:draft.x", "@module:draft", "@kind:ui", "@requires:league.drafting", "@pin:league.drafting:ui", "@smoke"],
            file: "tests\\ui\\draft\\x.ui.spec.ts",
            line: 3,
            tests: [],
        });
        expect(f).toMatchObject({ id: "draft.x", kind: "ui", requires: ["league.drafting"], pins: { "league.drafting": "ui" }, file: "tests/ui/draft/x.ui.spec.ts" });
        expect(flowFromSpec({ title: "not a flow", tags: [], file: "x", line: 1, tests: [] })).toBeNull();
    });
});

test.describe("config files", () => {
    test("the defaults and every environment are valid", () => {
        expect(() => readDefaults()).not.toThrow();
        const names = environmentNames();
        expect(names).toEqual(expect.arrayContaining(["local", "ci"]));
        for (const name of names) expect(readEnvironment(name).name).toBe(name);
    });

    test("an unknown key or a secret value instead of a variable name is refused", () => {
        const base = { name: "x", description: "x", dataPolicy: "test-data", baseUrl: "http://localhost:3000" };
        expect(EnvironmentSchema.safeParse({ ...base, baseUrll: "typo" }).success).toBe(false);
        const secret = EnvironmentSchema.safeParse({ ...base, accounts: { admin: { email: "me@example.com", password: "hunter2" } } });
        expect(secret.success).toBe(false);
    });
});
