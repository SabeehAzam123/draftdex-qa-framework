import { expect, test } from "@/support/fixtures";
import { flow } from "@/support/flow";

const admin = flow.define({
    id: "admin.ui-users",
    title: "An admin finds a user on the users page",
    module: "admin",
    kind: "ui",
    requires: ["account.admin", "account.coach"],
});
test(...flow.case(admin, async ({ given, ui }) => {
    const coach = given("account.coach");
    await ui.signInAs(given("account.admin"));
    await expect(ui.shell.navLink("admin")).toBeVisible();
    await ui.adminUsers.open();
    await ui.adminUsers.search(coach.email);
    await expect(ui.adminUsers.rows()).toHaveCount(1);
    await expect(ui.adminUsers.row(coach.email)).toContainText(coach.displayName);
}));

const notAdmin = flow.define({
    id: "admin.ui-hidden",
    title: "Users who aren't admins don't get the admin pages",
    module: "admin",
    kind: "ui",
    requires: ["account.coach"],
});
test(...flow.case(notAdmin, async ({ given, ui }) => {
    await ui.signInAs(given("account.coach"));
    await expect(ui.shell.navLink("admin")).toHaveCount(0);
    await ui.adminUsers.open();
    await expect(ui.adminUsers.forbidden()).toBeVisible();
}));
