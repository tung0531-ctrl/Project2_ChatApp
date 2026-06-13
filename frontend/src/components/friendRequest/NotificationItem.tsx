import type { Notification } from "@/types/user";
import type { ReactNode } from "react";
import UserAvatar from "../chat/UserAvatar";

interface NotificationItemProps {
  notification: Notification;
  actions?: ReactNode;
}

const NotificationItem = ({ notification, actions }: NotificationItemProps) => {
  const actorName = notification.actor?.displayName || notification.groupName || "ChatApp";
  const subtitle = notification.actor?.username
    ? `@${notification.actor.username}`
    : new Date(notification.createdAt).toLocaleString("vi-VN");

  return (
    <div className="rounded-lg border border-primary-foreground p-3 shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3 text-left">
          <UserAvatar
            type="sidebar"
            name={actorName}
            avatarUrl={notification.actor?.avatarUrl ?? undefined}
          />
          <div className="min-w-0">
            <p className="font-medium">{notification.title}</p>
            <p className="mt-1 text-sm text-foreground/80">{notification.message}</p>
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>

        {!notification.read ? (
          <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
        ) : null}
      </div>

      {actions ? <div className="mt-3 flex justify-end gap-2">{actions}</div> : null}
    </div>
  );
};

export default NotificationItem;