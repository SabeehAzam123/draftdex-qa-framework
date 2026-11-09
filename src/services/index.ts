import { z } from "zod";
import { LoginResult, Me, SeedSummary, User, Wallet } from "@/contracts/accounts";
import { Health, Page, Updated } from "@/contracts/common";
import { DraftState, Team } from "@/contracts/draft";
import { Delivery, Entry, League, Notification, Pokemon, PoolRow, PoolSummary, type LeagueSettings } from "@/contracts/leagues";
import { checkReply, type ApiClient } from "@/core/http/api-client";

/**
 * One class per API family. Each method expects the success status, checks the reply against its
 * contract and returns typed data. For negative checks use `client.send(...)` and `expectApiError`.
 */

export class AuthApi {
    constructor(private readonly c: ApiClient) {}
    signup(body: { email: string; password: string; displayName: string }) {
        return this.c.data("POST", "/auth/signup", 201, LoginResult, { body });
    }
    login(email: string, password: string) {
        return this.c.data("POST", "/auth/login", 200, LoginResult, { body: { email, password } });
    }
    me() {
        return this.c.data("GET", "/me", 200, Me);
    }
    updateMe(body: { displayName?: string; uiVariant?: "new" | "classic" }) {
        return this.c.data("PATCH", "/me", 200, User, { body });
    }
    wallet() {
        return this.c.data("GET", "/me/wallet", 200, Wallet);
    }
}

export type LeagueInput = { name: string; format?: "singles" | "doubles"; settings?: Partial<LeagueSettings> };

export class LeaguesApi {
    constructor(private readonly c: ApiClient) {}
    create(body: LeagueInput) {
        return this.c.data("POST", "/leagues", 201, League, { body });
    }
    get(id: string) {
        return this.c.data("GET", `/leagues/${id}`, 200, League);
    }
    list(query: { status?: string; mine?: boolean; page?: number; pageSize?: number } = {}) {
        return this.c.page("/leagues", Page(League), query);
    }
    update(id: string, body: Partial<LeagueInput>) {
        return this.c.data("PATCH", `/leagues/${id}`, 200, League, { body });
    }
    openRegistration(id: string) {
        return this.c.data("POST", `/leagues/${id}/open-registration`, 200, League);
    }
    cancel(id: string) {
        return this.c.data("POST", `/leagues/${id}/cancel`, 200, League);
    }
    startDraft(id: string, order?: string[]) {
        return this.c.data("POST", `/leagues/${id}/start-draft`, 200, DraftState, { body: order ? { order } : {} });
    }
    setWebhook(id: string, url: string | null) {
        return this.c.data("PUT", `/leagues/${id}/webhook`, 200, League, { body: { url } });
    }
    testWebhook(id: string) {
        return this.c.data("POST", `/leagues/${id}/webhook/test`, 200, Delivery);
    }
    notifications(id: string) {
        return this.c.data("GET", `/leagues/${id}/notifications`, 200, z.array(Notification));
    }
}

export class EntriesApi {
    constructor(private readonly c: ApiClient) {}
    list(leagueId: string) {
        return this.c.data("GET", `/leagues/${leagueId}/entries`, 200, z.array(Entry));
    }
    apply(leagueId: string, teamName: string) {
        return this.c.data("POST", `/leagues/${leagueId}/entries`, 201, Entry, { body: { teamName } });
    }
    approve(leagueId: string, entryId: string) {
        return this.c.data("POST", `/leagues/${leagueId}/entries/${entryId}/approve`, 200, Entry);
    }
    reject(leagueId: string, entryId: string) {
        return this.c.data("POST", `/leagues/${leagueId}/entries/${entryId}/reject`, 200, Entry);
    }
    withdraw(leagueId: string, entryId: string) {
        return this.c.data("POST", `/leagues/${leagueId}/entries/${entryId}/withdraw`, 200, Entry);
    }
}

export type PoolQuery = {
    q?: string;
    type?: string;
    status?: "all" | "available" | "taken" | "banned";
    minPoints?: number;
    maxPoints?: number;
    sort?: "points" | "dex" | "name" | "bst";
    page?: number;
    pageSize?: number;
};

export class PoolApi {
    constructor(private readonly c: ApiClient) {}
    list(leagueId: string, query: PoolQuery = {}) {
        return this.c.page(`/leagues/${leagueId}/pool`, Page(PoolRow), query);
    }
    /** The pool row for one Pokémon, by exact name. */
    async row(leagueId: string, name: string) {
        const res = await this.list(leagueId, { q: name, pageSize: 50 });
        const row = res.data.find((r) => r.pokemon.name === name);
        if (!row) throw new Error(`${name} isn't in league ${leagueId}'s pool`);
        return row;
    }
    summary(leagueId: string) {
        return this.c.data("GET", `/leagues/${leagueId}/pool/summary`, 200, PoolSummary);
    }
    update(leagueId: string, changes: { pokemonId: number; points?: number; banned?: boolean }[]) {
        return this.c.data("PUT", `/leagues/${leagueId}/pool`, 200, Updated, { body: { changes } });
    }
    importCsv(leagueId: string, csv: string) {
        return this.c.data("POST", `/leagues/${leagueId}/pool/import`, 200, Updated, { body: { csv } });
    }
}

export class DraftApi {
    constructor(private readonly c: ApiClient) {}
    state(leagueId: string) {
        return this.c.data("GET", `/leagues/${leagueId}/draft`, 200, DraftState);
    }
    pick(leagueId: string, pokemonId: number) {
        return this.c.data("POST", `/leagues/${leagueId}/draft/picks`, 201, DraftState, { body: { pokemonId } });
    }
    skip(leagueId: string) {
        return this.c.data("POST", `/leagues/${leagueId}/draft/skip`, 200, DraftState);
    }
}

export class TeamsApi {
    constructor(private readonly c: ApiClient) {}
    get(leagueId: string, entryId: string) {
        return this.c.data("GET", `/leagues/${leagueId}/teams/${entryId}`, 200, Team);
    }
    async showdown(leagueId: string, entryId: string): Promise<{ text: string; contentType: string }> {
        const reply = await this.c.expectStatus("GET", `/leagues/${leagueId}/teams/${entryId}/showdown`, 200);
        return { text: reply.text, contentType: reply.headers["content-type"] ?? "" };
    }
}

export class PokemonApi {
    constructor(private readonly c: ApiClient) {}
    list(query: { q?: string; type?: string; generation?: number; page?: number; pageSize?: number } = {}) {
        return this.c.page("/pokemon", Page(Pokemon), query);
    }
    get(id: number) {
        return this.c.data("GET", `/pokemon/${id}`, 200, Pokemon);
    }
}

export class UsersApi {
    constructor(private readonly c: ApiClient) {}
    list(query: { q?: string; role?: string; page?: number; pageSize?: number } = {}) {
        return this.c.page("/users", Page(User), query);
    }
    create(body: { email: string; password: string; displayName: string; role: "admin" | "user" }) {
        return this.c.data("POST", "/users", 201, User, { body });
    }
    update(id: string, body: { displayName?: string; role?: "admin" | "user" }) {
        return this.c.data("PATCH", `/users/${id}`, 200, User, { body });
    }
    async delete(id: string) {
        await this.c.expectStatus("DELETE", `/users/${id}`, 204);
    }
    /** Deletes everything and reloads the demo data. Destructive: only in flows tagged @destructive. */
    resetDemoData() {
        return this.c.data("POST", "/admin/reset", 200, SeedSummary);
    }
}

export class HealthApi {
    constructor(private readonly c: ApiClient) {}
    async check() {
        const reply = await this.c.expectStatus("GET", "/health", 200);
        return checkReply(Health, reply.json, "GET /health");
    }
}

/** Every API family, bound to one account (or none). */
export type Services = ReturnType<typeof servicesFor>;

export function servicesFor(client: ApiClient) {
    return {
        client,
        auth: new AuthApi(client),
        leagues: new LeaguesApi(client),
        entries: new EntriesApi(client),
        pool: new PoolApi(client),
        draft: new DraftApi(client),
        teams: new TeamsApi(client),
        pokemon: new PokemonApi(client),
        users: new UsersApi(client),
        health: new HealthApi(client),
    };
}
