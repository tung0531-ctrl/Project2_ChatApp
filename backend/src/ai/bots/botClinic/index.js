// Public entry point cua ho botClinic.
// File nay re-export cac helper can dung tu ben ngoai de code khac khong phai biet cau truc ben trong.
export {
  createClinicBotDefinition,
  getClinicClassifierConfig,
  getClinicTrainingExamples,
  getClinicVariant,
} from "./runtime/definitionFactory.js";
// Model cache helper cho script train va runtime boot.
export { getClinicModelCachePath, hasClinicModelCache } from "./runtime/modelCache.js";
// Dataset helper cho offline evaluation va training.
export {
  getAvailableLocalClincSplits,
  getLocalClincDatasetPath,
  readLocalClincExamples,
  readLocalClincExamplesBySplit,
} from "./data/datasetLoader.js";
// Re-export ba bien the clinic de registry dang ky de dang.
export { createBotClinicDefinition } from "./variants/botClinic.js";
export { createBotClinicV2Definition } from "./variants/botClinicV2.js";
export { createBotClinicV3Definition } from "./variants/botClinicV3.js";
