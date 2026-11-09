import { execFileSync } from "node:child_process";
import { z } from "zod";
import { ROOT } from "@/config/env";
import { PROVIDER_KINDS } from "@/config/schema";

/**
 * The flow catalog: every flow, read back from `playwright test --list` and the tags flow.define()
 * wrote. There is no separate registry to keep in step. Versioned: a reader (the Streamlit runner
 * in phase 5) refuses a catalog whose schemaVersion it doesn't know.
 */
export const SCHEMA_VERSION = 1;

export const CatalogFlow = z.strictObject({
    id: z.string(),
    title: z.string(),
    module: z.string(),
    kind: z.enum(["api", "ui"]),
    requires: z.array(z.string()),
    pins: z.record(z.string(), z.enum(PROVIDER_KINDS)),
    tags: z.array(z.string()),
    file: z.string(),
    line: z.number().int(),
});
export type CatalogFlow = z.infer<typeof CatalogFlow>;

export const Catalog = z.strictObject({
    schemaVersion: z.literal(SCHEMA_VERSION),
    generatedAt: z.iso.datetime(),
    flows: z.array(CatalogFlow),
});
export type Catalog = z.infer<typeof Catalog>;

type ListSpec = { title: string; tags?: string[]; file: string; line: number; tests: { projectName: string }[] };
type ListSuite = { specs?: ListSpec[]; suites?: ListSuite[] };

/** Turns one listed test into a catalog entry, or null if it isn't a flow (e.g. the app check). */
export function flowFromSpec(spec: ListSpec): CatalogFlow | null {
    const tags = (spec.tags ?? []).map((t) => (t.startsWith("@") ? t : `@${t}`));
    const value = (prefix: string) => tags.filter((t) => t.startsWith(`@${prefix}:`)).map((t) => t.slice(prefix.length + 2));
    const [id] = value("flow");
    if (!id) return null;
    const pins: Record<string, (typeof PROVIDER_KINDS)[number]> = {};
    for (const p of value("pin")) {
        const at = p.lastIndexOf(":");
        pins[p.slice(0, at)] = p.slice(at + 1) as (typeof PROVIDER_KINDS)[number];
    }
    return CatalogFlow.parse({
        id,
        title: spec.title,
        module: value("module")[0] ?? "",
        kind: value("kind")[0],
        requires: value("requires"),
        pins,
        tags,
        file: spec.file.replace(/\\/g, "/"),
        line: spec.line,
    });
}

/** Lists the api and ui projects (no test runs, no app needed) and builds the catalog. */
export function buildCatalog(): Catalog {
    const cli = require.resolve("@playwright/test/cli");
    const out = execFileSync(process.execPath, [cli, "test", "--list", "--reporter=json", "--project=api", "--project=ui"], {
        cwd: ROOT,
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
    });
    const report = JSON.parse(out) as { suites: ListSuite[]; errors?: { message?: string }[] };
    if (report.errors?.length) throw new Error(`Listing the flows failed:\n${report.errors.map((e) => e.message).join("\n")}`);

    const flows: CatalogFlow[] = [];
    const walk = (s: ListSuite) => {
        for (const spec of s.specs ?? []) {
            const f = flowFromSpec(spec);
            if (f && !flows.some((x) => x.id === f.id)) flows.push(f);
        }
        for (const child of s.suites ?? []) walk(child);
    };
    for (const s of report.suites) walk(s);
    flows.sort((a, b) => a.id.localeCompare(b.id));
    return Catalog.parse({ schemaVersion: SCHEMA_VERSION, generatedAt: new Date().toISOString(), flows });
}
