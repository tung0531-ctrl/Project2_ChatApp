import { readLocalClincExamples } from "./datasetLoader.js";
import { getClinicModelCachePath, hasClinicModelCache } from "./modelCache.js";
import { buildBotClinicRules } from "./rules.js";
import { botClinicResponses } from "./responses.js";
import { botClinicSeedExamples } from "./seedExamples.js";

const clinicIntentAliases = {
  thank_you: "thanks",
  are_you_a_bot: "bot_identity",
  what_is_your_name: "bot_identity",
  who_made_you: "bot_identity",
  who_do_you_work_for: "bot_identity",
  what_can_i_ask_you: "bot_capabilities",
  account_blocked: "freeze_account",
  report_fraud: "freeze_account",
  damaged_card: "replacement_card_duration",
  new_card: "replacement_card_duration",
  credit_score: "improve_credit_score",
  apr: "interest_rate",
  bill_due: "pay_bill",
  bill_balance: "pay_bill",
  min_payment: "pay_bill",
  direct_deposit: "routing",
  reminder_update: "reminder",
  meeting_schedule: "calendar",
  schedule_meeting: "calendar",
  calendar_update: "calendar",
  todo_list_update: "todo_list",
  shopping_list_update: "shopping_list",
  calories: "nutrition_info",
  restaurant_suggestion: "restaurant_reviews",
  accept_reservations: "restaurant_reservation",
  confirm_reservation: "restaurant_reservation",
  cancel_reservation: "restaurant_reservation",
  travel_notification: "travel_alert",
  flight_status: "travel_alert",
  lost_luggage: "carry_on",
  order: "order_status",
  gas: "gas_type",
  last_maintenance: "schedule_maintenance",
  oil_change_how: "oil_change_when",
};

const hasPhrase = (text, phrase) => text.includes(phrase);

const extractFirstMatch = (text, regex) => {
  const match = text.match(regex);
  return match?.[1] ?? match?.[0] ?? null;
};

const transferTargetStopwords = new Set([
  "a",
  "an",
  "the",
  "my",
  "account",
  "checking",
  "savings",
  "one",
  "another",
  "other",
]);

const extractTransferTarget = (normalizedText) => {
  const match = normalizedText.match(/\bto\s+([a-z]+(?:\s+[a-z]+){0,2})\b/);

  if (!match?.[1]) {
    return null;
  }

  const candidate = match[1].trim();

  return transferTargetStopwords.has(candidate) ? null : candidate;
};

const extractDestination = (normalizedText) => {
  const match = normalizedText.match(/\b(?:to|in)\s+([a-z]+(?:\s+[a-z]+){0,2})\b/);

  if (!match?.[1]) {
    return null;
  }

  const candidate = match[1].trim();

  return transferTargetStopwords.has(candidate) ? null : candidate;
};

const extractScheduleTime = (normalizedText) => {
  return (
    extractFirstMatch(normalizedText, /\b(\d+(?:\.\d+)?\s*(?:minutes?|hours?|days?))\b/) ||
    extractFirstMatch(normalizedText, /\b(at\s+\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?)\b/) ||
    extractFirstMatch(normalizedText, /\b(today|tomorrow|tonight|morning|evening|afternoon)\b/)
  );
};

const extractReminderTask = (normalizedText) => {
  const explicitReminderTask = extractFirstMatch(
    normalizedText,
    /\bremind me to\s+(.+?)(?=\s+(?:at|on|today|tomorrow|tonight|in)\b|$)/,
  );

  if (explicitReminderTask) {
    return explicitReminderTask.trim();
  }

  const genericTask = extractFirstMatch(
    normalizedText,
    /\b(?:set|create)\s+(?:a\s+)?reminder\s+(?:for|to)?\s+(.+?)(?=\s+(?:at|on|today|tomorrow|tonight|in)\b|$)/,
  );

  return genericTask?.trim() ?? null;
};

const extractOrderReference = (normalizedText) => {
  return extractFirstMatch(normalizedText, /\b(?:order|tracking)\s+(?:number\s+)?#?([a-z0-9-]{4,})\b/);
};

const extractPartySize = (normalizedText) => {
  return extractFirstMatch(normalizedText, /\bfor\s+(\d+)\s+(?:people|persons|guests)\b/);
};

const extractAmount = (normalizedText) => {
  return extractFirstMatch(
    normalizedText,
    /\b(\d+(?:\.\d+)?)\s*(?:dollars?|usd|bucks?|eur|euros?)?\b/,
  );
};

const extractTargetLanguage = (normalizedText) => {
  return extractFirstMatch(
    normalizedText,
    /\b(?:into|to)\s+(english|spanish|french|german|italian|russian|chinese|japanese|korean|vietnamese)\b/,
  );
};

export const transformClinicRunPrediction = ({ normalizedText, prediction }) => {
  let resolvedIntent = clinicIntentAliases[prediction.intent] ?? prediction.intent;
  let resolvedConfidence = prediction.confidence;

  const rescueIntent = (intent, minConfidence, condition) => {
    if (!condition) {
      return;
    }

    resolvedIntent = intent;
    resolvedConfidence = Math.max(resolvedConfidence, minConfidence);
  };

  rescueIntent("transfer", 0.12, hasPhrase(normalizedText, "transfer"));
  rescueIntent("book_flight", 0.12, hasPhrase(normalizedText, "book") && hasPhrase(normalizedText, "flight"));
  rescueIntent("book_hotel", 0.12, hasPhrase(normalizedText, "book") && hasPhrase(normalizedText, "hotel"));
  rescueIntent("pay_bill", 0.12, hasPhrase(normalizedText, "bill") && (hasPhrase(normalizedText, "pay") || hasPhrase(normalizedText, "payment")));
  rescueIntent("reminder", 0.12, hasPhrase(normalizedText, "reminder") || hasPhrase(normalizedText, "remind"));
  rescueIntent("timer", 0.12, hasPhrase(normalizedText, "timer"));
  rescueIntent("alarm", 0.12, hasPhrase(normalizedText, "alarm"));
  rescueIntent("order_status", 0.12, hasPhrase(normalizedText, "order") || hasPhrase(normalizedText, "tracking"));
  rescueIntent("restaurant_reservation", 0.12, hasPhrase(normalizedText, "reservation") || (hasPhrase(normalizedText, "book") && hasPhrase(normalizedText, "table")));
  rescueIntent("restaurant_reviews", 0.12, hasPhrase(normalizedText, "restaurant") && (hasPhrase(normalizedText, "review") || hasPhrase(normalizedText, "recommend")));
  rescueIntent("travel_alert", 0.12, hasPhrase(normalizedText, "travel alert") || hasPhrase(normalizedText, "flight status"));

  return {
    intent: resolvedIntent,
    confidence: resolvedConfidence,
  };
};

export const extractClinicFacts = ({ normalizedText, prediction }) => {
  const facts = [];
  const addFact = (fact, value) => {
    if (value !== null && value !== undefined && value !== "") {
      facts.push({ fact, value });
    }
  };

  const canonicalIntent = prediction.intent;

  if (["transfer", "pay_bill", "order_checks"].includes(canonicalIntent)) {
    addFact("slot_amount", extractAmount(normalizedText));
  }

  if (["transfer", "balance", "pay_bill", "routing", "order_checks"].includes(canonicalIntent)) {
    if (/(?:\baccount\b|\bchecking\b|\bsavings\b)/.test(normalizedText)) {
      addFact("slot_account_reference", "present");
    }
  }

  if (canonicalIntent === "transfer") {
    addFact("slot_transfer_target", extractTransferTarget(normalizedText));
  }

  if (["reminder", "alarm", "timer", "calendar", "todo_list", "restaurant_reservation"].includes(canonicalIntent)) {
    addFact("slot_schedule_time", extractScheduleTime(normalizedText));
  }

  if (["reminder", "todo_list"].includes(canonicalIntent)) {
    addFact("slot_task_subject", extractReminderTask(normalizedText));
  }

  if (["book_flight", "book_hotel", "travel_alert", "carry_on", "restaurant_reservation"].includes(canonicalIntent)) {
    addFact("slot_destination", extractDestination(normalizedText));
  }

  if (canonicalIntent === "order_status") {
    addFact("slot_order_reference", extractOrderReference(normalizedText));
  }

  if (canonicalIntent === "restaurant_reservation") {
    addFact("slot_party_size", extractPartySize(normalizedText));
  }

  if (canonicalIntent === "translate") {
    addFact("slot_target_language", extractTargetLanguage(normalizedText));
  }

  return facts;
};

export const clinicSharedClassifierOptions = {
  synonymMap: {
    checking: "account",
    savings: "account",
    funds: "money",
    bucks: "dollars",
    cash: "money",
    cc: "card",
    debit: "card",
    creditcard: "card",
    airfare: "flight",
    airline: "flight",
    motel: "hotel",
    reservation: "booking",
    reserve: "booking",
    schedule: "plan",
    reminder: "reminder",
    alarm: "alarm",
    clock: "time",
    translate: "translate",
    meaning: "definition",
    package: "order",
    parcel: "order",
    automobile: "car",
    vehicle: "car",
    petrol: "gas",
  },
  vectorizerOptions: {
    ngramRange: [1, 2],
    minDf: 2,
    maxFeatures: 8000,
    stopwords: ["botclinic", "clinic", "bot", "hybrid", "chatbot", "please"],
  },
};

export const clinicBotVariants = {
  botClinic: {
    botId: "botClinic",
    displayName: "Bot Clinic",
    trigger: "@botClinic",
    description:
      "A hybrid bot that uses TF-IDF for vectorization, Support Vector Machine for intent classification on the local CLINC150 dataset, and IF-THEN forward chaining for detailed response inference.",
    modelCacheFile: "modelCache.json",
    classifier: {
      type: "svm",
      alpha: 0.8,
      learningRate: 0.08,
      decay: 0.01,
      regularization: 0.0005,
      epochs: 8,
      modelLabel: "botClinic",
    },
    systemUser: {
      username: "botclinic_system",
      email: "botclinic.system@chatapp.local",
      displayName: "Bot Clinic",
      avatarUrl: null,
    },
  },
  botClinicV2: {
    botId: "botClinicV2",
    displayName: "Bot Clinic V2",
    trigger: "@botClinicV2",
    description:
      "A hybrid bot that uses TF-IDF for vectorization, Naive Bayes for intent classification on the local CLINC150 dataset, and IF-THEN forward chaining for detailed response inference.",
    modelCacheFile: "modelCacheV2.json",
    classifier: {
      type: "naive-bayes",
      alpha: 0.8,
      modelLabel: "botClinicV2",
    },
    systemUser: {
      username: "botclinicv2_system",
      email: "botclinicv2.system@chatapp.local",
      displayName: "Bot Clinic V2",
      avatarUrl: null,
    },
  },
  botClinicV3: {
    botId: "botClinicV3",
    displayName: "Bot Clinic V3",
    trigger: "@botClinicV3",
    description:
      "A hybrid bot that uses TF-IDF for vectorization, logistic regression with loss-aware gradient updates and learning-rate decay for intent classification on the local CLINC150 dataset, and IF-THEN forward chaining for detailed response inference.",
    modelCacheFile: "modelCacheV3.json",
    classifier: {
      type: "logistic-regression",
      learningRate: 0.02,
      decay: 0.05,
      regularization: 0.0005,
      epochs: 50,
      tolerance: 0.0001,
      patience: 2,
      modelLabel: "botClinicV3",
    },
    systemUser: {
      username: "botclinicv3_system",
      email: "botclinicv3.system@chatapp.local",
      displayName: "Bot Clinic V3",
      avatarUrl: null,
    },
  },
};

export const getClinicTrainingExamples = () => {
  return [...readLocalClincExamples(), ...botClinicSeedExamples];
};

export const getClinicVariant = (variantId = "botClinic") => {
  const variant = clinicBotVariants[variantId];

  if (!variant) {
    throw new Error(`UNKNOWN_CLINIC_BOT_VARIANT:${variantId}`);
  }

  return variant;
};

export const getClinicClassifierConfig = (variantId = "botClinic") => {
  const variant = getClinicVariant(variantId);

  return {
    ...clinicSharedClassifierOptions,
    ...variant.classifier,
    synonymMap: {
      ...clinicSharedClassifierOptions.synonymMap,
      ...(variant.classifier.synonymMap ?? {}),
    },
    vectorizerOptions: {
      ...clinicSharedClassifierOptions.vectorizerOptions,
      ...(variant.classifier.vectorizerOptions ?? {}),
    },
  };
};

export const createClinicBotDefinition = (variantId = "botClinic") => {
  const variant = getClinicVariant(variantId);
  const hasPretrainedModel = hasClinicModelCache(variant.modelCacheFile);

  return {
    botId: variant.botId,
    displayName: variant.displayName,
    trigger: variant.trigger,
    description: variant.description,
    confidenceThreshold: 0.1,
    classifier: {
      ...getClinicClassifierConfig(variantId),
      pretrainedModelPath: hasPretrainedModel
        ? getClinicModelCachePath(variant.modelCacheFile)
        : null,
    },
    systemUser: variant.systemUser,
    examples: hasPretrainedModel ? [] : getClinicTrainingExamples(),
    entities: {},
    transformRunPrediction: transformClinicRunPrediction,
    extractFacts: extractClinicFacts,
    rules: buildBotClinicRules(),
    responses: botClinicResponses,
  };
};