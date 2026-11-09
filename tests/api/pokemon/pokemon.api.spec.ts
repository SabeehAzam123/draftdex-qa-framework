import { MON } from "@/data/factories";
import { expectApiError } from "@/support/expect-api";
import { expect, test } from "@/support/fixtures";
import { flow } from "@/support/flow";

const browse = flow.define({
    id: "pokemon.browse",
    title: "The Pokémon list is public, paged and filterable",
    module: "pokemon",
    kind: "api",
});
test(...flow.case(browse, async ({ api }) => {
    const all = await api.anon.pokemon.list({ pageSize: 10 });
    expect(all.total).toBe(1025);
    expect(all.data[0]).toMatchObject({ id: 1, name: "Bulbasaur", generation: 1 });

    const dragons = await api.anon.pokemon.list({ type: "dragon", pageSize: 100 });
    expect(dragons.data.length).toBeGreaterThan(20);
    expect(dragons.data.every((p) => p.types.includes("dragon"))).toBe(true);

    const gen9 = await api.anon.pokemon.list({ generation: 9, pageSize: 5 });
    expect(gen9.data.every((p) => p.generation === 9)).toBe(true);

    expect((await api.anon.pokemon.get(MON.pikachu.id)).name).toBe("Pikachu");
    await expectApiError(api.anon.pokemon.get(9999), 404, "POKEMON_NOT_FOUND");
    await expectApiError(await api.anon.client.send("GET", "/pokemon/abc"), 422, "VALIDATION_ERROR");
    await expectApiError(await api.anon.client.send("GET", "/pokemon", { query: { pageSize: 500 } }), 422, "VALIDATION_ERROR");
}));
