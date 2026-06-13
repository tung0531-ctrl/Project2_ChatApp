import { create } from "zustand";
import type { NotificationState } from "@/types/store";
import { notificationService } from "@/services/notificationService";

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  reset: () => {
    set({ notifications: [], unreadCount: 0, loading: false });
  },
  fetchNotifications: async () => {
    try {
      set({ loading: true });
      const { notifications } = await notificationService.fetchNotifications();

      const unreadCount = notifications.reduce(
        (count, notification) => count + (notification.read ? 0 : 1),
        0
      );

      set({ notifications, unreadCount });
    } catch (error) {
      console.error("Lỗi khi lấy thông báo", error);
    } finally {
      set({ loading: false });
    }
  },
  markAllAsRead: async () => {
    try {
      await notificationService.markAllAsRead();
      set((state) => ({
        unreadCount: 0,
        notifications: state.notifications.map((notification) => ({
          ...notification,
          read: true,
        })),
      }));
    } catch (error) {
      console.error("Lỗi khi đánh dấu thông báo đã đọc", error);
    }
  },
  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + (notification.read ? 0 : 1),
    }));
  },
  removeNotificationByFriendRequestId: (friendRequestId) => {
    set((state) => {
      const removed = state.notifications.find(
        (notification) => notification.friendRequestId === friendRequestId
      );

      return {
        notifications: state.notifications.filter(
          (notification) => notification.friendRequestId !== friendRequestId
        ),
        unreadCount:
          state.unreadCount - (removed && !removed.read ? 1 : 0),
      };
    });
  },
  hideNotification: (notificationId) => {
    void notificationService.hideNotification(notificationId);

    set((state) => {
      const removed = state.notifications.find(
        (notification) => notification._id === notificationId
      );

      return {
        notifications: state.notifications.filter(
          (notification) => notification._id !== notificationId
        ),
        unreadCount: Math.max(0, state.unreadCount - (removed && !removed.read ? 1 : 0)),
      };
    });
  },
}));