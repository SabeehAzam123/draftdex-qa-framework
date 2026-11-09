import { expect, test } from "@/support/fixtures";
import { flow } from "@/support/flow";

const showdown = flow.define({
    id: "team.ui-showdown",
    title: "A coach copies their roster for Pokémon Showdown",
    module: "team",
    kind: "ui",
    requires: ["draft.first-pick"],
});
test(...flow.case(showdown, async ({ given, ui }) => {
    const first = given("draft.first-pick");
    await ui.signInAs(given("account.coach"));
    await ui.team.open(first.leagueId, first.entryId);
    await expect(ui.team.rosterCards()).toHaveCount(1);
    expect(await ui.team.copyForShowdown()).toBe(`${first.pokemonName}\n`);
    await ui.toasts.expect("success", "Import from text");
}));
