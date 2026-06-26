// Final English response templates for botClinic after forward chaining resolves workflow and facts.
export const botClinicResponses = {
  greeting:
    "Hello, I am @botClinic. I am running as a hybrid bot: I classify intent with the local CLINC150 dataset and use IF-THEN reasoning to produce the final answer.",
  bot_identity:
    "I am botClinic, a hybrid bot connected directly to ChatApp. I use the local CLINC150 dataset to understand user intent, and I use forward chaining over a multi-step rule base to decide the final response.",
  bot_capabilities:
    "I currently support major intent groups such as banking accounts, transfers, card and account security, time and reminder tasks, translation and knowledge lookup, travel, shopping, and several lifestyle queries. My answers focus on operational guidance and decision flow rather than executing real external services.",
  bot_how_it_works:
    "My pipeline is: normalize the question, build TF-IDF n-grams, classify the intent, place the intent and extracted keywords into working memory, run IF-THEN forward chaining, and then produce the final response. That means I do not only predict an intent; I also infer domain, workflow, slots, and handling priority.",
  thanks: "You are welcome. Mention @botClinic again and add more details if you want a more precise inference.",
  goodbye: "Goodbye. If you want to test again, just mention @botClinic in the group.",
  balance_response:
    "I infer that this is a balance inquiry. A reasonable handling flow is: identify the target account, verify access rights, read both available and current balance values, and return the result together with the latest update time.",
  transfer_response_base:
    "I infer that this is a money transfer request. The system should collect the source account, destination account, and transfer amount; then verify identity, validate transfer limits, check available balance, and only then create the transfer transaction.",
  transfer_response_detailed:
    "I infer that this is a transfer request that already references both money and accounts. A standard handling sequence is: 1) identify the source and destination accounts, 2) normalize the amount, 3) verify ownership and transfer limits, 4) check available funds, 5) execute the transaction, 6) record the transaction history, and 7) return a reference code to the user.",
  security_card_response:
    "I infer that this scenario is related to card security. The rule base prioritizes an urgent handling path: block or flag the card, verify the card owner, inspect recent transactions, create a replacement request if needed, and communicate the expected replacement timeline.",
  security_account_response:
    "I infer that this is an account protection request. The handling sequence should be: verify the user, temporarily freeze or increase the alert level on the account, review recent suspicious activity, and then guide the next steps such as password reset, device re-verification, or escalation to support.",
  credit_guidance_response:
    "I infer that this question is about credit profile or credit-related benefits. The rule base concludes that the system should review payment history, utilization ratio, overdue obligations, and current benefits before giving guidance such as paying on time, reducing card utilization, or optimizing reward usage.",
  operations_history_response:
    "I infer that this is a request to inspect transactions or spending history. A suitable handling flow is: choose the account, identify the time range, filter transaction type if needed, compute summary totals or the matching transaction list, and return the result in chronological order.",
  operations_generic_response:
    "I infer that this is an account operations request such as checking a routing number, paying a bill, ordering checks, or querying transactions. The standard flow is to verify the account, choose the correct action type, call the right business service, and return the result together with completion status.",
  productivity_response:
    "I infer that this belongs to the time and planning category, such as timers, alarms, calendars, or reminders. The system should extract the duration or timestamp, normalize date and timezone information, create the appropriate scheduled item, and confirm what has been set.",
  travel_response:
    "I infer that this is a travel-related request. The rule base groups the necessary steps as identifying destination and travel time, determining whether the need is flights, hotels, travel alerts, or baggage rules, and then producing the checklist of information still needed.",
  translate_response:
    "I infer that this is a translation request. The correct flow is to determine the target language, inspect the text to be translated, preserve important entities such as names or numbers, and then return the translation together with any ambiguity note if the source phrase is unclear.",
  definition_response:
    "I infer that this is a definition lookup request. A suitable handling strategy is to identify the target word or phrase, retrieve the primary meaning, provide contextual meaning if relevant, and optionally add an example usage to reduce ambiguity.",
  knowledge_generic_response:
    "I infer that this is a knowledge lookup or information transformation request. The system should first determine whether the goal is translation, definition lookup, or broader knowledge access, and only then choose the right data source and response format.",
  shopping_response:
    "I infer that this is a shopping or order-tracking request. The handling flow should include identifying the order reference or item list, checking the current order state, retrieving the latest shipping checkpoint or remaining item list, and returning the result in a concise action-oriented format.",
  food_response:
    "I infer that this is a restaurant, nutrition, or meal recommendation question. The system should extract preferences, location, dietary constraints, or the target dish, and then provide recommendations, review-style guidance, or nutrition-related information.",
  automotive_response:
    "I infer that this is a vehicle maintenance query. A suitable handling flow is to identify the vehicle or maintenance topic, inspect the latest time or mileage checkpoint, and then return guidance such as oil-change timing, fuel type, or the next maintenance scheduling step.",
  fallback:
    "I detected the @botClinic trigger, but I do not yet have enough confidence to give a detailed answer. Please clarify your goal by adding more information such as the operation name, amount, account, time, or service type.",
};