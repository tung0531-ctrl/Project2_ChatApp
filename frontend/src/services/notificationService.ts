// Gom cac API lay thong bao, danh dau da doc va xoa mem thong bao.
import api from "@/lib/axios";
import type { Notification } from "@/types/user";

interface NotificationResponse {
  notifications: Notification[];
  unreadCount: number;
}

export const notificationService = {
  async fetchNotifications(): Promise<NotificationResponse> {
    const res = await api.get("/notifications");
    return res.data;
  },

  async markAllAsRead() {
    await api.patch("/notifications/read-all");
  },

  async hideNotification(notificationId: string) {
    await api.patch(`/notifications/${notificationId}/hide`);
  },
};