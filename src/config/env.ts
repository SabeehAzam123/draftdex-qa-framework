/**
 * The only module that reads process.env (a self-test enforces it). Builds the RunConfig from
 * config/defaults.yaml, config/environments/<TEST_ENV>.yaml and the run variables:
 *
 *   TEST_ENV               which environment file (default: local)
 *   DRAFTDEX_UI            "new" | "classic": the UI to drive (overrides the YAML)
 *   DRAFTDEX_RUN_REQUEST   JSON, e.g. {"providers":{"league.setup":"ui"}}
 *   DRAFTDEX_HEADED        "1" to watch the browser
 *   DRAFTDEX_APP_DIR       the app's folder, so the run can start it
 *   DRAFTDEX_RUN_ID        set once by playwright.config.ts so every worker shares it
 *   <account variables>    named in the environment file (e.g. DRAFTDEX_ADMIN_EMAIL)
 */
import { config as loadDotenv } from "dotenv";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import type { z } from "zod";
import { DefaultsSchema, EnvironmentSchema, RunRequestSchema, type Account, type RunConfig } from "./schema";

export const ROOT = resolve(__dirname, "..", "..");
const CONFIG_DIR = resolve(ROOT, "config");

loadDotenv({ path: resolve(ROOT, ".env"), quiet: true });

export class ConfigError extends Error {
    override name = "ConfigError";
}

function readYaml<T>(file: string, schema: z.ZodType<T>): T {
    if (!existsSync(file)) throw new ConfigError(`Config file not found: ${file}`);
    const parsed = schema.safeParse(parseYaml(readFileSync(file, "utf8")) ?? {});
    if (!parsed.success) {
        const lines = parsed.error.issues.map((i) => `  ${i.path.join(".") || "(file)"}: ${i.message}`).join("\n");
        throw new ConfigError(`${file} is invalid:\n${lines}`);
    }
    return parsed.data;
}

export function environmentNames(): string[] {
    return readdirSync(resolve(CONFIG_DIR, "environments"))
        .filter((f) => f.endsWith(".yaml"))
        .map((f) => f.replace(/\.yaml$/, ""));
}

/** Validates an environment file without building a RunConfig (used by the self-tests). */
export function readEnvironment(name: string) {
    return readYaml(resolve(CONFIG_DIR, "environments", `${name}.yaml`), EnvironmentSchema);
}

export function readDefaults() {
    return readYaml(resolve(CONFIG_DIR, "defaults.yaml"), DefaultsSchema);
}

let cached: RunConfig | null = null;

export function loadRunConfig(): RunConfig {
    if (cached) return cached;
    const name = process.env.TEST_ENV || "local";
    const defaults = readDefaults();
    const env = readEnvironment(name);

    if (env.dataPolicy === "production") {
        throw new ConfigError(`"${name}" holds production data: flows can be previewed with \`npm run plan\`, never run there`);
    }

    const accounts: RunConfig["accounts"] = {};
    for (const [key, ref] of Object.entries(env.accounts)) {
        const email = process.env[ref.email];
        const password = process.env[ref.password];
        const missing = [!email && ref.email, !password && ref.password].filter((x): x is string => !!x);
        accounts[key] = missing.length ? { missing } : ({ email, password } as Account);
    }

    let runRequest = RunRequestSchema.parse({});
    if (process.env.DRAFTDEX_RUN_REQUEST) {
        try {
            runRequest = RunRequestSchema.parse(JSON.parse(process.env.DRAFTDEX_RUN_REQUEST));
        } catch (err) {
            throw new ConfigError(`DRAFTDEX_RUN_REQUEST is invalid: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    const ui = process.env.DRAFTDEX_UI || env.ui || defaults.ui;
    if (ui !== "new" && ui !== "classic") throw new ConfigError(`DRAFTDEX_UI must be "new" or "classic", not "${ui}"`);
    const appDir = process.env.DRAFTDEX_APP_DIR;

    cached = {
        timeouts: { ...defaults.timeouts, ...env.timeouts },
        retries: env.retries ?? defaults.retries,
        workers: env.workers ?? defaults.workers,
        browser: {
            ...defaults.browser,
            ...env.browser,
            headless: process.env.DRAFTDEX_HEADED === "1" ? false : (env.browser?.headless ?? defaults.browser.headless),
        },
        capture: { ...defaults.capture, ...env.capture },
        ui,
        env: { name: env.name, description: env.description, dataPolicy: env.dataPolicy, baseUrl: env.baseUrl.replace(/\/$/, "") },
        accounts,
        app: env.app && appDir ? { startCommand: env.app.startCommand, dir: resolve(ROOT, appDir) } : null,
        runRequest,
        runId: process.env.DRAFTDEX_RUN_ID || newRunId(),
        isCI: !!process.env.CI,
    };
    return cached;
}

function newRunId(): string {
    return Date.now().toString(36).slice(-6);
}

/** Called once by playwright.config.ts: every worker then reads the same run id. */
export function shareRunId(): string {
    if (!process.env.DRAFTDEX_RUN_ID) process.env.DRAFTDEX_RUN_ID = newRunId();
    return process.env.DRAFTDEX_RUN_ID;
}

/** Test hook. */
export function resetRunConfigForTests() {
    cached = null;
}
