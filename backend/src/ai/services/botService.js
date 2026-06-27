// Day la lop ket noi giua message flow cua ChatApp va AI engine.
// File nay phat hien bot duoc mention, kiem tra bot co bat trong group hay khong,
// lay them ngu canh gan day neu can, va tao payload message de bot tra loi trong conversation.
import bcrypt from "bcrypt";
import User from "../../models/User.js";
import Message from "../../models/Message.js";
import { getBotEngineById, getBotEngines } from "../registry/index.js";

// Cache user he thong cua tung bot de tranh hash/query lai nhieu lan.
const botUserCache = new Map();

// Tim tat ca mention trigger hop le trong noi dung message.
const detectTriggeredBots = (content = "") => {
  const lowered = content.toLowerCase();

  return getBotEngines().filter((bot) => {
    const escapedTrigger = bot.trigger.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(^|\\s)${escapedTrigger}(?=\\s|$|[?!.,:;])`, "i");
    return regex.test(lowered);
  });
};

// Chi nhung bot duoc bat trong group moi duoc phep phan hoi.
const isBotEnabledForConversation = (conversation, botId) => {
  return Boolean(
    conversation.group?.bots?.some((botConfig) => botConfig.botId === botId && botConfig.enabled),
  );
};

// Tao hoac tai lai system user cua bot de message bot duoc luu nhu message thong thuong.
const resolveBotUser = async (bot) => {
  if (botUserCache.has(bot.botId)) {
    return botUserCache.get(bot.botId);
  }

  const hashedPassword = await bcrypt.hash(`${bot.botId}-system-only`, 10);

  const user = await User.findOneAndUpdate(
    { username: bot.systemUser.username },
    {
      $setOnInsert: {
        username: bot.systemUser.username,
        email: bot.systemUser.email,
        hashedPassword,
      },
      $set: {
        displayName: bot.systemUser.displayName,
        avatarUrl: bot.systemUser.avatarUrl,
        accountType: "system_bot",
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );

  botUserCache.set(bot.botId, user);
  return user;
};

// Lay toi da 4 message user gan nhat lam context phu neu inference goc chua du ro.
const buildContextualPrompt = async ({ conversationId, currentMessageId, currentContent }) => {
  const recentMessages = await Message.find(
    {
      conversationId,
      _id: { $ne: currentMessageId },
      messageType: "user",
      content: { $exists: true, $nin: [null, ""] },
    },
    { content: 1 },
  )
    .sort({ createdAt: -1 })
    .limit(4)
    .lean();

  if (!recentMessages.length) {
    return currentContent;
  }

  const orderedContext = [...recentMessages]
    .reverse()
    .map((message) => message.content?.trim())
    .filter(Boolean);

  return [...orderedContext, currentContent].join("\n");
};

// Thu suy dien voi message goc truoc, sau do moi fallback sang prompt co context neu can.
const inferBotReplyContent = async ({ bot, conversation, content, currentMessageId }) => {
  const primaryInference = bot.run(content);

  if (!primaryInference.needsContext) {
    return primaryInference;
  }

  const contextualPrompt = await buildContextualPrompt({
    conversationId: conversation._id,
    currentMessageId,
    currentContent: content,
  });

  if (contextualPrompt === content) {
    return primaryInference;
  }

  const contextualInference = bot.run(contextualPrompt);

  if (!contextualInference.usedFallback || !contextualInference.needsContext) {
    return contextualInference;
  }

  return primaryInference;
};

export const buildBotReplyForGroupMessage = async ({
  conversation,
  content,
  currentMessageId,
}) => {
  // Bot chi tra loi trong group va chi khi co duy nhat mot mention trigger hop le.
  if (conversation.type !== "group") {
    return null;
  }

  const triggeredBots = detectTriggeredBots(content);

  if (triggeredBots.length !== 1) {
    return null;
  }

  const bot = triggeredBots[0];

  if (!isBotEnabledForConversation(conversation, bot.botId)) {
    return null;
  }

  const inference = await inferBotReplyContent({
    bot,
    conversation,
    content,
    currentMessageId,
  });

  if (!inference.content) {
    return null;
  }

  const botUser = await resolveBotUser(bot);

  // Payload nay se duoc tang message layer luu thanh messageType `bot` trong conversation.
  return {
    senderId: botUser._id,
    content: inference.content,
    messageType: "bot",
    botMeta: {
      botId: bot.botId,
      displayName: bot.displayName,
      trigger: bot.trigger,
      avatarUrl: bot.systemUser.avatarUrl,
    },
  };
};