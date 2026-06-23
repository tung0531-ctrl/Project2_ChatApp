import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import {
  emitNewMessage,
  updateConversationAfterCreateMessage,
} from "../utils/messageHelper.js";
import { io } from "../socket/index.js";
import { uploadMediaFromBuffer } from "../middlewares/uploadMiddleware.js";
import { buildBotReplyForGroupMessage } from "../ai/services/botService.js";

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
