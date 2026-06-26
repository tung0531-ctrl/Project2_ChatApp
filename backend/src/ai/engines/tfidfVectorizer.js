// Trien khai vectorizer TF-IDF dung cho train/predict va tinh do tuong dong van ban cua bot.
const DEFAULT_STOPWORDS = new Set([
  "a",
  "about",
  "above",
  "after",
  "again",
  "against",
  "all",
  "also",
  "am",
  "any",
  "an",
  "and",
  "anyone",
  "anything",
  "are",
  "as",
  "at",
  "ban",
  "be",
  "because",
  "been",
  "before",
  "being",
  "biet",
  "below",
  "between",
  "both",
  "but",
  "by",
  "can",
  "cho",
  "co",
  "could",
  "cua",
  "da",
  "day",
  "de",
  "den",
  "did",
  "di",
  "do",
  "does",
  "doing",
  "don",
  "down",
  "duoc",
  "during",
  "each",
  "few",
  "for",
  "from",
  "further",
  "gi",
  "giu",
  "goi",
  "had",
  "hay",
  "has",
  "have",
  "having",
  "he",
  "her",
  "here",
  "hers",
  "herself",
  "hello",
  "him",
  "himself",
  "his",
  "hoi",
  "how",
  "i",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "itself",
  "la",
  "lam",
  "len",
  "me",
  "more",
  "most",
  "my",
  "myself",
  "nao",
  "nay",
  "neu",
  "nhe",
  "nhi",
  "nho",
  "no",
  "nor",
  "not",
  "nhu",
  "nua",
  "o",
  "of",
  "off",
  "on",
  "once",
  "only",
  "oi",
  "or",
  "other",
  "our",
  "ours",
  "ourselves",
  "out",
  "over",
  "own",
  "ra",
  "roi",
  "same",
  "se",
  "she",
  "should",
  "so",
  "some",
  "such",
  "su",
  "tai",
  "than",
  "that",
  "the",
  "their",
  "theirs",
  "them",
  "themselves",
  "then",
  "there",
  "these",
  "the",
  "thi",
  "this",
  "those",
  "toi",
  "too",
  "tra",
  "trong",
  "under",
  "until",
  "up",
  "tu",
  "very",
  "ve",
  "voi",
  "was",
  "we",
  "were",
  "when",
  "what",
  "where",
  "which",
  "while",
  "who",
  "will",
  "with",
  "would",
  "why",
  "you",
  "your",
  "yours",
  "yourself",
  "yourselves",
]);

const countTerms = (terms = []) => {
  return terms.reduce((accumulator, term) => {
    accumulator.set(term, (accumulator.get(term) || 0) + 1);
    return accumulator;
  }, new Map());
};

export const tokenizeText = (text = "", stopwords = DEFAULT_STOPWORDS) => {
  return text
    .toLowerCase()
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1)
    .filter((token) => !stopwords.has(token));
};

const createNgrams = (tokens = [], ngramRange = [1, 2]) => {
  const [minN, maxN] = ngramRange;
  const terms = [];

  for (let size = minN; size <= maxN; size += 1) {
    if (size <= 1) {
      terms.push(...tokens);
      continue;
    }

    for (let index = 0; index <= tokens.length - size; index += 1) {
      terms.push(tokens.slice(index, index + size).join(" "));
    }
  }

  return terms;
};

export class TfidfVectorizer {
  constructor(documents = [], options = {}) {
    this.ngramRange = options.ngramRange ?? [1, 2];
    this.stopwords = new Set([...(options.stopwords ?? []), ...DEFAULT_STOPWORDS]);
    this.minDf = options.minDf ?? 1;
    this.maxFeatures = options.maxFeatures ?? null;
    this.documentCount = 0;
    this.documentFrequency = new Map();
    this.vocabulary = new Set();

    this.fit(documents);
  }

  fit(documents = []) {
    this.documentCount = documents.length;
    this.documentFrequency.clear();
    this.vocabulary.clear();

    const rawDocumentFrequency = new Map();

    documents.forEach((document) => {
      const terms = new Set(this.getTerms(document));

      terms.forEach((term) => {
        rawDocumentFrequency.set(term, (rawDocumentFrequency.get(term) || 0) + 1);
      });
    });

    const filteredTerms = Array.from(rawDocumentFrequency.entries())
      .filter(([, documentFrequency]) => documentFrequency >= this.minDf)
      .sort((left, right) => {
        if (right[1] !== left[1]) {
          return right[1] - left[1];
        }

        return left[0].localeCompare(right[0]);
      })
      .slice(0, this.maxFeatures ?? Number.POSITIVE_INFINITY);

    filteredTerms.forEach(([term, documentFrequency]) => {
      this.vocabulary.add(term);
      this.documentFrequency.set(term, documentFrequency);
    });
  }

  getTerms(text = "") {
    const tokens = tokenizeText(text, this.stopwords);
    return createNgrams(tokens, this.ngramRange);
  }

  getIdf(term) {
    const documentFrequency = this.documentFrequency.get(term) || 0;
    return Math.log((this.documentCount + 1) / (documentFrequency + 1)) + 1;
  }

  transformToSparse(text = "") {
    const terms = this.getTerms(text);

    if (!terms.length) {
      return new Map();
    }

    const termCounts = countTerms(terms);
    const vector = new Map();
    let magnitude = 0;

    termCounts.forEach((count, term) => {
      if (!this.vocabulary.has(term)) {
        return;
      }
      const tf = count / terms.length;
      const weight = tf * this.getIdf(term);
      vector.set(term, weight);
      magnitude += weight ** 2;
    });

    const normalizer = Math.sqrt(magnitude) || 1;

    return new Map(
      Array.from(vector.entries()).map(([term, weight]) => [term, weight / normalizer]),
    );
  }

  extractKeywords(text = "", limit = 8) {
    return Array.from(this.transformToSparse(text).entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, limit)
      .map(([term]) => term);
  }

  toJSON() {
    return {
      ngramRange: this.ngramRange,
      stopwords: Array.from(this.stopwords),
      minDf: this.minDf,
      maxFeatures: this.maxFeatures,
      documentCount: this.documentCount,
      documentFrequency: Array.from(this.documentFrequency.entries()),
      vocabulary: Array.from(this.vocabulary.values()),
    };
  }

  static fromJSON(state = {}) {
    const vectorizer = new TfidfVectorizer([], {
      ngramRange: state.ngramRange,
      stopwords: state.stopwords ?? [],
      minDf: state.minDf,
      maxFeatures: state.maxFeatures,
    });

    vectorizer.documentCount = state.documentCount ?? 0;
    vectorizer.documentFrequency = new Map(state.documentFrequency ?? []);
    vectorizer.vocabulary = new Set(state.vocabulary ?? []);

    return vectorizer;
  }
}