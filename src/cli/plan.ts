/**
 * Shows what a flow would set up first, how, and why, without running anything:
 *
 *   npm run plan -- draft.pick
 *   npm run plan -- draft.pick league.ui-set-up-and-open
 *   npm run plan -- --all
 *   DRAFTDEX_RUN_REQUEST='{"providers":{"league.setup":"ui"}}' npm run plan -- draft.ui-pick
 *
 * Uses the same planner as a run, with this run's request and provider availability.
 */
import { buildCatalog } from "@/catalog/catalog";
import { loadRunConfig } from "@/config/env";
import { formatPlan, plan } from "@/prereq/planner";
import { REGISTRY } from "@/states/registry";
import type { StateId } from "@/states/values";
import { allowedProviders } from "@/support/flow";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const all = process.argv.includes("--all");
const asJson = process.argv.includes("--json");
if (!all && args.length === 0) {
    console.error("Usage: npm run plan -- <flow id> [more ids]   (or --all; add --json for machine output)");
    process.exit(2);
}

const run = loadRunConfig();
const catalog = buildCatalog();
const wanted = all ? catalog.flows : args.map((id) => catalog.flows.find((f) => f.id === id) ?? id);
const out: unknown[] = [];
let failed = false;

for (const f of wanted) {
    if (typeof f === "string") {
        console.error(`Unknown flow "${f}". See: npm run catalog -- --table`);
        failed = true;
        continue;
    }
    try {
        const steps = plan({
            targets: f.requires as StateId[],
            registry: REGISTRY,
            allowed: allowedProviders(f.kind),
            pins: f.pins,
            request: run.runRequest.providers,
            run,
        });
        if (asJson) out.push({ flow: f.id, steps });
        else console.log(`\n${f.id}  (${f.kind}): ${f.title}\n${formatPlan(steps)}`);
    } catch (err) {
        failed = true;
        const message = err instanceof Error ? err.message : String(err);
        if (asJson) out.push({ flow: f.id, error: message });
        else console.log(`\n${f.id}: can't run in "${run.env.name}": ${message}`);
    }
}
if (asJson) process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
process.exit(failed ? 1 : 0);
