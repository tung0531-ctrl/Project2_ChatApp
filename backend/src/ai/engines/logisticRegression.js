// Trien khai logistic regression da lop tren vector TF-IDF, toi uu bang cross-entropy loss va learning-rate decay.
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

const addScaledSparseVector = (target = new Map(), source = new Map(), scale = 1) => {
  source.forEach((value, term) => {
    const nextValue = (target.get(term) || 0) + value * scale;

    if (Math.abs(nextValue) < 1e-12) {
      target.delete(term);
      return;
    }

    target.set(term, nextValue);
  });
};

const scaleSparseVector = (source = new Map(), scale = 1) => {
  if (scale === 1) {
    return;
  }

  Array.from(source.entries()).forEach(([term, value]) => {
    const nextValue = value * scale;

    if (Math.abs(nextValue) < 1e-12) {
      source.delete(term);
      return;
    }

    source.set(term, nextValue);
  });
};

const serializeWeightTable = (table = new Map()) => {
  return Array.from(table.entries()).map(([intent, weights]) => [intent, Array.from(weights.entries())]);
};

const deserializeWeightTable = (entries = []) => {
  return new Map(entries.map(([intent, weights]) => [intent, new Map(weights)]));
};

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;

const softmaxLogits = (items = []) => {
  if (!items.length) {
    return [];
  }

  const maxLogit = Math.max(...items.map((item) => item.logit));
  const scored = items.map((item) => ({
    ...item,
    expScore: Math.exp(item.logit - maxLogit),
  }));
  const total = scored.reduce((sum, item) => sum + item.expScore, 0) || 1;

  return scored
    .map((item) => ({
      intent: item.intent,
      confidence: item.expScore / total,
      logit: item.logit,
    }))
    .sort((left, right) => right.confidence - left.confidence);
};

export class LogisticRegressionClassifier {
  constructor(examples = [], options = {}) {
    this.epochs = options.epochs ?? 10;
    this.learningRate = options.learningRate ?? 0.06;
    this.decay = options.decay ?? 0.01;
    this.regularization = options.regularization ?? 0.0005;
    this.modelLabel = options.modelLabel ?? "logistic-regression";
    this.logPrefix = `[${this.modelLabel}]`;
    this.exampleIntents = new Map();
    this.exampleVectors = [];
    this.intentWeights = new Map();
    this.intentBiases = new Map();
    this.intents = [];
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
    this.vectorizer = TfidfVectorizer.fromJSON(state.vectorizer ?? {});
    this.intents = state.intents ?? [];
    this.intentWeights = deserializeWeightTable(state.intentWeights ?? []);
    this.intentBiases = new Map(state.intentBiases ?? []);
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
    console.info(
      `${this.logPrefix} Training logistic regression model on ${examples.length} examples across ${this.epochs} epochs...`,
    );
    const startedAt = Date.now();
    let lastHeartbeatAt = startedAt;

    this.intents = Array.from(new Set(examples.map((example) => example.intent))).sort();
    this.intentWeights.clear();
    this.intentBiases.clear();
    this.exampleIntents.clear();
    this.exampleVectors = [];

    this.intents.forEach((intent) => {
      this.intentWeights.set(intent, new Map());
      this.intentBiases.set(intent, 0);
    });

    const trainingRows = examples.map((example) => {
      const vector = this.vectorizer.transformToSparse(example.text);
      this.exampleIntents.set(example.text, example.intent);
      this.exampleVectors.push({ ...example, vector });
      return { ...example, vector };
    });

    let step = 0;

    for (let epoch = 0; epoch < this.epochs; epoch += 1) {
      let totalLoss = 0;

      for (let rowIndex = 0; rowIndex < trainingRows.length; rowIndex += 1) {
        const row = trainingRows[rowIndex];
        const eta = this.learningRate / (1 + this.decay * step);
        const logits = this.intents.map((intent) => ({
          intent,
          logit:
            dotSparseVectors(this.intentWeights.get(intent) || new Map(), row.vector) +
            (this.intentBiases.get(intent) || 0),
        }));
        const probabilities = softmaxLogits(logits);
        const probabilityByIntent = new Map(
          probabilities.map((probability) => [probability.intent, probability.confidence]),
        );

        totalLoss += -Math.log(Math.max(probabilityByIntent.get(row.intent) || 0, 1e-12));

        this.intents.forEach((intent) => {
          const target = row.intent === intent ? 1 : 0;
          const probability = probabilityByIntent.get(intent) || 0;
          const error = probability - target;
          const weights = this.intentWeights.get(intent);

          scaleSparseVector(weights, 1 - eta * this.regularization);
          addScaledSparseVector(weights, row.vector, -eta * error);
          this.intentBiases.set(intent, (this.intentBiases.get(intent) || 0) - eta * error);
        });

        step += 1;

        const now = Date.now();

        if (now - lastHeartbeatAt >= HEARTBEAT_INTERVAL_MS) {
          const elapsedMinutes = Math.floor((now - startedAt) / 60000);
          const epochProgress = ((rowIndex + 1) / Math.max(trainingRows.length, 1) * 100).toFixed(1);
          const averageLossSoFar = (totalLoss / Math.max(rowIndex + 1, 1)).toFixed(6);

          console.info(
            `${this.logPrefix} Still training after ${elapsedMinutes} minute(s). Epoch ${epoch + 1}/${this.epochs}, row ${rowIndex + 1}/${trainingRows.length} (${epochProgress}%), average loss ${averageLossSoFar}.`,
          );

          lastHeartbeatAt = now;
        }
      }

      const averageLoss = (totalLoss / Math.max(trainingRows.length, 1)).toFixed(6);
      const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
      console.info(
        `${this.logPrefix} Finished epoch ${epoch + 1}/${this.epochs} with loss ${averageLoss} after ${elapsedSeconds}s.`,
      );
    }

    console.info(
      `${this.logPrefix} Training completed. Intents: ${this.intents.length}. Examples: ${trainingRows.length}.`,
    );
  }

  predict(text = "") {
    const exactIntent = this.exampleIntents.get(text);

    if (exactIntent) {
      return {
        intent: exactIntent,
        confidence: 1,
        scores: [{ intent: exactIntent, confidence: 1, logit: 1 }],
        keywords: this.vectorizer.extractKeywords(text),
      };
    }

    const queryVector = this.vectorizer.transformToSparse(text);

    if (!queryVector.size || this.intents.length === 0) {
      return { intent: null, confidence: 0, scores: [], keywords: [] };
    }

    const logits = this.intents.map((intent) => ({
      intent,
      logit:
        dotSparseVectors(this.intentWeights.get(intent) || new Map(), queryVector) +
        (this.intentBiases.get(intent) || 0),
    }));
    const logisticScores = softmaxLogits(logits);
    const similarityByIntent = new Map();

    this.exampleVectors.forEach((example) => {
      const similarity = dotSparseVectors(queryVector, example.vector);
      const previous = similarityByIntent.get(example.intent) || 0;

      if (similarity > previous) {
        similarityByIntent.set(example.intent, similarity);
      }
    });

    const combinedScores = logisticScores.map((item) => ({
      intent: item.intent,
      confidence: item.confidence * 0.8 + (similarityByIntent.get(item.intent) || 0) * 0.2,
      logit: item.logit,
    }));
    const total = combinedScores.reduce((sum, item) => sum + item.confidence, 0) || 1;
    const scores = combinedScores
      .map((item) => ({
        intent: item.intent,
        confidence: item.confidence / total,
        logit: item.logit,
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
        exampleCount: this.exampleVectors.length,
        intentCount: this.intents.length,
        epochs: this.epochs,
        learningRate: this.learningRate,
        decay: this.decay,
        regularization: this.regularization,
        ...metadata,
      },
      normalizedExamples: this.exampleVectors.map(({ text, intent }) => ({ text, intent })),
      vectorizer: this.vectorizer.toJSON(),
      intents: this.intents,
      intentWeights: serializeWeightTable(this.intentWeights),
      intentBiases: Array.from(this.intentBiases.entries()),
    };
  }

  saveToFile(filePath, metadata = {}) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(this.toJSON(metadata), null, 2), "utf8");
    console.info(`${this.logPrefix} Saved pretrained logistic regression model to ${filePath}`);
  }

  static fromFile(filePath, options = {}) {
    const state = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const classifier = new LogisticRegressionClassifier([], {
      ...options,
      pretrainedState: state,
    });
    const trainedAt = state.meta?.trainedAt ? ` Trained at ${state.meta.trainedAt}.` : "";

    console.info(
      `${classifier.logPrefix} Loaded pretrained logistic regression model from ${filePath}.${trainedAt}`,
    );

    return classifier;
  }
}