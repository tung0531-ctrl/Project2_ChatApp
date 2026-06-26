// Trien khai linear SVM da lop toi gian bang SGD tren vector TF-IDF de suy ra intent cho botClinic.
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

export class SupportVectorMachineClassifier {
  constructor(examples = [], options = {}) {
    this.epochs = options.epochs ?? 8;
    this.learningRate = options.learningRate ?? 0.08;
    this.decay = options.decay ?? 0.01;
    this.regularization = options.regularization ?? 0.0005;
    this.exampleIntents = new Map();
    this.exampleVectors = [];
    this.intentWeights = new Map();
    this.intentBiases = new Map();
    this.intents = [];
    this.vectorizer = new TfidfVectorizer(
      examples.map((example) => example.text),
      options.vectorizerOptions,
    );

    this.train(examples);
  }

  train(examples = []) {
    this.intents = Array.from(new Set(examples.map((example) => example.intent))).sort();

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
    }
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
}