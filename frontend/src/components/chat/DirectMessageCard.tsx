import type { Conversation } from "@/types/chat";
import type { Friend } from "@/types/user";
import ChatCard from "./ChatCard";
import { useAuthStore } from "@/stores/useAuthStore";
import { useChatStore } from "@/stores/useChatStore";
import { cn } from "@/lib/utils";
import UserAvatar from "./UserAvatar";
import StatusBadge from "./StatusBadge";
import UnreadCountBadge from "./UnreadCountBadge";
import { useSocketStore } from "@/stores/useSocketStore";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { MoreHorizontal, Trash2, UserRoundSearch } from "lucide-react";
import { useFriendStore } from "@/stores/useFriendStore";
import UserProfileDialog from "../profile/UserProfileDialog";

const getLastMessagePreview = (convo?: Conversation) => {
  if (!convo?.lastMessage) {
    return "";
  }

  if (convo.lastMessage.content?.trim()) {
    return convo.lastMessage.content;
  }

  if (convo.lastMessage.mediaType === "image/gif") {
    return "Đã gửi GIF";
  }

  if (convo.lastMessage.mediaType?.startsWith("video/")) {
    return "Đã gửi video";
  }

  if (convo.lastMessage.mediaType === "application/pdf") {
    return "Đã gửi PDF";
  }

  if (
    convo.lastMessage.mediaType === "application/msword" ||
    convo.lastMessage.mediaType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "Đã gửi file Word";
  }

  if (
    convo.lastMessage.mediaType === "application/vnd.ms-excel" ||
    convo.lastMessage.mediaType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return "Đã gửi file Excel";
  }

  if (convo.lastMessage.imgUrl) {
    return convo.lastMessage.mediaType?.startsWith("image/")
      ? "Đã gửi hình ảnh"
      : "Đã gửi tệp đính kèm";
  }

  return "";
};

interface DirectMessageCardProps {
  convo?: Conversation;
  friend: Friend;
}

const DirectMessageCard = ({ convo, friend }: DirectMessageCardProps) => {
  const { user } = useAuthStore();
  const {
    activeConversationId,
    setActiveConversation,
    messages,
    fetchMessages,
    createConversation,
  } = useChatStore();
  const { onlineUsers } = useSocketStore();
  const { unfriend, loading } = useFriendStore();
  const [profileOpen, setProfileOpen] = useState(false);

  if (!user) return null;

  const otherUser =
    convo?.participants.find((participant) => participant._id !== user._id) ?? friend;

  const unreadCount = convo?.unreadCounts[user._id] ?? 0;
  const lastMessage = getLastMessagePreview(convo);
  const cardId = convo?._id ?? `friend-${friend._id}`;

  const handleSelectConversation = async (id: string) => {
    if (!convo) {
      await createConversation("direct", "", [friend._id]);
      return;
    }

    setActiveConversation(id);
    if (!messages[id]) {
      await fetchMessages(id);
    }
  };

  const handleUnfriend = async () => {
    await unfriend(friend._id);
  };

  return (
    <>
      <ChatCard
        convoId={cardId}
        name={otherUser.displayName ?? ""}
        timestamp={
          convo?.lastMessage?.createdAt
            ? new Date(convo.lastMessage.createdAt)
            : undefined
        }
        isActive={!!convo && activeConversationId === convo._id}
        onSelect={handleSelectConversation}
        unreadCount={unreadCount}
        leftSection={
          <>
            <UserAvatar
              type="sidebar"
              name={otherUser.displayName ?? ""}
              avatarUrl={otherUser.avatarUrl ?? undefined}
            />
            <StatusBadge
              status={
                onlineUsers.includes(otherUser?._id ?? "") ? "online" : "offline"
              }
            />
            {unreadCount > 0 && <UnreadCountBadge unreadCount={unreadCount} />}
          </>
        }
        subtitle={
          <p
            className={cn(
              "text-sm truncate",
              unreadCount > 0 ? "font-medium text-foreground" : "text-muted-foreground"
            )}
          >
            {lastMessage || "Nhấn để bắt đầu trò chuyện"}
          </p>
        }
        rightSection={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-8 text-muted-foreground hover:bg-muted/50"
                onClick={(event) => event.stopPropagation()}
              >
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Tùy chọn bạn bè</span>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              onClick={(event) => event.stopPropagation()}
            >
              <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                <UserRoundSearch className="size-4" />
                Xem profile
              </DropdownMenuItem>

              <DropdownMenuItem
                variant="destructive"
                disabled={loading}
                onClick={handleUnfriend}
              >
                <Trash2 className="size-4" />
                Hủy kết bạn
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <UserProfileDialog
        userId={friend._id}
        open={profileOpen}
        setOpen={setProfileOpen}
      />
    </>
  );
};

export default DirectMessageCard;
