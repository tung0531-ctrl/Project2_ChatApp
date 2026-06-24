const DEFAULT_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "ban",
  "biet",
  "cho",
  "co",
  "cua",
  "da",
  "day",
  "de",
  "den",
  "di",
  "duoc",
  "gi",
  "giu",
  "goi",
  "hay",
  "hello",
  "hoi",
  "is",
  "la",
  "lam",
  "len",
  "nao",
  "nay",
  "neu",
  "nhe",
  "nhi",
  "nho",
  "nhu",
  "nua",
  "o",
  "oi",
  "ra",
  "roi",
  "se",
  "su",
  "tai",
  "the",
  "thi",
  "toi",
  "tra",
  "trong",
  "tu",
  "ve",
  "voi",
  "what",
  "where",
  "who",
  "why",
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

const createNgrams = (tokens = [], ngramRange = [1, 3]) => {
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
    this.documentCount = 0;
    this.documentFrequency = new Map();
    this.vocabulary = new Set();

    this.fit(documents);
  }

  fit(documents = []) {
    this.documentCount = documents.length;
    this.documentFrequency.clear();
    this.vocabulary.clear();

    documents.forEach((document) => {
      const terms = new Set(this.getTerms(document));

      terms.forEach((term) => {
        this.vocabulary.add(term);
        this.documentFrequency.set(term, (this.documentFrequency.get(term) || 0) + 1);
      });
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
}