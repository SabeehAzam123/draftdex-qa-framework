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
| `league.season` | A finished draft; the schedule exists | api (a fresh one), existing (the demo league) |
| `match.reported` | The coach reported a 2–1 win over the rival | api, ui (the schedule) |
| `trade.proposed` → `trade.accepted` | A 1-for-1 offer to the rival, then accepted by the rival | api, ui (the trades page) |

The season and trade states also require `league.drafting`, so they work on the flow's own league. Built from the demo league instead (`league.season` from `existing`), they'd fail clearly as BLOCKED.

Add a state: its value type in `values.ts`, a `defineState({...})` here, then list it in `registry.ts`. A self-test checks every requirement exists and every state can be planned.
