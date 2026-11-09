# tests/ui/

UI flows, one folder per module. They use the page objects through `ui` (never a specific UI's classes), and `ui.signInAs(account)` to start signed in.

To build a prerequisite through the screens too (because the flow is about them), pin it:

```ts
const f = flow.define({
    id: "entry.ui-join-through-ui",
    title: "Applying and approval, both through the screens",
    module: "entry",
    kind: "ui",
    requires: ["entry.approved"],
    pins: { "entry.pending": "ui", "entry.approved": "ui" },
});
```
