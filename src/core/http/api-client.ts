import type { APIRequestContext } from "@playwright/test";
import type { z } from "zod";
import { Envelope, ErrorBody } from "@/contracts/common";

export type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type Query = Record<string, string | number | boolean | undefined | null>;
export type SendOptions = {
    body?: unknown;
    query?: Query;
    /** Send this exact text instead of JSON (with `contentType`), for negative tests. */
    rawBody?: string;
    contentType?: string;
    headers?: Record<string, string>;
};

export type Reply = { method: Method; path: string; status: number; headers: Record<string, string>; text: string; json: unknown; traceId: string | null };

/** The app answered with an unexpected status. Carries the error code and trace id for the report. */
export class ApiError extends Error {
    override name = "ApiError";
    readonly status: number;
    readonly code: string | null;
    readonly traceId: string | null;
    readonly body: unknown;
    constructor(
        readonly reply: Reply,
        expected: number[],
    ) {
        const parsed = ErrorBody.safeParse(reply.json);
        const code = parsed.success ? parsed.data.code : null;
        const message = parsed.success ? parsed.data.message : reply.text.slice(0, 200);
        super(
            `${reply.method} ${reply.path} answered ${reply.status}${code ? ` ${code}` : ""} (expected ${expected.join(" or ")}): ${message}` +
                (reply.traceId ? ` [trace ${reply.traceId}]` : ""),
        );
        this.status = reply.status;
        this.code = code;
        this.traceId = reply.traceId;
        this.body = reply.json;
    }
}

/** A reply didn't match its contract: the API changed shape. Lists every field that differs. */
export class ContractError extends Error {
    override name = "ContractError";
    constructor(
        where: string,
        readonly issues: { path: string; message: string }[],
    ) {
        super(`${where} doesn't match its contract:\n${issues.map((i) => `  ${i.path || "(root)"}: ${i.message}`).join("\n")}`);
    }
}

/** Parses a value against a contract, or throws a ContractError naming every mismatch. */
export function checkReply<T>(contract: z.ZodType<T>, value: unknown, where: string): T {
    const parsed = contract.safeParse(value);
    if (!parsed.success) {
        throw new ContractError(
            where,
            parsed.error.issues.map((i) => ({ path: i.path.map(String).join("."), message: i.message })),
        );
    }
    return parsed.data;
}

/**
 * The one HTTP client. Built on Playwright's request context, so every call shows up in traces
 * and the report. A client is bound to one account's token (or none).
 */
export class ApiClient {
    constructor(
        private readonly ctx: APIRequestContext,
        readonly token: string | null = null,
    ) {}

    withToken(token: string | null): ApiClient {
        return new ApiClient(this.ctx, token);
    }

    /** Sends a request and returns whatever came back. Never throws on an HTTP status. */
    async send(method: Method, path: string, o: SendOptions = {}): Promise<Reply> {
        // An explicit (empty) cookie header stops Playwright attaching cookies from earlier replies
        // (every sign-up and login sets one): an API call is authenticated by its Bearer token only.
        const headers: Record<string, string> = { cookie: "", ...o.headers };
        if (this.token) headers.authorization = `Bearer ${this.token}`;
        const write = method !== "GET" && method !== "DELETE";
        let data: string | Buffer | undefined;
        if (o.rawBody !== undefined) {
            // A Buffer goes out byte for byte. A string with a JSON content type that isn't valid JSON
            // would be quietly re-encoded by Playwright as a JSON string literal.
            data = Buffer.from(o.rawBody);
            if (o.contentType) headers["content-type"] = o.contentType;
        } else if (write) {
            data = JSON.stringify(o.body ?? {});
            headers["content-type"] = o.contentType ?? "application/json";
        }
        const params: Record<string, string> = {};
        for (const [k, v] of Object.entries(o.query ?? {})) if (v !== undefined && v !== null && v !== "") params[k] = String(v);

        // maxRetries covers only ECONNRESET: a keep-alive socket the server closed just as the request
        // went out, so the request never reached the app and retrying it is safe.
        const res = await this.ctx.fetch(`/api${path}`, { method, headers, data, params, failOnStatusCode: false, maxRetries: 2 });
        const text = await res.text();
        let json: unknown;
        try {
            json = text ? JSON.parse(text) : undefined;
        } catch {
            json = undefined;
        }
        const all = res.headers();
        return { method, path, status: res.status(), headers: all, text, json, traceId: all["x-trace-id"] ?? null };
    }

    /** Expects one of `statuses` and returns the reply; otherwise throws an ApiError. */
    async expectStatus(method: Method, path: string, statuses: number | number[], o: SendOptions = {}): Promise<Reply> {
        const expected = Array.isArray(statuses) ? statuses : [statuses];
        const reply = await this.send(method, path, o);
        if (!expected.includes(reply.status)) throw new ApiError(reply, expected);
        return reply;
    }

    /** A `{ data }` endpoint: checks the status, the envelope and the contract, and returns `data`. */
    async data<T>(method: Method, path: string, status: number, contract: z.ZodType<T>, o: SendOptions = {}): Promise<T> {
        const reply = await this.expectStatus(method, path, status, o);
        return checkReply(Envelope(contract), reply.json, `${method} ${path}`).data as T;
    }

    /** A list endpoint (`{ data, page, pageSize, total }`). */
    async page<T>(path: string, contract: z.ZodType<T>, query?: Query): Promise<T> {
        const reply = await this.expectStatus("GET", path, 200, { query });
        return checkReply(contract, reply.json, `GET ${path}`);
    }
}
