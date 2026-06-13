import { toast } from "sonner";
import { Button } from "../ui/button";
import NotificationItem from "./NotificationItem";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useFriendStore } from "@/stores/useFriendStore";
import { Trash2 } from "lucide-react";

const ReceivedNotifications = () => {
  const { notifications, removeNotificationByFriendRequestId, hideNotification } =
    useNotificationStore();
  const { acceptRequest, declineRequest, loading } = useFriendStore();

  if (!notifications || notifications.length === 0) {
    return (
      <p className="mt-4 text-sm text-muted-foreground">Bạn chưa có thông báo nào.</p>
    );
  }

  const handleAccept = async (requestId: string) => {
    try {
      await acceptRequest(requestId);
      removeNotificationByFriendRequestId(requestId);
      toast.success("Đã đồng ý kết bạn thành công");
    } catch (error) {
      console.error(error);
    }
  };

  const handleDecline = async (requestId: string) => {
    try {
      await declineRequest(requestId);
      removeNotificationByFriendRequestId(requestId);
      toast.info("Đã từ chối kết bạn");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="mt-4 space-y-3">
      {notifications.map((notification) => {
        const hasFriendRequestAction =
          notification.type === "friend_request" && notification.friendRequestId;

        return (
          <NotificationItem
            key={notification._id}
            notification={notification}
            actions={
              hasFriendRequestAction ? (
                <>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleAccept(notification.friendRequestId as string)}
                    disabled={loading}
                  >
                    Chấp nhận
                  </Button>
                  <Button
                    size="sm"
                    variant="destructiveOutline"
                    onClick={() => handleDecline(notification.friendRequestId as string)}
                    disabled={loading}
                  >
                    Từ chối
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => hideNotification(notification._id)}
                  >
                    <Trash2 className="size-4" />
                    Xóa
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => hideNotification(notification._id)}
                >
                  <Trash2 className="size-4" />
                  Xóa
                </Button>
              )
            }
          />
        );
      })}
    </div>
  );
};

export default ReceivedNotifications;