import Notification from "../models/Notification.js";

const formatNotification = (notification) => ({
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
});

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    const notifications = await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const unreadCount = notifications.reduce(
      (total, notification) => total + (notification.read ? 0 : 1),
      0,
    );

    return res.status(200).json({
      notifications: notifications.map(formatNotification),
      unreadCount,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách thông báo", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    await Notification.updateMany(
      {
        recipient: userId,
        read: false,
      },
      {
        $set: {
          read: true,
        },
      },
    );

    return res.status(200).json({ message: "Đã đánh dấu tất cả thông báo là đã đọc" });
  } catch (error) {
    console.error("Lỗi khi đánh dấu thông báo đã đọc", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};