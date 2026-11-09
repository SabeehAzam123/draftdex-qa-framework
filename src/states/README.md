# src/states/

Every state a flow can `require`, each with the providers that can build it.

| State | Builds | Providers |
| --- | --- | --- |
| `account.commissioner`, `account.coach` | A fresh account | api, ui (sign-up page) |
| `account.admin` | The admin from `.env` | existing |
| `league.setup` → `league.registration` | A league, then open for registration | api, ui |
| `entry.pending` → `entry.approved` | The coach applies, then is approved | api, ui |
| `league.rival` | A second approved coach | api |
| `league.drafting` | Draft started, the coach first | api, ui |
| `draft.first-pick` | The coach made pick 1 | api, ui |
| `league.season` | A finished draft | api (a fresh one), existing (the demo league) |

Add a state: its value type in `values.ts`, a `defineState({...})` here, then list it in `registry.ts`. A self-test checks every requirement exists and every state can be planned.
