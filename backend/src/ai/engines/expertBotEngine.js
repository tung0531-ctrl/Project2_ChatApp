import { NaiveBayesClassifier } from "./naiveBayes.js";
import { runForwardChaining } from "./forwardChaining.js";

const stripDiacritics = (text = "") =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");

export const normalizeText = (text = "") => {
  return stripDiacritics(text)
    .toLowerCase()
    .replace(/@[\w-]+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const pickResponse = (value) => {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
};

const createRuleId = (prefix, index) => `${prefix}-${index + 1}`;

const getEntityTypeFromCollectionName = (collectionName = "") => {
  if (collectionName === "heroes") {
    return "hero";
  }

  if (collectionName.endsWith("ches") || collectionName.endsWith("shes")) {
    return collectionName.slice(0, -2);
  }

  if (collectionName.endsWith("ies")) {
    return `${collectionName.slice(0, -3)}y`;
  }

  if (collectionName.endsWith("s")) {
    return collectionName.slice(0, -1);
  }

  return collectionName;
};

const createEntityIndex = (entities = {}) => {
  const indexedEntities = [];

  Object.entries(entities).forEach(([entityType, items]) => {
    items.forEach((item) => {
      item.aliases.forEach((alias) => {
        indexedEntities.push({
          entityType: getEntityTypeFromCollectionName(entityType),
          alias,
          normalizedAlias: normalizeText(alias),
          item,
        });
      });
    });
  });

  return indexedEntities.sort(
    (left, right) => right.normalizedAlias.length - left.normalizedAlias.length,
  );
};

const createEntityLookup = (entities = {}) => {
  const lookup = new Map();

  Object.entries(entities).forEach(([collectionName, items]) => {
    const entityType = getEntityTypeFromCollectionName(collectionName);

    items.forEach((item) => {
      lookup.set(`${entityType}:${item.id}`, {
        entityType,
        item,
      });
    });
  });

  return lookup;
};

const getEntityDisplayName = (entity) => {
  return entity?.item?.name ?? entity?.item?.displayName ?? entity?.item?.id ?? "";
};

const findMatchedEntities = (normalizedText, indexedEntities = []) => {
  const matched = new Map();

  indexedEntities.forEach((entity) => {
    if (!normalizedText.includes(entity.normalizedAlias)) {
      return;
    }

    const key = `${entity.entityType}:${entity.item.id}`;
    const existing = matched.get(key);

    if (!existing || entity.normalizedAlias.length > existing.normalizedAlias.length) {
      matched.set(key, entity);
    }
  });

  return Array.from(matched.values()).sort(
    (left, right) => right.normalizedAlias.length - left.normalizedAlias.length,
  );
};

const normalizeRules = (rules = []) => {
  return rules.flatMap((rule, index) => {
    if (rule.if && rule.then) {
      return [{ ...rule, id: rule.id ?? createRuleId("rule", index) }];
    }

    if (rule.responseType === "static") {
      return [
        {
          id: rule.id ?? createRuleId("legacy-static", index),
          if: {
            all: [{ fact: "intent", equals: rule.intent }],
          },
          then: {
            respond: {
              type: "static",
              responseKey: rule.responseKey,
              usedFallback: rule.responseKey === "fallback",
              needsContext: rule.responseKey === "fallback",
            },
          },
        },
      ];
    }

    return [
      {
        id: rule.id ?? createRuleId("legacy-knowledge", index),
        if: {
          all: [
            { fact: "intent", equals: rule.intent },
            ...(rule.entityType
              ? [{ fact: "entityType", equals: rule.entityType }]
              : []),
          ],
        },
        then: {
          respond: {
            type: "entityKnowledge",
            field: rule.knowledgeField,
          },
        },
      },
    ];
  });
};

export const createExpertBotEngine = (definition) => {
  const normalizedExamples = definition.examples.map((example) => ({
    ...example,
    text: normalizeText(example.text),
  }));
  const classifier = new NaiveBayesClassifier(normalizedExamples, definition.classifier ?? {});
  const indexedEntities = createEntityIndex(definition.entities);
  const entityLookup = createEntityLookup(definition.entities);
  const normalizedRules = normalizeRules(definition.rules);
  const confidenceThreshold = definition.confidenceThreshold ?? 0.18;

  return {
    botId: definition.botId,
    displayName: definition.displayName,
    trigger: definition.trigger,
    description: definition.description,
    systemUser: definition.systemUser,
    run(rawText) {
      const normalizedText = normalizeText(rawText);
      const prediction = classifier.predict(normalizedText);
      const matchedEntities = findMatchedEntities(normalizedText, indexedEntities);
      const primaryEntity = matchedEntities[0] ?? null;

      if (!prediction.intent || prediction.confidence < confidenceThreshold) {
        return {
          content: pickResponse(definition.responses.fallback),
          matchedIntent: prediction.intent,
          confidence: prediction.confidence,
          usedFallback: true,
          needsContext: true,
          keywords: prediction.keywords ?? [],
          firedRules: [],
        };
      }

      const initialFacts = [
        { fact: "intent", value: prediction.intent },
        { fact: "confidenceBand", value: prediction.confidence >= 0.45 ? "high" : "medium" },
        ...prediction.keywords.map((keyword) => ({ fact: "keyword", value: keyword })),
      ];

      if (primaryEntity) {
        initialFacts.push(
          { fact: "entityType", value: primaryEntity.entityType },
          { fact: "entityId", value: primaryEntity.item.id },
          { fact: "entityName", value: getEntityDisplayName(primaryEntity) },
        );
      }

      const inference = runForwardChaining({
        rules: normalizedRules,
        initialFacts,
        resolveResponse: (action, factStore) => {
          if (action.type === "static") {
            return {
              content: pickResponse(definition.responses[action.responseKey]),
              usedFallback: action.usedFallback ?? action.responseKey === "fallback",
              needsContext: action.needsContext ?? action.responseKey === "fallback",
            };
          }

          if (action.type === "entityKnowledge") {
            const resolvedEntityId = factStore.getFirst("entityId");
            const resolvedEntityType = factStore.getFirst("entityType") ?? primaryEntity?.entityType;
            const resolvedEntity = resolvedEntityId && resolvedEntityType
              ? entityLookup.get(`${resolvedEntityType}:${resolvedEntityId}`)
              : primaryEntity;

            if (!resolvedEntity) {
              return null;
            }

            const knowledgeField = action.field ?? factStore.getFirst(action.fieldFact);
            const responseContent = resolvedEntity.item.knowledge?.[knowledgeField];

            if (!responseContent) {
              return null;
            }

            return {
              content: responseContent,
              usedFallback: false,
              needsContext: false,
              entityId: resolvedEntity.item.id,
            };
          }

          return null;
        },
      });

      if (!inference.response?.content) {
        return {
          content: pickResponse(definition.responses.fallback),
          matchedIntent: prediction.intent,
          confidence: prediction.confidence,
          usedFallback: true,
          needsContext: true,
          keywords: prediction.keywords ?? [],
          firedRules: inference.firedRules,
        };
      }

      return {
        content: inference.response.content,
        matchedIntent: prediction.intent,
        confidence: prediction.confidence,
        entityId: inference.response.entityId ?? primaryEntity?.item?.id,
        usedFallback: inference.response.usedFallback ?? false,
        needsContext: inference.response.needsContext ?? false,
        keywords: prediction.keywords ?? [],
        firedRules: inference.firedRules,
      };
    },
  };
};