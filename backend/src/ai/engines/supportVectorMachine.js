// Trien khai linear SVM da lop toi gian bang SGD tren vector TF-IDF de suy ra intent cho botClinic.
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

const softmaxMargins = (items = []) => {
  if (!items.length) {
    return [];
  }

  const maxMargin = Math.max(...items.map((item) => item.margin));
  const scored = items.map((item) => ({
    ...item,
    expScore: Math.exp(item.margin - maxMargin),
  }));
  const total = scored.reduce((sum, item) => sum + item.expScore, 0) || 1;

  return scored
    .map((item) => ({
      intent: item.intent,
      confidence: item.expScore / total,
      margin: item.margin,
    }))
    .sort((left, right) => right.confidence - left.confidence);
};

const serializeWeightTable = (table = new Map()) => {
  return Array.from(table.entries()).map(([intent, weights]) => [intent, Array.from(weights.entries())]);
};

const deserializeWeightTable = (entries = []) => {
  return new Map(entries.map(([intent, weights]) => [intent, new Map(weights)]));
};

export class SupportVectorMachineClassifier {
  constructor(examples = [], options = {}) {
    this.epochs = options.epochs ?? 8;
    this.learningRate = options.learningRate ?? 0.08;
    this.decay = options.decay ?? 0.01;
    this.regularization = options.regularization ?? 0.0005;
    this.modelLabel = options.modelLabel ?? "svm";
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
      `${this.logPrefix} Training SVM model on ${examples.length} examples across ${this.epochs} epochs...`,
    );
    const startedAt = Date.now();

    this.intents = Array.from(new Set(examples.map((example) => example.intent))).sort();
    this.intentWeights.clear();
    this.intentBiases.clear();

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
      for (const row of trainingRows) {
        const eta = this.learningRate / (1 + this.decay * step);

        this.intents.forEach((intent) => {
          const expected = row.intent === intent ? 1 : -1;
          const weights = this.intentWeights.get(intent);
          const currentMargin = dotSparseVectors(weights, row.vector) + (this.intentBiases.get(intent) || 0);

          scaleSparseVector(weights, 1 - eta * this.regularization);

          if (expected * currentMargin < 1) {
            addScaledSparseVector(weights, row.vector, eta * expected);
            this.intentBiases.set(intent, (this.intentBiases.get(intent) || 0) + eta * expected);
          }
        });

        step += 1;
      }

      const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
      console.info(
        `${this.logPrefix} Finished epoch ${epoch + 1}/${this.epochs} after ${elapsedSeconds}s.`,
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
        scores: [{ intent: exactIntent, confidence: 1, margin: 1 }],
        keywords: this.vectorizer.extractKeywords(text),
      };
    }

    const queryVector = this.vectorizer.transformToSparse(text);

    if (!queryVector.size || this.intents.length === 0) {
      return { intent: null, confidence: 0, scores: [], keywords: [] };
    }

    const margins = this.intents.map((intent) => ({
      intent,
      margin:
        dotSparseVectors(this.intentWeights.get(intent) || new Map(), queryVector) +
        (this.intentBiases.get(intent) || 0),
    }));

    const svmScores = softmaxMargins(margins);
    const similarityByIntent = new Map();

    this.exampleVectors.forEach((example) => {
      const similarity = dotSparseVectors(queryVector, example.vector);
      const previous = similarityByIntent.get(example.intent) || 0;

      if (similarity > previous) {
        similarityByIntent.set(example.intent, similarity);
      }
    });

    const combinedScores = svmScores.map((item) => ({
      intent: item.intent,
      confidence: item.confidence * 0.8 + (similarityByIntent.get(item.intent) || 0) * 0.2,
      margin: item.margin,
    }));
    const total = combinedScores.reduce((sum, item) => sum + item.confidence, 0) || 1;
    const scores = combinedScores
      .map((item) => ({
        intent: item.intent,
        confidence: item.confidence / total,
        margin: item.margin,
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
    console.info(`${this.logPrefix} Saved pretrained SVM model to ${filePath}`);
  }

  static fromFile(filePath, options = {}) {
    const state = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const classifier = new SupportVectorMachineClassifier([], {
      ...options,
      pretrainedState: state,
    });
    const trainedAt = state.meta?.trainedAt ? ` Trained at ${state.meta.trainedAt}.` : "";

    console.info(`${classifier.logPrefix} Loaded pretrained SVM model from ${filePath}.${trainedAt}`);

    return classifier;
  }
}