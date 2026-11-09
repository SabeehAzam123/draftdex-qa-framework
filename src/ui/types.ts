import type { Locator } from "@playwright/test";

/**
 * What a test can do on each screen, in the app's own words. Specs and states use only these
 * interfaces. Each UI (src/ui/new today; src/ui/classic in phase 3) implements them, so one
 * flow can drive either UI. A self-test keeps the layers apart.
 */

/** A Pokémon as the flows refer to it (rows are found by dex number, never by fuzzy text). */
export type Mon = { id: number; name: string };

export interface LoginPage {
    open(next?: string): Promise<void>;
    signIn(email: string, password: string): Promise<void>;
    submit(): Promise<void>;
    fieldError(field: "email" | "password"): Locator;
    formError(): Locator;
}

export interface SignupPage {
    open(): Promise<void>;
    fill(v: { displayName?: string; email?: string; password?: string }): Promise<void>;
    submit(): Promise<void>;
    fieldError(field: "name" | "email" | "password"): Locator;
}

export interface Shell {
    credits(): Locator;
    userName(): Locator;
    navLink(item: "leagues" | "pokemon" | "wallet" | "admin"): Locator;
    goTo(item: "leagues" | "pokemon" | "wallet" | "admin"): Promise<void>;
    signOut(): Promise<void>;
}

export interface Toasts {
    /** Waits for a toast of this kind containing the text. */
    expect(kind: "success" | "error", text: string | RegExp): Promise<void>;
    last(): Locator;
}

export type LeagueFormValues = {
    name?: string;
    format?: "singles" | "doubles";
    budget?: number;
    rosterSize?: number;
    maxCoaches?: number;
    entryFee?: number;
    /** Seconds; one of the form's options */
    timer?: number;
    prizeSplit?: number[];
};

export interface LeaguesPage {
    open(): Promise<void>;
    show(tab: "mine" | "all"): Promise<void>;
    filterStatus(status: string): Promise<void>;
    card(name: string): Locator;
    openLeague(name: string): Promise<void>;
    empty(): Locator;
    startNew(): Promise<void>;
}

export interface LeagueForm {
    fill(v: LeagueFormValues): Promise<void>;
    /** Submits and returns the new league's id (from the save reply). */
    create(): Promise<string>;
    submit(): Promise<void>;
    fieldError(field: "name" | "budget" | "roster-size" | "max-coaches" | "entry-fee" | "prize-split"): Locator;
}

export type LeagueTab = "overview" | "pool" | "draft" | "settings";

export interface LeaguePage {
    open(leagueId: string): Promise<void>;
    name(): Locator;
    status(): Locator;
    prizePool(): Locator;
    tab(t: LeagueTab): Locator;
    goToTab(t: LeagueTab): Promise<void>;
    action(a: "open-registration" | "start-draft" | "cancel" | "withdraw" | "apply"): Locator;
    openRegistration(): Promise<void>;
    /** Applies with a team name; returns the entry id from the save reply. */
    apply(teamName: string): Promise<string>;
    /** Applies, expecting the app to refuse (4xx); the page then shows why. */
    applyExpectingError(teamName: string): Promise<void>;
    applyError(): Locator;
    withdraw(): Promise<void>;
    entryRow(teamName: string): Locator;
    entryStatus(teamName: string): Locator;
    approve(teamName: string): Promise<void>;
    reject(teamName: string): Promise<void>;
    startDraft(order: "random" | "listed"): Promise<void>;
    cancelLeague(): Promise<void>;
}

export interface PoolPage {
    open(leagueId: string): Promise<void>;
    search(q: string): Promise<void>;
    filterStatus(status: "all" | "available" | "taken" | "banned"): Promise<void>;
    row(mon: Mon): Locator;
    /** The cost shown for a Pokémon (badge or the commissioner's input). */
    points(mon: Mon): Promise<number>;
    setPoints(mon: Mon, points: number): Promise<void>;
    setBanned(mon: Mon, banned: boolean): Promise<void>;
    save(): Promise<void>;
    saveButton(): Locator;
    pointsInput(mon: Mon): Locator;
    importCsv(csv: string): Promise<void>;
    importErrors(): Locator;
}

export interface DraftPage {
    open(leagueId: string): Promise<void>;
    notStarted(): Locator;
    complete(): Locator;
    onTheClock(): Locator;
    yourTurn(): Locator;
    countdown(): Locator;
    /** The on-the-clock banner; its `data-slot` is the current pick number. Assert on it (it retries), don't read it once. */
    current(): Locator;
    maxPoints(): Locator;
    search(q: string): Promise<void>;
    pickButton(mon: Mon): Locator;
    pick(mon: Mon): Promise<void>;
    skip(): Promise<void>;
    logEntry(slot: number): Locator;
    upcoming(): Locator;
    teamBudget(entryId: string): Locator;
}

export interface TeamPage {
    open(leagueId: string, entryId: string): Promise<void>;
    name(): Locator;
    rosterCards(): Locator;
    copyForShowdown(): Promise<string>;
}

export interface SettingsPage {
    open(leagueId: string): Promise<void>;
    forbidden(): Locator;
    webhookCurrent(): Locator;
    saveWebhook(url: string): Promise<void>;
    webhookError(): Locator;
}

export interface WalletPage {
    open(): Promise<void>;
    balance(): Locator;
    rows(kind?: "signup_bonus" | "entry_fee" | "refund" | "prize"): Locator;
}

export interface PokemonPage {
    open(): Promise<void>;
    search(q: string): Promise<void>;
    filterType(type: string): Promise<void>;
    cards(): Locator;
    card(mon: Mon): Locator;
}

export interface AdminUsersPage {
    open(): Promise<void>;
    forbidden(): Locator;
    search(q: string): Promise<void>;
    rows(): Locator;
    row(email: string): Locator;
}

/** Every screen, for one browser page. */
export type Ui = {
    login: LoginPage;
    signup: SignupPage;
    shell: Shell;
    toasts: Toasts;
    leagues: LeaguesPage;
    leagueForm: LeagueForm;
    league: LeaguePage;
    pool: PoolPage;
    draft: DraftPage;
    team: TeamPage;
    settings: SettingsPage;
    wallet: WalletPage;
    pokemon: PokemonPage;
    adminUsers: AdminUsersPage;
    /** Signs the browser in as an account (through the API, so it's fast), then opens `path`. */
    signInAs(account: { email: string; password: string }, path?: string): Promise<void>;
};
