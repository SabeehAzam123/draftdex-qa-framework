# src/data/

- `newAccount`, `leagueName`, `teamName`: unique per run (run id + random suffix), so parallel workers never collide and created data is easy to spot (`e2e` in every name).
- `TEST_LEAGUE_SETTINGS`: small leagues (3 rounds, up to 4 coaches), so a whole draft takes a few calls.
- `MON`: the Pokémon flows refer to, and why (cost, legendary, Showdown spelling).
- `INVALID_SIGNUP`: deliberately invalid input for validation flows. The only place such values may live (a self-test checks).
