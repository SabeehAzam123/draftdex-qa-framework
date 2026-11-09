import { z } from "zod";

/** config/defaults.yaml. Strict: an unknown key is a typo, and stops the run. */
export const DefaultsSchema = z.strictObject({
    timeouts: z.strictObject({
        test: z.number().int().positive(),
        expect: z.number().int().positive(),
        action: z.number().int().positive(),
        navigation: z.number().int().positive(),
    }),
    retries: z.number().int().min(0).max(3),
    workers: z.number().int().min(1).max(16),
    browser: z.strictObject({ channel: z.string(), headless: z.boolean() }),
    capture: z.strictObject({
        trace: z.enum(["off", "on", "retain-on-failure", "on-first-retry"]),
        screenshot: z.enum(["off", "on", "only-on-failure"]),
        video: z.enum(["off", "on", "retain-on-failure"]),
    }),
    ui: z.enum(["new", "classic"]),
});

/** An account the flows can't create: the NAMES of the .env variables holding its email and password. */
const AccountRefSchema = z.strictObject({
    email: z.string().regex(/^[A-Z][A-Z0-9_]*$/, "Use the name of a .env variable, e.g. DRAFTDEX_ADMIN_EMAIL"),
    password: z.string().regex(/^[A-Z][A-Z0-9_]*$/, "Use the name of a .env variable, e.g. DRAFTDEX_ADMIN_PASSWORD"),
});

/** config/environments/<name>.yaml. Any defaults key may be overridden here too. */
export const EnvironmentSchema = DefaultsSchema.partial().extend({
    name: z.string().regex(/^[a-z][a-z0-9-]*$/),
    description: z.string(),
    dataPolicy: z.enum(["test-data", "production"]),
    baseUrl: z.url(),
    accounts: z.record(z.string(), AccountRefSchema).default({}),
    app: z.strictObject({ startCommand: z.string() }).optional(),
}).strict();

export type Defaults = z.infer<typeof DefaultsSchema>;
export type Environment = z.infer<typeof EnvironmentSchema>;

/** Which provider builds a prerequisite state. */
export const PROVIDER_KINDS = ["api", "ui", "existing"] as const;
export type ProviderKind = (typeof PROVIDER_KINDS)[number];

/** DRAFTDEX_RUN_REQUEST: what the runner (or a person) asks of this run. JSON. */
export const RunRequestSchema = z.strictObject({
    /** Build these states with this provider instead of the default (a flow's own pin still wins). */
    providers: z.record(z.string(), z.enum(PROVIDER_KINDS)).default({}),
});
export type RunRequest = z.infer<typeof RunRequestSchema>;

export type Account = { email: string; password: string };

/** Everything a run needs, built once from the YAML files and the environment variables. */
export type RunConfig = Defaults & {
    env: { name: string; description: string; dataPolicy: "test-data" | "production"; baseUrl: string };
    accounts: Record<string, Account | { missing: string[] }>;
    app: { startCommand: string; dir: string } | null;
    runRequest: RunRequest;
    /** Short id shared by every worker of one run; it goes into test data names. */
    runId: string;
    isCI: boolean;
};
