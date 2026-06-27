// Final English response templates for botClinic after forward chaining resolves workflow and facts.
export const botClinicResponses = {
  // Intro/self-description responses.
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
  // Banking responses and transfer prompts.
  balance_response:
    "I infer that this is a balance inquiry. A reasonable handling flow is: identify the target account, verify access rights, read both available and current balance values, and return the result together with the latest update time.",
  ask_transfer_amount_and_target:
    "I infer that you want to transfer money, but I still need two critical slots before the rule flow can continue: the amount and the recipient or destination account. For example: transfer 50 dollars to Alex, or move 200 dollars to savings.",
  ask_transfer_amount:
    "I infer that this is a transfer request, but I am still missing the transfer amount. Please tell me how much money should be moved so the transfer flow can continue.",
  ask_transfer_target:
    "I infer that this is a transfer request and I can already see the amount, but I still need the recipient or destination account. Please tell me who should receive the money or which account it should go to.",
  transfer_response_base:
    "I infer that this is a money transfer request. The system should collect the source account, destination account, and transfer amount; then verify identity, validate transfer limits, check available balance, and only then create the transfer transaction.",
  transfer_response_detailed:
    "I infer that this is a transfer request that already references both money and accounts. A standard handling sequence is: 1) identify the source and destination accounts, 2) normalize the amount, 3) verify ownership and transfer limits, 4) check available funds, 5) execute the transaction, 6) record the transaction history, and 7) return a reference code to the user.",
  security_freeze_response:
    "I infer that the main need is freezing or locking access quickly. The safest rule path is: verify the account owner, place an immediate temporary freeze, preserve an audit trail, review recent suspicious events, and then guide recovery steps such as password reset or device re-verification.",
  security_card_response:
    "I infer that this scenario is related to card security. The rule base prioritizes an urgent handling path: block or flag the card, verify the card owner, inspect recent transactions, create a replacement request if needed, and communicate the expected replacement timeline.",
  security_replacement_response:
    "I infer that the user is asking about card replacement timing. The handling path should confirm whether the old card is already blocked, collect delivery and identity details, estimate the production and shipping window, and then return the expected replacement timeline together with any temporary card-access guidance.",
  security_account_response:
    "I infer that this is an account protection request. The handling sequence should be: verify the user, temporarily freeze or increase the alert level on the account, review recent suspicious activity, and then guide the next steps such as password reset, device re-verification, or escalation to support.",
  credit_score_response:
    "I infer that this is specifically about improving a credit score. The rule base would review payment punctuality, utilization ratio, recent hard inquiries, and delinquency history, then recommend concrete actions such as reducing revolving balance, paying on time, and avoiding new debt during the recovery window.",
  credit_interest_response:
    "I infer that the focus is on interest rate guidance. The correct handling flow is to identify the product type, inspect the current rate basis, review payment history and risk tier, and then explain whether the best next step is payoff acceleration, refinancing, balance transfer, or negotiation with support.",
  credit_limit_response:
    "I infer that this is a credit-limit question. The system should review income and usage history, payment consistency, current utilization, and recent account changes before determining whether to recommend a limit increase request, spending reduction, or continued on-time usage to build eligibility.",
  credit_rewards_response:
    "I infer that this question is about reward points or redemption. The correct flow is to identify the active rewards program, read the current rewards balance, validate redemption eligibility, and then present the most relevant redemption or balance-summary options.",
  credit_guidance_response:
    "I infer that this question is about credit profile or credit-related benefits. The rule base concludes that the system should review payment history, utilization ratio, overdue obligations, and current benefits before giving guidance such as paying on time, reducing card utilization, or optimizing reward usage.",
  bill_payment_response:
    "I infer that this is a bill-payment request. A suitable rule path is: identify the payee, confirm the due date and amount, validate the funding account, check payment cutoff rules, submit the payment instruction, and return the confirmation status plus reference details.",
  routing_response:
    "I infer that the user needs routing information. The system should first identify the relevant account or region, verify access rights, fetch the routing or direct-deposit number from the correct account profile, and return it together with a warning to double-check before sharing it externally.",
  check_order_response:
    "I infer that this is about ordering physical checks. The expected rule sequence is to verify the account, confirm the mailing address and check style, submit the order, estimate fulfillment time, and return the order confirmation together with any shipping note.",
  operations_history_response:
    "I infer that this is a request to inspect transactions or spending history. A suitable handling flow is: choose the account, identify the time range, filter transaction type if needed, compute summary totals or the matching transaction list, and return the result in chronological order.",
  operations_generic_response:
    "I infer that this is an account operations request such as checking a routing number, paying a bill, ordering checks, or querying transactions. The standard flow is to verify the account, choose the correct action type, call the right business service, and return the result together with completion status.",
  // Productivity responses and slot prompts.
  timer_response:
    "I infer that this is a timer request. The proper handling flow is to normalize the requested duration, confirm the unit such as minutes or hours, create the timer, and then return the countdown setup with the exact duration that was captured.",
  ask_timer_duration:
    "I infer that you want to set a timer, but the duration is still missing. Please tell me the time span explicitly, for example 10 minutes or 2 hours.",
  alarm_response:
    "I infer that this is an alarm-setting request. The system should extract the target time and timezone, validate whether the time refers to today or a future date, create the alarm entry, and then confirm the final trigger time back to the user.",
  reminder_response:
    "I infer that this is a reminder request. The rule base should extract both the task description and the reminder time, normalize relative dates such as tomorrow morning, create the reminder, and confirm both what will happen and when it will trigger.",
  ask_reminder_details:
    "I infer that you want a reminder, but I still need the task and the time. Please tell me what should be reminded and when it should happen, for example: remind me to call John tomorrow morning.",
  ask_reminder_time:
    "I infer that this is a reminder request and I already have the task, but I still need the reminder time. Please tell me when the reminder should trigger.",
  calendar_response:
    "I infer that this belongs to calendar or date lookup. The system should normalize the requested date or time expression, determine whether the user wants scheduling or lookup behavior, and then return either the created calendar context or the interpreted date-time result.",
  todo_response:
    "I infer that this is a to-do list request. A suitable handling path is to identify whether the user wants to add, review, or organize tasks, capture the task labels and optional deadlines, and then return the updated task plan in a concise actionable format.",
  productivity_response:
    "I infer that this belongs to the time and planning category, such as timers, alarms, calendars, or reminders. The system should extract the duration or timestamp, normalize date and timezone information, create the appropriate scheduled item, and confirm what has been set.",
  // Travel responses and missing-destination prompts.
  flight_booking_response:
    "I infer that this is a flight-booking request. The rule path should identify origin, destination, dates, passenger count, and cabin or baggage constraints, then check availability, compare options, and return what information is still missing before a booking can be finalized.",
  ask_flight_destination:
    "I infer that you want to book a flight, but the destination is still missing. Please tell me where you want to fly so the booking workflow can continue.",
  hotel_booking_response:
    "I infer that this is a hotel-booking request. A suitable handling flow is to determine destination, check-in and check-out dates, guest count, room preferences, and budget range, then return the checklist needed to complete the booking search.",
  ask_hotel_destination:
    "I infer that you want to book a hotel, but I still need the destination or city. Please tell me where the stay should be booked.",
  travel_alert_response:
    "I infer that the user is asking about travel alerts or disruptions. The rule base should identify the route or airline, inspect delay, cancellation, or weather context, and then summarize the relevant alert plus the next action the traveler should confirm.",
  baggage_response:
    "I infer that this is specifically about carry-on or baggage policy. The correct handling sequence is to identify the airline or route, determine cabin-bag versus checked-bag context, review size and weight rules, and then return the policy summary plus any likely exceptions.",
  travel_response:
    "I infer that this is a travel-related request. The rule base groups the necessary steps as identifying destination and travel time, determining whether the need is flights, hotels, travel alerts, or baggage rules, and then producing the checklist of information still needed.",
  // Knowledge utility responses.
  translate_response:
    "I infer that this is a translation request. The correct flow is to determine the target language, inspect the text to be translated, preserve important entities such as names or numbers, and then return the translation together with any ambiguity note if the source phrase is unclear.",
  definition_response:
    "I infer that this is a definition lookup request. A suitable handling strategy is to identify the target word or phrase, retrieve the primary meaning, provide contextual meaning if relevant, and optionally add an example usage to reduce ambiguity.",
  weather_response:
    "I infer that this is a weather lookup request. The rule base should identify the target location and timeframe, decide whether the user wants current conditions or forecast detail, and then return temperature, precipitation or condition summary, and any uncertainty if the place or day is underspecified.",
  knowledge_generic_response:
    "I infer that this is a knowledge lookup or information transformation request. The system should first determine whether the goal is translation, definition lookup, or broader knowledge access, and only then choose the right data source and response format.",
  // Shopping responses.
  order_status_response:
    "I infer that this is an order-status request. The handling flow should identify the order or tracking reference, look up the most recent fulfillment checkpoint, detect whether the package is pending, shipped, delayed, or delivered, and then return the latest status with the next expected step.",
  ask_order_reference:
    "I infer that you want to check an order status, but I still need an order number or tracking reference. Please provide that identifier so the lookup path can continue.",
  shopping_list_response:
    "I infer that this is about building or reviewing a shopping list. The system should capture the requested items, organize them into a concise list, note any missing quantities or categories, and then return the normalized checklist back to the user.",
  shopping_response:
    "I infer that this is a shopping or order-tracking request. The handling flow should include identifying the order reference or item list, checking the current order state, retrieving the latest shipping checkpoint or remaining item list, and returning the result in a concise action-oriented format.",
  // Food and restaurant responses.
  restaurant_reviews_response:
    "I infer that the user wants restaurant-review style guidance. The rule base should identify cuisine or location preferences, collect any budget or quality hints, and then return a concise review-oriented recommendation path or summary.",
  restaurant_reservation_response:
    "I infer that this is a restaurant-reservation request. The correct handling flow is to identify location, time, party size, and cuisine preferences, then confirm availability requirements and return the reservation details that still need to be specified.",
  ask_restaurant_reservation_details:
    "I infer that you want a restaurant reservation, but I still need at least the time and party size before the reservation path becomes actionable. Please tell me when and for how many people.",
  nutrition_response:
    "I infer that this is a nutrition-information request. The system should identify the food item or meal, determine whether calories, protein, fat, or broader nutrition facts are needed, and then return the nutrition summary in the requested level of detail.",
  meal_suggestion_response:
    "I infer that this is a meal-suggestion request. The rule path should extract dietary preferences, cuisine goals, and health or convenience constraints, then return a shortlist of suitable meal directions or recommendation criteria.",
  food_response:
    "I infer that this is a restaurant, nutrition, or meal recommendation question. The system should extract preferences, location, dietary constraints, or the target dish, and then provide recommendations, review-style guidance, or nutrition-related information.",
  // Automotive responses.
  maintenance_schedule_response:
    "I infer that this is a maintenance-scheduling request. The system should identify the vehicle, the service type, and the relevant mileage or date checkpoint, then determine whether the next action is due now or later and return the recommended scheduling step.",
  oil_change_response:
    "I infer that this is an oil-change timing question. The proper handling flow is to inspect the vehicle type, the last service mileage or date, and the expected interval, then return whether an oil change is due now, soon, or still within range.",
  gas_type_response:
    "I infer that this is a fuel-type question. The rule base should identify the vehicle or engine requirement, determine whether the concern is regular, premium, diesel, or octane guidance, and then return the safest fuel recommendation with any caveat about manufacturer specifications.",
  automotive_response:
    "I infer that this is a vehicle maintenance query. A suitable handling flow is to identify the vehicle or maintenance topic, inspect the latest time or mileage checkpoint, and then return guidance such as oil-change timing, fuel type, or the next maintenance scheduling step.",
  // Fallback chung khi classifier va rule engine van chua du co so de tra loi cu the.
  fallback:
    "I detected the @botClinic trigger, but I do not yet have enough confidence to give a detailed answer. Please clarify your goal by adding more information such as the operation name, amount, account, time, or service type.",
};