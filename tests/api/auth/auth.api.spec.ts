import { INVALID_SIGNUP, newAccount } from "@/data/factories";
import { expectApiError } from "@/support/expect-api";
import { expect, test } from "@/support/fixtures";
import { flow } from "@/support/flow";

const signup = flow.define({
    id: "auth.signup",
    title: "Signing up creates a normal account with 1,000 credits",
    module: "auth",
    kind: "api",
    tags: ["@smoke"],
});
test(...flow.case(signup, async ({ api, run }) => {
    const fresh = newAccount(run, "signup");
    const { token, user } = await api.anon.auth.signup({ ...fresh, email: fresh.email.toUpperCase() });
    expect(user).toMatchObject({ email: fresh.email.toLowerCase(), role: "user", uiVariant: "new", displayName: fresh.displayName });
    const me = api.as({ token });
    expect((await me.auth.me()).balance).toBe(1000);
    const wallet = await me.auth.wallet();
    expect(wallet.history).toEqual([expect.objectContaining({ amount: 1000, kind: "signup_bonus" })]);
}));

const signupValidation = flow.define({
    id: "auth.signup-validation",
    title: "Sign-up explains every invalid field and refuses extra ones",
    module: "auth",
    kind: "api",
});
test(...flow.case(signupValidation, async ({ api, run }) => {
    const bad = await api.anon.client.send("POST", "/auth/signup", { body: INVALID_SIGNUP });
    const err = await expectApiError(bad, 422, "VALIDATION_ERROR");
    expect(err.details?.map((d) => d.path)).toEqual(expect.arrayContaining(["email", "password", "displayName"]));

    // A client can't make itself an admin
    const sneaky = await api.anon.client.send("POST", "/auth/signup", { body: { ...newAccount(run, "sneaky"), role: "admin" } });
    const refused = await expectApiError(sneaky, 422, "VALIDATION_ERROR");
    expect(refused.details?.[0]?.message).toContain("role");
}));

const duplicate = flow.define({
    id: "auth.signup-duplicate",
    title: "An email can have only one account, whatever its case",
    module: "auth",
    kind: "api",
    requires: ["account.coach"],
});
test(...flow.case(duplicate, async ({ given, api }) => {
    const coach = given("account.coach");
    await expectApiError(api.anon.auth.signup({ email: coach.email.toUpperCase(), password: coach.password, displayName: "Twin" }), 409, "USER_EMAIL_EXISTS");
}));

const login = flow.define({
    id: "auth.login",
    title: "Signing in returns a token, and a wrong password gets the same answer as an unknown email",
    module: "auth",
    kind: "api",
    requires: ["account.coach"],
    tags: ["@smoke"],
});
test(...flow.case(login, async ({ given, api, run }) => {
    const coach = given("account.coach");
    const ok = await api.anon.auth.login(coach.email, coach.password);
    expect(ok.user.id).toBe(coach.id);

    const wrong = await expectApiError(api.anon.auth.login(coach.email, `${coach.password}x`), 401, "AUTH_INVALID_CREDENTIALS");
    const unknown = await expectApiError(api.anon.auth.login(newAccount(run, "nobody").email, coach.password), 401, "AUTH_INVALID_CREDENTIALS");
    expect(wrong.message).toBe(unknown.message);
}));

const tokens = flow.define({
    id: "auth.token-required",
    title: "Protected endpoints need a valid token",
    module: "auth",
    kind: "api",
});
test(...flow.case(tokens, async ({ api }) => {
    // Sign someone up first: their session cookie must not leak into the anonymous call
    await api.newAccount("cookie-check");
    await expectApiError(await api.anon.client.send("GET", "/me"), 401, "AUTH_MISSING_TOKEN");
    for (const authorization of ["Bearer not.a.jwt", "Token abc"]) {
        await expectApiError(await api.anon.client.send("GET", "/me", { headers: { authorization } }), 401, "AUTH_INVALID_TOKEN");
    }
}));

const jsonOnly = flow.define({
    id: "auth.json-only",
    title: "Writes must be JSON (blocks cross-site form posts), and broken JSON is a 400",
    module: "auth",
    kind: "api",
});
test(...flow.case(jsonOnly, async ({ api }) => {
    const form = await api.anon.client.send("POST", "/auth/login", { rawBody: "email=a&password=b", contentType: "application/x-www-form-urlencoded" });
    await expectApiError(form, 415, "UNSUPPORTED_MEDIA_TYPE");
    const broken = await api.anon.client.send("POST", "/auth/login", { rawBody: "{not json", contentType: "application/json" });
    await expectApiError(broken, 400, "BAD_REQUEST");
}));

const profile = flow.define({
    id: "auth.profile",
    title: "A user can rename themself and switch UI",
    module: "auth",
    kind: "api",
    requires: ["account.coach"],
});
test(...flow.case(profile, async ({ given, api }) => {
    const me = api.as(given("account.coach"));
    expect(await me.auth.updateMe({ displayName: "Renamed Coach", uiVariant: "classic" })).toMatchObject({ displayName: "Renamed Coach", uiVariant: "classic" });
    expect((await me.auth.me()).displayName).toBe("Renamed Coach");
}));
