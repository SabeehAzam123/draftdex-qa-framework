# src/catalog/

`buildCatalog()` lists the api and ui projects (`playwright test --list --reporter=json`; nothing runs) and reads each flow back from the tags `flow.define` wrote. So the catalog can't drift from the specs.

The catalog is versioned (`schemaVersion`) and checked by zod. The Streamlit runner (phase 5) reads it and refuses a version it doesn't know.
