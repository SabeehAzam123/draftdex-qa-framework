import { expect } from "@playwright/test";
import { newAccount } from "@/data/factories";
import { defineState } from "@/prereq/define";
import type { ProviderContext } from "@/prereq/context";
import type { Account } from "./values";

/** Signs up through the sign-up page, then gets an API token for the same account. */
async function signUpThroughUi(ctx: ProviderContext, role: string): Promise<Account> {
    const ui = ctx.ui!;
    const fresh = newAccount(ctx.run, role);
    await ui.page.context().clearCookies();
    await ui.pages.signup.open();
    await ui.pages.signup.fill(fresh);
    await ui.pages.signup.submit();
    await ui.page.waitForURL((url) => url.pathname === "/leagues");
    await expect(ui.pages.shell.userName()).toHaveText(fresh.displayName);
    const login = await ctx.api.anon.auth.login(fresh.email, fresh.password);
    ctx.record({ type: "account", id: login.user.id, label: fresh.email });
    return { ...fresh, id: login.user.id, token: login.token };
}

export const commissioner = defineState({
    id: "account.commissioner",
    title: "A new account to run a league",
    requires: [],
    providers: {
        api: {
            build: async (ctx) => {
                const a = await ctx.api.newAccount("commish");
                ctx.record({ type: "account", id: a.id, label: a.email });
                return a;
            },
        },
        ui: { build: (ctx) => signUpThroughUi(ctx, "commish") },
    },
});

export const coach = defineState({
    id: "account.coach",
    title: "A new coach account",
    requires: [],
    providers: {
        api: {
            build: async (ctx) => {
                const a = await ctx.api.newAccount("coach");
                ctx.record({ type: "account", id: a.id, label: a.email });
                return a;
            },
        },
        ui: { build: (ctx) => signUpThroughUi(ctx, "coach") },
    },
});

export const admin = defineState({
    id: "account.admin",
    title: "The configured admin account",
    requires: [],
    providers: {
        existing: {
            available: (run) => {
                const a = run.accounts.admin;
                if (!a) return "the environment has no admin account";
                if ("missing" in a) return `set ${a.missing.join(" and ")} in .env`;
                return true;
            },
            build: async (ctx) => {
                const a = ctx.run.accounts.admin as { email: string; password: string };
                const login = await ctx.api.anon.auth.login(a.email, a.password);
                if (login.user.role !== "admin") throw new Error(`${a.email} isn't an admin`);
                return { ...a, id: login.user.id, displayName: login.user.displayName, token: login.token };
            },
        },
    },
});
