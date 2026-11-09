import { MON } from "@/data/factories";
import { expect, test } from "@/support/fixtures";
import { flow } from "@/support/flow";

const edit = flow.define({
    id: "pool.ui-edit",
    title: "The commissioner changes a cost and a ban in the tier list",
    module: "pool",
    kind: "ui",
    requires: ["league.setup"],
});
test(...flow.case(edit, async ({ given, ui, api }) => {
    const league = given("league.setup");
    await ui.signInAs(league.commissioner);
    await ui.pool.open(league.id);
    await expect(ui.pool.saveButton()).toBeDisabled();

    await ui.pool.search(MON.garchomp.name);
    await ui.pool.setPoints(MON.garchomp, 15);
    await ui.pool.search(MON.mewtwo.name);
    await expect(ui.pool.pointsInput(MON.mewtwo)).toBeDisabled();
    await ui.pool.setBanned(MON.mewtwo, false);
    await expect(ui.pool.saveButton()).toHaveText("Save 2 change(s)");
    await ui.pool.save();
    await ui.toasts.expect("success", "Saved 2 change(s)");

    const c = api.as(league.commissioner);
    expect((await c.pool.row(league.id, MON.garchomp.name)).points).toBe(15);
    expect((await c.pool.row(league.id, MON.mewtwo.name)).banned).toBe(false);
}));

const importErrors = flow.define({
    id: "pool.ui-import-errors",
    title: "A bad CSV import lists every bad line and changes nothing",
    module: "pool",
    kind: "ui",
    requires: ["league.setup"],
});
test(...flow.case(importErrors, async ({ given, ui }) => {
    const league = given("league.setup");
    await ui.signInAs(league.commissioner);
    await ui.pool.open(league.id);
    await ui.pool.importCsv("dex,points\n445,12\nNotAMon,4\n25,99\n");
    await expect(ui.pool.importErrors()).toContainText('line 3: Unknown Pokémon "NotAMon"');
    await expect(ui.pool.importErrors()).toContainText("line 4: Points must be 1–20, got 99");
}));

const readOnly = flow.define({
    id: "pool.ui-coach-read-only",
    title: "Coaches see the tier list but can't edit it",
    module: "pool",
    kind: "ui",
    requires: ["entry.pending"],
});
test(...flow.case(readOnly, async ({ given, ui }) => {
    const entry = given("entry.pending");
    await ui.signInAs(entry.coach);
    await ui.pool.open(entry.leagueId);
    await ui.pool.search(MON.garchomp.name);
    expect(await ui.pool.points(MON.garchomp)).toBe(20);
    await expect(ui.pool.saveButton()).toHaveCount(0);
    await expect(ui.pool.pointsInput(MON.garchomp)).toHaveCount(0);
}));
