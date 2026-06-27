## bots folder

- `botGame.json`: pure JSON bot definition for the game expert bot. It contains examples, entities, rules, and responses, then gets loaded by `loaders/botLoader.js`.
- `botClinic/`: clinic bot family split into config, data, runtime helpers, rule base, and response templates.

`botGame.json` stays comment-free because it is loaded directly with `JSON.parse()`. Use this README and `src/ai/README.md` as the human-readable guide for JSON-based AI files.
