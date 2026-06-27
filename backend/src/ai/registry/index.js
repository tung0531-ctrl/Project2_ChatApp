// Registry la noi khoi tao mot lan va cap phat tat ca bot engine cho phan con lai cua he thong.
// Khi can them bot moi, day thuong la diem dau tien can dang ky definition moi.
import { loadBotDefinition } from "../loaders/botLoader.js";
import { createExpertBotEngine } from "../engines/expertBotEngine.js";
import {
  createBotClinicDefinition,
  createBotClinicV2Definition,
  createBotClinicV3Definition,
} from "../bots/botClinic/index.js";

// Khoi tao bot definitions tinh tu JSON hoac tu factory function.
const botGameDefinition = loadBotDefinition("botGame.json");
const botClinicDefinition = createBotClinicDefinition();
const botClinicV2Definition = createBotClinicV2Definition();
const botClinicV3Definition = createBotClinicV3Definition();

// Day la nguon definitions duy nhat ma he thong dung de tao cac bot runtime.
const botDefinitions = [
  botGameDefinition,
  botClinicDefinition,
  botClinicV2Definition,
  botClinicV3Definition,
];

// Moi definition duoc wrap bang ExpertBotEngine de co cung interface runtime.
const botRegistry = new Map(
  botDefinitions.map((definition) => [definition.botId, createExpertBotEngine(definition)]),
);

// Tra metadata gon cho UI/admin ma khong expose toan bo classifier internals.
export const getAvailableBotDefinitions = () => {
  return Array.from(botRegistry.values()).map((bot) => ({
    botId: bot.botId,
    displayName: bot.displayName,
    trigger: bot.trigger,
    description: bot.description,
  }));
};

// Lay mot bot engine theo botId khi message flow can goi bot cu the.
export const getBotEngineById = (botId) => {
  return botRegistry.get(botId) ?? null;
};

// Dung cho cac bai toan quet toan bo bot, vi du detect mention trong message.
export const getBotEngines = () => {
  return Array.from(botRegistry.values());
};