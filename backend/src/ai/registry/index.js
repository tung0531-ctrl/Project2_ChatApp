// Dang ky botGame va cac bien the clinic de ChatApp co the goi song song nhieu bot.
import { loadBotDefinition } from "../loaders/botLoader.js";
import { createExpertBotEngine } from "../engines/expertBotEngine.js";
import { createBotClinicDefinition } from "../bots/botClinic/definition.js";
import { createBotClinicV2Definition } from "../bots/botClinic/definitionV2.js";
import { createBotClinicV3Definition } from "../bots/botClinic/definitionV3.js";

const botGameDefinition = loadBotDefinition("botGame.json");
const botClinicDefinition = createBotClinicDefinition();
const botClinicV2Definition = createBotClinicV2Definition();
const botClinicV3Definition = createBotClinicV3Definition();

const botDefinitions = [
  botGameDefinition,
  botClinicDefinition,
  botClinicV2Definition,
  botClinicV3Definition,
];

const botRegistry = new Map(
  botDefinitions.map((definition) => [definition.botId, createExpertBotEngine(definition)]),
);

export const getAvailableBotDefinitions = () => {
  return Array.from(botRegistry.values()).map((bot) => ({
    botId: bot.botId,
    displayName: bot.displayName,
    trigger: bot.trigger,
    description: bot.description,
  }));
};

export const getBotEngineById = (botId) => {
  return botRegistry.get(botId) ?? null;
};

export const getBotEngines = () => {
  return Array.from(botRegistry.values());
};