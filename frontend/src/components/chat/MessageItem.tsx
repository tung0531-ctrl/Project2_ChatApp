import { cn, formatMessageTime, splitTextWithMentions } from "@/lib/utils";
import type { Conversation, Message, Participant } from "@/types/chat";
import UserAvatar from "./UserAvatar";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import SeenByAvatars from "./SeenByAvatars";
import { FileText, FileSpreadsheet, Paperclip } from "lucide-react";

const formatFileSize = (size?: number | null) => {
  if (!size) {
    return null;
  }

  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const getAttachmentIcon = (mediaType?: string | null) => {
  if (mediaType === "application/pdf") {
    return FileText;
  }

  if (
    mediaType === "application/vnd.ms-excel" ||
    mediaType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return FileSpreadsheet;
  }

  return Paperclip;
};

const renderMessageMedia = (message: Message) => {
  if (!message.imgUrl) {
    return null;
  }

  if (message.mediaType?.startsWith("video/")) {
    return (
      <video
        src={message.imgUrl}
        controls
        className="max-h-80 w-full rounded-md bg-black object-contain"
      />
    );
  }

  if (!message.mediaType?.startsWith("image/")) {
    const AttachmentIcon = getAttachmentIcon(message.mediaType);

    return (
      <a
        href={message.imgUrl}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 rounded-md border border-border/50 bg-background/70 px-3 py-3 transition-colors hover:bg-background"
      >
        <AttachmentIcon className="size-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{message.fileName || "Tệp đính kèm"}</p>
          <p className="text-xs text-muted-foreground">
            {[message.mediaType || "Tệp", formatFileSize(message.fileSize)]
              .filter(Boolean)
              .join(" • ")}
          </p>
        </div>
      </a>
    );
  }

  return (
    <img
      src={message.imgUrl}
      alt="media message"
      className="max-h-80 w-full rounded-md object-contain"
      loading="lazy"
    />
  );
};

interface MessageItemProps {
  message: Message;
  index: number;
  messages: Message[];
  selectedConvo: Conversation;
}

const MessageItem = ({
  message,
  index,
  messages,
  selectedConvo,
}: MessageItemProps) => {
  const prev = index + 1 < messages.length ? messages[index + 1] : undefined;

  const isShowTime =
    index === 0 ||
    new Date(message.createdAt).getTime() -
      new Date(prev?.createdAt || 0).getTime() >
      300000; // 5 phút

  const isGroupBreak = isShowTime || message.senderId !== prev?.senderId;

  const participant = selectedConvo.participants.find(
    (p: Participant) => p._id.toString() === message.senderId.toString()
  );
  const isBotMessage = message.messageType === "bot";
  const senderName = isBotMessage
    ? (message.botMeta?.displayName ?? "Bot")
    : (participant?.displayName ?? "ChatApp");
  const senderAvatar = isBotMessage
    ? (message.botMeta?.avatarUrl ?? undefined)
    : (participant?.avatarUrl ?? undefined);
  const contentSegments = message.content
    ? splitTextWithMentions(message.content)
    : [];

  return (
    <>
      {/* time */}
      {isShowTime && (
        <span className="flex justify-center text-xs text-muted-foreground px-1">
          {formatMessageTime(new Date(message.createdAt))}
        </span>
      )}

      <div
        className={cn(
          "flex gap-2 message-bounce mt-1",
          message.isOwn ? "justify-end" : "justify-start"
        )}
      >
        {/* avatar */}
        {!message.isOwn && (
          <div className="w-8">
            {isGroupBreak && (
              <div className="space-y-1">
                <UserAvatar
                  type="chat"
                  name={senderName}
                  avatarUrl={senderAvatar}
                />
                {isBotMessage ? (
                  <Badge
                    variant="secondary"
                    className="h-4 px-1.5 text-[10px]"
                  >
                    BOT
                  </Badge>
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* tin nhắn */}
        <div
          className={cn(
            "max-w-xs lg:max-w-md space-y-1 flex flex-col",
            message.isOwn ? "items-end" : "items-start"
          )}
        >
          <Card
            className={cn(
              "p-3",
              message.isOwn ? "chat-bubble-sent border-0" : "chat-bubble-received"
            )}
          >
            <div className="space-y-2">
              {renderMessageMedia(message)}
              {message.content ? (
                <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                  {contentSegments.map((segment, segmentIndex) => (
                    <span
                      key={`${message._id}-segment-${segmentIndex}`}
                      className={segment.isMention ? "font-semibold text-primary" : undefined}
                    >
                      {segment.text}
                    </span>
                  ))}
                </p>
              ) : null}
            </div>
          </Card>

          {/* seen/ delivered */}
          {message.isOwn && message._id === selectedConvo.lastMessage?._id && (
            selectedConvo.seenBy.length > 0 ? (
              <SeenByAvatars
                seenBy={selectedConvo.seenBy}
                participants={selectedConvo.participants}
              />
            ) : (
              <Badge
                variant="outline"
                className="h-4 border-0 bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
              >
                delivered
              </Badge>
            )
          )}
        </div>
      </div>
    </>
  );
};

export default MessageItem;
