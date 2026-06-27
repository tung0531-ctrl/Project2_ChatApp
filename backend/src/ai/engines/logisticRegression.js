// Trien khai multiclass logistic regression tren vector TF-IDF.
// File nay phu trach train/predict/explain, toi uu bang cross-entropy loss,
// va tra ve confidence sau khi softmax logit va tron them similarity heuristic.
import fs from "fs";
import path from "path";

import { TfidfVectorizer } from "./tfidfVectorizer.js";

// Dot-product sparse duoc dung de tinh logit cho moi intent.
const dotSparseVectors = (left = new Map(), right = new Map()) => {
  const [smaller, larger] = left.size <= right.size ? [left, right] : [right, left];
  let score = 0;

  smaller.forEach((weight, term) => {
    score += weight * (larger.get(term) || 0);
  });

  return score;
};

// Cap nhat sparse weights theo gradient tren cac feature dang xuat hien.
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

const serializeWeightTable = (table = new Map()) => {
  return Array.from(table.entries()).map(([intent, weights]) => [intent, Array.from(weights.entries())]);
};

const deserializeWeightTable = (entries = []) => {
  return new Map(entries.map(([intent, weights]) => [intent, new Map(weights)]));
};

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;

// Tron ngau nhien tap train moi epoch de SGD it bi lech thu tu du lieu.
const shuffleArray = (array = []) => {
  for (let index = array.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [array[index], array[swapIndex]] = [array[swapIndex], array[index]];
  }
};

// Lazy decay tri hoan regularization toi luc feature duoc dung lai de giam chi phi tinh toan.
const applyLazyDecayToTerm = ({
  weights = new Map(),
  lastUpdated = new Map(),
  term,
  totalSteps = 0,
  shrinkFactor = 1,
}) => {
  const previousStep = lastUpdated.get(term) || 0;
  const stepsPassed = totalSteps - previousStep;

  if (stepsPassed <= 0) {
    return;
  }

  const currentWeight = weights.get(term) || 0;
  const nextWeight = currentWeight * shrinkFactor ** stepsPassed;

  if (Math.abs(nextWeight) < 1e-12) {
    weights.delete(term);
  } else {
    weights.set(term, nextWeight);
  }

  lastUpdated.set(term, totalSteps);
};

// Chot toan bo lazy decay truoc khi predict hoac luu model.
const settleLazyDecayForWeights = ({
  weights = new Map(),
  lastUpdated = new Map(),
  totalSteps = 0,
  shrinkFactor = 1,
}) => {
  Array.from(weights.keys()).forEach((term) => {
    applyLazyDecayToTerm({
      weights,
      lastUpdated,
      term,
      totalSteps,
      shrinkFactor,
    });
  });
};

// Softmax logits thanh phan phoi xac suat da lop.
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

// Tao bang contribution cho explainability.
const buildContributionRows = (queryVector = new Map(), weights = new Map()) => {
  return Array.from(queryVector.entries())
    .map(([term, inputWeight]) => {
      const modelWeight = weights.get(term) || 0;

      return {
        term,
        inputWeight,
        modelWeight,
        contribution: inputWeight * modelWeight,
      };
    })
    .sort((left, right) => Math.abs(right.contribution) - Math.abs(left.contribution));
};

export class LogisticRegressionClassifier {
  // Khoi tao classifier moi, hydrate state, hoac resume training tu checkpoint.
  constructor(examples = [], options = {}) {
    this.epochs = options.epochs ?? 10;
    this.learningRate = options.learningRate ?? 0.06;
    this.decay = options.decay ?? 0.01;
    this.regularization = options.regularization ?? 0.0005;
    this.tolerance = options.tolerance ?? 0.0001;
    this.patienceLimit = options.patience ?? 2;
    this.modelLabel = options.modelLabel ?? "logistic-regression";
    this.logPrefix = `[${this.modelLabel}]`;
    this.exampleIntents = new Map();
    this.exampleVectors = [];
    this.intentWeights = new Map();
    this.intentBiases = new Map();
    this.intents = [];
    this.lazyDecayState = null;
    this.vectorizer = new TfidfVectorizer([], options.vectorizerOptions);

    if (options.pretrainedState) {
      this.hydrate(options.pretrainedState);
      this.applyOptionOverrides(options);

      if (options.resumeTraining) {
        this.train(examples, { resumeFromCurrentState: true });
      }

      return;
    }

    this.vectorizer = new TfidfVectorizer(
      examples.map((example) => example.text),
      options.vectorizerOptions,
    );

    this.train(examples);
  }

  // Cho phep script train override mot so hyperparameter luc resume.
  applyOptionOverrides(options = {}) {
    if (Object.prototype.hasOwnProperty.call(options, "epochs")) {
      this.epochs = options.epochs;
    }

    if (Object.prototype.hasOwnProperty.call(options, "learningRate")) {
      this.learningRate = options.learningRate;
    }

    if (Object.prototype.hasOwnProperty.call(options, "decay")) {
      this.decay = options.decay;
    }

    if (Object.prototype.hasOwnProperty.call(options, "regularization")) {
      this.regularization = options.regularization;
    }

    if (Object.prototype.hasOwnProperty.call(options, "tolerance")) {
      this.tolerance = options.tolerance;
    }

    if (Object.prototype.hasOwnProperty.call(options, "patience")) {
      this.patienceLimit = options.patience;
    }
  }

  // Khoi phuc model state, vectorizer va example indexes tu model cache.
  hydrate(state = {}) {
    this.epochs = state.meta?.epochs ?? this.epochs;
    this.learningRate = state.meta?.learningRate ?? this.learningRate;
    this.decay = state.meta?.decay ?? this.decay;
    this.regularization = state.meta?.regularization ?? this.regularization;
    this.tolerance = state.meta?.tolerance ?? this.tolerance;
    this.patienceLimit = state.meta?.patience ?? this.patienceLimit;
    this.vectorizer = TfidfVectorizer.fromJSON(state.vectorizer ?? {});
    this.intents = state.intents ?? [];
    this.intentWeights = deserializeWeightTable(state.intentWeights ?? []);
    this.intentBiases = new Map(state.intentBiases ?? []);
    this.lazyDecayState = null;
    this.rebuildExampleIndexes(state.normalizedExamples ?? []);
  }

  // Dong bo lazy decay dang tre de state va du doan khong bi lech.
  flushPendingLazyDecay() {
    if (!this.lazyDecayState) {
      return;
    }

    const { totalSteps = 0, shrinkFactor = 1, intentLastUpdated = new Map() } = this.lazyDecayState;

    this.intents.forEach((intent) => {
      settleLazyDecayForWeights({
        weights: this.intentWeights.get(intent),
        lastUpdated: intentLastUpdated.get(intent),
        totalSteps,
        shrinkFactor,
      });
    });

    this.lazyDecayState = null;
  }

  // Tao lai exact-match map va example vectors dung cho similarity heuristic.
  rebuildExampleIndexes(examples = []) {
    this.exampleIntents.clear();
    this.exampleVectors = examples.map((example) => {
      const vector = this.vectorizer.transformToSparse(example.text);

      this.exampleIntents.set(example.text, example.intent);

      return { ...example, vector };
    });
  }

  // Tinh average cross-entropy loss de danh gia offline hoac kiem tra checkpoint.
  evaluateAverageLoss(examples = []) {
    if (!examples.length || this.intents.length === 0) {
      return 0;
    }

    let totalLoss = 0;

    examples.forEach((example) => {
      const vector = this.vectorizer.transformToSparse(example.text);
      const logits = this.intents.map((intent) => ({
        intent,
        logit:
          dotSparseVectors(this.intentWeights.get(intent) || new Map(), vector) +
          (this.intentBiases.get(intent) || 0),
      }));
      const probabilities = softmaxLogits(logits);
      const matchedProbability =
        probabilities.find((probability) => probability.intent === example.intent)?.confidence ?? 0;

      totalLoss += -Math.log(Math.max(matchedProbability, 1e-12));
    });

    return totalLoss / examples.length;
  }

  // Train logistic regression bang softmax + gradient descent co regularization va decay.
  train(examples = [], options = {}) {
    const resumeFromCurrentState = options.resumeFromCurrentState ?? false;

    console.info(
      `${this.logPrefix} ${resumeFromCurrentState ? "Resuming" : "Training"} logistic regression model on ${examples.length} examples across ${this.epochs} epochs...`,
    );
    const startedAt = Date.now();
    let lastHeartbeatAt = startedAt;
    let currentEta = this.learningRate;
    let previousLoss = Number.POSITIVE_INFINITY;
    let patience = 0;
    let totalSteps = 0;
    this.exampleIntents.clear();
    this.exampleVectors = [];
    const intentLastUpdated = new Map();

    const discoveredIntents = Array.from(new Set(examples.map((example) => example.intent))).sort();

    if (!resumeFromCurrentState) {
      this.intents = discoveredIntents;
      this.intentWeights.clear();
      this.intentBiases.clear();

      this.intents.forEach((intent) => {
        this.intentWeights.set(intent, new Map());
        this.intentBiases.set(intent, 0);
      });
    } else {
      this.intents = Array.from(new Set([...this.intents, ...discoveredIntents])).sort();

      this.intents.forEach((intent) => {
        if (!this.intentWeights.has(intent)) {
          this.intentWeights.set(intent, new Map());
        }

        if (!this.intentBiases.has(intent)) {
          this.intentBiases.set(intent, 0);
        }
      });
    }

    this.intents.forEach((intent) => {
      intentLastUpdated.set(intent, new Map());
    });

    const trainingRows = examples.map((example) => {
      const vector = this.vectorizer.transformToSparse(example.text);
      this.exampleIntents.set(example.text, example.intent);
      this.exampleVectors.push({ ...example, vector });
      return { ...example, vector };
    });

    if (resumeFromCurrentState) {
      const baselineLoss = this.evaluateAverageLoss(examples);

      console.info(
        `${this.logPrefix} Loaded checkpoint baseline loss ${baselineLoss.toFixed(6)} before resuming. LR ${currentEta.toFixed(6)}.`,
      );
    }

    for (let epoch = 0; epoch < this.epochs; epoch += 1) {
      shuffleArray(trainingRows);

      let totalLoss = 0;
      const shrinkFactor = 1 - currentEta * this.regularization;
      this.lazyDecayState = {
        totalSteps,
        shrinkFactor,
        intentLastUpdated,
      };

      for (let rowIndex = 0; rowIndex < trainingRows.length; rowIndex += 1) {
        const row = trainingRows[rowIndex];
        const activeTerms = Array.from(row.vector.entries());

        totalSteps += 1;
        this.lazyDecayState.totalSteps = totalSteps;

        const logits = this.intents.map((intent) => {
          const weights = this.intentWeights.get(intent) || new Map();
          const lastUpdated = intentLastUpdated.get(intent) || new Map();
          let logit = this.intentBiases.get(intent) || 0;

          activeTerms.forEach(([term, featureValue]) => {
            applyLazyDecayToTerm({
              weights,
              lastUpdated,
              term,
              totalSteps,
              shrinkFactor,
            });

            logit += (weights.get(term) || 0) * featureValue;
          });

          return { intent, logit };
        });
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
          const lastUpdated = intentLastUpdated.get(intent);

          addScaledSparseVector(weights, row.vector, -currentEta * error);

          activeTerms.forEach(([term]) => {
            lastUpdated.set(term, totalSteps);
          });

          this.intentBiases.set(
            intent,
            (this.intentBiases.get(intent) || 0) - currentEta * error,
          );
        });

        const now = Date.now();

        if (now - lastHeartbeatAt >= HEARTBEAT_INTERVAL_MS) {
          const elapsedMinutes = Math.floor((now - startedAt) / 60000);
          const epochProgress = ((rowIndex + 1) / Math.max(trainingRows.length, 1) * 100).toFixed(1);
          const averageLossSoFar = (totalLoss / Math.max(rowIndex + 1, 1)).toFixed(6);

          console.info(
            `${this.logPrefix} Still training after ${elapsedMinutes} minute(s). Epoch ${epoch + 1}/${this.epochs}, row ${rowIndex + 1}/${trainingRows.length} (${epochProgress}%), average loss ${averageLossSoFar}, LR ${currentEta.toFixed(6)}.`,
          );

          lastHeartbeatAt = now;
        }
      }

      this.intents.forEach((intent) => {
        settleLazyDecayForWeights({
          weights: this.intentWeights.get(intent),
          lastUpdated: intentLastUpdated.get(intent),
          totalSteps,
          shrinkFactor,
        });
      });
      this.lazyDecayState = null;

      const averageLoss = totalLoss / Math.max(trainingRows.length, 1);
      const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
      console.info(
        `${this.logPrefix} Finished epoch ${epoch + 1}/${this.epochs} with loss ${averageLoss.toFixed(6)} after ${elapsedSeconds}s. LR ${currentEta.toFixed(6)}.`,
      );

      if (Math.abs(previousLoss - averageLoss) < this.tolerance) {
        patience += 1;

        if (patience >= this.patienceLimit) {
          console.info(
            `${this.logPrefix} Converged at epoch ${epoch + 1}. Loss delta ${Math.abs(previousLoss - averageLoss).toFixed(6)} is below tolerance ${this.tolerance}.`,
          );
          break;
        }
      } else {
        patience = 0;
      }

      previousLoss = averageLoss;
      currentEta = this.learningRate / (1 + this.decay * (epoch + 1));
    }

    console.info(
      `${this.logPrefix} Training completed. Intents: ${this.intents.length}. Examples: ${trainingRows.length}.`,
    );
  }

  // Predict bang logit -> softmax probability -> blend voi similarity heuristic.
  predict(text = "") {
    this.flushPendingLazyDecay();

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

  // Explain tra ve score, similarity va contribution cua feature cho intent thang.
  explain(text = "") {
    this.flushPendingLazyDecay();

    const exactIntent = this.exampleIntents.get(text) || null;
    const queryVector = this.vectorizer.transformToSparse(text);
    const vectorization = this.vectorizer.explainTransform(text);

    if (!queryVector.size || this.intents.length === 0) {
      return {
        exactMatch: Boolean(exactIntent),
        scoreLabel: "logit",
        vectorization,
        topScores: [],
        winningIntent: null,
      };
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
      finalConfidence: item.confidence * 0.8 + (similarityByIntent.get(item.intent) || 0) * 0.2,
      rawScore: item.logit,
      similarity: similarityByIntent.get(item.intent) || 0,
    }));
    const total = combinedScores.reduce((sum, item) => sum + item.finalConfidence, 0) || 1;
    const topScores = combinedScores
      .map((item) => ({
        intent: item.intent,
        rawScore: item.rawScore,
        finalConfidence: item.finalConfidence / total,
        similarity: item.similarity,
      }))
      .sort((left, right) => right.finalConfidence - left.finalConfidence);

    const selectedIntent = exactIntent ?? topScores[0]?.intent ?? null;
    const selectedScore = topScores.find((item) => item.intent === selectedIntent) ?? null;
    const weights = this.intentWeights.get(selectedIntent) || new Map();

    return {
      exactMatch: Boolean(exactIntent),
      scoreLabel: "logit",
      vectorization,
      topScores: topScores.slice(0, 5),
      winningIntent: selectedIntent
        ? {
            intent: selectedIntent,
            bias: this.intentBiases.get(selectedIntent) || 0,
            rawScore: selectedScore?.rawScore ?? 0,
            finalConfidence: exactIntent ? 1 : selectedScore?.finalConfidence ?? 0,
            similarity: selectedScore?.similarity ?? 0,
            contributions: buildContributionRows(queryVector, weights).slice(0, 20),
          }
        : null,
    };
  }

  toJSON(metadata = {}) {
    this.flushPendingLazyDecay();

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
        tolerance: this.tolerance,
        patience: this.patienceLimit,
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
    this.flushPendingLazyDecay();

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