import { expect, type Page } from "@playwright/test";
import type { MatchAction, SchedulePage, StandingsPage, TradeAction, TradesPage } from "../types";
import { scheduleLocators, standingsLocators, tradesLocators } from "./season.locators";
import { call, expectOk } from "./wait";

export class NewSchedulePage implements SchedulePage {
    private readonly l: ReturnType<typeof scheduleLocators>;
    constructor(private readonly page: Page) {
        this.l = scheduleLocators(page);
    }

    async open(leagueId: string) {
        await this.page.goto(`/leagues/${leagueId}/schedule`);
        await expect(this.l.summary).toBeVisible();
    }
    summary() {
        return this.l.summary;
    }
    match(matchId: string) {
        return this.l.match(matchId);
    }
    status(matchId: string) {
        return this.l.status(matchId);
    }
    score(matchId: string) {
        return this.l.score(matchId);
    }
    action(matchId: string, a: MatchAction) {
        return this.l.action(matchId, a);
    }
    private async fillScore(homeWins: number, awayWins: number) {
        await this.l.homeWins.selectOption(String(homeWins));
        await this.l.awayWins.selectOption(String(awayWins));
    }
    async report(matchId: string, homeWins: number, awayWins: number, replayUrl?: string) {
        await this.l.action(matchId, "report").click();
        await expect(this.l.modal).toBeVisible();
        await this.fillScore(homeWins, awayWins);
        if (replayUrl) await this.l.replay.fill(replayUrl);
        await expectOk(this.page, call("POST", /\/report$/), () => this.l.submit.click());
        await expect(this.l.modal).toBeHidden();
    }
    async confirm(matchId: string) {
        await expectOk(this.page, call("POST", /\/confirm$/), () => this.l.action(matchId, "confirm").click());
    }
    async dispute(matchId: string, reason: string) {
        await this.l.action(matchId, "dispute").click();
        await this.l.reason.fill(reason);
        await expectOk(this.page, call("POST", /\/dispute$/), () => this.l.submit.click());
        await expect(this.l.modal).toBeHidden();
    }
    async resolve(matchId: string, homeWins: number, awayWins: number) {
        await this.l.action(matchId, "resolve").click();
        await this.fillScore(homeWins, awayWins);
        await expectOk(this.page, call("POST", /\/resolve$/), () => this.l.submit.click());
        await expect(this.l.modal).toBeHidden();
    }
}

export class NewStandingsPage implements StandingsPage {
    private readonly l: ReturnType<typeof standingsLocators>;
    constructor(private readonly page: Page) {
        this.l = standingsLocators(page);
    }

    async open(leagueId: string) {
        await this.page.goto(`/leagues/${leagueId}/standings`);
        await expect(this.l.table).toBeVisible();
    }
    row(entryId: string) {
        return this.l.row(entryId);
    }
    champion() {
        return this.l.champion;
    }
}

export class NewTradesPage implements TradesPage {
    private readonly l: ReturnType<typeof tradesLocators>;
    constructor(private readonly page: Page) {
        this.l = tradesLocators(page);
    }

    async open(leagueId: string) {
        await this.page.goto(`/leagues/${leagueId}/trades`);
        await expect(this.l.list.or(this.l.empty)).toBeVisible();
    }
    async propose(v: { partnerEntryId: string; give: number[]; get: number[]; note?: string }): Promise<string> {
        await this.l.partner.selectOption(v.partnerEntryId);
        for (const id of v.give) await this.l.giveBox(id).check();
        for (const id of v.get) await this.l.getBox(id).check();
        if (v.note) await this.l.note.fill(v.note);
        const res = await expectOk(this.page, call("POST", /\/trades$/), () => this.l.submit.click());
        return ((await res.json()) as { data: { id: string } }).data.id;
    }
    trade(tradeId: string) {
        return this.l.trade(tradeId);
    }
    status(tradeId: string) {
        return this.l.status(tradeId);
    }
    actionButton(tradeId: string, a: TradeAction) {
        return this.l.action(tradeId, a);
    }
    async act(tradeId: string, a: TradeAction) {
        await expectOk(this.page, call("POST", new RegExp(`/trades/${tradeId}/${a}$`)), () => this.l.action(tradeId, a).click());
    }
    cannotPropose() {
        return this.l.cannotPropose;
    }
}
