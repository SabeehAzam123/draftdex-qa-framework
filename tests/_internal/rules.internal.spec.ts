import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { ROOT } from "@/config/env";

/** Repo rules, checked on every run. Each failure names the file and line. */

function files(dir: string, ext = /\.ts$/): string[] {
    const out: string[] = [];
    for (const name of readdirSync(join(ROOT, dir))) {
        const rel = `${dir}/${name}`;
        if (statSync(join(ROOT, rel)).isDirectory()) out.push(...files(rel, ext));
        else if (ext.test(name)) out.push(rel);
    }
    return out;
}

/** Lines of `paths` matching `pattern`, as "file:line: text". */
function offenders(paths: string[], pattern: RegExp, allow: (file: string, line: string) => boolean = () => false): string[] {
    const found: string[] = [];
    for (const file of paths) {
        readFileSync(join(ROOT, file), "utf8")
            .split(/\r?\n/)
            .forEach((line, i) => {
                if (pattern.test(line) && !allow(file, line)) found.push(`${file}:${i + 1}: ${line.trim()}`);
            });
    }
    return found;
}

const CODE = [...files("src"), ...files("tests").filter((f) => !f.startsWith("tests/_internal/")), "playwright.config.ts"];

test.describe("no hardcoding", () => {
    test("no URLs in code: addresses live in config/", () => {
        // Example hosts used as *refused* inputs, the masked form the app returns, and the Showdown
        // replay link the app stores as data (src/data) are fine: none is an address the framework calls
        const allowed = /(evil\.example|169\.254\.169\.254|discord\.com\/api\/webhooks|10\.0\.0\.1|replay\.pokemonshowdown\.com)/;
        expect(offenders(CODE, /https?:\/\//, (_f, line) => allowed.test(line) || /^\s*(\*|\/\/)/.test(line))).toEqual([]);
    });

    test("process.env is read only in src/config", () => {
        expect(offenders(CODE, /process\.env/, (file) => file.startsWith("src/config/"))).toEqual([]);
    });

    test("no fixed sleeps: wait on a signal instead", () => {
        expect(offenders(CODE, /waitForTimeout\(|setTimeout\(\s*resolve/)).toEqual([]);
    });

    test("no passwords or demo accounts in code: they come from .env", () => {
        // src/data holds the only deliberately invalid values (e.g. a too-short password for a validation flow)
        expect(offenders(CODE, /password\s*[:=]\s*["'][^"']+["']/i, (file) => file.startsWith("src/data/"))).toEqual([]);
        expect(offenders(CODE, /(admin|coach\d)@draftdex\.test/)).toEqual([]);
    });
});

test.describe("structure", () => {
    test("every main folder has a README", () => {
        const folders = ["config", "src", ...readdirSync(join(ROOT, "src")).map((d) => `src/${d}`), "tests", "tests/api", "tests/ui", "tests/_internal", "docs"];
        const missing = folders.filter((d) => statSync(join(ROOT, d)).isDirectory() && !existsSync(join(ROOT, d, "README.md")));
        expect(missing).toEqual([]);
    });

    test("UI layers stay apart: specs and states use the interfaces, implementations don't mix", () => {
        const direct = offenders([...files("tests"), ...files("src/states"), ...files("src/support")], /from ["']@\/ui\/(new|classic)/);
        expect(direct, "import from @/ui, never a specific UI").toEqual([]);
        expect(offenders(files("src/ui/new"), /classic/i)).toEqual([]);
    });

    test("nothing generated or secret is tracked by git", () => {
        let tracked: string[];
        try {
            tracked = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" }).split(/\r?\n/);
        } catch {
            test.skip(true, "not a git checkout");
            return;
        }
        const bad = tracked.filter((f) => /^(\.env$|\.env\.(?!example)|reports\/|test-results\/|playwright-report\/|node_modules\/)/.test(f));
        expect(bad).toEqual([]);
        expect(relative(ROOT, ROOT)).toBe("");
    });
});
