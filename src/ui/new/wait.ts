import type { Page, Response } from "@playwright/test";

/**
 * Waits on signals, never on time: an action is done when the API call it triggers has answered.
 * `call("POST", /\/entries$/)` matches that request; the action runs while we listen.
 */
export function call(method: string, path: RegExp) {
    return (r: Response) => r.request().method() === method && path.test(new URL(r.url()).pathname);
}

/** Runs `action` and returns the reply of the API call it triggers. */
export async function whileWaitingFor(page: Page, match: (r: Response) => boolean, action: () => Promise<unknown>): Promise<Response> {
    const [res] = await Promise.all([page.waitForResponse(match), action()]);
    return res;
}

/** Same, and fails with the app's error if the reply isn't a success. */
export async function expectOk(page: Page, match: (r: Response) => boolean, action: () => Promise<unknown>): Promise<Response> {
    const res = await whileWaitingFor(page, match, action);
    if (!res.ok()) {
        const body = await res.text().catch(() => "");
        throw new Error(`${res.request().method()} ${new URL(res.url()).pathname} answered ${res.status()}: ${body.slice(0, 300)}`);
    }
    return res;
}

export const exact = (text: string) => new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`);
