import { clinicBotVariants, clinicSharedClassifierOptions } from "../config/clinicConfig.js";
import { readLocalClincExamples } from "../data/datasetLoader.js";
import { botClinicSeedExamples } from "../data/seedExamples.js";
import { buildBotClinicRules } from "../rules.js";
import { botClinicResponses } from "../responses.js";
import { extractClinicFacts, transformClinicRunPrediction } from "./inference.js";
import { getClinicModelCachePath, hasClinicModelCache } from "./modelCache.js";

// Ghep CLINC local data va seed examples bo sung thanh bo train day du.
export const getClinicTrainingExamples = () => {
  return [...readLocalClincExamples(), ...botClinicSeedExamples];
};

// Lay metadata cua mot variant va fail som neu botId khong hop le.
export const getClinicVariant = (variantId = "botClinic") => {
  const variant = clinicBotVariants[variantId];

  if (!variant) {
    throw new Error(`UNKNOWN_CLINIC_BOT_VARIANT:${variantId}`);
  }

  return variant;
};

// Merge cau hinh dung chung voi hyperparameter rieng cua tung variant classifier.
export const getClinicClassifierConfig = (variantId = "botClinic") => {
  const variant = getClinicVariant(variantId);

  return {
    ...clinicSharedClassifierOptions,
    ...variant.classifier,
    synonymMap: {
      ...clinicSharedClassifierOptions.synonymMap,
      ...(variant.classifier.synonymMap ?? {}),
    },
    vectorizerOptions: {
      ...clinicSharedClassifierOptions.vectorizerOptions,
      ...(variant.classifier.vectorizerOptions ?? {}),
    },
  };
};

// Lap bot definition day du ma registry co the dua vao ExpertBotEngine.
export const createClinicBotDefinition = (variantId = "botClinic") => {
  const variant = getClinicVariant(variantId);
  const hasPretrainedModel = hasClinicModelCache(variant.modelCacheFile);

  return {
    botId: variant.botId,
    displayName: variant.displayName,
    trigger: variant.trigger,
    description: variant.description,
    confidenceThreshold: 0.1,
    // Pretrained path duoc chen vao classifier config neu da train san model cache.
    classifier: {
      ...getClinicClassifierConfig(variantId),
      pretrainedModelPath: hasPretrainedModel
        ? getClinicModelCachePath(variant.modelCacheFile)
        : null,
    },
    systemUser: variant.systemUser,
    // Neu da co pretrained model thi runtime khong can kem examples de train luc boot.
    examples: hasPretrainedModel ? [] : getClinicTrainingExamples(),
    entities: {},
    // Hai hook duoi day cho phep clinic runtime chen logic hau-phan-loai vao ExpertBotEngine.
    transformRunPrediction: transformClinicRunPrediction,
    extractFacts: extractClinicFacts,
    rules: buildBotClinicRules(),
    responses: botClinicResponses,
  };
};
