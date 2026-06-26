import {
  botClinicClassifierConfig,
  getBotClinicTrainingExamples,
} from "../bots/botClinic/definition.js";
import { getBotClinicModelCachePath } from "../bots/botClinic/modelCache.js";
import { normalizeSynonyms, normalizeText } from "../engines/expertBotEngine.js";
import { SupportVectorMachineClassifier } from "../engines/supportVectorMachine.js";

const synonymMap = botClinicClassifierConfig.synonymMap ?? {};
const normalizedExamples = getBotClinicTrainingExamples().map((example) => ({
  ...example,
  text: normalizeSynonyms(normalizeText(example.text), synonymMap),
}));

console.info(`[botClinic] Preparing ${normalizedExamples.length} normalized training examples...`);

const classifier = new SupportVectorMachineClassifier(normalizedExamples, {
  ...botClinicClassifierConfig,
});

const modelCachePath = getBotClinicModelCachePath();

classifier.saveToFile(modelCachePath, {
  botId: "botClinic",
  source: "local CLINC150 train split + botClinic English seed examples",
});

console.info(`[botClinic] Precomputed model is ready at ${modelCachePath}`);