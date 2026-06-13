import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { io } from "../socket/index.js";
import { createNotification } from "../utils/notificationHelper.js";

const formatParticipants = (participants = []) =>
  participants.map((p) => ({
    _id: p.userId?._id ?? p.userId,
    displayName: p.userId?.displayName,
    avatarUrl: p.userId?.avatarUrl ?? null,
    joinedAt: p.joinedAt,
  }));

const formatConversation = (conversation) => ({
  ...conversation.toObject(),
  group: conversation.group
    ? {
        ...conversation.group.toObject?.(),
        createdBy: conversation.group.createdBy?.toString?.() ?? conversation.group.createdBy,
      }
    : conversation.group,
  unreadCounts: conversation.unreadCounts || {},
  participants: formatParticipants(conversation.participants || []),
});

const isConversationParticipant = (conversation, userId) =>
  conversation.participants.some(
    (participant) =>
      participant.userId?._id?.toString() === userId ||
      participant.userId?.toString?.() === userId,
  );

const removeParticipantFromConversation = (conversation, userId) => {
  const participantIndex = conversation.participants.findIndex(
    (participant) =>
      participant.userId?._id?.toString() === userId ||
      participant.userId?.toString?.() === userId,
  );

  if (participantIndex === -1) {
    return false;
  }

  conversation.participants.splice(participantIndex, 1);
  conversation.unreadCounts.delete(userId);
  conversation.seenBy = conversation.seenBy.filter(
    (seenUser) => seenUser._id?.toString() !== userId && seenUser.toString?.() !== userId,
  );

  return true;
};

export const createConversation = async (req, res) => {
  try {
    const { type, name, memberIds } = req.body;
    const userId = req.user._id;

    if (
      !type ||
      (type === "group" && !name) ||
      !memberIds ||
      !Array.isArray(memberIds) ||
      memberIds.length === 0
    ) {
      return res
        .status(400)
        .json({ message: "Tên nhóm và danh sách thành viên là bắt buộc" });
    }

    let conversation;

    if (type === "direct") {
      const participantId = memberIds[0];

      conversation = await Conversation.findOne({
        type: "direct",
        "participants.userId": { $all: [userId, participantId] },
      });

      if (!conversation) {
        conversation = new Conversation({
          type: "direct",
          participants: [{ userId }, { userId: participantId }],
          lastMessageAt: new Date(),
        });

        await conversation.save();
      }
    }

    if (type === "group") {
      conversation = new Conversation({
        type: "group",
        participants: [{ userId }, ...memberIds.map((id) => ({ userId: id }))],
        group: {
          name,
          createdBy: userId,
        },
        lastMessageAt: new Date(),
      });

      await conversation.save();
    }

    if (!conversation) {
      return res.status(400).json({ message: "Conversation type không hợp lệ" });
    }

    await conversation.populate([
      { path: "participants.userId", select: "displayName avatarUrl" },
      {
        path: "seenBy",
        select: "displayName avatarUrl",
      },
      { path: "lastMessage.senderId", select: "displayName avatarUrl" },
    ]);

    const formatted = formatConversation(conversation);

    if (type === "group") {
      memberIds.forEach((userId) => {
        io.to(userId).emit("new-group", formatted);
      });

      await Promise.all(
        memberIds.map((memberId) =>
          createNotification({
            recipient: memberId,
            type: "group_joined",
            title: "Bạn đã được thêm vào nhóm chat",
            message: `Bạn đã được thêm vào nhóm chat ${formatted.group?.name ?? "mới"}.`,
            actor: {
              _id: req.user._id,
              username: req.user.username,
              displayName: req.user.displayName,
              avatarUrl: req.user.avatarUrl ?? null,
            },
            groupName: formatted.group?.name ?? "",
            conversationId: conversation._id,
          }),
        ),
      );
    }

    if (type === "direct") {
      io.to(userId).emit("new-group", formatted);
      io.to(memberIds[0]).emit("new-group", formatted);
    }

    return res.status(201).json({ conversation: formatted });
  } catch (error) {
    console.error("Lỗi khi tạo conversation", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const conversations = await Conversation.find({
      "participants.userId": userId,
    })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .populate({
        path: "participants.userId",
        select: "displayName avatarUrl",
      })
      .populate({
        path: "lastMessage.senderId",
        select: "displayName avatarUrl",
      })
      .populate({
        path: "seenBy",
        select: "displayName avatarUrl",
      });

    const formatted = conversations.map((convo) => {
      return formatConversation(convo);
    });

    return res.status(200).json({ conversations: formatted });
  } catch (error) {
    console.error("Lỗi xảy ra khi lấy conversations", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50, cursor } = req.query;

    const query = { conversationId };

    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    let messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit) + 1);

    let nextCursor = null;

    if (messages.length > Number(limit)) {
      const nextMessage = messages[messages.length - 1];
      nextCursor = nextMessage.createdAt.toISOString();
      messages.pop();
    }

    messages = messages.reverse();

    return res.status(200).json({
      messages,
      nextCursor,
    });
  } catch (error) {
    console.error("Lỗi xảy ra khi lấy messages", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const getUserConversationsForSocketIO = async (userId) => {
  try {
    const conversations = await Conversation.find(
      { "participants.userId": userId },
      { _id: 1 },
    );

    return conversations.map((c) => c._id.toString());
  } catch (error) {
    console.error("Lỗi khi fetch conversations: ", error);
    return [];
  }
};

export const searchJoinableGroups = async (req, res) => {
  try {
    const userId = req.user._id;
    const keyword = req.query?.name?.trim() ?? "";

    if (!keyword) {
      return res.status(200).json({ groups: [] });
    }

    const groups = await Conversation.find({
      type: "group",
      "group.name": { $regex: keyword, $options: "i" },
      participants: {
        $not: {
          $elemMatch: {
            userId,
          },
        },
      },
    })
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate({
        path: "participants.userId",
        select: "displayName avatarUrl",
      })
      .populate({
        path: "lastMessage.senderId",
        select: "displayName avatarUrl",
      })
      .populate({
        path: "seenBy",
        select: "displayName avatarUrl",
      });

    return res.status(200).json({
      groups: groups.map((group) => formatConversation(group)),
    });
  } catch (error) {
    console.error("Lỗi khi tìm nhóm chat", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const joinGroup = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId)
      .populate({
        path: "participants.userId",
        select: "displayName avatarUrl",
      })
      .populate({
        path: "lastMessage.senderId",
        select: "displayName avatarUrl",
      })
      .populate({
        path: "seenBy",
        select: "displayName avatarUrl",
      });

    if (!conversation) {
      return res.status(404).json({ message: "Không tìm thấy nhóm chat" });
    }

    if (conversation.type !== "group") {
      return res.status(400).json({ message: "Chỉ có thể tham gia nhóm chat" });
    }

    const alreadyJoined = conversation.participants.some(
      (participant) =>
        participant.userId?._id?.toString() === userId.toString() ||
        participant.userId?.toString?.() === userId.toString(),
    );

    if (alreadyJoined) {
      return res.status(409).json({ message: "Bạn đã ở trong nhóm chat này rồi" });
    }

    conversation.participants.push({
      userId,
      joinedAt: new Date(),
    });
    conversation.unreadCounts.set(userId.toString(), 0);

    await conversation.save();
    await conversation.populate([
      {
        path: "participants.userId",
        select: "displayName avatarUrl",
      },
      {
        path: "lastMessage.senderId",
        select: "displayName avatarUrl",
      },
      {
        path: "seenBy",
        select: "displayName avatarUrl",
      },
    ]);

    const formatted = formatConversation(conversation);

    io.to(userId.toString()).emit("new-group", formatted);
    io.to(conversationId).emit("conversation-updated", formatted);

    await createNotification({
      recipient: userId,
      type: "group_joined",
      title: "Tham gia nhóm chat thành công",
      message: `Bạn đã tham gia nhóm chat ${formatted.group?.name ?? ""}.`,
      actor: {
        _id: req.user._id,
        username: req.user.username,
        displayName: req.user.displayName,
        avatarUrl: req.user.avatarUrl ?? null,
      },
      groupName: formatted.group?.name ?? "",
      conversationId: conversation._id,
    });

    return res.status(200).json({ conversation: formatted });
  } catch (error) {
    console.error("Lỗi khi tham gia nhóm chat", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const leaveGroup = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id.toString();

    const conversation = await Conversation.findById(conversationId)
      .populate({
        path: "participants.userId",
        select: "displayName avatarUrl",
      })
      .populate({
        path: "lastMessage.senderId",
        select: "displayName avatarUrl",
      })
      .populate({
        path: "seenBy",
        select: "displayName avatarUrl",
      });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation không tồn tại" });
    }

    if (conversation.type !== "group") {
      return res.status(400).json({ message: "Chỉ có thể rời khỏi nhóm chat" });
    }

    const removed = removeParticipantFromConversation(conversation, userId);

    if (!removed) {
      return res.status(403).json({ message: "Bạn không ở trong nhóm này" });
    }

    await conversation.save();
    await conversation.populate([
      {
        path: "participants.userId",
        select: "displayName avatarUrl",
      },
      {
        path: "lastMessage.senderId",
        select: "displayName avatarUrl",
      },
      {
        path: "seenBy",
        select: "displayName avatarUrl",
      },
    ]);

    const formatted = formatConversation(conversation);

    io.to(conversationId).emit("conversation-updated", formatted);

    return res.status(200).json({ conversation: formatted });
  } catch (error) {
    console.error("Lỗi khi rời nhóm", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const kickGroupMember = async (req, res) => {
  try {
    const { conversationId, memberId } = req.params;
    const userId = req.user._id.toString();

    const conversation = await Conversation.findById(conversationId)
      .populate({
        path: "participants.userId",
        select: "displayName avatarUrl",
      })
      .populate({
        path: "lastMessage.senderId",
        select: "displayName avatarUrl",
      })
      .populate({
        path: "seenBy",
        select: "displayName avatarUrl",
      });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation không tồn tại" });
    }

    if (conversation.type !== "group") {
      return res.status(400).json({ message: "Chỉ có thể kick thành viên khỏi nhóm chat" });
    }

    if (!isConversationParticipant(conversation, userId)) {
      return res.status(403).json({ message: "Bạn không ở trong nhóm này" });
    }

    if (conversation.group?.createdBy?.toString() !== userId) {
      return res.status(403).json({ message: "Chỉ trưởng nhóm mới được kick thành viên" });
    }

    if (conversation.group?.createdBy?.toString() === memberId) {
      return res.status(400).json({ message: "Không thể kick trưởng nhóm" });
    }

    const removed = removeParticipantFromConversation(conversation, memberId);

    if (!removed) {
      return res.status(404).json({ message: "Thành viên không còn trong nhóm" });
    }

    await conversation.save();
    await conversation.populate([
      {
        path: "participants.userId",
        select: "displayName avatarUrl",
      },
      {
        path: "lastMessage.senderId",
        select: "displayName avatarUrl",
      },
      {
        path: "seenBy",
        select: "displayName avatarUrl",
      },
    ]);

    const formatted = formatConversation(conversation);

    io.to(conversationId).emit("conversation-updated", formatted);
    io.to(memberId).emit("conversation-updated", formatted);

    await createNotification({
      recipient: memberId,
      type: "group_kicked",
      title: "Bạn đã bị xóa khỏi nhóm chat",
      message: `Bạn đã bị xóa khỏi nhóm chat ${formatted.group?.name ?? ""}.`,
      actor: {
        _id: req.user._id,
        username: req.user.username,
        displayName: req.user.displayName,
        avatarUrl: req.user.avatarUrl ?? null,
      },
      groupName: formatted.group?.name ?? "",
      conversationId: conversation._id,
    });

    return res.status(200).json({ conversation: formatted });
  } catch (error) {
    console.error("Lỗi khi kick thành viên khỏi nhóm", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const updateGroupDescription = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id.toString();
    const description = req.body?.description?.trim() ?? "";

    const conversation = await Conversation.findById(conversationId)
      .populate({
        path: "participants.userId",
        select: "displayName avatarUrl",
      })
      .populate({
        path: "lastMessage.senderId",
        select: "displayName avatarUrl",
      })
      .populate({
        path: "seenBy",
        select: "displayName avatarUrl",
      });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation không tồn tại" });
    }

    if (conversation.type !== "group") {
      return res.status(400).json({ message: "Chỉ nhóm chat mới có mô tả" });
    }

    const isParticipant = isConversationParticipant(conversation, userId);

    if (!isParticipant) {
      return res.status(403).json({ message: "Bạn không ở trong nhóm này" });
    }

    if (conversation.group?.createdBy?.toString() !== userId) {
      return res.status(403).json({ message: "Chỉ trưởng nhóm mới được sửa mô tả" });
    }

    conversation.group.description = description;
    await conversation.save();

    const formatted = formatConversation(conversation);
    io.to(conversationId).emit("conversation-updated", formatted);

    return res.status(200).json({ conversation: formatted });
  } catch (error) {
    console.error("Lỗi khi cập nhật mô tả nhóm", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const markAsSeen = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id.toString();

    const conversation = await Conversation.findById(conversationId).lean();

    if (!conversation) {
      return res.status(404).json({ message: "Conversation không tồn tại" });
    }

    const last = conversation.lastMessage;

    if (!last) {
      return res.status(200).json({ message: "Không có tin nhắn để mark as seen" });
    }

    if (last.senderId.toString() === userId) {
      return res.status(200).json({ message: "Sender không cần mark as seen" });
    }

    const updated = await Conversation.findByIdAndUpdate(
      conversationId,
      {
        $addToSet: { seenBy: userId },
        $set: { [`unreadCounts.${userId}`]: 0 },
      },
      {
        new: true,
      },
    );

    await updated.populate({
      path: "seenBy",
      select: "displayName avatarUrl",
    });

    io.to(conversationId).emit("read-message", {
      conversation: {
        _id: updated?._id,
        lastMessageAt: updated?.lastMessageAt,
        unreadCounts: updated?.unreadCounts,
        seenBy: updated?.seenBy ?? [],
      },
    });

    return res.status(200).json({
      message: "Marked as seen",
      seenBy: updated?.seenBy || [],
      myUnreadCount: updated?.unreadCounts[userId] || 0,
    });
  } catch (error) {
    console.error("Lỗi khi mark as seen", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};
