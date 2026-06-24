// Tao thong bao theo mot diem dung chung va emit realtime den dung nguoi nhan.
import Notification from "../models/Notification.js";
import { io } from "../socket/index.js";

export const createNotification = async ({
  recipient,
  type,
  title,
  message,
  actor,
  groupName,
  friendRequestId,
  conversationId,
}) => {
  const notification = await Notification.create({
    recipient,
    type,
    title,
    message,
    actor,
    groupName,
    friendRequestId,
    conversationId,
  });

  const formatted = {
    _id: notification._id.toString(),
    type: notification.type,
    title: notification.title,
    message: notification.message,
    actor: notification.actor,
    groupName: notification.groupName,
    friendRequestId: notification.friendRequestId?.toString?.() ?? null,
    conversationId: notification.conversationId?.toString?.() ?? null,
    read: notification.read,
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt,
  };

  io.to(recipient.toString()).emit("new-notification", formatted);

  return formatted;
};