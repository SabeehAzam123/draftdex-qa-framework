import { expect, type Page } from "@playwright/test";
import type { LeagueForm, LeagueFormValues, LeaguePage, LeaguesPage, LeagueTab } from "../types";
import { leagueFormLocators, leagueLocators, leaguesListLocators } from "./leagues.locators";
import { call, expectOk, whileWaitingFor } from "./wait";

const LEAGUES_LIST = call("GET", /^\/api\/leagues$/);

export class NewLeaguesPage implements LeaguesPage {
    private readonly l: ReturnType<typeof leaguesListLocators>;
    constructor(private readonly page: Page) {
        this.l = leaguesListLocators(page);
    }

    async open() {
        await whileWaitingFor(this.page, LEAGUES_LIST, () => this.page.goto("/leagues"));
        await expect(this.l.list.or(this.l.empty)).toBeVisible();
    }
    async show(tab: "mine" | "all") {
        await whileWaitingFor(this.page, LEAGUES_LIST, () => this.l.tab(tab).click());
        await expect(this.l.tab(tab)).toHaveAttribute("aria-selected", "true");
    }
    async filterStatus(status: string) {
        await whileWaitingFor(this.page, LEAGUES_LIST, () => this.l.statusFilter.selectOption(status));
    }
    card(name: string) {
        return this.l.card(name);
    }
    async openLeague(name: string) {
        await this.l.card(name).click();
        await this.page.waitForURL(/\/leagues\/lg_/);
    }
    empty() {
        return this.l.empty;
    }
    async startNew() {
        await this.l.create.click();
        await this.page.waitForURL((url) => url.pathname === "/leagues/new");
    }
}

export class NewLeagueForm implements LeagueForm {
    private readonly l: ReturnType<typeof leagueFormLocators>;
    constructor(private readonly page: Page) {
        this.l = leagueFormLocators(page);
    }

    async fill(v: LeagueFormValues) {
        await expect(this.l.form).toBeVisible();
        if (v.name !== undefined) await this.l.field("name").fill(v.name);
        if (v.format !== undefined) await this.l.field("format").selectOption(v.format);
        const numbers: [keyof LeagueFormValues, string][] = [
            ["budget", "budget"],
            ["rosterSize", "roster-size"],
            ["maxCoaches", "max-coaches"],
            ["entryFee", "entry-fee"],
        ];
        for (const [key, id] of numbers) {
            const value = v[key];
            if (value !== undefined) await this.l.field(id).fill(String(value));
        }
        if (v.timer !== undefined) await this.l.field("timer").selectOption(String(v.timer));
        if (v.prizeSplit) {
            for (let place = 1; place <= 3; place++) await this.l.prize(place).fill(String(v.prizeSplit[place - 1] ?? 0));
        }
    }
    async create(): Promise<string> {
        const res = await expectOk(this.page, call("POST", /^\/api\/leagues$/), () => this.l.submit.click());
        const id = ((await res.json()) as { data: { id: string } }).data.id;
        await this.page.waitForURL((url) => url.pathname === `/leagues/${id}`);
        return id;
    }
    async submit() {
        await this.l.submit.click();
    }
    fieldError(field: "name" | "budget" | "roster-size" | "max-coaches" | "entry-fee" | "prize-split") {
        return this.l.error(field);
    }
}

export class NewLeaguePage implements LeaguePage {
    private readonly l: ReturnType<typeof leagueLocators>;
    constructor(private readonly page: Page) {
        this.l = leagueLocators(page);
    }

    async open(leagueId: string) {
        await this.page.goto(`/leagues/${leagueId}`);
        await expect(this.l.name).toBeVisible();
    }
    name() {
        return this.l.name;
    }
    status() {
        return this.l.status;
    }
    prizePool() {
        return this.l.prizePool;
    }
    tab(t: LeagueTab) {
        return this.l.tab(t);
    }
    async goToTab(t: LeagueTab) {
        await this.l.tab(t).click();
        await this.page.waitForURL((url) => (t === "overview" ? /^\/leagues\/lg_[0-9a-f]+$/ : new RegExp(`/${t}$`)).test(url.pathname));
    }
    action(a: "open-registration" | "start-draft" | "cancel" | "withdraw" | "apply") {
        return {
            "open-registration": this.l.openRegistration,
            "start-draft": this.l.startDraft,
            cancel: this.l.cancel,
            withdraw: this.l.withdraw,
            apply: this.l.applySubmit,
        }[a];
    }
    async openRegistration() {
        await expectOk(this.page, call("POST", /\/open-registration$/), () => this.l.openRegistration.click());
        await expect(this.l.status).toHaveText("Registration open");
    }
    async apply(teamName: string): Promise<string> {
        await this.l.applyTeam.fill(teamName);
        const res = await expectOk(this.page, call("POST", /\/entries$/), () => this.l.applySubmit.click());
        return ((await res.json()) as { data: { id: string } }).data.id;
    }
    async applyExpectingError(teamName: string) {
        await this.l.applyTeam.fill(teamName);
        const res = await whileWaitingFor(this.page, call("POST", /\/entries$/), () => this.l.applySubmit.click());
        if (res.ok()) throw new Error(`Expected the application to be refused, but it answered ${res.status()}`);
    }
    applyError() {
        return this.l.applyTeamError;
    }
    async withdraw() {
        await expectOk(this.page, call("POST", /\/withdraw$/), () => this.l.withdraw.click());
    }
    entryRow(teamName: string) {
        return this.l.entryRow(teamName);
    }
    entryStatus(teamName: string) {
        return this.l.entryStatus(teamName);
    }
    async approve(teamName: string) {
        await expectOk(this.page, call("POST", /\/approve$/), () => this.l.approve(teamName).click());
        await expect(this.l.entryStatus(teamName)).toHaveText("Approved");
    }
    async reject(teamName: string) {
        await expectOk(this.page, call("POST", /\/reject$/), () => this.l.reject(teamName).click());
        await expect(this.l.entryStatus(teamName)).toHaveText("Rejected");
    }
    async startDraft(order: "random" | "listed") {
        await this.l.startDraft.click();
        await expect(this.l.startModal).toBeVisible();
        await this.l.startOrder(order).check();
        await expectOk(this.page, call("POST", /\/start-draft$/), () => this.l.startConfirm.click());
        await expect(this.l.status).toHaveText("Drafting");
    }
    async cancelLeague() {
        await this.l.cancel.click();
        await expectOk(this.page, call("POST", /\/cancel$/), () => this.l.cancelConfirm.click());
        await expect(this.l.status).toHaveText("Cancelled");
    }
}
