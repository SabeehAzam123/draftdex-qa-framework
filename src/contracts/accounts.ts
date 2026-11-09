import { z } from "zod";
import { Id, IsoDate } from "./common";

export const User = z.strictObject({
    id: Id("us"),
    email: z.email(),
    displayName: z.string().min(2),
    role: z.enum(["admin", "user"]),
    uiVariant: z.enum(["new", "classic"]),
    createdAt: IsoDate,
});
export type User = z.infer<typeof User>;

export const Me = User.extend({ balance: z.number().int() }).strict();
export type Me = z.infer<typeof Me>;

export const LoginResult = z.strictObject({ token: z.jwt(), user: User });
export type LoginResult = z.infer<typeof LoginResult>;

export const LedgerRow = z.strictObject({
    id: z.number().int(),
    amount: z.number().int().refine((n) => n !== 0, "a ledger row never moves 0 credits"),
    kind: z.enum(["signup_bonus", "entry_fee", "refund", "prize"]),
    ref: z.string().nullable(),
    memo: z.string(),
    createdAt: IsoDate,
});
export const Wallet = z.strictObject({ balance: z.number().int(), history: z.array(LedgerRow) });
export type Wallet = z.infer<typeof Wallet>;

export const SeedSummary = z.strictObject({
    admin: z.email(),
    coaches: z.array(z.email()),
    leagues: z.array(z.strictObject({ name: z.string(), status: z.string() })),
});
