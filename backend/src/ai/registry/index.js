import { loadBotDefinition } from "../loaders/botLoader.js";
import { createExpertBotEngine } from "../engines/expertBotEngine.js";

const botGameDefinition = loadBotDefinition("botGame.json");

const botDefinitions = [botGameDefinition];

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