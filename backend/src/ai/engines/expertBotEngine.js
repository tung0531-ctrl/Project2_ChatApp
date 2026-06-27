// ExpertBotEngine la lop dieu phoi trung tam cho tat ca AI bot.
// No khong chua tri thuc domain cu the; no chi ghep cac manh runtime chung lai:
// normalize text -> classifier predict -> bot hook chinh intent/fact -> entity matching
// -> seed working-memory facts -> forward chaining -> final response hoac fallback.
import { NaiveBayesClassifier } from "./naiveBayes.js";
import { LogisticRegressionClassifier } from "./logisticRegression.js";
import { SupportVectorMachineClassifier } from "./supportVectorMachine.js";
import { runForwardChaining } from "./forwardChaining.js";

// Nhom helper tien xu ly van ban de moi classifier nhan cung mot kieu input da duoc lam sach.
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

// Chuyen dong nghia ve token dai dien de train va predict nhat quan hon.
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

// Tao danh sach unigram/bigram/trigram de rule engine co them facts ngoai classifier keywords.
const extractRuleKeywords = (normalizedText = "", maxNgram = 3) => {
  const tokens = normalizedText.split(/\s+/).filter(Boolean);
  const terms = new Set();

  tokens.forEach((token, tokenIndex) => {
    terms.add(token);

    for (let size = 2; size <= maxNgram; size += 1) {
      if (tokenIndex + size > tokens.length) {
        break;
      }

      terms.add(tokens.slice(tokenIndex, tokenIndex + size).join(" "));
    }
  });

  return Array.from(terms);
};

// Cho phep bot-specific runtime chen logic sua intent/confidence sau khi classifier predict xong.
const transformRunPrediction = ({ definition, rawText, normalizedText, prediction }) => {
  if (typeof definition.transformRunPrediction !== "function") {
    return prediction;
  }

  const overrides = definition.transformRunPrediction({
    rawText,
    normalizedText,
    prediction,
  });

  return overrides ? { ...prediction, ...overrides } : prediction;
};

// Goi hook rut trich slot/fact rieng cua bot truoc khi dua vao forward chaining.
const extractDefinitionFacts = ({ definition, rawText, normalizedText, prediction }) => {
  if (typeof definition.extractFacts !== "function") {
    return [];
  }

  return definition.extractFacts({
    rawText,
    normalizedText,
    prediction,
  }) ?? [];
};

// Chuan hoa response template ve mot string duy nhat de run() de xu ly.
const pickResponse = (value) => {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
};

const createRuleId = (prefix, index) => `${prefix}-${index + 1}`;

// Doi ten collection entities thanh entityType ngan gon dung chung cho rules va knowledge lookup.
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

// Tao chi muc alias -> entity de tim entity theo chuoi da normalize.
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

// Tao lookup entityType:id de response co the mo lai entity da chon sau khi suy dien.
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

// Tim cac entity co alias xuat hien trong input va giu match dai nhat cho moi entity.
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

// Bang uu tien entity type cho tung intent, chu yeu dung khi mot cau noi trung nhieu entity cung luc.
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

// Mot so intent uu tien entity co id co dinh thay vi chi dua vao type match.
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

// Chon entity chinh se duoc dem vao working memory de response knowledge-based dung dung doi tuong.
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

// Ho tro ca rule format moi (`if/then`) va rule format cu de registry khong phai quan tam chi tiet.
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

// Bien mot bot definition tinh thanh runtime engine thong nhat cho ChatApp.
// Dau vao `definition` thuong gom: classifier config, examples, entities, rules va responses.
// Dau ra la object co 3 API chinh:
// - `predictIntent()`: chi phan loai intent
// - `explainIntent()`: tra them score va giai thich classifier
// - `run()`: chay toan bo pipeline hybrid de lay response cuoi cung
export const createExpertBotEngine = (definition) => {
  const synonymMap = definition.classifier?.synonymMap ?? definition.synonymMap ?? {};
  // Normalize examples mot lan truoc khi classifier train/load de tranh lech giua train va infer.
  const normalizedExamples = definition.examples.map((example) => ({
    ...example,
    text: normalizeSynonyms(normalizeText(example.text), synonymMap),
  }));
  const classifierOptions = definition.classifier ?? {};
  const classifierType = classifierOptions.type ?? "naive-bayes";
  let classifier;

  // Chon implementation classifier dua tren classifier type cua bot definition.
  const buildClassifier = () => {
    if (classifierType === "svm") {
      return new SupportVectorMachineClassifier(normalizedExamples, classifierOptions);
    }

    if (classifierType === "logistic-regression") {
      return new LogisticRegressionClassifier(normalizedExamples, classifierOptions);
    }

    return new NaiveBayesClassifier(normalizedExamples, classifierOptions);
  };

  // Tai pretrained snapshot neu bot da duoc train san va co model cache tren dia.
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

  // Uu tien pretrained model de khoi dong nhanh; neu load loi thi fallback ve train tai boot time.
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
    classifierType,
    // API nhe nhat: chi phan loai intent va tra ve score/keywords.
    predictIntent(rawText) {
      const normalizedText = normalizeSynonyms(normalizeText(rawText), synonymMap);
      const prediction = classifier.predict(normalizedText);

      return {
        normalizedText,
        intent: prediction.intent,
        confidence: prediction.confidence,
        scores: prediction.scores ?? [],
        keywords: prediction.keywords ?? [],
      };
    },
    // API phuc vu explainability: giu ket qua predict va bo sung thong tin giai thich cua classifier.
    explainIntent(rawText) {
      const normalizedText = normalizeSynonyms(normalizeText(rawText), synonymMap);
      const prediction = classifier.predict(normalizedText);
      const explanation = typeof classifier.explain === "function"
        ? classifier.explain(normalizedText)
        : null;

      return {
        normalizedText,
        intent: prediction.intent,
        confidence: prediction.confidence,
        scores: prediction.scores ?? [],
        keywords: prediction.keywords ?? [],
        explanation,
      };
    },
    // Hook danh gia offline, hien huu ich cho logistic regression khi can do average loss.
    evaluateAverageLoss(examples = []) {
      if (typeof classifier.evaluateAverageLoss !== "function") {
        return null;
      }

      const normalizedExamples = examples.map((example) => ({
        ...example,
        text: normalizeSynonyms(normalizeText(example.text), synonymMap),
      }));

      return classifier.evaluateAverageLoss(normalizedExamples);
    },
    // API runtime chinh: chay toan bo hybrid pipeline va tra response cuoi cung cho message bot.
    run(rawText) {
      const normalizedText = normalizeSynonyms(normalizeText(rawText), synonymMap);
      const classifierPrediction = classifier.predict(normalizedText);
      // Bot-specific rescue co the doi intent/confidence de phu hop domain hon.
      const prediction = transformRunPrediction({
        definition,
        rawText,
        normalizedText,
        prediction: classifierPrediction,
      });
      const matchedEntities = findMatchedEntities(normalizedText, indexedEntities);
      const primaryEntity = selectPrimaryEntity(matchedEntities, prediction.intent);
      const ruleKeywords = Array.from(
        new Set([...(prediction.keywords ?? []), ...extractRuleKeywords(normalizedText)]),
      );
      // Bot-specific extractor rut ra slot facts co cau truc de rule engine hieu duoc workflow.
      const extractedFacts = extractDefinitionFacts({
        definition,
        rawText,
        normalizedText,
        prediction,
      });

      if (!prediction.intent || prediction.confidence < confidenceThreshold) {
        return {
          content: pickResponse(definition.responses.fallback),
          matchedIntent: prediction.intent,
          confidence: prediction.confidence,
          usedFallback: true,
          needsContext: true,
          keywords: ruleKeywords,
          firedRules: [],
        };
      }

      // Seed working memory bang intent, confidence band, keyword, slot va entity match truoc khi suy dien.
      const initialFacts = [
        { fact: "intent", value: prediction.intent },
        { fact: "confidenceBand", value: prediction.confidence >= 0.45 ? "high" : "medium" },
        ...ruleKeywords.map((keyword) => ({ fact: "keyword", value: keyword })),
        ...extractedFacts,
      ];

      if (primaryEntity) {
        initialFacts.push(
          { fact: "entityType", value: primaryEntity.entityType },
          { fact: "entityId", value: primaryEntity.item.id },
          { fact: "entityName", value: getEntityDisplayName(primaryEntity) },
        );
      }

      // Forward chaining se assert facts moi, chon response dau tien phu hop, va ghi lai fired rules.
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
          keywords: ruleKeywords,
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
        keywords: ruleKeywords,
        firedRules: inference.firedRules,
      };
    },
  };
};