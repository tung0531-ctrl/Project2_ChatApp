const tokenize = (text) => {
  return text
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
};

export class NaiveBayesClassifier {
  constructor(examples = []) {
    this.intentDocCounts = new Map();
    this.intentTokenCounts = new Map();
    this.intentTotalTokens = new Map();
    this.vocabulary = new Set();
    this.totalDocs = 0;

    this.train(examples);
  }

  train(examples) {
    examples.forEach(({ text, intent }) => {
      const tokens = tokenize(text);
      this.totalDocs += 1;
      this.intentDocCounts.set(intent, (this.intentDocCounts.get(intent) || 0) + 1);

      if (!this.intentTokenCounts.has(intent)) {
        this.intentTokenCounts.set(intent, new Map());
      }

      const tokenMap = this.intentTokenCounts.get(intent);

      tokens.forEach((token) => {
        this.vocabulary.add(token);
        tokenMap.set(token, (tokenMap.get(token) || 0) + 1);
        this.intentTotalTokens.set(
          intent,
          (this.intentTotalTokens.get(intent) || 0) + 1,
        );
      });
    });
  }

  predict(text) {
    const tokens = tokenize(text);
    const vocabSize = Math.max(this.vocabulary.size, 1);
    const intents = Array.from(this.intentDocCounts.keys());

    if (tokens.length === 0 || intents.length === 0) {
      return { intent: null, confidence: 0, scores: [] };
    }

    const rawScores = intents.map((intent) => {
      const docCount = this.intentDocCounts.get(intent) || 1;
      const tokenMap = this.intentTokenCounts.get(intent) || new Map();
      const totalTokens = this.intentTotalTokens.get(intent) || 0;

      let score = Math.log(docCount / this.totalDocs);

      tokens.forEach((token) => {
        const tokenCount = tokenMap.get(token) || 0;
        score += Math.log((tokenCount + 1) / (totalTokens + vocabSize));
      });

      return { intent, score };
    });

    const maxScore = Math.max(...rawScores.map((item) => item.score));
    const stabilized = rawScores.map((item) => ({
      ...item,
      expScore: Math.exp(item.score - maxScore),
    }));
    const totalScore = stabilized.reduce((sum, item) => sum + item.expScore, 0);
    const scores = stabilized
      .map((item) => ({
        intent: item.intent,
        confidence: totalScore === 0 ? 0 : item.expScore / totalScore,
      }))
      .sort((left, right) => right.confidence - left.confidence);

    return {
      intent: scores[0]?.intent ?? null,
      confidence: scores[0]?.confidence ?? 0,
      scores,
    };
  }
}