import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import {
  emitNewMessage,
  updateConversationAfterCreateMessage,
} from "../utils/messageHelper.js";
import { io } from "../socket/index.js";
import { uploadMediaFromBuffer } from "../middlewares/uploadMiddleware.js";
import { buildBotReplyForGroupMessage } from "../ai/services/botService.js";
import { detectMessageModeration } from "../utils/moderationHelper.js";

const ALLOWED_REACTIONS = new Set(["👍", "❤️", "😂", "😮", "😢", "😡"]);

const normalizeReactions = (reactions = []) => {
  return reactions
    .map((reaction) => ({
      emoji: reaction.emoji,
      userIds: (reaction.userIds ?? []).map((userId) => userId.toString()),
    }))
    .filter((reaction) => reaction.userIds.length > 0);
};

const normalizeMessagePayload = ({ content, imgUrl, mediaType, fileName, fileSize }) => {
  const normalizedContent = content?.trim() ?? "";

  return {
    content: normalizedContent || null,
    imgUrl: imgUrl ?? null,
    mediaType: mediaType ?? null,
    fileName: fileName ?? null,
    fileSize: fileSize ?? null,
    hasContent: Boolean(normalizedContent),
    hasMedia: Boolean(imgUrl),
  };
};

const createAndEmitMessage = async ({
  conversation,
  senderId,
  content,
  imgUrl = null,
  mediaType = null,
  fileName = null,
  fileSize = null,
  messageType = "user",
  botMeta = null,
}) => {
  const moderation =
    messageType === "user"
      ? detectMessageModeration(content ?? "")
      : {
          status: "clean",
          isFlagged: false,
          matchedKeywords: [],
          reasonCodes: [],
          flaggedAt: null,
        };

  const message = await Message.create({
    conversationId: conversation._id,
    senderId,
    content,
    imgUrl,
    mediaType,
    fileName,
    fileSize,
    messageType,
    botMeta,
    moderation,
  });

  updateConversationAfterCreateMessage(conversation, message, senderId);
  await conversation.save();
  emitNewMessage(io, conversation, message);

  return message;
};

export const uploadChatMedia = async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "Bạn chưa chọn file." });
    }

    const uploadedMedia = await uploadMediaFromBuffer(file.buffer, {
      public_id: `${Date.now()}-${file.originalname.split(".")[0]}`,
    });

    return res.status(200).json({
      mediaUrl: uploadedMedia.secure_url,
      mediaType: file.mimetype,
      fileName: file.originalname,
      fileSize: file.size,
    });
  } catch (error) {
    console.error("Lỗi khi upload media tin nhắn", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const sendDirectMessage = async (req, res) => {
  try {
    const { recipientId, content, imgUrl, mediaType, fileName, fileSize, conversationId } = req.body;
    const senderId = req.user._id;
    const normalizedMessage = normalizeMessagePayload({
      content,
      imgUrl,
      mediaType,
      fileName,
      fileSize,
    });

    let conversation;

    if (!normalizedMessage.hasContent && !normalizedMessage.hasMedia) {
      return res.status(400).json({ message: "Thiếu nội dung hoặc file media" });
    }

    if (conversationId) {
      conversation = await Conversation.findById(conversationId);
    }

    if (!conversation) {
      conversation = await Conversation.create({
        type: "direct",
        participants: [
          { userId: senderId, joinedAt: new Date() },
          { userId: recipientId, joinedAt: new Date() },
        ],
        lastMessageAt: new Date(),
        unreadCounts: new Map(),
      });
    }

    const message = await createAndEmitMessage({
      conversation,
      senderId,
      content: normalizedMessage.content,
      imgUrl: normalizedMessage.imgUrl,
      mediaType: normalizedMessage.mediaType,
      fileName: normalizedMessage.fileName,
      fileSize: normalizedMessage.fileSize,
    });

    return res.status(201).json({ message });
  } catch (error) {
    console.error("Lỗi xảy ra khi gửi tin nhắn trực tiếp", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const sendGroupMessage = async (req, res) => {
  try {
    const { conversationId, content, imgUrl, mediaType, fileName, fileSize } = req.body;
    const senderId = req.user._id;
    const conversation = req.conversation;
    const normalizedMessage = normalizeMessagePayload({
      content,
      imgUrl,
      mediaType,
      fileName,
      fileSize,
    });

    if (!normalizedMessage.hasContent && !normalizedMessage.hasMedia) {
      return res.status(400).json({ message: "Thiếu nội dung hoặc file media" });
    }

    const message = await createAndEmitMessage({
      conversation,
      senderId,
      content: normalizedMessage.content,
      imgUrl: normalizedMessage.imgUrl,
      mediaType: normalizedMessage.mediaType,
      fileName: normalizedMessage.fileName,
      fileSize: normalizedMessage.fileSize,
    });

    const botReply = await buildBotReplyForGroupMessage({
      conversation,
      content: normalizedMessage.content ?? "",
      currentMessageId: message._id,
    });

    if (botReply) {
      await createAndEmitMessage({
        conversation,
        senderId: botReply.senderId,
        content: botReply.content,
        messageType: botReply.messageType,
        botMeta: botReply.botMeta,
      });
    }

    return res.status(201).json({ message });
  } catch (error) {
    console.error("Lỗi xảy ra khi gửi tin nhắn nhóm", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const toggleMessageReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const emoji = req.body?.emoji?.trim?.();
    const userId = req.user._id.toString();

    if (!emoji || !ALLOWED_REACTIONS.has(emoji)) {
      return res.status(400).json({ message: "Biểu cảm không hợp lệ" });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Không tìm thấy tin nhắn" });
    }

    const conversation = await Conversation.findById(message.conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện" });
    }

    const isParticipant = conversation.participants.some(
      (participant) => participant.userId.toString() === userId,
    );

    if (!isParticipant) {
      return res.status(403).json({ message: "Bạn không ở trong cuộc trò chuyện này" });
    }

    const existingReaction = (message.reactions ?? []).find((reaction) =>
      reaction.userIds.some((reactionUserId) => reactionUserId.toString() === userId),
    );
    const hadSameReaction = existingReaction?.emoji === emoji;

    message.reactions = (message.reactions ?? []).map((reaction) => ({
      emoji: reaction.emoji,
      userIds: reaction.userIds.filter((reactionUserId) => reactionUserId.toString() !== userId),
    }));

    const matchingReaction = message.reactions.find((reaction) => reaction.emoji === emoji);

    if (!hadSameReaction) {
      if (matchingReaction) {
        matchingReaction.userIds.push(req.user._id);
      } else {
        message.reactions.push({
          emoji,
          userIds: [req.user._id],
        });
      }
    }

    message.reactions = message.reactions.filter((reaction) => reaction.userIds.length > 0);

    await message.save();

    const normalizedReactions = normalizeReactions(message.reactions);

    io.to(conversation._id.toString()).emit("message-reaction-updated", {
      conversationId: conversation._id.toString(),
      messageId: message._id.toString(),
      reactions: normalizedReactions,
    });

    return res.status(200).json({
      messageId: message._id.toString(),
      conversationId: conversation._id.toString(),
      reactions: normalizedReactions,
    });
  } catch (error) {
    console.error("Lỗi khi thả cảm xúc cho tin nhắn", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};
