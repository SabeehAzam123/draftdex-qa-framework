import type { Page } from "@playwright/test";

/** Selectors only. Every one is a data-testid the app keeps stable for tests. */

export const loginLocators = (p: Page) => ({
    form: p.getByTestId("login-form"),
    email: p.getByTestId("login-email"),
    password: p.getByTestId("login-password"),
    submit: p.getByTestId("login-submit"),
    emailError: p.getByTestId("login-email-error"),
    passwordError: p.getByTestId("login-password-error"),
    formError: p.getByTestId("login-error"),
});

export const signupLocators = (p: Page) => ({
    form: p.getByTestId("signup-form"),
    name: p.getByTestId("signup-name"),
    email: p.getByTestId("signup-email"),
    password: p.getByTestId("signup-password"),
    submit: p.getByTestId("signup-submit"),
    error: (field: "name" | "email" | "password") => p.getByTestId(`signup-${field}-error`),
});

export const shellLocators = (p: Page) => ({
    credits: p.getByTestId("user-credits"),
    userName: p.getByTestId("user-name"),
    nav: (item: string) => p.getByTestId(`nav-${item}`),
    logout: p.getByTestId("logout-button"),
    toast: (kind: string) => p.locator(`[data-testid="toast"][data-type="${kind}"]`),
    anyToast: p.getByTestId("toast"),
});
