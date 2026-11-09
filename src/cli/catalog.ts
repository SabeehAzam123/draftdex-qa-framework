/**
 * npm run catalog            every flow as JSON (for tools: the runner reads this)
 * npm run catalog -- --table a readable table
 */
import { buildCatalog } from "@/catalog/catalog";

const catalog = buildCatalog();

if (process.argv.includes("--table")) {
    const rows = catalog.flows.map((f) => [f.id, f.kind, f.requires.join(", ") || "—", Object.entries(f.pins).map(([s, k]) => `${s}=${k}`).join(", ")]);
    const head = ["flow", "kind", "requires", "pins"];
    const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i]!.length)));
    const line = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i]!)).join("  ");
    console.log(line(head));
    console.log(widths.map((w) => "-".repeat(w)).join("  "));
    for (const r of rows) console.log(line(r));
    const by = (k: string) => catalog.flows.filter((f) => f.kind === k).length;
    console.log(`\n${catalog.flows.length} flows (${by("api")} api, ${by("ui")} ui)`);
} else {
    process.stdout.write(`${JSON.stringify(catalog, null, 2)}\n`);
}
