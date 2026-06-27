## botClinic structure

- `index.js`: public entry point for the clinic bot family.
- `variants/`: one thin definition file per bot variant.
- `runtime/`: shared bot construction, intent rescue, slot extraction, and model-cache helpers.
- `data/`: CLINC dataset loader and supplemental seed examples.
- `rules.js` and `responses.js`: the knowledge base used by forward chaining.
- `modelCache*.json`: pretrained classifier snapshots for each clinic variant.

This layout keeps behavior the same while separating declaration files, shared runtime logic, and training data.
`modelCache*.json` remain comment-free because they are loaded as raw JSON snapshots at runtime.
