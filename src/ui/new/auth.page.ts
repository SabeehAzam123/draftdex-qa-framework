import { expect, type Page } from "@playwright/test";
import type { LoginPage, Shell, SignupPage, Toasts } from "../types";
import { loginLocators, shellLocators, signupLocators } from "./auth.locators";

export class NewLoginPage implements LoginPage {
    private readonly l: ReturnType<typeof loginLocators>;
    constructor(private readonly page: Page) {
        this.l = loginLocators(page);
    }

    async open(next?: string) {
        await this.page.goto(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
        await expect(this.l.form).toBeVisible();
    }
    async signIn(email: string, password: string) {
        await this.l.email.fill(email);
        await this.l.password.fill(password);
        await this.l.submit.click();
        await this.page.waitForURL((url) => !url.pathname.startsWith("/login"));
    }
    async submit() {
        await this.l.submit.click();
    }
    fieldError(field: "email" | "password") {
        return field === "email" ? this.l.emailError : this.l.passwordError;
    }
    formError() {
        return this.l.formError;
    }
}

export class NewSignupPage implements SignupPage {
    private readonly l: ReturnType<typeof signupLocators>;
    constructor(private readonly page: Page) {
        this.l = signupLocators(page);
    }

    async open() {
        await this.page.goto("/signup");
        await expect(this.l.form).toBeVisible();
    }
    async fill(v: { displayName?: string; email?: string; password?: string }) {
        if (v.displayName !== undefined) await this.l.name.fill(v.displayName);
        if (v.email !== undefined) await this.l.email.fill(v.email);
        if (v.password !== undefined) await this.l.password.fill(v.password);
    }
    async submit() {
        await this.l.submit.click();
    }
    fieldError(field: "name" | "email" | "password") {
        return this.l.error(field);
    }
}

export class NewShell implements Shell {
    private readonly l: ReturnType<typeof shellLocators>;
    constructor(private readonly page: Page) {
        this.l = shellLocators(page);
    }

    credits() {
        return this.l.credits;
    }
    userName() {
        return this.l.userName;
    }
    navLink(item: "leagues" | "pokemon" | "wallet" | "admin") {
        return this.l.nav(item);
    }
    async goTo(item: "leagues" | "pokemon" | "wallet" | "admin") {
        const path = item === "admin" ? "/admin/users" : `/${item}`;
        await this.l.nav(item).click();
        await this.page.waitForURL((url) => url.pathname === path);
    }
    async signOut() {
        await this.l.logout.click();
        await this.page.waitForURL((url) => url.pathname === "/login");
    }
}

export class NewToasts implements Toasts {
    private readonly l: ReturnType<typeof shellLocators>;
    constructor(private readonly page: Page) {
        this.l = shellLocators(page);
    }

    async expect(kind: "success" | "error", text: string | RegExp) {
        await expect(this.l.toast(kind).filter({ hasText: text }).last()).toBeVisible();
    }
    last() {
        return this.l.anyToast.last();
    }
}
