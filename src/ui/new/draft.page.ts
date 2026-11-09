import { expect, type Page } from "@playwright/test";
import type { DraftPage, Mon, PoolPage, TeamPage } from "../types";
import { draftLocators, poolLocators, teamLocators } from "./draft.locators";
import { call, expectOk, whileWaitingFor } from "./wait";

/** The pool list answering a search for `q` (the page reloads it on every keystroke; this waits for the final one). */
const poolSearch = (q: string, status?: string) => (r: import("@playwright/test").Response) => {
    const url = new URL(r.url());
    return (
        r.request().method() === "GET" &&
        /\/pool$/.test(url.pathname) &&
        url.searchParams.get("q") === q &&
        (status === undefined || url.searchParams.get("status") === status)
    );
};

export class NewPoolPage implements PoolPage {
    private readonly l: ReturnType<typeof poolLocators>;
    constructor(private readonly page: Page) {
        this.l = poolLocators(page);
    }

    async open(leagueId: string) {
        await this.page.goto(`/leagues/${leagueId}/pool`);
        await expect(this.l.table).toBeVisible();
    }
    async search(q: string) {
        await whileWaitingFor(this.page, poolSearch(q), () => this.l.search.fill(q));
    }
    async filterStatus(status: "all" | "available" | "taken" | "banned") {
        await whileWaitingFor(this.page, call("GET", /\/pool$/), () => this.l.status.selectOption(status));
    }
    row(mon: Mon) {
        return this.l.row(mon.id);
    }
    async points(mon: Mon): Promise<number> {
        await expect(this.l.row(mon.id)).toBeVisible();
        if (await this.l.pointsInput(mon.id).count()) return Number(await this.l.pointsInput(mon.id).inputValue());
        const text = (await this.l.pointsBadge(mon.id).textContent()) ?? "";
        const m = /(\d+) pts/.exec(text);
        if (!m) throw new Error(`${mon.name} shows "${text}", not a number of points`);
        return Number(m[1]);
    }
    async setPoints(mon: Mon, points: number) {
        await this.l.pointsInput(mon.id).fill(String(points));
    }
    async setBanned(mon: Mon, banned: boolean) {
        await this.l.banToggle(mon.id).setChecked(banned);
    }
    async save() {
        await expectOk(this.page, call("PUT", /\/pool$/), () => this.l.save.click());
    }
    saveButton() {
        return this.l.save;
    }
    pointsInput(mon: Mon) {
        return this.l.pointsInput(mon.id);
    }
    async importCsv(csv: string) {
        await this.l.importOpen.click();
        await this.l.importText.fill(csv);
        await whileWaitingFor(this.page, call("POST", /\/pool\/import$/), () => this.l.importSubmit.click());
    }
    importErrors() {
        return this.l.importErrors;
    }
}

export class NewDraftPage implements DraftPage {
    private readonly l: ReturnType<typeof draftLocators>;
    constructor(private readonly page: Page) {
        this.l = draftLocators(page);
    }

    async open(leagueId: string) {
        await this.page.goto(`/leagues/${leagueId}/draft`);
        await expect(this.l.current.or(this.l.complete).or(this.l.notStarted)).toBeVisible();
    }
    notStarted() {
        return this.l.notStarted;
    }
    complete() {
        return this.l.complete;
    }
    onTheClock() {
        return this.l.onTheClock;
    }
    yourTurn() {
        return this.l.yourTurn;
    }
    countdown() {
        return this.l.countdown;
    }
    current() {
        return this.l.current;
    }
    maxPoints() {
        return this.l.maxPoints;
    }
    async search(q: string) {
        await whileWaitingFor(this.page, poolSearch(q, "available"), () => this.l.search.fill(q));
    }
    pickButton(mon: Mon) {
        return this.l.pickButton(mon.id);
    }
    async pick(mon: Mon) {
        await this.search(mon.name);
        await expectOk(this.page, call("POST", /\/draft\/picks$/), () => this.l.pickButton(mon.id).click());
    }
    async skip() {
        await expectOk(this.page, call("POST", /\/draft\/skip$/), () => this.l.skip.click());
    }
    logEntry(slot: number) {
        return this.l.logEntry(slot);
    }
    upcoming() {
        return this.l.upcoming;
    }
    teamBudget(entryId: string) {
        return this.l.teamBudget(entryId);
    }
}

export class NewTeamPage implements TeamPage {
    private readonly l: ReturnType<typeof teamLocators>;
    constructor(private readonly page: Page) {
        this.l = teamLocators(page);
    }

    async open(leagueId: string, entryId: string) {
        await this.page.goto(`/leagues/${leagueId}/teams/${entryId}`);
        await expect(this.l.name).toBeVisible();
    }
    name() {
        return this.l.name;
    }
    rosterCards() {
        return this.l.cards;
    }
    rosterCard(mon: { id: number }) {
        return this.page.locator(`[data-testid="roster-card"][data-pokemon-id="${mon.id}"]`);
    }
    async copyForShowdown(): Promise<string> {
        await expectOk(this.page, call("GET", /\/showdown$/), () => this.l.copy.click());
        await expect(this.l.text).toBeVisible();
        return this.l.text.inputValue();
    }
}
