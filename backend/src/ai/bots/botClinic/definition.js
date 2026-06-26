// Ghep du lieu, response va rule base thanh bot definition cho registry cua ChatApp.
import { readLocalClincExamples } from "./datasetLoader.js";
import { buildBotClinicRules } from "./rules.js";
import { botClinicResponses } from "./responses.js";
import { botClinicSeedExamples } from "./seedExamples.js";

export const createBotClinicDefinition = () => ({
  botId: "botClinic",
  displayName: "Bot Clinic",
  trigger: "@botClinic",
  description:
    "A hybrid bot that uses TF-IDF for vectorization, Support Vector Machine for intent classification on the local CLINC150 dataset, and IF-THEN forward chaining for detailed response inference.",
  confidenceThreshold: 0.1,
  classifier: {
    type: "svm",
    alpha: 0.8,
    learningRate: 0.08,
    decay: 0.01,
    regularization: 0.0005,
    epochs: 8,
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
      stopwords: ["botclinic", "clinic", "bot", "hybrid", "chatbot", "please"],
    },
  },
  systemUser: {
    username: "botclinic_system",
    email: "botclinic.system@chatapp.local",
    displayName: "Bot Clinic",
    avatarUrl: null,
  },
  examples: [...readLocalClincExamples(), ...botClinicSeedExamples],
  entities: {},
  rules: buildBotClinicRules(),
  responses: botClinicResponses,
});