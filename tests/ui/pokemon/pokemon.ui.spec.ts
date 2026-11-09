import { MON } from "@/data/factories";
import { expect, test } from "@/support/fixtures";
import { flow } from "@/support/flow";

const pokemon = flow.define({
    id: "pokemon.ui-browse",
    title: "Browsing Pokémon by type and name",
    module: "pokemon",
    kind: "ui",
    requires: ["account.coach"],
});
test(...flow.case(pokemon, async ({ given, ui }) => {
    await ui.signInAs(given("account.coach"));
    await ui.pokemon.open();
    await ui.pokemon.filterType("dragon");
    const cards = ui.pokemon.cards();
    await expect(cards.first()).toBeVisible();
    for (const card of await cards.all()) await expect(card.locator('[data-type="dragon"]')).toHaveCount(1);
    await ui.pokemon.search(MON.garchomp.name);
    await expect(cards).toHaveCount(1);
    await expect(ui.pokemon.card(MON.garchomp)).toContainText("Base stats 600");
}));
