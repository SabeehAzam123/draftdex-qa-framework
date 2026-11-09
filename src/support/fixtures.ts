import { test as base, expect } from "@playwright/test";
import { loadRunConfig } from "@/config/env";
import type { RunConfig } from "@/config/schema";
import { ApiClient } from "@/core/http/api-client";
import { newAccount } from "@/data/factories";
import type { ApiFactory } from "@/prereq/context";
import { servicesFor } from "@/services";
import { createUi, type Ui } from "@/ui";

type WorkerFixtures = { run: RunConfig };
type TestFixtures = { api: ApiFactory; ui: Ui };

/**
 * - `run` (per worker): the RunConfig from config/ and the run variables.
 * - `api` (per test): anonymous services, services as an account, and fresh accounts.
 * - `ui` (per test): the page objects for this run's UI. Only UI flows use it, so API flows never start a browser.
 */
export const test = base.extend<TestFixtures, WorkerFixtures>({
    run: [async ({}, use) => use(loadRunConfig()), { scope: "worker" }],

    api: async ({ playwright, run }, use) => {
        const ctx = await playwright.request.newContext({ baseURL: run.env.baseUrl });
        const anon = new ApiClient(ctx);
        const factory: ApiFactory = {
            anon: servicesFor(anon),
            as: (account) => servicesFor(anon.withToken(account.token)),
            newAccount: async (role) => {
                const fresh = newAccount(run, role);
                const { token, user } = await servicesFor(anon).auth.signup(fresh);
                return { ...fresh, id: user.id, token };
            },
        };
        await use(factory);
        await ctx.dispose();
    },

    ui: async ({ page, run }, use) => {
        await use(createUi(page, run.ui));
    },
});

export { expect };
