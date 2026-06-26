// Ghep classifier, entity matching va forward chaining thanh mot engine he chuyen gia dung chung.
import { NaiveBayesClassifier } from "./naiveBayes.js";
import { LogisticRegressionClassifier } from "./logisticRegression.js";
import { SupportVectorMachineClassifier } from "./supportVectorMachine.js";
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

export const normalizeSynonyms = (text = "", synonymMap = {}) => {
  if (!text) {
    return text;
  }

  const normalizedEntries = Object.entries(synonymMap).map(([source, target]) => [
    normalizeText(source),
    normalizeText(target),
  ]);

  return text
    .split(/\s+/)
    .map((token) => {
      return normalizedEntries.find(([source]) => source === token)?.[1] ?? token;
    })
    .join(" ")
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

const preferredEntityTypesByIntent = {
  hero_role: ["hero"],
  hero_skill: ["hero"],
  hero_build: ["hero"],
  hero_strength: ["hero"],
  hero_weakness: ["hero"],
  hero_counter: ["hero"],
  hero_lore: ["hero"],
  item_info: ["item"],
  item_category_list: ["itemCategory"],
  tournament_info: ["tournament"],
  tournament_history: ["tournament"],
  team_info: ["team"],
  player_info: ["player"],
  patch_info: ["patch"],
  patch_version_history: ["patch"],
};

const preferredEntityIdsByIntent = {
  bot_identity: ["bot_identity_topic"],
  bot_capabilities: ["bot_identity_topic"],
  bot_how_it_works: ["bot_identity_topic"],
  game_overview: ["game_overview_topic"],
  game_modes: ["game_overview_topic"],
  game_roles: ["game_overview_topic"],
  game_history: ["game_overview_topic"],
  objective_info: ["objectives_topic"],
  tournament_overview: ["tournament_overview_topic"],
  tournament_month_overview: ["june_tournaments_topic"],
  item_overview: ["item_overview_topic"],
  improve_skill: ["improve_skill_topic"],
  beginner_guide: ["beginner_guide_topic"],
  trivia_info: ["trivia_topic"],
};

const selectPrimaryEntity = (matchedEntities = [], intent = null) => {
  const preferredEntityIds = preferredEntityIdsByIntent[intent] ?? [];
  const preferredEntityTypes = preferredEntityTypesByIntent[intent] ?? [];

  if (preferredEntityIds.length > 0) {
    const preferredEntity = matchedEntities.find((entity) =>
      preferredEntityIds.includes(entity.item.id),
    );

    if (preferredEntity) {
      return preferredEntity;
    }
  }

  if (preferredEntityTypes.length > 0) {
    const preferredMatch = matchedEntities.find((entity) =>
      preferredEntityTypes.includes(entity.entityType),
    );

    if (preferredMatch) {
      return preferredMatch;
    }
  }

  return matchedEntities[0] ?? null;
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
  const synonymMap = definition.classifier?.synonymMap ?? definition.synonymMap ?? {};
  const normalizedExamples = definition.examples.map((example) => ({
    ...example,
    text: normalizeSynonyms(normalizeText(example.text), synonymMap),
  }));
  const classifierOptions = definition.classifier ?? {};
  const classifierType = classifierOptions.type ?? "naive-bayes";
  let classifier;

  const buildClassifier = () => {
    if (classifierType === "svm") {
      return new SupportVectorMachineClassifier(normalizedExamples, classifierOptions);
    }

    if (classifierType === "logistic-regression") {
      return new LogisticRegressionClassifier(normalizedExamples, classifierOptions);
    }

    return new NaiveBayesClassifier(normalizedExamples, classifierOptions);
  };

  const loadPretrainedClassifier = () => {
    if (classifierType === "svm") {
      return SupportVectorMachineClassifier.fromFile(
        classifierOptions.pretrainedModelPath,
        classifierOptions,
      );
    }

    if (classifierType === "logistic-regression") {
      return LogisticRegressionClassifier.fromFile(
        classifierOptions.pretrainedModelPath,
        classifierOptions,
      );
    }

    return NaiveBayesClassifier.fromFile(classifierOptions.pretrainedModelPath, classifierOptions);
  };

  if (classifierOptions.pretrainedModelPath) {
    try {
      classifier = loadPretrainedClassifier();
    } catch (error) {
      console.warn(
        `[${definition.botId}] Failed to load pretrained ${classifierType} model from ${classifierOptions.pretrainedModelPath}. Falling back to on-boot training. ${error.message}`,
      );
    }
  }

  if (!classifier) {
    classifier = buildClassifier();
  }

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
      const normalizedText = normalizeSynonyms(normalizeText(rawText), synonymMap);
      const prediction = classifier.predict(normalizedText);
      const matchedEntities = findMatchedEntities(normalizedText, indexedEntities);
      const primaryEntity = selectPrimaryEntity(matchedEntities, prediction.intent);

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