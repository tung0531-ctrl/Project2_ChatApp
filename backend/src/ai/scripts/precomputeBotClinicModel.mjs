import {
  getClinicClassifierConfig,
  getClinicTrainingExamples,
  getClinicVariant,
} from "../bots/botClinic/shared.js";
import { getClinicModelCachePath } from "../bots/botClinic/modelCache.js";
import { normalizeSynonyms, normalizeText } from "../engines/expertBotEngine.js";
import { LogisticRegressionClassifier } from "../engines/logisticRegression.js";
import { NaiveBayesClassifier } from "../engines/naiveBayes.js";
import { SupportVectorMachineClassifier } from "../engines/supportVectorMachine.js";

const variantId = process.argv[2] ?? "botClinic";
const variant = getClinicVariant(variantId);
const classifierOptions = getClinicClassifierConfig(variantId);
const synonymMap = classifierOptions.synonymMap ?? {};
const normalizedExamples = getClinicTrainingExamples().map((example) => ({
  ...example,
  text: normalizeSynonyms(normalizeText(example.text), synonymMap),
}));

const classifierByType = {
  svm: SupportVectorMachineClassifier,
  "naive-bayes": NaiveBayesClassifier,
  "logistic-regression": LogisticRegressionClassifier,
};

const ClassifierImplementation = classifierByType[classifierOptions.type];

if (!ClassifierImplementation) {
  throw new Error(`UNSUPPORTED_CLINIC_CLASSIFIER:${classifierOptions.type}`);
}

console.info(`[${variant.botId}] Preparing ${normalizedExamples.length} normalized training examples...`);

const classifier = new ClassifierImplementation(normalizedExamples, classifierOptions);

const modelCachePath = getClinicModelCachePath(variant.modelCacheFile);

classifier.saveToFile(modelCachePath, {
  botId: variant.botId,
  classifierType: classifierOptions.type,
  source: "local CLINC150 train split + botClinic English seed examples",
});

console.info(`[${variant.botId}] Precomputed model is ready at ${modelCachePath}`);