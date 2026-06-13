import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import {
  emitNewMessage,
  updateConversationAfterCreateMessage,
} from "../utils/messageHelper.js";
import { io } from "../socket/index.js";
import { uploadMediaFromBuffer } from "../middlewares/uploadMiddleware.js";

const isSupportedMediaType = (mimeType = "") =>
  mimeType.startsWith("image/") || mimeType.startsWith("video/");

const normalizeMessagePayload = ({ content, imgUrl, mediaType }) => {
  const normalizedContent = content?.trim() ?? "";

  return {
    content: normalizedContent || null,
    imgUrl: imgUrl ?? null,
    mediaType: mediaType ?? null,
    hasContent: Boolean(normalizedContent),
    hasMedia: Boolean(imgUrl),
  };
};

export const uploadChatMedia = async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "Bạn chưa chọn file." });
    }

    if (!isSupportedMediaType(file.mimetype)) {
      return res.status(400).json({ message: "Chỉ hỗ trợ ảnh, GIF hoặc video." });
    }

    const uploadedMedia = await uploadMediaFromBuffer(file.buffer, {
      public_id: `${Date.now()}-${file.originalname.split(".")[0]}`,
    });

    return res.status(200).json({
      mediaUrl: uploadedMedia.secure_url,
      mediaType: file.mimetype,
    });
  } catch (error) {
    console.error("Lỗi khi upload media tin nhắn", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const sendDirectMessage = async (req, res) => {
  try {
    const { recipientId, content, imgUrl, mediaType, conversationId } = req.body;
    const senderId = req.user._id;
    const normalizedMessage = normalizeMessagePayload({ content, imgUrl, mediaType });

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

    const message = await Message.create({
      conversationId: conversation._id,
      senderId,
      content: normalizedMessage.content,
      imgUrl: normalizedMessage.imgUrl,
      mediaType: normalizedMessage.mediaType,
    });

    updateConversationAfterCreateMessage(conversation, message, senderId);

    await conversation.save();

    emitNewMessage(io, conversation, message);

    return res.status(201).json({ message });
  } catch (error) {
    console.error("Lỗi xảy ra khi gửi tin nhắn trực tiếp", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const sendGroupMessage = async (req, res) => {
  try {
    const { conversationId, content, imgUrl, mediaType } = req.body;
    const senderId = req.user._id;
    const conversation = req.conversation;
    const normalizedMessage = normalizeMessagePayload({ content, imgUrl, mediaType });

    if (!normalizedMessage.hasContent && !normalizedMessage.hasMedia) {
      return res.status(400).json({ message: "Thiếu nội dung hoặc file media" });
    }

    const message = await Message.create({
      conversationId,
      senderId,
      content: normalizedMessage.content,
      imgUrl: normalizedMessage.imgUrl,
      mediaType: normalizedMessage.mediaType,
    });

    updateConversationAfterCreateMessage(conversation, message, senderId);

    await conversation.save();
    emitNewMessage(io, conversation, message);

    return res.status(201).json({ message });
  } catch (error) {
    console.error("Lỗi xảy ra khi gửi tin nhắn nhóm", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};
