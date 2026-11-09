import type { Page } from "@playwright/test";
import type { RunConfig } from "@/config/schema";
import type { Services } from "@/services";
import type { Ui } from "@/ui";
import type { Account, StateId, StateValues } from "@/states/values";

/** API access for a test: anonymous, as an account, or a brand-new account. */
export type ApiFactory = {
    anon: Services;
    as(account: { token: string }): Services;
    /** Signs up a fresh account through the API (unique per run). */
    newAccount(role: string): Promise<Account>;
};

/** What a provider gets when it builds a state. */
export type ProviderContext = {
    /** A state built earlier in this plan. */
    get<K extends StateId>(id: K): StateValues[K];
    api: ApiFactory;
    /** The browser: only for UI providers, in UI flows. */
    ui: { page: Page; pages: Ui } | null;
    run: RunConfig;
    /** Notes something this provider created; it appears in the report as "Created data". */
    record(item: { type: string; id: string; label: string }): void;
};
