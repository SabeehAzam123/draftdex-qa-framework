import type { Page } from "@playwright/test";
import type { Ui } from "../types";
import { NewLoginPage, NewShell, NewSignupPage, NewToasts } from "./auth.page";
import { NewAdminUsersPage, NewPokemonPage, NewSettingsPage, NewWalletPage } from "./browse.page";
import { NewDraftPage, NewPoolPage, NewTeamPage } from "./draft.page";
import { NewLeagueForm, NewLeaguePage, NewLeaguesPage } from "./leagues.page";

/** The "New" UI's page objects. */
export function newUi(page: Page): Ui {
    return {
        login: new NewLoginPage(page),
        signup: new NewSignupPage(page),
        shell: new NewShell(page),
        toasts: new NewToasts(page),
        leagues: new NewLeaguesPage(page),
        leagueForm: new NewLeagueForm(page),
        league: new NewLeaguePage(page),
        pool: new NewPoolPage(page),
        draft: new NewDraftPage(page),
        team: new NewTeamPage(page),
        settings: new NewSettingsPage(page),
        wallet: new NewWalletPage(page),
        pokemon: new NewPokemonPage(page),
        adminUsers: new NewAdminUsersPage(page),
        async signInAs(account, path = "/leagues") {
            // The browser context's request shares its cookie jar, so the session cookie lands in the browser
            const res = await page.context().request.post("/api/auth/login", { data: { email: account.email, password: account.password } });
            if (!res.ok()) throw new Error(`Couldn't sign in as ${account.email}: HTTP ${res.status()} ${await res.text()}`);
            await page.goto(path);
        },
    };
}
