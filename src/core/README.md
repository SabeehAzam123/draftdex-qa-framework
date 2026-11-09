# src/core/

`http/api-client.ts`: the one HTTP client, built on Playwright's request context, so every call shows in traces and the HTML report.

- `send()` returns any reply; `expectStatus()`, `data()` and `page()` check the status and the contract, and throw `ApiError` (status, error code, trace id) or `ContractError` (every field that differs).
- Calls are authenticated by a Bearer token only: an empty `cookie` header stops Playwright reusing cookies from earlier sign-ins.
- `ECONNRESET` is retried: a keep-alive socket closed as the request left, so it never reached the app.
- Raw bodies go out as bytes. A string with a JSON content type that isn't valid JSON would otherwise be re-encoded by Playwright as a JSON string.
