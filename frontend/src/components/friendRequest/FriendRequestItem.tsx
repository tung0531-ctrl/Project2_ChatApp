import type { FriendRequest } from "@/types/user";
import type { ReactNode } from "react";
import UserAvatar from "../chat/UserAvatar";

interface RequestItemProps {
  requestInfo: FriendRequest;
  actions: ReactNode;
  type: "sent" | "received";
}

const FriendRequestItem = ({ requestInfo, actions, type }: RequestItemProps) => {
  if (!requestInfo) {
    return;
  }
  const info = type === "sent" ? requestInfo.to : requestInfo.from;
  const requestMessage = requestInfo.message?.trim();

  if (!info) {
    return;
  }

  return (
    <div className="flex items-center justify-between rounded-lg shadow-md border border-primary-foreground p-3 gap-4">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <UserAvatar
          type="sidebar"
          name={info.displayName}
        />
        <div className="min-w-0">
          <p className="font-medium">{info.displayName}</p>
          <p className="text-sm text-muted-foreground">@{info.username}</p>

          {requestMessage ? (
            <p className="mt-2 rounded-md bg-muted/60 px-3 py-2 text-sm leading-6 text-foreground break-words">
              {requestMessage}
            </p>
          ) : null}
        </div>
      </div>
      {actions}
    </div>
  );
};

export default FriendRequestItem;
