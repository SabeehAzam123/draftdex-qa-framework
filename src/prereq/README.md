# src/prereq/

The prerequisite engine. Full explanation: [docs/PREREQ_ENGINE.md](../../docs/PREREQ_ENGINE.md).

| File | What |
| --- | --- |
| `define.ts` | `defineState()`, `Provider`, the default provider order (api, ui, existing) |
| `planner.ts` | `plan()`, pure: targets + registry + pins + run request → ordered steps, each with a provider and a reason. `PlanError` for mistakes (unknown state, cycle, impossible pin) |
| `resolver.ts` | `resolvePlan()`: runs the steps as `PREREQ › …` test steps, records the plan and created data as annotations, and turns a failed step into `BLOCKED by prerequisite …` |
| `context.ts` | What a provider gets: `get()`, `api`, `ui` (UI flows only), `run`, `record()` |
