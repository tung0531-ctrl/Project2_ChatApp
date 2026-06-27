// Build a multi-stage IF-THEN rule base for botClinic so forward chaining can infer workflow and response.
// Nhom helper builder giup viet rule ngan hon va giu mot format thong nhat.
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

const addCustomResponseRule = (id, conditions, responseKey, options = {}) => ({
  id,
  if: {
    all: conditions,
  },
  then: {
    respond: {
      type: "static",
      responseKey,
      ...(options.needsContext !== undefined ? { needsContext: options.needsContext } : {}),
    },
  },
});

const addIntentFactRule = (id, intents, assertedFacts = []) => ({
  id,
  if: {
    all: [{ fact: "intent", oneOf: Array.isArray(intents) ? intents : [intents] }],
  },
  then: {
    assert: assertedFacts.map(([fact, value]) => ({ fact, value })),
  },
});

export const buildBotClinicRules = () => {
  return [
    // Intro rules: tra loi truc tiep cho greeting, identity va giai thich bot.
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

    // Banking rules: balance, transfer, security, credit va account operations.
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
    addIntentFactRule("clinic-security-freeze-action", ["freeze_account"], [
      ["protectionAction", "freeze_account"],
      ["securityPriority", "immediate_lockdown"],
    ]),
    addIntentFactRule("clinic-security-report-card-action", ["report_lost_card"], [
      ["protectionAction", "report_lost_card"],
      ["securityPriority", "card_containment"],
    ]),
    addIntentFactRule("clinic-security-replacement-action", ["replacement_card_duration"], [
      ["protectionAction", "replacement_timeline"],
      ["securityPriority", "replacement_followup"],
    ]),
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
    addIntentFactRule("clinic-credit-improve-score-action", ["improve_credit_score"], [
      ["creditAction", "improve_score"],
      ["guidanceDepth", "behavior_change"],
    ]),
    addIntentFactRule("clinic-credit-interest-action", ["interest_rate"], [
      ["creditAction", "rate_review"],
      ["guidanceDepth", "pricing_review"],
    ]),
    addIntentFactRule("clinic-credit-limit-action", ["credit_limit"], [
      ["creditAction", "limit_review"],
      ["guidanceDepth", "eligibility_review"],
    ]),
    addIntentFactRule("clinic-credit-rewards-balance-action", ["rewards_balance"], [
      ["creditAction", "rewards_balance"],
      ["guidanceDepth", "benefit_lookup"],
    ]),
    addIntentFactRule("clinic-credit-redeem-action", ["redeem_rewards"], [
      ["creditAction", "redeem_rewards"],
      ["guidanceDepth", "benefit_redemption"],
    ]),
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
    addIntentFactRule("clinic-operations-history-action", ["transactions", "spending_history"], [
      ["operationsAction", "history_review"],
    ]),
    addIntentFactRule("clinic-operations-bill-payment-action", ["pay_bill"], [
      ["operationsAction", "bill_payment"],
      ["requiresDueDate", "yes"],
    ]),
    addIntentFactRule("clinic-operations-routing-action", ["routing"], [
      ["operationsAction", "routing_lookup"],
      ["requiresAccountContext", "yes"],
    ]),
    addIntentFactRule("clinic-operations-check-order-action", ["order_checks"], [
      ["operationsAction", "check_order"],
      ["fulfillmentMode", "mail_delivery"],
    ]),
    addKeywordRule("clinic-transfer-detect-amount", "fund_transfer", ["dollars", "money", "funds"], [
      ["slotDetected", "amount_reference"],
    ]),
    addKeywordRule("clinic-transfer-detect-account", "fund_transfer", ["account", "checking", "savings"], [
      ["slotDetected", "account_reference"],
    ]),
    addKeywordRule("clinic-transfer-detect-recipient", "fund_transfer", ["recipient", "friend", "payee", "wire"], [
      ["slotDetected", "recipient_reference"],
    ]),
    addKeywordRule("clinic-transfer-detect-urgency", "fund_transfer", ["today", "now", "urgent", "immediately"], [
      ["transferPriority", "expedited"],
    ]),
    addKeywordRule("clinic-balance-detect-account", "balance_lookup", ["account", "balance", "checking", "savings"], [
      ["slotDetected", "balance_target"],
    ]),
    addKeywordRule("clinic-security-detect-card", "account_protection", ["card", "credit card", "debit card"], [
      ["securityScope", "card"],
    ]),
    addKeywordRule("clinic-security-detect-lost", "account_protection", ["lost", "stolen", "missing"], [
      ["incidentType", "lost_or_stolen"],
    ]),
    addKeywordRule("clinic-security-detect-fraud", "account_protection", ["fraud", "suspicious", "unauthorized"], [
      ["incidentType", "suspicious_activity"],
    ]),
    addKeywordRule("clinic-credit-detect-score", "credit_guidance", ["credit", "score", "interest"], [
      ["guidanceScope", "credit_health"],
    ]),
    addKeywordRule("clinic-credit-detect-limit", "credit_guidance", ["limit", "raise", "increase"], [
      ["guidanceScope", "limit_strategy"],
    ]),
    addKeywordRule("clinic-credit-detect-rewards", "credit_guidance", ["rewards", "points", "redeem"], [
      ["guidanceScope", "rewards_program"],
    ]),
    addKeywordRule("clinic-operations-detect-history", "account_operations", ["transactions", "history", "spending"], [
      ["operationsScope", "history_review"],
    ]),
    addKeywordRule("clinic-operations-detect-bill", "account_operations", ["bill", "utility", "electricity", "internet", "phone"], [
      ["operationsScope", "bill_payment"],
    ]),
    addKeywordRule("clinic-operations-detect-routing", "account_operations", ["routing", "number", "direct deposit"], [
      ["operationsScope", "routing_lookup"],
    ]),
    addKeywordRule("clinic-operations-detect-checks", "account_operations", ["checks", "cheques", "mail"], [
      ["operationsScope", "check_order"],
    ]),

    // Productivity rules: timer, alarm, reminder, calendar, date/time va todo list.
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
    addIntentFactRule("clinic-productivity-timer-action", ["timer"], [["planningAction", "timer"]]),
    addIntentFactRule("clinic-productivity-alarm-action", ["alarm"], [["planningAction", "alarm"]]),
    addIntentFactRule("clinic-productivity-reminder-action", ["reminder"], [["planningAction", "reminder"]]),
    addIntentFactRule("clinic-productivity-calendar-action", ["calendar", "date", "time"], [["planningAction", "calendar_lookup"]]),
    addIntentFactRule("clinic-productivity-todo-action", ["todo_list"], [["planningAction", "todo_list"]]),
    addKeywordRule("clinic-productivity-detect-duration", "planning_support", ["minutes", "hour", "timer", "date", "time"], [
      ["temporalSignal", "explicit_time_expression"],
    ]),
    addKeywordRule("clinic-productivity-detect-relative-date", "planning_support", ["today", "tomorrow", "tonight", "morning", "evening"], [
      ["temporalSignal", "relative_time_expression"],
    ]),
    addKeywordRule("clinic-productivity-detect-task", "planning_support", ["meeting", "call", "task", "reminder"], [
      ["taskSignal", "named_task"],
    ]),

    // Travel rules: booking, alerts va baggage.
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
    addIntentFactRule("clinic-travel-flight-action", ["book_flight"], [["travelAction", "flight_booking"]]),
    addIntentFactRule("clinic-travel-hotel-action", ["book_hotel"], [["travelAction", "hotel_booking"]]),
    addIntentFactRule("clinic-travel-alert-action", ["travel_alert"], [["travelAction", "travel_alert_lookup"]]),
    addIntentFactRule("clinic-travel-baggage-action", ["carry_on"], [["travelAction", "baggage_policy"]]),
    addKeywordRule("clinic-travel-detect-destination", "travel_support", ["flight", "hotel", "travel", "paris", "london"], [
      ["travelSignal", "destination_or_booking"],
    ]),
    addKeywordRule("clinic-travel-detect-airline", "travel_support", ["airline", "delta", "united", "american"], [
      ["travelSignal", "airline_context"],
    ]),
    addKeywordRule("clinic-travel-detect-baggage", "travel_support", ["carry on", "baggage", "luggage", "bag"], [
      ["travelSignal", "baggage_context"],
    ]),
    addKeywordRule("clinic-travel-detect-alert", "travel_support", ["delay", "cancelled", "alert", "storm"], [
      ["travelSignal", "disruption_context"],
    ]),

    // Knowledge rules: translation, definition lookup va weather.
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
    addIntentFactRule("clinic-knowledge-weather-action", ["weather"], [["knowledgeMode", "weather_lookup"]]),
    addKeywordRule("clinic-translate-detect-language", "knowledge_lookup", ["translate", "chinese", "spanish", "english", "russian"], [
      ["knowledgeMode", "translation"],
    ]),
    addKeywordRule("clinic-definition-detect-term", "knowledge_lookup", ["definition", "word", "meaning"], [
      ["knowledgeMode", "definition_lookup"],
    ]),
    addKeywordRule("clinic-weather-detect-forecast", "knowledge_lookup", ["weather", "forecast", "rain", "temperature", "sunny"], [
      ["knowledgeMode", "weather_lookup"],
    ]),

    // Shopping rules: order tracking va shopping list.
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
    addIntentFactRule("clinic-shopping-order-status-action", ["order_status"], [["shoppingAction", "order_status"]]),
    addIntentFactRule("clinic-shopping-list-action", ["shopping_list"], [["shoppingAction", "shopping_list"]]),
    addKeywordRule("clinic-shopping-detect-tracking", "shopping_support", ["tracking", "shipping", "delivery", "order"], [
      ["shoppingSignal", "order_tracking"],
    ]),
    addKeywordRule("clinic-shopping-detect-items", "shopping_support", ["list", "buy", "groceries", "items"], [
      ["shoppingSignal", "item_collection"],
    ]),

    // Food/lifestyle rules: restaurant reviews, reservation, nutrition va meal suggestion.
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
    addIntentFactRule("clinic-food-reviews-action", ["restaurant_reviews"], [["foodAction", "restaurant_reviews"]]),
    addIntentFactRule("clinic-food-reservation-action", ["restaurant_reservation"], [["foodAction", "restaurant_reservation"]]),
    addIntentFactRule("clinic-food-nutrition-action", ["nutrition_info"], [["foodAction", "nutrition_info"]]),
    addIntentFactRule("clinic-food-meal-suggestion-action", ["meal_suggestion"], [["foodAction", "meal_suggestion"]]),
    addKeywordRule("clinic-food-detect-reservation", "food_support", ["table", "reservation", "book", "tonight"], [
      ["foodSignal", "reservation_context"],
    ]),
    addKeywordRule("clinic-food-detect-nutrition", "food_support", ["calories", "protein", "fat", "nutrition"], [
      ["foodSignal", "nutrition_context"],
    ]),
    addKeywordRule("clinic-food-detect-preference", "food_support", ["vegan", "vegetarian", "spicy", "healthy"], [
      ["foodSignal", "preference_context"],
    ]),

    // Automotive rules: maintenance, oil change va fuel guidance.
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
    addIntentFactRule("clinic-vehicle-maintenance-action", ["schedule_maintenance"], [["vehicleAction", "schedule_maintenance"]]),
    addIntentFactRule("clinic-vehicle-oil-change-action", ["oil_change_when"], [["vehicleAction", "oil_change_guidance"]]),
    addIntentFactRule("clinic-vehicle-gas-type-action", ["gas_type"], [["vehicleAction", "fuel_guidance"]]),
    addKeywordRule("clinic-vehicle-detect-mileage", "vehicle_support", ["miles", "mileage", "odometer", "service"], [
      ["vehicleSignal", "maintenance_interval"],
    ]),
    addKeywordRule("clinic-vehicle-detect-fuel", "vehicle_support", ["gas", "diesel", "premium", "unleaded"], [
      ["vehicleSignal", "fuel_requirement"],
    ]),

    // Prompt rules: hoi them slot con thieu thay vi roi vao fallback ngay.
    addCustomResponseRule(
      "clinic-transfer-prompt-core-details",
      [
        { fact: "workflow", equals: "fund_transfer" },
        { fact: "slot_amount", exists: false },
        { fact: "slot_transfer_target", exists: false },
      ],
      "ask_transfer_amount_and_target",
      { needsContext: true },
    ),
    addCustomResponseRule(
      "clinic-transfer-prompt-amount",
      [
        { fact: "workflow", equals: "fund_transfer" },
        { fact: "slot_amount", exists: false },
        { fact: "slot_transfer_target", exists: true },
      ],
      "ask_transfer_amount",
      { needsContext: true },
    ),
    addCustomResponseRule(
      "clinic-transfer-prompt-target",
      [
        { fact: "workflow", equals: "fund_transfer" },
        { fact: "slot_amount", exists: true },
        { fact: "slot_transfer_target", exists: false },
      ],
      "ask_transfer_target",
      { needsContext: true },
    ),
    addCustomResponseRule(
      "clinic-reminder-prompt-details",
      [
        { fact: "planningAction", equals: "reminder" },
        { fact: "slot_schedule_time", exists: false },
        { fact: "slot_task_subject", exists: false },
      ],
      "ask_reminder_details",
      { needsContext: true },
    ),
    addCustomResponseRule(
      "clinic-reminder-prompt-time",
      [
        { fact: "planningAction", equals: "reminder" },
        { fact: "slot_schedule_time", exists: false },
        { fact: "slot_task_subject", exists: true },
      ],
      "ask_reminder_time",
      { needsContext: true },
    ),
    addCustomResponseRule(
      "clinic-timer-prompt-duration",
      [
        { fact: "planningAction", equals: "timer" },
        { fact: "slot_schedule_time", exists: false },
      ],
      "ask_timer_duration",
      { needsContext: true },
    ),
    addCustomResponseRule(
      "clinic-flight-prompt-destination",
      [
        { fact: "travelAction", equals: "flight_booking" },
        { fact: "slot_destination", exists: false },
      ],
      "ask_flight_destination",
      { needsContext: true },
    ),
    addCustomResponseRule(
      "clinic-hotel-prompt-destination",
      [
        { fact: "travelAction", equals: "hotel_booking" },
        { fact: "slot_destination", exists: false },
      ],
      "ask_hotel_destination",
      { needsContext: true },
    ),
    addCustomResponseRule(
      "clinic-order-status-prompt-reference",
      [
        { fact: "shoppingAction", equals: "order_status" },
        { fact: "slot_order_reference", exists: false },
      ],
      "ask_order_reference",
      { needsContext: true },
    ),
    addCustomResponseRule(
      "clinic-restaurant-reservation-prompt-details",
      [
        { fact: "foodAction", equals: "restaurant_reservation" },
        { fact: "slot_schedule_time", exists: false },
        { fact: "slot_party_size", exists: false },
      ],
      "ask_restaurant_reservation_details",
      { needsContext: true },
    ),

    // Final rules: chot response khi da du facts de biet workflow va muc tieu can tra loi.
    addFinalResponseRule("clinic-balance-final-detailed", [["workflow", "balance_lookup"], ["slotDetected", "balance_target"]], "balance_response"),
    addFinalResponseRule("clinic-security-freeze-final", [["workflow", "account_protection"], ["protectionAction", "freeze_account"]], "security_freeze_response"),
    addFinalResponseRule("clinic-security-replacement-final", [["workflow", "account_protection"], ["protectionAction", "replacement_timeline"]], "security_replacement_response"),
    addCustomResponseRule(
      "clinic-transfer-final-slotted",
      [
        { fact: "workflow", equals: "fund_transfer" },
        { fact: "slot_amount", exists: true },
        { fact: "slot_transfer_target", exists: true },
      ],
      "transfer_response_detailed",
    ),
    addFinalResponseRule("clinic-transfer-final-detailed", [["workflow", "fund_transfer"], ["slotDetected", "amount_reference"], ["slotDetected", "account_reference"]], "transfer_response_detailed"),
    addFinalResponseRule("clinic-transfer-final-base", [["workflow", "fund_transfer"]], "transfer_response_base"),
    addFinalResponseRule("clinic-security-card-final", [["workflow", "account_protection"], ["securityScope", "card"]], "security_card_response"),
    addFinalResponseRule("clinic-security-generic-final", [["workflow", "account_protection"]], "security_account_response"),
    addFinalResponseRule("clinic-credit-score-final", [["workflow", "credit_guidance"], ["creditAction", "improve_score"]], "credit_score_response"),
    addFinalResponseRule("clinic-credit-interest-final", [["workflow", "credit_guidance"], ["creditAction", "rate_review"]], "credit_interest_response"),
    addFinalResponseRule("clinic-credit-limit-final", [["workflow", "credit_guidance"], ["creditAction", "limit_review"]], "credit_limit_response"),
    addFinalResponseRule("clinic-credit-rewards-final", [["workflow", "credit_guidance"], ["creditAction", "rewards_balance"]], "credit_rewards_response"),
    addFinalResponseRule("clinic-credit-redeem-final", [["workflow", "credit_guidance"], ["creditAction", "redeem_rewards"]], "credit_rewards_response"),
    addFinalResponseRule("clinic-credit-final", [["workflow", "credit_guidance"]], "credit_guidance_response"),
    addFinalResponseRule("clinic-operations-bill-final", [["workflow", "account_operations"], ["operationsAction", "bill_payment"]], "bill_payment_response"),
    addFinalResponseRule("clinic-operations-routing-final", [["workflow", "account_operations"], ["operationsAction", "routing_lookup"]], "routing_response"),
    addFinalResponseRule("clinic-operations-check-order-final", [["workflow", "account_operations"], ["operationsAction", "check_order"]], "check_order_response"),
    addFinalResponseRule("clinic-operations-history-final", [["workflow", "account_operations"], ["operationsScope", "history_review"]], "operations_history_response"),
    addFinalResponseRule("clinic-operations-generic-final", [["workflow", "account_operations"]], "operations_generic_response"),
    addFinalResponseRule("clinic-productivity-timer-final", [["workflow", "planning_support"], ["planningAction", "timer"]], "timer_response"),
    addFinalResponseRule("clinic-productivity-alarm-final", [["workflow", "planning_support"], ["planningAction", "alarm"]], "alarm_response"),
    addFinalResponseRule("clinic-productivity-reminder-final", [["workflow", "planning_support"], ["planningAction", "reminder"]], "reminder_response"),
    addFinalResponseRule("clinic-productivity-calendar-final", [["workflow", "planning_support"], ["planningAction", "calendar_lookup"]], "calendar_response"),
    addFinalResponseRule("clinic-productivity-todo-final", [["workflow", "planning_support"], ["planningAction", "todo_list"]], "todo_response"),
    addFinalResponseRule("clinic-productivity-final", [["workflow", "planning_support"]], "productivity_response"),
    addFinalResponseRule("clinic-travel-flight-final", [["workflow", "travel_support"], ["travelAction", "flight_booking"]], "flight_booking_response"),
    addFinalResponseRule("clinic-travel-hotel-final", [["workflow", "travel_support"], ["travelAction", "hotel_booking"]], "hotel_booking_response"),
    addFinalResponseRule("clinic-travel-alert-final", [["workflow", "travel_support"], ["travelAction", "travel_alert_lookup"]], "travel_alert_response"),
    addFinalResponseRule("clinic-travel-baggage-final", [["workflow", "travel_support"], ["travelAction", "baggage_policy"]], "baggage_response"),
    addFinalResponseRule("clinic-travel-final", [["workflow", "travel_support"]], "travel_response"),
    addFinalResponseRule("clinic-knowledge-translate-final", [["workflow", "knowledge_lookup"], ["knowledgeMode", "translation"]], "translate_response"),
    addFinalResponseRule("clinic-knowledge-definition-final", [["workflow", "knowledge_lookup"], ["knowledgeMode", "definition_lookup"]], "definition_response"),
    addFinalResponseRule("clinic-knowledge-weather-final", [["workflow", "knowledge_lookup"], ["knowledgeMode", "weather_lookup"]], "weather_response"),
    addFinalResponseRule("clinic-knowledge-generic-final", [["workflow", "knowledge_lookup"]], "knowledge_generic_response"),
    addFinalResponseRule("clinic-shopping-order-status-final", [["workflow", "shopping_support"], ["shoppingAction", "order_status"]], "order_status_response"),
    addFinalResponseRule("clinic-shopping-list-final", [["workflow", "shopping_support"], ["shoppingAction", "shopping_list"]], "shopping_list_response"),
    addFinalResponseRule("clinic-shopping-final", [["workflow", "shopping_support"]], "shopping_response"),
    addFinalResponseRule("clinic-food-reviews-final", [["workflow", "food_support"], ["foodAction", "restaurant_reviews"]], "restaurant_reviews_response"),
    addFinalResponseRule("clinic-food-reservation-final", [["workflow", "food_support"], ["foodAction", "restaurant_reservation"]], "restaurant_reservation_response"),
    addFinalResponseRule("clinic-food-nutrition-final", [["workflow", "food_support"], ["foodAction", "nutrition_info"]], "nutrition_response"),
    addFinalResponseRule("clinic-food-meal-final", [["workflow", "food_support"], ["foodAction", "meal_suggestion"]], "meal_suggestion_response"),
    addFinalResponseRule("clinic-food-final", [["workflow", "food_support"]], "food_response"),
    addFinalResponseRule("clinic-vehicle-maintenance-final", [["workflow", "vehicle_support"], ["vehicleAction", "schedule_maintenance"]], "maintenance_schedule_response"),
    addFinalResponseRule("clinic-vehicle-oil-final", [["workflow", "vehicle_support"], ["vehicleAction", "oil_change_guidance"]], "oil_change_response"),
    addFinalResponseRule("clinic-vehicle-fuel-final", [["workflow", "vehicle_support"], ["vehicleAction", "fuel_guidance"]], "gas_type_response"),
    addFinalResponseRule("clinic-automotive-final", [["workflow", "vehicle_support"]], "automotive_response"),
  ];
};