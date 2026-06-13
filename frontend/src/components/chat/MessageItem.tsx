import { cn, formatMessageTime } from "@/lib/utils";
import type { Conversation, Message, Participant } from "@/types/chat";
import UserAvatar from "./UserAvatar";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import SeenByAvatars from "./SeenByAvatars";

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
              <UserAvatar
                type="chat"
                name={participant?.displayName ?? "ChatApp"}
                avatarUrl={participant?.avatarUrl ?? undefined}
              />
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
                <p className="text-sm leading-relaxed break-words">{message.content}</p>
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
