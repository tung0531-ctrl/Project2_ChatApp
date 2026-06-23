const toArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  return value === undefined ? [] : [value];
};

const normalizeValue = (value) => {
  if (typeof value === "string") {
    return value.trim();
  }

  return value;
};

export const createFactStore = (initialFacts = []) => {
  const facts = new Map();

  const add = (fact, value) => {
    const normalizedValue = normalizeValue(value);

    if (normalizedValue === undefined || normalizedValue === null || normalizedValue === "") {
      return false;
    }

    if (!facts.has(fact)) {
      facts.set(fact, new Set());
    }

    const bucket = facts.get(fact);
    const sizeBefore = bucket.size;
    bucket.add(normalizedValue);
    return bucket.size !== sizeBefore;
  };

  initialFacts.forEach(({ fact, value }) => {
    toArray(value).forEach((entry) => add(fact, entry));
  });

  return {
    add,
    hasFact(fact) {
      return (facts.get(fact)?.size || 0) > 0;
    },
    hasValue(fact, expectedValue) {
      return facts.get(fact)?.has(normalizeValue(expectedValue)) ?? false;
    },
    getFirst(fact) {
      return facts.get(fact)?.values().next().value;
    },
    getAll(fact) {
      return Array.from(facts.get(fact) ?? []);
    },
    snapshot() {
      return Object.fromEntries(
        Array.from(facts.entries()).map(([fact, values]) => [fact, Array.from(values)]),
      );
    },
  };
};

const isConditionSatisfied = (factStore, condition = {}) => {
  if (!condition.fact) {
    return false;
  }

  if (condition.exists === true) {
    return factStore.hasFact(condition.fact);
  }

  if (condition.exists === false) {
    return !factStore.hasFact(condition.fact);
  }

  if (condition.equals !== undefined) {
    return factStore.hasValue(condition.fact, condition.equals);
  }

  if (condition.oneOf) {
    return toArray(condition.oneOf).some((value) => factStore.hasValue(condition.fact, value));
  }

  if (condition.notEquals !== undefined) {
    return !factStore.hasValue(condition.fact, condition.notEquals);
  }

  return factStore.hasFact(condition.fact);
};

const areRuleConditionsSatisfied = (factStore, rule = {}) => {
  const allConditions = rule.if?.all ?? [];
  const anyConditions = rule.if?.any ?? [];

  const allMatched = allConditions.every((condition) => isConditionSatisfied(factStore, condition));
  const anyMatched = anyConditions.length === 0
    ? true
    : anyConditions.some((condition) => isConditionSatisfied(factStore, condition));

  return allMatched && anyMatched;
};

export const runForwardChaining = ({
  rules = [],
  initialFacts = [],
  resolveResponse,
  maxIterations = 12,
}) => {
  const factStore = createFactStore(initialFacts);
  const firedRules = [];
  const firedRuleIds = new Set();
  let response = null;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let changed = false;

    rules.forEach((rule) => {
      if (!rule?.id || firedRuleIds.has(rule.id)) {
        return;
      }

      if (!areRuleConditionsSatisfied(factStore, rule)) {
        return;
      }

      firedRuleIds.add(rule.id);
      firedRules.push(rule.id);

      (rule.then?.assert ?? []).forEach((assertion) => {
        const values = assertion.fromFact
          ? factStore.getAll(assertion.fromFact)
          : toArray(assertion.value);

        values.forEach((value) => {
          changed = factStore.add(assertion.fact, value) || changed;
        });
      });

      if (rule.then?.respond && !response) {
        response = resolveResponse?.(rule.then.respond, factStore, rule) ?? null;
      }
    });

    if (!changed) {
      break;
    }
  }

  return {
    response,
    firedRules,
    facts: factStore.snapshot(),
  };
};