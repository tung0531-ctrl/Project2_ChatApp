// Hien thong tin conversation dang chon va cac hanh dong chinh o dau khung chat.
import { useChatStore } from "@/stores/useChatStore";
import type { Conversation } from "@/types/chat";
import { SidebarTrigger } from "../ui/sidebar";
import { useAuthStore } from "@/stores/useAuthStore";
import { Separator } from "../ui/separator";
import UserAvatar from "./UserAvatar";
import StatusBadge from "./StatusBadge";
import GroupChatAvatar from "./GroupChatAvatar";
import { useSocketStore } from "@/stores/useSocketStore";
import { Pin } from "lucide-react";
import { Button } from "../ui/button";

const getPinnedPreviewText = (chat?: Conversation) => {
  const pinnedMessage = chat?.pinnedMessage;

  if (!pinnedMessage) {
    return null;
  }

  if (pinnedMessage.content?.trim()) {
    return pinnedMessage.content;
  }

  if (pinnedMessage.fileName?.trim()) {
    return pinnedMessage.fileName;
  }

  if (pinnedMessage.imgUrl) {
    return "Tệp đính kèm";
  }

  return "Tin nhắn đã ghim";
};

const getPinnedSenderName = (chat?: Conversation) => {
  const pinnedMessage = chat?.pinnedMessage;

  if (!chat || !pinnedMessage) {
    return null;
  }

  if (pinnedMessage.messageType === "bot") {
    return pinnedMessage.botMeta?.displayName ?? "Bot";
  }

  const sender = chat.participants.find(
    (participant) => participant._id.toString() === pinnedMessage.senderId?.toString()
  );

  return sender?.displayName ?? "Người gửi";
};

const canManagePinnedMessage = (
  conversation?: Conversation,
  userId?: string | null,
) => {
  if (!conversation || !userId) {
    return false;
  }

  if (conversation.type === "direct") {
    return true;
  }

  return conversation.group?.createdBy?.toString() === userId.toString();
};

const ChatWindowHeader = ({ chat }: { chat?: Conversation }) => {
  const { conversations, activeConversationId, togglePinnedMessage } = useChatStore();
  const { user } = useAuthStore();
  const { onlineUsers } = useSocketStore();

  let otherUser;

  chat = chat ?? conversations.find((c) => c._id === activeConversationId);

  if (!chat) {
    return (
      <header className="md:hidden sticky top-0 z-10 flex items-center gap-2 px-4 py-2 w-full">
        <SidebarTrigger className="-ml-1 text-foreground" />
      </header>
    );
  }

  if (chat.type === "direct") {
    const otherUsers = chat.participants.filter((p) => p._id !== user?._id);
    otherUser = otherUsers.length > 0 ? otherUsers[0] : null;

    if (!user || !otherUser) return;
  }

  const pinnedPreview = getPinnedPreviewText(chat);
  const pinnedSenderName = getPinnedSenderName(chat);
  const canUnpinMessage = canManagePinnedMessage(chat, user?._id);

  return (
    <header className="sticky top-0 z-10 bg-background">
      <div className="px-4 py-2 flex items-center gap-2 w-full">
        <SidebarTrigger className="-ml-1 text-foreground" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />

        <div className="p-2 w-full flex items-center gap-3">
          {/* avatar */}
          <div className="relative">
            {chat.type === "direct" ? (
              <>
                <UserAvatar
                  type={"sidebar"}
                  name={otherUser?.displayName || "ChatApp"}
                  avatarUrl={otherUser?.avatarUrl || undefined}
                />
                {/* todo: socket io */}
                <StatusBadge
                  status={
                    onlineUsers.includes(otherUser?._id ?? "") ? "online" : "offline"
                  }
                />
              </>
            ) : (
              <GroupChatAvatar
                participants={chat.participants}
                type="sidebar"
              />
            )}
          </div>

          {/* name */}
          <h2 className="font-semibold text-foreground">
            {chat.type === "direct" ? otherUser?.displayName : chat.group?.name}
          </h2>
        </div>
      </div>

      {chat.pinnedMessage ? (
        <div className="border-t border-border/40 px-4 py-2">
          <div className="flex items-start justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2">
            <div className="flex min-w-0 items-start gap-2">
            <Pin className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-primary">
                Tin nhắn đã ghim{pinnedSenderName ? ` • ${pinnedSenderName}` : ""}
              </p>
              <p className="truncate text-sm text-foreground">{pinnedPreview}</p>
            </div>
            </div>
            {canUnpinMessage ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 shrink-0 px-2 text-primary hover:bg-primary/10 hover:text-primary"
                onClick={() => void togglePinnedMessage(chat.pinnedMessage?.messageId ?? "")}
              >
                Bỏ ghim
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </header>
  );
};

export default ChatWindowHeader;
