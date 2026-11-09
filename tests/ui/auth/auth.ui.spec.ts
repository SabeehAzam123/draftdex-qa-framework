import { INVALID_SIGNUP, newAccount } from "@/data/factories";
import { expect, test } from "@/support/fixtures";
import { flow } from "@/support/flow";

const signIn = flow.define({
    id: "auth.ui-sign-in",
    title: "A coach signs in and lands on their leagues",
    module: "auth",
    kind: "ui",
    requires: ["account.coach"],
    tags: ["@smoke"],
});
test(...flow.case(signIn, async ({ given, ui, page }) => {
    const coach = given("account.coach");
    await ui.login.open();
    await ui.login.signIn(coach.email, coach.password);
    await expect(page).toHaveURL(/\/leagues$/);
    await expect(ui.shell.userName()).toHaveText(coach.displayName);
    await expect(ui.shell.credits()).toHaveText("1,000 cr");
}));

const signInErrors = flow.define({
    id: "auth.ui-sign-in-errors",
    title: "The sign-in form explains what's wrong",
    module: "auth",
    kind: "ui",
    requires: ["account.coach"],
});
test(...flow.case(signInErrors, async ({ given, ui }) => {
    const coach = given("account.coach");
    await ui.login.open();
    await ui.login.submit();
    await expect(ui.login.fieldError("email")).toHaveText("Enter your email");
    await expect(ui.login.fieldError("password")).toHaveText("Enter your password");

    await ui.login.signIn(coach.email, `${coach.password}x`).catch(() => undefined);
    await expect(ui.login.formError()).toHaveText("Wrong email or password");
}));

const signUp = flow.define({
    id: "auth.ui-sign-up",
    title: "A visitor creates an account and starts with 1,000 credits",
    module: "auth",
    kind: "ui",
    tags: ["@smoke"],
});
test(...flow.case(signUp, async ({ ui, run, page }) => {
    await ui.signup.open();
    await ui.signup.fill(INVALID_SIGNUP);
    await ui.signup.submit();
    await expect(ui.signup.fieldError("name")).toHaveText("At least 2 characters");
    await expect(ui.signup.fieldError("email")).toHaveText("Enter a valid email");
    await expect(ui.signup.fieldError("password")).toHaveText("At least 8 characters");

    const fresh = newAccount(run, "visitor");
    await ui.signup.fill(fresh);
    await ui.signup.submit();
    await page.waitForURL(/\/leagues$/);
    await expect(ui.shell.userName()).toHaveText(fresh.displayName);
    await expect(ui.shell.credits()).toHaveText("1,000 cr");
}));

const signOut = flow.define({
    id: "auth.ui-sign-out",
    title: "Signing out ends the session; protected pages send you to sign in",
    module: "auth",
    kind: "ui",
    requires: ["account.coach"],
});
test(...flow.case(signOut, async ({ given, ui, page }) => {
    await ui.signInAs(given("account.coach"));
    await ui.shell.signOut();
    await page.goto("/wallet");
    await expect(page).toHaveURL(/\/login/);
}));
