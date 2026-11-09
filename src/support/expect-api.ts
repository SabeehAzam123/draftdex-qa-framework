import { expect } from "@playwright/test";
import { ErrorBody } from "@/contracts/common";
import { ApiError, checkReply, type Reply } from "@/core/http/api-client";

/**
 * Asserts the app refused a request the right way: this status, this error code, and an error body
 * that matches the contract (`{ message, code, traceId }`). Takes a reply or a call that should throw.
 */
export async function expectApiError(attempt: Promise<unknown> | Reply, status: number, code: string): Promise<{ message: string; details?: { path: string; message: string }[] }> {
    let reply: Reply;
    if (attempt instanceof Promise) {
        const err = await attempt.then(
            () => null,
            (e: unknown) => e,
        );
        if (!(err instanceof ApiError)) throw new Error(`Expected ${status} ${code}, but the call ${err ? `threw ${String(err)}` : "succeeded"}`);
        reply = err.reply;
    } else {
        reply = attempt;
    }
    const body = checkReply(ErrorBody, reply.json, `${reply.method} ${reply.path} (error body)`);
    expect.soft(reply.headers["x-trace-id"], "the trace id header matches the body").toBe(body.traceId);
    expect({ status: reply.status, code: body.code }, `${reply.method} ${reply.path}: ${body.message}`).toEqual({ status, code });
    return body;
}
