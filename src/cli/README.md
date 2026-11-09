# src/cli/

| Command | What |
| --- | --- |
| `npm run catalog` | Every flow as JSON (`-- --table` for people) |
| `npm run plan -- <flow id>…` | What each flow would set up, with which provider and why. Uses this run's request (`DRAFTDEX_RUN_REQUEST`) and checks providers' availability. `--all`, `--json` |

Both run with `tsx`: no build step.
