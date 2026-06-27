// Runtime helper cho botClinic sau khi classifier du doan xong.
// File nay lam 2 viec: map near-intent ve intent duoc ho tro va rut trich slot/fact phuc vu rule engine.
// No la cau noi giua output thong ke cua classifier va workflow IF-THEN trong rules.js.
// Bang alias dua cac intent CLINC gan nghia ve intent canonical ma rule base co ho tro.
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

// Helper nho de viet rescue rule gon hon.
const hasPhrase = (text, phrase) => text.includes(phrase);

// Helper regex dung chung cho cac ham rut trich slot ben duoi.
const extractFirstMatch = (text, regex) => {
  const match = text.match(regex);
  return match?.[1] ?? match?.[0] ?? null;
};

// Stopword cho target account/destination de tranh lay nham nhung tu qua chung.
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

// Rut trich doi tuong nhan tien trong workflow transfer.
const extractTransferTarget = (normalizedText) => {
  const match = normalizedText.match(/\bto\s+([a-z]+(?:\s+[a-z]+){0,2})\b/);

  if (!match?.[1]) {
    return null;
  }

  const candidate = match[1].trim();

  return transferTargetStopwords.has(candidate) ? null : candidate;
};

// Rut trich destination cho travel va mot so workflow can dia diem.
const extractDestination = (normalizedText) => {
  const match = normalizedText.match(/\b(?:to|in)\s+([a-z]+(?:\s+[a-z]+){0,2})\b/);

  if (!match?.[1]) {
    return null;
  }

  const candidate = match[1].trim();

  return transferTargetStopwords.has(candidate) ? null : candidate;
};

// Rut trich thong tin thoi gian tu cac mau pho bien nhu 10 minutes, at 8am, tomorrow.
const extractScheduleTime = (normalizedText) => {
  return (
    extractFirstMatch(normalizedText, /\b(\d+(?:\.\d+)?\s*(?:minutes?|hours?|days?))\b/) ||
    extractFirstMatch(normalizedText, /\b(at\s+\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?)\b/) ||
    extractFirstMatch(normalizedText, /\b(today|tomorrow|tonight|morning|evening|afternoon)\b/)
  );
};

// Rut trich noi dung task cua reminder neu nguoi dung da noi ro can nhac viec gi.
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

// Rut trich ma don hang/tracking tu cau hoi shopping.
const extractOrderReference = (normalizedText) => {
  return extractFirstMatch(normalizedText, /\b(?:order|tracking)\s+(?:number\s+)?#?([a-z0-9-]{4,})\b/);
};

// Rut trich so luong nguoi cho reservation.
const extractPartySize = (normalizedText) => {
  return extractFirstMatch(normalizedText, /\bfor\s+(\d+)\s+(?:people|persons|guests)\b/);
};

// Rut trich amount phuc vu transfer/bill/order_checks.
const extractAmount = (normalizedText) => {
  return extractFirstMatch(
    normalizedText,
    /\b(\d+(?:\.\d+)?)\s*(?:dollars?|usd|bucks?|eur|euros?)?\b/,
  );
};

// Rut trich ngon ngu dich muc tieu trong workflow translate.
const extractTargetLanguage = (normalizedText) => {
  return extractFirstMatch(
    normalizedText,
    /\b(?:into|to)\s+(english|spanish|french|german|italian|russian|chinese|japanese|korean|vietnamese)\b/,
  );
};

// Chinh intent/confidence de cuu cac case classifier gan dung domain nhung score chua dat.
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

// Bien output classifier + text normalized thanh slot facts co cau truc cho rule engine.
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
