import fs from "fs";

import {
  getClinicClassifierConfig,
  getClinicModelCachePath,
  getClinicTrainingExamples,
  getClinicVariant,
} from "../bots/botClinic/index.js";
import { normalizeSynonyms, normalizeText } from "../engines/expertBotEngine.js";
import { LogisticRegressionClassifier } from "../engines/logisticRegression.js";
import { NaiveBayesClassifier } from "../engines/naiveBayes.js";
import { SupportVectorMachineClassifier } from "../engines/supportVectorMachine.js";

// Doc tham so CLI va chuan hoa bo examples truoc khi train/precompute model cache.
const variantId = process.argv[2] ?? "botClinic";
const cliFlags = process.argv.slice(3);
const variant = getClinicVariant(variantId);
const classifierOptions = getClinicClassifierConfig(variantId);
const synonymMap = classifierOptions.synonymMap ?? {};
const normalizedExamples = getClinicTrainingExamples().map((example) => ({
  ...example,
  text: normalizeSynonyms(normalizeText(example.text), synonymMap),
}));

// Cho phep override hyperparameter bang CLI flag khi can thuc nghiem nhanh.
const shouldResume = cliFlags.includes("--resume");
const numericOverrideEntries = cliFlags
  .filter((flag) => flag.startsWith("--") && flag.includes("="))
  .map((flag) => {
    const [rawKey, rawValue] = flag.slice(2).split("=");
    return [rawKey, Number(rawValue)];
  })
  .filter(([, value]) => !Number.isNaN(value));
const classifierOverrides = Object.fromEntries(numericOverrideEntries);
const mergedClassifierOptions = {
  ...classifierOptions,
  ...classifierOverrides,
};

const classifierByType = {
  svm: SupportVectorMachineClassifier,
  "naive-bayes": NaiveBayesClassifier,
  "logistic-regression": LogisticRegressionClassifier,
};

// Mapping classifier type -> implementation cu the de script nay dung duoc cho ca 3 variant.
const ClassifierImplementation = classifierByType[classifierOptions.type];

if (!ClassifierImplementation) {
  throw new Error(`UNSUPPORTED_CLINIC_CLASSIFIER:${classifierOptions.type}`);
}

console.info(`[${variant.botId}] Preparing ${normalizedExamples.length} normalized training examples...`);

const modelCachePath = getClinicModelCachePath(variant.modelCacheFile);
let classifier;

// Logistic regression co the resume tu checkpoint; cac model khac hien chi ho tro train moi.
if (shouldResume) {
  if (mergedClassifierOptions.type !== "logistic-regression") {
    throw new Error(`RESUME_NOT_SUPPORTED_FOR:${mergedClassifierOptions.type}`);
  }

  if (!fs.existsSync(modelCachePath)) {
    throw new Error(`MODEL_CACHE_NOT_FOUND:${modelCachePath}`);
  }

  const pretrainedState = JSON.parse(fs.readFileSync(modelCachePath, "utf8"));

  console.info(
    `[${variant.botId}] Resuming logistic regression from ${modelCachePath} with overrides ${JSON.stringify(classifierOverrides)}.`,
  );

  classifier = new LogisticRegressionClassifier(normalizedExamples, {
    ...mergedClassifierOptions,
    pretrainedState,
    resumeTraining: true,
  });
} else {
  classifier = new ClassifierImplementation(normalizedExamples, mergedClassifierOptions);
}

// Luu pretrained snapshot de runtime khoi dong nhanh va khong can train lai luc boot.
classifier.saveToFile(modelCachePath, {
  botId: variant.botId,
  classifierType: mergedClassifierOptions.type,
  source: "local CLINC150 train split + botClinic English seed examples",
  resumedFromCheckpoint: shouldResume,
});

console.info(`[${variant.botId}] Precomputed model is ready at ${modelCachePath}`);