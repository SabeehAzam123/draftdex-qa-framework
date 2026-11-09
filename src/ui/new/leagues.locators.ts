import type { Page } from "@playwright/test";
import { exact } from "./wait";

export const leaguesListLocators = (p: Page) => ({
    list: p.getByTestId("leagues-list"),
    empty: p.getByTestId("leagues-empty"),
    tab: (t: "mine" | "all") => p.getByTestId(`leagues-tab-${t}`),
    statusFilter: p.getByTestId("leagues-status-filter"),
    create: p.getByTestId("leagues-create"),
    card: (name: string) => p.getByTestId("league-card").filter({ has: p.getByTestId("league-card-name").filter({ hasText: exact(name) }) }),
});

export const leagueFormLocators = (p: Page) => ({
    form: p.getByTestId("league-form"),
    field: (name: string) => p.getByTestId(`league-form-${name}`),
    prize: (place: number) => p.getByTestId(`league-form-prize-${place}`),
    error: (name: string) => p.getByTestId(`league-form-${name}-error`),
    submit: p.getByTestId("league-form-submit"),
});

export const leagueLocators = (p: Page) => {
    const entryRow = (team: string) => p.getByTestId("entry-row").filter({ has: p.getByTestId("entry-team").filter({ hasText: exact(team) }) });
    return {
        name: p.getByTestId("league-name"),
        status: p.getByTestId("league-status"),
        prizePool: p.getByTestId("league-prize-pool"),
        tab: (t: string) => p.getByTestId(`league-tab-${t}`),
        openRegistration: p.getByTestId("league-open-registration"),
        startDraft: p.getByTestId("league-start-draft"),
        cancel: p.getByTestId("league-cancel"),
        cancelConfirm: p.getByTestId("league-cancel-confirm"),
        withdraw: p.getByTestId("league-withdraw"),
        applyTeam: p.getByTestId("league-apply-team-name"),
        applyTeamError: p.getByTestId("league-apply-team-name-error"),
        applySubmit: p.getByTestId("league-apply-submit"),
        startModal: p.getByTestId("start-draft-modal"),
        startOrder: (o: "random" | "listed") => p.getByTestId(`start-draft-order-${o}`),
        startConfirm: p.getByTestId("start-draft-confirm"),
        entryRow,
        entryStatus: (team: string) => entryRow(team).getByTestId("entry-status"),
        approve: (team: string) => entryRow(team).getByTestId("entry-approve"),
        reject: (team: string) => entryRow(team).getByTestId("entry-reject"),
    };
};
