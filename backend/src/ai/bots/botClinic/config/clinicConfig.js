// Cau hinh tinh dung chung cho toan bo ho botClinic.
// File nay chi luu metadata va hyperparameter, khong chua runtime logic.
// Nhom cau hinh co so duoc merge vao moi bien the classifier khi tao bot definition.
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

// Registry bien the: moi bot co trigger, mo ta, model cache va hyperparameter rieng.
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
