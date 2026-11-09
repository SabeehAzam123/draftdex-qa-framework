import type { Page } from "@playwright/test";

export const scheduleLocators = (p: Page) => {
    const match = (id: string) => p.locator(`[data-testid="match-row"][data-match-id="${id}"]`);
    return {
        summary: p.getByTestId("schedule-summary"),
        week: p.getByTestId("schedule-week"),
        match,
        status: (id: string) => match(id).getByTestId("match-status"),
        score: (id: string) => match(id).getByTestId("match-score"),
        action: (id: string, a: string) => match(id).getByTestId(`match-${a}`),
        modal: p.getByTestId("result-modal"),
        homeWins: p.getByTestId("result-home-wins"),
        awayWins: p.getByTestId("result-away-wins"),
        replay: p.getByTestId("result-replay"),
        reason: p.getByTestId("result-reason"),
        submit: p.getByTestId("result-submit"),
    };
};

export const standingsLocators = (p: Page) => ({
    table: p.getByTestId("standings-table"),
    row: (entryId: string) => p.locator(`[data-testid="standings-row"][data-entry-id="${entryId}"]`),
    champion: p.getByTestId("standings-champion"),
});

export const tradesLocators = (p: Page) => {
    const trade = (id: string) => p.locator(`[data-testid="trade-row"][data-trade-id="${id}"]`);
    return {
        list: p.getByTestId("trades-list"),
        empty: p.getByTestId("trades-empty"),
        propose: p.getByTestId("trade-propose"),
        cannotPropose: p.getByTestId("trades-cannot-propose"),
        partner: p.getByTestId("trade-partner"),
        giveBox: (id: number) => p.getByTestId("trade-pick-give").locator(`input[data-pokemon-id="${id}"]`),
        getBox: (id: number) => p.getByTestId("trade-pick-get").locator(`input[data-pokemon-id="${id}"]`),
        note: p.getByTestId("trade-note"),
        submit: p.getByTestId("trade-submit"),
        trade,
        status: (id: string) => trade(id).getByTestId("trade-status"),
        action: (id: string, a: string) => trade(id).getByTestId(`trade-${a}`),
    };
};
