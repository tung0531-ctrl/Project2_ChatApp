## AI module overview

This folder is the runtime for all expert-system bots used by ChatApp.

### Main folders

- `bots/`: bot-specific definitions, rule bases, responses, training data, and pretrained model snapshots.
- `engines/`: reusable NLP and expert-system building blocks shared by all bots.
- `loaders/`: helpers that read bot definitions from JSON files.
- `registry/`: central place that instantiates and exposes all available bot engines.
- `services/`: message-flow orchestration between chat messages and bot replies.
- `scripts/`: one-off utilities for pretraining or smoke-testing AI bots.

### Main files

- `engines/expertBotEngine.js`: the core orchestrator. It turns a bot definition into a runnable engine with `predictIntent()`, `explainIntent()`, and `run()`. It is responsible for normalization, classifier selection/loading, optional prediction rescue, entity lookup, fact seeding, forward chaining, and fallback handling.
- `engines/forwardChaining.js`: generic IF-THEN inference engine. It stores facts, checks rule conditions, fires rules once, and returns the resolved response plus fired rules.
- `engines/tfidfVectorizer.js`: converts text into sparse TF-IDF vectors. All three clinic classifiers use it for training, prediction, keyword extraction, and similarity scoring.
- `engines/naiveBayes.js`: TF-IDF weighted Naive Bayes classifier used by `botClinicV2`.
- `engines/supportVectorMachine.js`: linear one-vs-rest SVM classifier used by `botClinic`.
- `engines/logisticRegression.js`: multiclass logistic regression classifier used by `botClinicV3`.
- `registry/index.js`: builds the bot registry by loading definitions and wrapping each one with `createExpertBotEngine()`.
- `services/botService.js`: connects chat messages to bots. It detects `@bot` mentions, checks whether the bot is enabled for the conversation, builds context, and creates the outgoing bot reply payload.
- `loaders/botLoader.js`: loads JSON bot definitions such as `botGame.json`.
- `bots/botGame.json`: JSON-defined game bot knowledge base, including examples, entities, rules, and responses.
- `bots/botClinic/index.js`: public entry for the clinic bot family. It exposes the shared clinic runtime, dataset helpers, and the 3 clinic bot variants.
- `scripts/precomputeBotClinicModel.mjs`: offline training script that precomputes the clinic classifier models and stores them in `modelCache*.json`.
- `scripts/smokeHybridBot.mjs`: quick local smoke test for hybrid bot behavior.

### JSON note

Some AI files are pure JSON data files, such as `bots/botGame.json` and `bots/botClinic/modelCache*.json`.
They cannot receive inline comments without breaking the current `JSON.parse()` loading path, so their role is documented in the README files instead of inside the JSON itself.

### How `expertBotEngine` fits in

`expertBotEngine.js` is the bridge between static bot data and live runtime behavior:

1. Normalize user text.
2. Run the selected classifier.
3. Optionally transform or rescue the prediction using bot-specific hooks.
4. Match entities from the bot definition.
5. Seed working-memory facts.
6. Run forward chaining over the bot rules.
7. Resolve the final response or fallback.

If you want to understand the AI flow end-to-end, start with `registry/index.js`, then `engines/expertBotEngine.js`, then the target bot under `bots/`.
