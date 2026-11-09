import { defineConfig, devices } from "@playwright/test";
import { loadRunConfig, shareRunId } from "./src/config/env";

/**
 * Three projects:
 * - internal: the framework's self-tests (no app, no browser, no network)
 * - api:      API flows (no browser)
 * - ui:       UI flows in a browser
 * api and ui first run app-check, which stops the run early with a clear message if DraftDex isn't up.
 */
shareRunId();
const run = loadRunConfig();

export default defineConfig({
    timeout: run.timeouts.test,
    expect: { timeout: run.timeouts.expect },
    retries: run.retries,
    workers: run.workers,
    fullyParallel: true,
    forbidOnly: run.isCI,
    outputDir: "test-results",
    reporter: [
        ["list"],
        ["html", { outputFolder: "reports/html", open: "never" }],
        ["json", { outputFile: "reports/results.json" }],
        ["junit", { outputFile: "reports/junit.xml" }],
    ],
    use: {
        baseURL: run.env.baseUrl,
        actionTimeout: run.timeouts.action,
        navigationTimeout: run.timeouts.navigation,
        trace: run.capture.trace,
        screenshot: run.capture.screenshot,
        video: run.capture.video,
        testIdAttribute: "data-testid",
    },
    webServer: run.app
        ? {
              command: run.app.startCommand,
              cwd: run.app.dir,
              url: `${run.env.baseUrl}/api/health`,
              reuseExistingServer: true,
              timeout: 180_000,
          }
        : undefined,
    projects: [
        { name: "internal", testDir: "tests/_internal", testMatch: /.*\.internal\.spec\.ts/ },
        { name: "app-check", testDir: "tests/_setup", testMatch: /app-check\.setup\.ts/ },
        { name: "api", testDir: "tests/api", testMatch: /.*\.api\.spec\.ts/, dependencies: ["app-check"] },
        {
            name: "ui",
            testDir: "tests/ui",
            testMatch: /.*\.ui\.spec\.ts/,
            dependencies: ["app-check"],
            use: {
                ...devices["Desktop Chrome"],
                ...(run.browser.channel ? { channel: run.browser.channel } : {}),
                headless: run.browser.headless,
                viewport: { width: 1366, height: 900 },
            },
        },
    ],
});
