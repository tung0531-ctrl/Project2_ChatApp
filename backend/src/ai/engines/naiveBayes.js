// Trien khai bo phan loai Naive Bayes nhe de du doan intent cho tung bot domain.
import fs from "fs";
import path from "path";

import { TfidfVectorizer } from "./tfidfVectorizer.js";

const dotSparseVectors = (left = new Map(), right = new Map()) => {
  const [smaller, larger] = left.size <= right.size ? [left, right] : [right, left];
  let score = 0;

  smaller.forEach((weight, term) => {
    score += weight * (larger.get(term) || 0);
  });

  return score;
};

export class NaiveBayesClassifier {
  constructor(examples = [], options = {}) {
    this.alpha = options.alpha ?? 1;
    this.modelLabel = options.modelLabel ?? "naive-bayes";
    this.logPrefix = `[${this.modelLabel}]`;
    this.intentDocCounts = new Map();
    this.intentFeatureWeights = new Map();
    this.intentTotalWeights = new Map();
    this.totalDocs = 0;
    this.exampleIntents = new Map();
    this.exampleVectors = [];
    this.vectorizer = new TfidfVectorizer([], options.vectorizerOptions);

    if (options.pretrainedState) {
      this.hydrate(options.pretrainedState);
      return;
    }

    this.vectorizer = new TfidfVectorizer(
      examples.map((example) => example.text),
      options.vectorizerOptions,
    );

    this.train(examples);
  }

  hydrate(state = {}) {
    this.alpha = state.meta?.alpha ?? this.alpha;
    this.vectorizer = TfidfVectorizer.fromJSON(state.vectorizer ?? {});
    this.totalDocs = state.totalDocs ?? 0;
    this.intentDocCounts = new Map(state.intentDocCounts ?? []);
    this.intentFeatureWeights = new Map(
      (state.intentFeatureWeights ?? []).map(([intent, weights]) => [intent, new Map(weights)]),
    );
    this.intentTotalWeights = new Map(state.intentTotalWeights ?? []);
    this.rebuildExampleIndexes(state.normalizedExamples ?? []);
  }

  rebuildExampleIndexes(examples = []) {
    this.exampleIntents.clear();
    this.exampleVectors = examples.map((example) => {
      const vector = this.vectorizer.transformToSparse(example.text);

      this.exampleIntents.set(example.text, example.intent);

      return { ...example, vector };
    });
  }

  train(examples = []) {
    console.info(`${this.logPrefix} Training Naive Bayes model on ${examples.length} examples...`);

    this.intentDocCounts.clear();
    this.intentFeatureWeights.clear();
    this.intentTotalWeights.clear();
    this.totalDocs = 0;
    this.exampleIntents.clear();
    this.exampleVectors = [];

    examples.forEach(({ text, intent }) => {
      const vector = this.vectorizer.transformToSparse(text);

      this.totalDocs += 1;
      this.exampleIntents.set(text, intent);
      this.exampleVectors.push({ text, intent, vector });
      this.intentDocCounts.set(intent, (this.intentDocCounts.get(intent) || 0) + 1);

      if (!this.intentFeatureWeights.has(intent)) {
        this.intentFeatureWeights.set(intent, new Map());
      }

      const featureMap = this.intentFeatureWeights.get(intent);

      vector.forEach((weight, term) => {
        featureMap.set(term, (featureMap.get(term) || 0) + weight);
        this.intentTotalWeights.set(intent, (this.intentTotalWeights.get(intent) || 0) + weight);
      });
    });

    console.info(
      `${this.logPrefix} Training completed. Intents: ${this.intentDocCounts.size}. Examples: ${this.totalDocs}.`,
    );
  }

  predict(text = "") {
    const exactIntent = this.exampleIntents.get(text);

    if (exactIntent) {
      return {
        intent: exactIntent,
        confidence: 1,
        scores: [{ intent: exactIntent, confidence: 1 }],
        keywords: this.vectorizer.extractKeywords(text),
      };
    }

    const queryVector = this.vectorizer.transformToSparse(text);
    const intents = Array.from(this.intentDocCounts.keys());

    if (!queryVector.size || intents.length === 0) {
      return { intent: null, confidence: 0, scores: [], keywords: [] };
    }

    const vocabularySize = Math.max(this.vectorizer.vocabulary.size, 1);
    const rawScores = intents.map((intent) => {
      const intentDocCount = this.intentDocCounts.get(intent) || 1;
      const featureMap = this.intentFeatureWeights.get(intent) || new Map();
      const totalIntentWeight = this.intentTotalWeights.get(intent) || 0;
      let score = Math.log(intentDocCount / this.totalDocs);

      queryVector.forEach((queryWeight, term) => {
        const observedWeight = featureMap.get(term) || 0;
        const conditionalProbability =
          (observedWeight + this.alpha) / (totalIntentWeight + this.alpha * vocabularySize);

        score += queryWeight * Math.log(conditionalProbability);
      });

      return { intent, score };
    });

    const maxScore = Math.max(...rawScores.map((item) => item.score));
    const stabilizedScores = rawScores.map((item) => ({
      ...item,
      expScore: Math.exp(item.score - maxScore),
    }));
    const totalScore = stabilizedScores.reduce((sum, item) => sum + item.expScore, 0);
    const bayesScores = stabilizedScores
      .map((item) => ({
        intent: item.intent,
        confidence: totalScore === 0 ? 0 : item.expScore / totalScore,
      }))
      .sort((left, right) => right.confidence - left.confidence);

    const similarityByIntent = new Map();

    this.exampleVectors.forEach((example) => {
      const similarity = dotSparseVectors(queryVector, example.vector);
      const bestSimilarity = similarityByIntent.get(example.intent) || 0;

      if (similarity > bestSimilarity) {
        similarityByIntent.set(example.intent, similarity);
      }
    });

    const combinedScores = bayesScores.map((item) => ({
      intent: item.intent,
      confidence:
        item.confidence * 0.7 + (similarityByIntent.get(item.intent) || 0) * 0.3,
    }));
    const combinedTotal = combinedScores.reduce((sum, item) => sum + item.confidence, 0) || 1;
    const scores = combinedScores
      .map((item) => ({
        intent: item.intent,
        confidence: item.confidence / combinedTotal,
      }))
      .sort((left, right) => right.confidence - left.confidence);

    return {
      intent: scores[0]?.intent ?? null,
      confidence: scores[0]?.confidence ?? 0,
      scores,
      keywords: this.vectorizer.extractKeywords(text),
    };
  }

  toJSON(metadata = {}) {
    return {
      meta: {
        trainedAt: new Date().toISOString(),
        modelLabel: this.modelLabel,
        alpha: this.alpha,
        exampleCount: this.exampleVectors.length,
        intentCount: this.intentDocCounts.size,
        ...metadata,
      },
      normalizedExamples: this.exampleVectors.map(({ text, intent }) => ({ text, intent })),
      totalDocs: this.totalDocs,
      vectorizer: this.vectorizer.toJSON(),
      intentDocCounts: Array.from(this.intentDocCounts.entries()),
      intentFeatureWeights: Array.from(this.intentFeatureWeights.entries()).map(
        ([intent, weights]) => [intent, Array.from(weights.entries())],
      ),
      intentTotalWeights: Array.from(this.intentTotalWeights.entries()),
    };
  }

  saveToFile(filePath, metadata = {}) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(this.toJSON(metadata), null, 2), "utf8");
    console.info(`${this.logPrefix} Saved pretrained Naive Bayes model to ${filePath}`);
  }

  static fromFile(filePath, options = {}) {
    const state = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const classifier = new NaiveBayesClassifier([], {
      ...options,
      pretrainedState: state,
    });
    const trainedAt = state.meta?.trainedAt ? ` Trained at ${state.meta.trainedAt}.` : "";

    console.info(
      `${classifier.logPrefix} Loaded pretrained Naive Bayes model from ${filePath}.${trainedAt}`,
    );

    return classifier;
  }
}