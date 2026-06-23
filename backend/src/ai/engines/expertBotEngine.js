import { NaiveBayesClassifier } from "./naiveBayes.js";

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

const getEntityTypeFromCollectionName = (collectionName = "") => {
  if (collectionName === "heroes") {
    return "hero";
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

export const createExpertBotEngine = (definition) => {
  const normalizedExamples = definition.examples.map((example) => ({
    ...example,
    text: normalizeText(example.text),
  }));
  const classifier = new NaiveBayesClassifier(normalizedExamples);
  const indexedEntities = createEntityIndex(definition.entities);

  return {
    botId: definition.botId,
    displayName: definition.displayName,
    trigger: definition.trigger,
    description: definition.description,
    systemUser: definition.systemUser,
    run(rawText) {
      const normalizedText = normalizeText(rawText);
      const prediction = classifier.predict(normalizedText);
      const matchedEntity = indexedEntities.find((entity) => {
        return normalizedText.includes(entity.normalizedAlias);
      });
      const matchedRule = definition.rules.find((rule) => {
        if (rule.intent !== prediction.intent) {
          return false;
        }

        if (!rule.entityType) {
          return true;
        }

        return matchedEntity?.entityType === rule.entityType;
      });

      if (!matchedRule || prediction.confidence < 0.32) {
        return {
          content: pickResponse(definition.responses.fallback),
          matchedIntent: prediction.intent,
          confidence: prediction.confidence,
        };
      }

      if (matchedRule.responseType === "static") {
        return {
          content: pickResponse(definition.responses[matchedRule.responseKey]),
          matchedIntent: prediction.intent,
          confidence: prediction.confidence,
        };
      }

      if (!matchedEntity) {
        return {
          content: pickResponse(definition.responses.askHero),
          matchedIntent: prediction.intent,
          confidence: prediction.confidence,
        };
      }

      const responseContent = matchedEntity.item.knowledge?.[matchedRule.knowledgeField];

      if (!responseContent) {
        return {
          content: pickResponse(definition.responses.fallback),
          matchedIntent: prediction.intent,
          confidence: prediction.confidence,
        };
      }

      return {
        content: responseContent,
        matchedIntent: prediction.intent,
        confidence: prediction.confidence,
        entityId: matchedEntity.item.id,
      };
    },
  };
};