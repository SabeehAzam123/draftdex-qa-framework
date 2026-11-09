import { newAccount } from "@/data/factories";
import { expectApiError } from "@/support/expect-api";
import { expect, test } from "@/support/fixtures";
import { flow } from "@/support/flow";

const adminOnly = flow.define({
    id: "admin.admin-only",
    title: "User management is for admins only",
    module: "admin",
    kind: "api",
    requires: ["account.coach"],
});
test(...flow.case(adminOnly, async ({ given, api }) => {
    const coach = api.as(given("account.coach"));
    await expectApiError(coach.users.list(), 403, "RBAC_FORBIDDEN");
    await expectApiError(coach.users.delete(given("account.coach").id), 403, "RBAC_FORBIDDEN");
    // Never run the reset here: it would delete every other flow's data. Only the refusal is checked.
    await expectApiError(coach.users.resetDemoData(), 403, "RBAC_FORBIDDEN");
}));

const manage = flow.define({
    id: "admin.manage-users",
    title: "An admin creates, finds, promotes and deletes a user",
    module: "admin",
    kind: "api",
    requires: ["account.admin"],
});
test(...flow.case(manage, async ({ given, api, run }) => {
    const admin = api.as(given("account.admin"));
    const fresh = newAccount(run, "managed");
    const user = await admin.users.create({ ...fresh, role: "user" });
    const found = await admin.users.list({ q: fresh.email });
    expect(found.data.map((u) => u.id)).toEqual([user.id]);
    expect((await admin.users.update(user.id, { role: "admin" })).role).toBe("admin");
    await admin.users.delete(user.id);
    await expectApiError(admin.users.delete(user.id), 404, "USER_NOT_FOUND");
}));

const selfGuard = flow.define({
    id: "admin.self-guard",
    title: "An admin can't demote or delete themself, or delete someone with leagues",
    module: "admin",
    kind: "api",
    requires: ["account.admin", "entry.pending"],
});
test(...flow.case(selfGuard, async ({ given, api }) => {
    const me = given("account.admin");
    const admin = api.as(me);
    await expectApiError(admin.users.update(me.id, { role: "user" }), 409, "USER_CANNOT_CHANGE_SELF");
    await expectApiError(admin.users.delete(me.id), 409, "USER_CANNOT_CHANGE_SELF");
    await expectApiError(admin.users.delete(given("entry.pending").coach.id), 409, "USER_HAS_ACTIVITY");
    await expectApiError(admin.users.delete(given("league.setup").commissioner.id), 409, "USER_HAS_ACTIVITY");
}));
