import { test } from "@/support/fixtures";

/** Runs before the api and ui projects: one clear message instead of every flow failing the same way. */
test("DraftDex is up", async ({ api, run }) => {
    try {
        await api.anon.health.check();
    } catch (err) {
        throw new Error(
            `DraftDex isn't answering at ${run.env.baseUrl}/api/health (${err instanceof Error ? err.message.split("\n")[0] : err}).\n` +
                "Start it with `npm run dev` in the app's folder, or set DRAFTDEX_APP_DIR in .env so the run starts it.",
        );
    }
});
