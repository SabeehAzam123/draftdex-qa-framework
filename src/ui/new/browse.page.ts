import { expect, type Page } from "@playwright/test";
import type { AdminUsersPage, Mon, PokemonPage, SettingsPage, WalletPage } from "../types";
import { adminLocators, pokemonLocators, settingsLocators, walletLocators } from "./browse.locators";
import { call, whileWaitingFor } from "./wait";

export class NewSettingsPage implements SettingsPage {
    private readonly l: ReturnType<typeof settingsLocators>;
    constructor(private readonly page: Page) {
        this.l = settingsLocators(page);
    }

    async open(leagueId: string) {
        await this.page.goto(`/leagues/${leagueId}/settings`);
        await expect(this.l.webhook.or(this.l.forbidden)).toBeVisible();
    }
    forbidden() {
        return this.l.forbidden;
    }
    webhookCurrent() {
        return this.l.current;
    }
    async saveWebhook(url: string) {
        await this.l.url.fill(url);
        await whileWaitingFor(this.page, call("PUT", /\/webhook$/), () => this.l.save.click());
    }
    webhookError() {
        return this.l.urlError;
    }
}

export class NewWalletPage implements WalletPage {
    private readonly l: ReturnType<typeof walletLocators>;
    constructor(private readonly page: Page) {
        this.l = walletLocators(page);
    }

    async open() {
        await this.page.goto("/wallet");
        await expect(this.l.balance).toBeVisible();
    }
    balance() {
        return this.l.balance;
    }
    rows(kind?: "signup_bonus" | "entry_fee" | "refund" | "prize") {
        return this.l.rows(kind);
    }
}

const POKEMON_LIST = call("GET", /^\/api\/pokemon$/);

export class NewPokemonPage implements PokemonPage {
    private readonly l: ReturnType<typeof pokemonLocators>;
    constructor(private readonly page: Page) {
        this.l = pokemonLocators(page);
    }

    async open() {
        await whileWaitingFor(this.page, POKEMON_LIST, () => this.page.goto("/pokemon"));
        await expect(this.l.grid).toBeVisible();
    }
    async search(q: string) {
        await whileWaitingFor(this.page, (r) => POKEMON_LIST(r) && new URL(r.url()).searchParams.get("q") === q, () => this.l.search.fill(q));
    }
    async filterType(type: string) {
        await whileWaitingFor(this.page, (r) => POKEMON_LIST(r) && new URL(r.url()).searchParams.get("type") === type, () => this.l.type.selectOption(type));
    }
    cards() {
        return this.l.cards;
    }
    card(mon: Mon) {
        return this.l.card(mon.id);
    }
}

const USERS_LIST = call("GET", /^\/api\/users$/);

export class NewAdminUsersPage implements AdminUsersPage {
    private readonly l: ReturnType<typeof adminLocators>;
    constructor(private readonly page: Page) {
        this.l = adminLocators(page);
    }

    async open() {
        await this.page.goto("/admin/users");
        await expect(this.l.table.or(this.l.forbidden)).toBeVisible();
    }
    forbidden() {
        return this.l.forbidden;
    }
    async search(q: string) {
        await whileWaitingFor(this.page, (r) => USERS_LIST(r) && new URL(r.url()).searchParams.get("q") === q, () => this.l.search.fill(q));
    }
    rows() {
        return this.l.rows;
    }
    row(email: string) {
        return this.l.row(email);
    }
}
