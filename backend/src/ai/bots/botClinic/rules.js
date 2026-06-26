// Build a multi-stage IF-THEN rule base for botClinic so forward chaining can infer workflow and response.
const addStaticResponseRule = (id, intent, responseKey, assertedFacts = []) => ({
  id,
  if: {
    all: [{ fact: "intent", equals: intent }],
  },
  then: {
    assert: assertedFacts.map(([fact, value]) => ({ fact, value })),
    respond: {
      type: "static",
      responseKey,
    },
  },
});

const addIntentDomainRule = (id, intents, domain, workflow, assertedFacts = []) => ({
  id,
  if: {
    all: [{ fact: "intent", oneOf: intents }],
  },
  then: {
    assert: [
      { fact: "domain", value: domain },
      { fact: "workflow", value: workflow },
      ...assertedFacts.map(([fact, value]) => ({ fact, value })),
    ],
  },
});

const addKeywordRule = (id, workflow, keywords, assertedFacts = []) => ({
  id,
  if: {
    all: [{ fact: "workflow", equals: workflow }],
    any: keywords.map((keyword) => ({ fact: "keyword", equals: keyword })),
  },
  then: {
    assert: assertedFacts.map(([fact, value]) => ({ fact, value })),
  },
});

const addFinalResponseRule = (id, conditions, responseKey) => ({
  id,
  if: {
    all: conditions.map(([fact, value]) => ({ fact, equals: value })),
  },
  then: {
    respond: {
      type: "static",
      responseKey,
    },
  },
});

export const buildBotClinicRules = () => {
  return [
    addStaticResponseRule("clinic-intro-greeting", "greeting", "greeting", [
      ["conversationMode", "friendly"],
      ["botRole", "assistant"],
    ]),
    addStaticResponseRule("clinic-intro-identity", "bot_identity", "bot_identity", [
      ["botRole", "hybrid_expert_system"],
      ["knowledgeSource", "clinc150_local_dataset"],
    ]),
    addStaticResponseRule("clinic-intro-capabilities", "bot_capabilities", "bot_capabilities", [
      ["botRole", "hybrid_expert_system"],
      ["supports", "intent_classification"],
      ["supports", "forward_chaining"],
    ]),
    addStaticResponseRule("clinic-intro-how-it-works", "bot_how_it_works", "bot_how_it_works", [
      ["pipeline", "normalize"],
      ["pipeline", "tfidf"],
      ["pipeline", "naive_bayes"],
      ["pipeline", "forward_chaining"],
    ]),
    addStaticResponseRule("clinic-intro-thanks", "thanks", "thanks", [["conversationMode", "polite"]]),
    addStaticResponseRule("clinic-intro-goodbye", "goodbye", "goodbye", [["conversationMode", "closing"]]),

    addIntentDomainRule(
      "clinic-balance-domain",
      ["balance"],
      "banking",
      "balance_lookup",
      [
        ["requiresVerification", "yes"],
        ["needs", "account_scope"],
        ["needs", "latest_ledger_state"],
      ],
    ),
    addIntentDomainRule(
      "clinic-transfer-domain",
      ["transfer"],
      "banking",
      "fund_transfer",
      [
        ["requiresVerification", "yes"],
        ["needs", "source_account"],
        ["needs", "destination_account"],
        ["needs", "amount"],
      ],
    ),
    addIntentDomainRule(
      "clinic-banking-security-domain",
      ["freeze_account", "report_lost_card", "replacement_card_duration"],
      "banking_security",
      "account_protection",
      [
        ["requiresUrgency", "high"],
        ["requiresVerification", "yes"],
      ],
    ),
    addIntentDomainRule(
      "clinic-banking-credit-domain",
      ["improve_credit_score", "interest_rate", "credit_limit", "rewards_balance", "redeem_rewards"],
      "banking_credit",
      "credit_guidance",
      [
        ["requiresHistoryReview", "yes"],
        ["needs", "credit_profile"],
      ],
    ),
    addIntentDomainRule(
      "clinic-banking-operations-domain",
      ["transactions", "spending_history", "pay_bill", "routing", "order_checks"],
      "banking_operations",
      "account_operations",
      [
        ["requiresVerification", "yes"],
        ["needs", "account_selection"],
      ],
    ),
    addKeywordRule("clinic-transfer-detect-amount", "fund_transfer", ["dollars", "money", "funds"], [
      ["slotDetected", "amount_reference"],
    ]),
    addKeywordRule("clinic-transfer-detect-account", "fund_transfer", ["account", "checking", "savings"], [
      ["slotDetected", "account_reference"],
    ]),
    addKeywordRule("clinic-balance-detect-account", "balance_lookup", ["account", "balance", "checking", "savings"], [
      ["slotDetected", "balance_target"],
    ]),
    addKeywordRule("clinic-security-detect-card", "account_protection", ["card", "credit card", "debit card"], [
      ["securityScope", "card"],
    ]),
    addKeywordRule("clinic-credit-detect-score", "credit_guidance", ["credit", "score", "interest"], [
      ["guidanceScope", "credit_health"],
    ]),
    addKeywordRule("clinic-operations-detect-history", "account_operations", ["transactions", "history", "spending"], [
      ["operationsScope", "history_review"],
    ]),

    addIntentDomainRule(
      "clinic-productivity-domain",
      ["timer", "alarm", "reminder", "calendar", "date", "time", "todo_list"],
      "productivity",
      "planning_support",
      [
        ["requiresTemporalInfo", "yes"],
        ["supportsAction", "schedule_or_lookup"],
      ],
    ),
    addKeywordRule("clinic-productivity-detect-duration", "planning_support", ["minutes", "hour", "timer", "date", "time"], [
      ["temporalSignal", "explicit_time_expression"],
    ]),

    addIntentDomainRule(
      "clinic-travel-domain",
      ["book_flight", "book_hotel", "travel_alert", "carry_on"],
      "travel",
      "travel_support",
      [
        ["requiresTripContext", "yes"],
        ["needs", "destination"],
      ],
    ),
    addKeywordRule("clinic-travel-detect-destination", "travel_support", ["flight", "hotel", "travel", "paris", "london"], [
      ["travelSignal", "destination_or_booking"],
    ]),

    addIntentDomainRule(
      "clinic-knowledge-domain",
      ["translate", "definition", "weather"],
      "knowledge_utility",
      "knowledge_lookup",
      [
        ["requiresSourceText", "sometimes"],
        ["supportsAction", "lookup_or_transform"],
      ],
    ),
    addKeywordRule("clinic-translate-detect-language", "knowledge_lookup", ["translate", "chinese", "spanish", "english", "russian"], [
      ["knowledgeMode", "translation"],
    ]),
    addKeywordRule("clinic-definition-detect-term", "knowledge_lookup", ["definition", "word", "meaning"], [
      ["knowledgeMode", "definition_lookup"],
    ]),

    addIntentDomainRule(
      "clinic-shopping-domain",
      ["order_status", "shopping_list"],
      "shopping",
      "shopping_support",
      [
        ["requiresOrderContext", "sometimes"],
        ["supportsAction", "track_or_collect_items"],
      ],
    ),

    addIntentDomainRule(
      "clinic-food-domain",
      ["restaurant_reviews", "restaurant_reservation", "nutrition_info", "meal_suggestion"],
      "food_lifestyle",
      "food_support",
      [
        ["requiresPreferenceContext", "yes"],
        ["supportsAction", "recommend_or_lookup"],
      ],
    ),

    addIntentDomainRule(
      "clinic-automotive-domain",
      ["schedule_maintenance", "oil_change_when", "gas_type"],
      "automotive",
      "vehicle_support",
      [
        ["requiresVehicleContext", "yes"],
        ["supportsAction", "maintenance_guidance"],
      ],
    ),

    addFinalResponseRule("clinic-balance-final-detailed", [["workflow", "balance_lookup"], ["slotDetected", "balance_target"]], "balance_response"),
    addFinalResponseRule("clinic-transfer-final-detailed", [["workflow", "fund_transfer"], ["slotDetected", "amount_reference"], ["slotDetected", "account_reference"]], "transfer_response_detailed"),
    addFinalResponseRule("clinic-transfer-final-base", [["workflow", "fund_transfer"]], "transfer_response_base"),
    addFinalResponseRule("clinic-security-card-final", [["workflow", "account_protection"], ["securityScope", "card"]], "security_card_response"),
    addFinalResponseRule("clinic-security-generic-final", [["workflow", "account_protection"]], "security_account_response"),
    addFinalResponseRule("clinic-credit-final", [["workflow", "credit_guidance"]], "credit_guidance_response"),
    addFinalResponseRule("clinic-operations-history-final", [["workflow", "account_operations"], ["operationsScope", "history_review"]], "operations_history_response"),
    addFinalResponseRule("clinic-operations-generic-final", [["workflow", "account_operations"]], "operations_generic_response"),
    addFinalResponseRule("clinic-productivity-final", [["workflow", "planning_support"]], "productivity_response"),
    addFinalResponseRule("clinic-travel-final", [["workflow", "travel_support"]], "travel_response"),
    addFinalResponseRule("clinic-knowledge-translate-final", [["workflow", "knowledge_lookup"], ["knowledgeMode", "translation"]], "translate_response"),
    addFinalResponseRule("clinic-knowledge-definition-final", [["workflow", "knowledge_lookup"], ["knowledgeMode", "definition_lookup"]], "definition_response"),
    addFinalResponseRule("clinic-knowledge-generic-final", [["workflow", "knowledge_lookup"]], "knowledge_generic_response"),
    addFinalResponseRule("clinic-shopping-final", [["workflow", "shopping_support"]], "shopping_response"),
    addFinalResponseRule("clinic-food-final", [["workflow", "food_support"]], "food_response"),
    addFinalResponseRule("clinic-automotive-final", [["workflow", "vehicle_support"]], "automotive_response"),
  ];
};