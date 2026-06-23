import { useAuthStore } from "@/stores/useAuthStore";
import { useChatStore } from "@/stores/useChatStore";
import { cn, formatMessageTime, splitTextWithMentions } from "@/lib/utils";
import type { Conversation, Message, Participant } from "@/types/chat";
import UserAvatar from "./UserAvatar";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import SeenByAvatars from "./SeenByAvatars";
import { Popover, PopoverAnchor, PopoverContent } from "../ui/popover";
import {
  FileText,
  FileSpreadsheet,
  Paperclip,
  Pin,
  Reply,
} from "lucide-react";
import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

const REACTION_OPTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡"];
const LONG_PRESS_DURATION = 350;

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

const getMentionTextClass = (isOwn: boolean) => {
  if (isOwn) {
    return "font-semibold text-violet-200";
  }

  return "font-semibold text-violet-800 dark:text-violet-400";
};

const getReferencePreviewText = (reference?: Message["replyTo"] | null) => {
  if (!reference) {
    return "";
  }

  if (reference.content?.trim()) {
    return reference.content;
  }

  if (reference.fileName?.trim()) {
    return reference.fileName;
  }

  if (reference.imgUrl) {
    return "Tệp đính kèm";
  }

  return "Tin nhắn";
};

const getReferenceSenderName = (
  reference: Message["replyTo"] | null | undefined,
  conversation: Conversation,
  currentUserId?: string,
) => {
  if (!reference) {
    return "tin nhắn";
  }

  if (reference.messageType === "bot") {
    return reference.botMeta?.displayName ?? "bot";
  }

  if (reference.senderId?.toString() === currentUserId?.toString()) {
    return "chính mình";
  }

  const matchedParticipant = conversation.participants.find(
    (participant) => participant._id.toString() === reference.senderId?.toString()
  );

  return matchedParticipant?.displayName ?? "tin nhắn";
};

const getReplyCaption = (referencedSenderName: string) => {
  return `Phản hồi ${referencedSenderName}`;
};

const canManagePinnedMessage = (
  conversation: Conversation,
  userId?: string | null,
) => {
  if (!userId) {
    return false;
  }

  if (conversation.type === "direct") {
    return true;
  }

  return conversation.group?.createdBy?.toString() === userId.toString();
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
  const { user } = useAuthStore();
  const { reactToMessage, setReplyMessage, togglePinnedMessage } = useChatStore();
  const [isReactionPickerOpen, setIsReactionPickerOpen] = useState(false);
  const [isSubmittingReaction, setIsSubmittingReaction] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState<{
    emoji: string;
    userIds: string[];
  } | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const reactionHoldTimerRef = useRef<number | null>(null);
  const prev = index + 1 < messages.length ? messages[index + 1] : undefined;
  const next = index > 0 ? messages[index - 1] : undefined;

  const isShowTime =
    index === 0 ||
    new Date(message.createdAt).getTime() -
      new Date(prev?.createdAt || 0).getTime() >
      300000; // 5 phút

  const isAvatarBreak =
    !next ||
    message.senderId !== next.senderId ||
    new Date(next.createdAt).getTime() - new Date(message.createdAt).getTime() > 300000;

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
  const mentionTextClass = getMentionTextClass(Boolean(message.isOwn));
  const visibleReactions = (message.reactions ?? []).filter(
    (reaction) => reaction.userIds.length > 0
  );
  const normalizeId = (value: string | { toString(): string } | null | undefined) =>
    value?.toString();
  const currentUserId = normalizeId(user?._id);
  const canPinMessage = canManagePinnedMessage(selectedConvo, currentUserId);
  const isPinnedMessage =
    normalizeId(selectedConvo.pinnedMessage?.messageId) === normalizeId(message._id);
  const referencedSenderName = getReferenceSenderName(
    message.replyTo,
    selectedConvo,
    currentUserId
  );
  const replyCaption = getReplyCaption(referencedSenderName);

  const reactionUsers = selectedReaction
    ? selectedReaction.userIds.map((reactionUserId) => {
        if (user && normalizeId(reactionUserId) === currentUserId) {
          return {
            _id: user._id,
            displayName: user.displayName,
            username: user.username,
            avatarUrl: user.avatarUrl ?? undefined,
          };
        }

        const matchedParticipant = selectedConvo.participants.find(
          (participant) => normalizeId(participant._id) === normalizeId(reactionUserId)
        );

        return {
          _id: reactionUserId,
          displayName: matchedParticipant?.displayName ?? "Người dùng",
          username: matchedParticipant?.username,
          avatarUrl: matchedParticipant?.avatarUrl ?? undefined,
        };
      })
    : [];

  const clearHoldTimer = () => {
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const clearReactionHoldTimer = () => {
    if (reactionHoldTimerRef.current) {
      window.clearTimeout(reactionHoldTimerRef.current);
      reactionHoldTimerRef.current = null;
    }
  };

  const startHoldTimer = () => {
    clearHoldTimer();
    holdTimerRef.current = window.setTimeout(() => {
      setIsReactionPickerOpen(true);
      holdTimerRef.current = null;
    }, LONG_PRESS_DURATION);
  };

  const startReactionHoldTimer = (emoji: string) => {
    clearReactionHoldTimer();
    reactionHoldTimerRef.current = window.setTimeout(() => {
      void handleReactionSelect(emoji);
      reactionHoldTimerRef.current = null;
    }, LONG_PRESS_DURATION);
  };

  const handleReactionSelect = async (emoji: string) => {
    if (isSubmittingReaction) {
      return;
    }

    setIsSubmittingReaction(true);
    const success = await reactToMessage(message._id, emoji);

    if (success) {
      setIsReactionPickerOpen(false);
    }

    setIsSubmittingReaction(false);
  };

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
          "flex items-start gap-2 message-bounce mt-2",
          message.isOwn ? "justify-end" : "justify-start"
        )}
      >
        {/* avatar */}
        {!message.isOwn && (
          <div className="w-8">
            {isAvatarBreak && (
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
            "group/message-row max-w-xs lg:max-w-md space-y-1 flex flex-col",
            message.isOwn ? "items-end" : "items-start"
          )}
        >
          <Popover
            open={isReactionPickerOpen}
            onOpenChange={setIsReactionPickerOpen}
          >
            <PopoverAnchor asChild>
              <div
                className={cn(
                  "flex items-center gap-2",
                  message.isOwn ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className="flex flex-col">
                  {message.replyTo ? (
                    <div
                      className={cn(
                        "mb-1 flex flex-col gap-1 px-1",
                        message.isOwn ? "items-end text-right" : "items-start text-left"
                      )}
                    >
                      <div
                        className={cn(
                          "flex items-center gap-1 text-[11px] font-medium text-muted-foreground/90",
                          message.isOwn ? "justify-end" : "justify-start"
                        )}
                      >
                        <Reply className="size-3.5" />
                        <span>{replyCaption}</span>
                      </div>
                      <div
                        className={cn(
                          "max-w-full rounded-2xl border px-3 py-2 text-xs shadow-sm",
                          message.isOwn
                            ? "border-white/15 bg-primary/20 text-white/80"
                            : "border-primary/15 bg-primary/10 text-foreground/75"
                        )}
                      >
                        <p className="line-clamp-2 break-words leading-relaxed">
                          {getReferencePreviewText(message.replyTo)}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <Card
                    onPointerDown={(event) => {
                      if (event.pointerType === "mouse" && event.button !== 0) {
                        return;
                      }

                      startHoldTimer();
                    }}
                    onPointerUp={clearHoldTimer}
                    onPointerLeave={clearHoldTimer}
                    onPointerCancel={clearHoldTimer}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      clearHoldTimer();
                      setIsReactionPickerOpen(true);
                    }}
                    className={cn(
                      "relative p-3 touch-manipulation",
                      message.isOwn ? "chat-bubble-sent border-0" : "chat-bubble-received"
                    )}
                  >
                    <div className="space-y-2">
                      {isPinnedMessage ? (
                        <div className="flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary/10 px-2 py-1 text-xs text-primary">
                          <Pin className="size-3.5 shrink-0" />
                          <span className="truncate font-medium">Tin nhắn đang được ghim</span>
                        </div>
                      ) : null}

                      {renderMessageMedia(message)}
                      {message.content ? (
                        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                          {contentSegments.map((segment, segmentIndex) => (
                            <span
                              key={`${message._id}-segment-${segmentIndex}`}
                              className={segment.isMention ? mentionTextClass : undefined}
                            >
                              {segment.text}
                            </span>
                          ))}
                        </p>
                      ) : null}
                    </div>
                  </Card>

                  {visibleReactions.length > 0 ? (
                    <div
                      className={cn(
                        "relative z-10 mt-[-10px] flex flex-wrap gap-1 px-2",
                        message.isOwn ? "justify-end" : "justify-start"
                      )}
                    >
                      {visibleReactions.map((reaction) => {
                        const hasReacted = Boolean(
                          user?._id && reaction.userIds.includes(user._id)
                        );

                        return (
                          <button
                            key={`${message._id}-${reaction.emoji}`}
                            type="button"
                            disabled={isSubmittingReaction}
                            onClick={() =>
                              setSelectedReaction({
                                emoji: reaction.emoji,
                                userIds: reaction.userIds,
                              })
                            }
                            onPointerDown={(event) => {
                              if (event.pointerType === "mouse" && event.button !== 0) {
                                return;
                              }

                              startReactionHoldTimer(reaction.emoji);
                            }}
                            onPointerUp={clearReactionHoldTimer}
                            onPointerLeave={clearReactionHoldTimer}
                            onPointerCancel={clearReactionHoldTimer}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border bg-background/95 px-2 py-1 text-xs shadow-sm transition-colors",
                              hasReacted
                                ? "border-primary/60 text-primary"
                                : "border-border/60 text-foreground hover:bg-muted"
                            )}
                          >
                            <span>{reaction.emoji}</span>
                            <span className="font-medium">{reaction.userIds.length}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>

                <div className="pointer-events-none flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover/message-row:opacity-100">
                  <button
                    type="button"
                    onClick={() => setReplyMessage(message)}
                    className="pointer-events-auto inline-flex size-8 items-center justify-center rounded-full border border-border/50 bg-background/95 text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Reply className="size-4" />
                  </button>
                  {canPinMessage ? (
                    <button
                      type="button"
                      onClick={() => void togglePinnedMessage(message._id)}
                      className="pointer-events-auto inline-flex size-8 items-center justify-center rounded-full border border-border/50 bg-background/95 text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Pin className="size-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            </PopoverAnchor>

            <PopoverContent
              side="top"
              align={message.isOwn ? "end" : "start"}
              sideOffset={10}
              className="w-auto rounded-full border-border/50 bg-background/95 p-2 shadow-lg"
            >
              <div className="flex items-center gap-1">
                {REACTION_OPTIONS.map((emoji) => {
                  const isActive = Boolean(
                    user?._id &&
                      (message.reactions ?? []).some(
                        (reaction) =>
                          reaction.emoji === emoji && reaction.userIds.includes(user._id)
                      )
                  );

                  return (
                    <button
                      key={`${message._id}-picker-${emoji}`}
                      type="button"
                      disabled={isSubmittingReaction}
                      onClick={() => handleReactionSelect(emoji)}
                      className={cn(
                        "flex size-10 items-center justify-center rounded-full text-lg transition-transform hover:scale-110 hover:bg-muted",
                        isActive ? "bg-primary/10 ring-1 ring-primary/30" : "bg-transparent"
                      )}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>

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

      <Dialog
        open={Boolean(selectedReaction)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedReaction(null);
          }
        }}
      >
        <DialogContent className="border-border/30 glass-strong sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {selectedReaction?.emoji} Người đã thả cảm xúc
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {reactionUsers.map((reactionUser) => (
              <div
                key={`${selectedReaction?.emoji}-${reactionUser._id}`}
                className="flex items-center gap-3 rounded-lg border border-border/30 bg-background/60 p-3"
              >
                <UserAvatar
                  type="chat"
                  name={reactionUser.displayName}
                  avatarUrl={reactionUser.avatarUrl}
                />

                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{reactionUser.displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {reactionUser.username ? `@${reactionUser.username}` : "Không có username"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MessageItem;
