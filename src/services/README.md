# src/services/

One class per API family, bound to one account through its `ApiClient`. Each method expects the success status, checks the reply against its contract and returns typed data.

```ts
const coach = api.as(given("account.coach"));
const state = await coach.draft.pick(leagueId, MON.garchomp.id);
```

For a refusal, let the call throw and check it with `expectApiError(promise, status, code)`. For raw requests (a wrong content type, broken JSON) use `api.anon.client.send(...)`.
