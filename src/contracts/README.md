# src/contracts/

zod schemas for every DraftDex reply. **Strict**: a field the app adds, renames or drops fails the flow with the exact path, because noticing API drift is part of testing.

Template for a new one:

```ts
export const Thing = z.strictObject({
    id: Id("th"),
    name: z.string(),
    createdAt: IsoDate,
});
export type Thing = z.infer<typeof Thing>;
```

Then use it in a service: `this.c.data("GET", "/things/" + id, 200, Thing)`.
