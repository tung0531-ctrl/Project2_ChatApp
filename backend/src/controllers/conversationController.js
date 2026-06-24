// Dieu phoi nghiep vu conversation, group membership, seen state, pin message va cau hinh bot theo nhom.
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { io } from "../socket/index.js";
import { createNotification } from "../utils/notificationHelper.js";
import { getAvailableBotDefinitions } from "../ai/registry/index.js";

const conversationPopulate = [
  {
    path: "participants.userId",
    select: "username displayName avatarUrl",
  },
  {
    path: "group.pendingJoinRequests.userId",
    select: "username displayName avatarUrl",
  },
  {
    path: "lastMessage.senderId",
    select: "displayName avatarUrl",
  },
  {
    path: "seenBy",
    select: "displayName avatarUrl",
  },
];

const formatParticipants = (participants = []) =>
  participants.map((p) => ({
    _id: p.userId?._id ?? p.userId,
    username: p.userId?.username,
    displayName: p.userId?.displayName,
    avatarUrl: p.userId?.avatarUrl ?? null,
    joinedAt: p.joinedAt,
  }));

const formatMessageReference = (reference) => {
  if (!reference) {
    return null;
  }

  return {
    ...reference.toObject?.(),
    messageId: reference.messageId?.toString?.() ?? reference.messageId ?? null,
    senderId: reference.senderId?.toString?.() ?? reference.senderId ?? null,
  };
};

const formatPendingJoinRequests = (pendingJoinRequests = []) =>
  pendingJoinRequests.map((request) => ({
    userId: request.userId?._id ?? request.userId,
    username: request.userId?.username,
    displayName: request.userId?.displayName,
    avatarUrl: request.userId?.avatarUrl ?? null,
    createdAt: request.createdAt,
  }));

const formatConversation = (conversation) => ({
  ...conversation.toObject(),
  group: conversation.group
    ? {
        ...conversation.group.toObject?.(),
        createdBy: conversation.group.createdBy?.toString?.() ?? conversation.group.createdBy,
        pendingJoinRequests: formatPendingJoinRequests(
          conversation.group.pendingJoinRequests || []
        ),
      }
    : conversation.group,
  unreadCounts: conversation.unreadCounts || {},
  pinnedMessage: formatMessageReference(conversation.pinnedMessage),
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

const hasPendingJoinRequest = (conversation, userId) =>
  conversation.group?.pendingJoinRequests?.some(
    (request) =>
      request.userId?._id?.toString() === userId || request.userId?.toString?.() === userId,
  );

const addParticipantToConversation = (conversation, userId) => {
  if (isConversationParticipant(conversation, userId.toString())) {
    return false;
  }

  conversation.participants.push({
    userId,
    joinedAt: new Date(),
  });
  conversation.unreadCounts.set(userId.toString(), 0);

  return true;
};

const notifyGroupJoined = async ({ recipient, actor, groupName, conversationId, title, message }) =>
  createNotification({
    recipient,
    type: "group_joined",
    title,
    message,
    actor,
    groupName,
    conversationId,
  });

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

    await conversation.populate(conversationPopulate);

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
      .populate(conversationPopulate);

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
      "group.pendingJoinRequests": {
        $not: {
          $elemMatch: {
            userId,
          },
        },
      },
    })
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate(conversationPopulate);

    return res.status(200).json({
      groups: groups.map((group) => formatConversation(group)),
    });
  } catch (error) {
    console.error("Lỗi khi tìm nhóm chat", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const getAvailableBots = async (_req, res) => {
  try {
    return res.status(200).json({ bots: getAvailableBotDefinitions() });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách bot khả dụng", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const joinGroup = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId).populate(conversationPopulate);

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

    if (conversation.group?.joinApprovalEnabled) {
      if (hasPendingJoinRequest(conversation, userId.toString())) {
        return res.status(409).json({ message: "Bạn đã gửi yêu cầu tham gia nhóm này rồi" });
      }

      conversation.group.pendingJoinRequests.push({
        userId,
        createdAt: new Date(),
      });

      await conversation.save();
      await conversation.populate(conversationPopulate);

      const formattedPendingConversation = formatConversation(conversation);
      io.to(conversationId).emit("conversation-updated", formattedPendingConversation);

      return res.status(202).json({
        status: "requested",
        message: "Yêu cầu tham gia nhóm đã được gửi tới trưởng nhóm.",
      });
    }

    addParticipantToConversation(conversation, userId);

    await conversation.save();
    await conversation.populate(conversationPopulate);

    const formatted = formatConversation(conversation);

    io.to(userId.toString()).emit("new-group", formatted);
    io.to(conversationId).emit("conversation-updated", formatted);

    await notifyGroupJoined({
      recipient: userId,
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

    return res.status(200).json({ status: "joined", conversation: formatted });
  } catch (error) {
    console.error("Lỗi khi tham gia nhóm chat", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const leaveGroup = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id.toString();

    const conversation = await Conversation.findById(conversationId).populate(conversationPopulate);

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
    await conversation.populate(conversationPopulate);

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

    const conversation = await Conversation.findById(conversationId).populate(conversationPopulate);

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
    await conversation.populate(conversationPopulate);

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

    const conversation = await Conversation.findById(conversationId).populate(conversationPopulate);

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

export const updateGroupBots = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id.toString();
    const requestedBotIds = Array.isArray(req.body?.botIds) ? req.body.botIds : [];

    const conversation = await Conversation.findById(conversationId).populate(conversationPopulate);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation không tồn tại" });
    }

    if (conversation.type !== "group") {
      return res.status(400).json({ message: "Chỉ nhóm chat mới có thể quản lý bot" });
    }

    if (!isConversationParticipant(conversation, userId)) {
      return res.status(403).json({ message: "Bạn không ở trong nhóm này" });
    }

    if (conversation.group?.createdBy?.toString() !== userId) {
      return res.status(403).json({ message: "Chỉ trưởng nhóm mới được cập nhật bot" });
    }

    const availableBotIds = new Set(getAvailableBotDefinitions().map((bot) => bot.botId));
    const sanitizedBotIds = [...new Set(requestedBotIds)]
      .filter((botId) => typeof botId === "string")
      .filter((botId) => availableBotIds.has(botId));

    conversation.group.bots = sanitizedBotIds.map((botId) => ({
      botId,
      enabled: true,
    }));

    await conversation.save();

    const formatted = formatConversation(conversation);
    io.to(conversationId).emit("conversation-updated", formatted);

    return res.status(200).json({ conversation: formatted });
  } catch (error) {
    console.error("Lỗi khi cập nhật bot nhóm", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const updateGroupJoinApproval = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id.toString();
    const enabled = Boolean(req.body?.enabled);

    const conversation = await Conversation.findById(conversationId).populate(conversationPopulate);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation không tồn tại" });
    }

    if (conversation.type !== "group") {
      return res.status(400).json({ message: "Chỉ nhóm chat mới có cài đặt kiểm duyệt tham gia" });
    }

    if (!isConversationParticipant(conversation, userId)) {
      return res.status(403).json({ message: "Bạn không ở trong nhóm này" });
    }

    if (conversation.group?.createdBy?.toString() !== userId) {
      return res.status(403).json({ message: "Chỉ trưởng nhóm mới được cập nhật cài đặt kiểm duyệt" });
    }

    conversation.group.joinApprovalEnabled = enabled;

    const autoApprovedUserIds = [];

    if (!enabled) {
      const pendingRequests = conversation.group?.pendingJoinRequests ?? [];

      pendingRequests.forEach((request) => {
        const requestUserId = request.userId?._id ?? request.userId;

        if (requestUserId && addParticipantToConversation(conversation, requestUserId)) {
          autoApprovedUserIds.push(requestUserId.toString());
        }
      });

      conversation.group.pendingJoinRequests = [];
    }

    await conversation.save();
    await conversation.populate(conversationPopulate);

    const formatted = formatConversation(conversation);

    io.to(conversationId).emit("conversation-updated", formatted);

    await Promise.all(
      autoApprovedUserIds.map(async (approvedUserId) => {
        io.to(approvedUserId).emit("new-group", formatted);

        await notifyGroupJoined({
          recipient: approvedUserId,
          title: "Yêu cầu tham gia nhóm đã được chấp nhận",
          message: `Bạn đã được thêm vào nhóm chat ${formatted.group?.name ?? ""}.`,
          actor: {
            _id: req.user._id,
            username: req.user.username,
            displayName: req.user.displayName,
            avatarUrl: req.user.avatarUrl ?? null,
          },
          groupName: formatted.group?.name ?? "",
          conversationId: conversation._id,
        });
      })
    );

    return res.status(200).json({ conversation: formatted });
  } catch (error) {
    console.error("Lỗi khi cập nhật cài đặt kiểm duyệt tham gia nhóm", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const handleGroupJoinRequest = async (req, res) => {
  try {
    const { conversationId, requestUserId } = req.params;
    const userId = req.user._id.toString();
    const action = req.body?.action;

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: "Hành động xử lý yêu cầu tham gia không hợp lệ" });
    }

    const conversation = await Conversation.findById(conversationId).populate(conversationPopulate);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation không tồn tại" });
    }

    if (conversation.type !== "group") {
      return res.status(400).json({ message: "Chỉ nhóm chat mới có yêu cầu tham gia" });
    }

    if (!isConversationParticipant(conversation, userId)) {
      return res.status(403).json({ message: "Bạn không ở trong nhóm này" });
    }

    if (conversation.group?.createdBy?.toString() !== userId) {
      return res.status(403).json({ message: "Chỉ trưởng nhóm mới được xử lý yêu cầu tham gia" });
    }

    const pendingRequestIndex = (conversation.group?.pendingJoinRequests ?? []).findIndex(
      (request) => (request.userId?._id ?? request.userId)?.toString() === requestUserId
    );

    if (pendingRequestIndex === -1) {
      return res.status(404).json({ message: "Không tìm thấy yêu cầu tham gia nhóm" });
    }

    conversation.group.pendingJoinRequests.splice(pendingRequestIndex, 1);

    if (action === "approve") {
      addParticipantToConversation(conversation, requestUserId);
    }

    await conversation.save();
    await conversation.populate(conversationPopulate);

    const formatted = formatConversation(conversation);

    io.to(conversationId).emit("conversation-updated", formatted);

    if (action === "approve") {
      io.to(requestUserId).emit("new-group", formatted);

      await notifyGroupJoined({
        recipient: requestUserId,
        title: "Yêu cầu tham gia nhóm đã được chấp nhận",
        message: `Bạn đã được thêm vào nhóm chat ${formatted.group?.name ?? ""}.`,
        actor: {
          _id: req.user._id,
          username: req.user.username,
          displayName: req.user.displayName,
          avatarUrl: req.user.avatarUrl ?? null,
        },
        groupName: formatted.group?.name ?? "",
        conversationId: conversation._id,
      });
    }

    return res.status(200).json({
      conversation: formatted,
      status: action,
    });
  } catch (error) {
    console.error("Lỗi khi xử lý yêu cầu tham gia nhóm", error);
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
