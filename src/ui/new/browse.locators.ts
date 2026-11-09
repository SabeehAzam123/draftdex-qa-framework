import type { Page } from "@playwright/test";

export const settingsLocators = (p: Page) => ({
    webhook: p.getByTestId("settings-webhook"),
    forbidden: p.getByTestId("settings-forbidden"),
    current: p.getByTestId("webhook-current"),
    url: p.getByTestId("webhook-url"),
    urlError: p.getByTestId("webhook-url-error"),
    save: p.getByTestId("webhook-save"),
});

export const walletLocators = (p: Page) => ({
    balance: p.getByTestId("wallet-balance"),
    rows: (kind?: string) => (kind ? p.locator(`[data-testid="wallet-row"][data-kind="${kind}"]`) : p.getByTestId("wallet-row")),
});

export const pokemonLocators = (p: Page) => ({
    grid: p.getByTestId("pokemon-grid"),
    search: p.getByTestId("pokemon-search"),
    type: p.getByTestId("pokemon-type"),
    cards: p.getByTestId("pokemon-card"),
    card: (id: number) => p.locator(`[data-testid="pokemon-card"][data-pokemon-id="${id}"]`),
});

export const adminLocators = (p: Page) => ({
    table: p.getByTestId("users-table"),
    forbidden: p.getByTestId("admin-forbidden"),
    search: p.getByTestId("users-search"),
    rows: p.getByTestId("user-row"),
    row: (email: string) => p.getByTestId("user-row").filter({ has: p.getByTestId("user-email").filter({ hasText: email }) }),
});
