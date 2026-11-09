import type { Page } from "@playwright/test";

export const poolLocators = (p: Page) => {
    const row = (id: number) => p.locator(`[data-testid="pool-row"][data-pokemon-id="${id}"]`);
    return {
        table: p.getByTestId("pool-table"),
        search: p.getByTestId("pool-search"),
        status: p.getByTestId("pool-status"),
        row,
        pointsInput: (id: number) => row(id).getByTestId("pool-points-input"),
        pointsBadge: (id: number) => row(id).getByTestId("pool-row-points"),
        banToggle: (id: number) => row(id).getByTestId("pool-ban-toggle"),
        save: p.getByTestId("pool-save"),
        importOpen: p.getByTestId("pool-import-open"),
        importText: p.getByTestId("pool-import-text"),
        importSubmit: p.getByTestId("pool-import-submit"),
        importErrors: p.getByTestId("pool-import-errors"),
    };
};

export const draftLocators = (p: Page) => {
    const available = (id: number) => p.locator(`[data-testid="draft-available-row"][data-pokemon-id="${id}"]`);
    return {
        current: p.getByTestId("draft-current"),
        complete: p.getByTestId("draft-complete"),
        notStarted: p.getByTestId("draft-not-started"),
        onTheClock: p.getByTestId("draft-on-the-clock"),
        yourTurn: p.getByTestId("draft-your-turn"),
        countdown: p.getByTestId("draft-countdown"),
        maxPoints: p.getByTestId("draft-max-points"),
        search: p.getByTestId("draft-search"),
        pickButton: (id: number) => available(id).getByTestId("draft-pick-button"),
        skip: p.getByTestId("draft-skip"),
        logEntry: (slot: number) => p.locator(`[data-testid="draft-pick"][data-slot="${slot}"]`),
        upcoming: p.getByTestId("draft-upcoming"),
        teamBudget: (entryId: string) => p.locator(`[data-testid="draft-team-row"][data-entry-id="${entryId}"]`).getByTestId("draft-team-budget"),
    };
};

export const teamLocators = (p: Page) => ({
    name: p.getByTestId("team-name"),
    cards: p.getByTestId("roster-card"),
    copy: p.getByTestId("team-showdown-copy"),
    text: p.getByTestId("team-showdown-text"),
    empty: p.getByTestId("team-empty"),
});
