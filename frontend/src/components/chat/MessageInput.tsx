import { useAuthStore } from "@/stores/useAuthStore";
import type { BotDefinition, Conversation } from "@/types/chat";
import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";
import { Paperclip, Send, X } from "lucide-react";
import EmojiPicker from "./EmojiPicker";
import { useChatStore } from "@/stores/useChatStore";
import { toast } from "sonner";
import { Badge } from "../ui/badge";
import UserAvatar from "./UserAvatar";
import { cn, normalizeMentionSearch, splitTextWithMentions } from "@/lib/utils";

interface MentionCandidate {
  id: string;
  type: "user" | "bot";
  label: string;
  mentionKey: string;
  subtitle: string;
  avatarUrl?: string | null;
}

const getActiveMention = (value: string, caretPosition: number) => {
  if (caretPosition < 0) {
    return null;
  }

  const mentionStart = value.lastIndexOf("@", caretPosition - 1);

  if (mentionStart === -1) {
    return null;
  }

  const charBefore = mentionStart > 0 ? value[mentionStart - 1] : " ";

  if (!/\s/.test(charBefore)) {
    return null;
  }

  const nextWhitespaceIndex = value.slice(mentionStart).search(/\s/);
  const mentionEnd =
    nextWhitespaceIndex === -1 ? value.length : mentionStart + nextWhitespaceIndex;

  if (caretPosition > mentionEnd) {
    return null;
  }

  return {
    start: mentionStart,
    end: mentionEnd,
    query: value.slice(mentionStart + 1, caretPosition),
  };
};

const getMentionKeyForParticipant = (participant: Conversation["participants"][number]) => {
  if (participant.username?.trim()) {
    return participant.username.trim();
  }

  return participant.displayName.replace(/\s+/g, "");
};

const mentionHighlightClass = "font-semibold text-violet-600 dark:text-violet-300";

const MessageInput = ({ selectedConvo }: { selectedConvo: Conversation }) => {
  const { user } = useAuthStore();
  const {
    sendDirectMessage,
    sendGroupMessage,
    uploadMessageMedia,
    fetchAvailableBots,
  } = useChatStore();
  const [value, setValue] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [availableBots, setAvailableBots] = useState<BotDefinition[]>([]);
  const [caretPosition, setCaretPosition] = useState(0);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  if (!user) return;

  useEffect(() => {
    if (!selectedMedia) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedMedia);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedMedia]);

  useEffect(() => {
    if (selectedConvo.type !== "group") {
      setAvailableBots([]);
      return;
    }

    let active = true;

    const loadAvailableBots = async () => {
      const bots = await fetchAvailableBots();

      if (active) {
        setAvailableBots(bots);
      }
    };

    loadAvailableBots();

    return () => {
      active = false;
    };
  }, [fetchAvailableBots, selectedConvo.type]);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 140)}px`;
  }, [value]);

  useEffect(() => {
    setActiveSuggestionIndex(0);
  }, [selectedConvo._id]);

  const resetSelectedMedia = () => {
    setSelectedMedia(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSelectMedia = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setSelectedMedia(file);
  };

  const participants = selectedConvo.participants.filter(
    (participant) => participant._id !== user._id
  );
  const enabledBotIds = new Set(
    (selectedConvo.group?.bots ?? [])
      .filter((botConfig) => botConfig.enabled)
      .map((botConfig) => botConfig.botId)
  );
  const mentionCandidates: MentionCandidate[] = [
    ...participants.map((participant) => {
      const mentionKey = getMentionKeyForParticipant(participant);

      return {
        id: participant._id,
        type: "user" as const,
        label: participant.displayName,
        mentionKey,
        subtitle: `@${mentionKey}`,
        avatarUrl: participant.avatarUrl ?? null,
      };
    }),
    ...availableBots
      .filter((bot) => selectedConvo.type === "group" && enabledBotIds.has(bot.botId))
      .map((bot) => ({
        id: bot.botId,
        type: "bot" as const,
        label: bot.displayName,
        mentionKey: bot.trigger.replace(/^@/, ""),
        subtitle: bot.trigger,
        avatarUrl: null,
      })),
  ];
  const activeMention = getActiveMention(value, caretPosition);
  const mentionSuggestions = activeMention
    ? mentionCandidates
        .filter((candidate, index, array) => {
          return array.findIndex((item) => item.mentionKey === candidate.mentionKey) === index;
        })
        .filter((candidate) => {
          const normalizedQuery = normalizeMentionSearch(activeMention.query);

          if (!normalizedQuery) {
            return true;
          }

          return (
            normalizeMentionSearch(candidate.mentionKey).startsWith(normalizedQuery) ||
            normalizeMentionSearch(candidate.label).startsWith(normalizedQuery)
          );
        })
        .slice(0, 5)
    : [];
  const highlightedSegments = splitTextWithMentions(value);

  const syncCaretPosition = () => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    setCaretPosition(textarea.selectionStart ?? 0);
  };

  const insertTextAtCaret = (insertedText: string) => {
    const textarea = textareaRef.current;

    if (!textarea) {
      setValue((currentValue) => `${currentValue}${insertedText}`);
      return;
    }

    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? value.length;
    const nextValue = `${value.slice(0, start)}${insertedText}${value.slice(end)}`;
    const nextCaret = start + insertedText.length;

    setValue(nextValue);
    setCaretPosition(nextCaret);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const insertMention = (candidate: MentionCandidate) => {
    const mention = getActiveMention(value, textareaRef.current?.selectionStart ?? caretPosition);

    if (!mention) {
      return;
    }

    const insertedText = `@${candidate.mentionKey} `;
    const nextValue = `${value.slice(0, mention.start)}${insertedText}${value.slice(
      mention.end
    )}`;
    const nextCaret = mention.start + insertedText.length;

    setValue(nextValue);
    setCaretPosition(nextCaret);
    setActiveSuggestionIndex(0);

    requestAnimationFrame(() => {
      const textarea = textareaRef.current;

      if (!textarea) {
        return;
      }

      textarea.focus();
      textarea.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const sendMessage = async () => {
    if ((!value.trim() && !selectedMedia) || sending) return;

    const currValue = value.trim();
    const mediaFile = selectedMedia;

    setSending(true);

    try {
      let uploadedMedia:
        | {
            mediaUrl: string;
            mediaType: string;
            fileName: string;
            fileSize: number;
          }
        | undefined;

      if (mediaFile) {
        uploadedMedia = await uploadMessageMedia(mediaFile);
      }

      if (selectedConvo.type === "direct") {
        const participants = selectedConvo.participants;
        const otherUser = participants.filter((p) => p._id !== user._id)[0];
        await sendDirectMessage(
          otherUser._id,
          currValue,
          uploadedMedia?.mediaUrl,
          uploadedMedia?.mediaType,
          uploadedMedia?.fileName,
          uploadedMedia?.fileSize
        );
      } else {
        await sendGroupMessage(
          selectedConvo._id,
          currValue,
          uploadedMedia?.mediaUrl,
          uploadedMedia?.mediaType,
          uploadedMedia?.fileName,
          uploadedMedia?.fileSize
        );
      }

      setValue("");
      setCaretPosition(0);
      resetSelectedMedia();
    } catch (error) {
      console.error(error);
      toast.error("Lỗi xảy ra khi gửi tin nhắn. Bạn hãy thử lại!");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveSuggestionIndex((currentIndex) =>
          currentIndex === mentionSuggestions.length - 1 ? 0 : currentIndex + 1
        );
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveSuggestionIndex((currentIndex) =>
          currentIndex === 0 ? mentionSuggestions.length - 1 : currentIndex - 1
        );
        return;
      }

      if ((e.key === "Enter" || e.key === "Tab") && activeMention) {
        e.preventDefault();
        insertMention(mentionSuggestions[activeSuggestionIndex] ?? mentionSuggestions[0]);
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        setCaretPosition(-1);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="bg-background p-3">
      {selectedMedia && previewUrl ? (
        <div className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-primary-foreground p-3">
          <div className="min-w-0 flex-1 space-y-2">
            {selectedMedia.type.startsWith("video/") ? (
              <video
                src={previewUrl}
                controls
                className="max-h-48 w-full rounded-md border border-border/50 bg-black object-contain"
              />
            ) : selectedMedia.type.startsWith("image/") ? (
              <img
                src={previewUrl}
                alt={selectedMedia.name}
                className="max-h-48 w-full rounded-md border border-border/50 object-contain"
              />
            ) : (
              <div className="flex items-center gap-3 rounded-md border border-border/50 bg-background px-3 py-4">
                <Paperclip className="size-5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{selectedMedia.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedMedia.type || "Tệp đính kèm"}
                  </p>
                </div>
              </div>
            )}
            <p className="truncate text-sm text-muted-foreground">{selectedMedia.name}</p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={resetSelectedMedia}
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : null}

      <div className="flex items-center gap-2 min-h-[56px]">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleSelectMedia}
        />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="hover:bg-primary/10 transition-smooth"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="size-4" />
        </Button>

        <div className="flex-1 relative">
          {mentionSuggestions.length > 0 ? (
            <div className="absolute bottom-full left-0 right-0 z-20 mb-2 overflow-hidden rounded-lg border border-border/50 bg-background shadow-lg">
              {mentionSuggestions.map((candidate, index) => (
                <button
                  key={`${candidate.type}-${candidate.id}`}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => insertMention(candidate)}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                    index === activeSuggestionIndex
                      ? "bg-primary/10"
                      : "hover:bg-muted/60"
                  )}
                >
                  <UserAvatar
                    type="chat"
                    name={candidate.label}
                    avatarUrl={candidate.avatarUrl ?? undefined}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">
                        {candidate.label}
                      </p>
                      {candidate.type === "bot" ? (
                        <Badge
                          variant="secondary"
                          className="h-4 px-1.5 text-[10px]"
                        >
                          BOT
                        </Badge>
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {candidate.subtitle}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : null}

          <div className="relative min-h-9 rounded-md border border-border/50 bg-background dark:bg-input/30 transition-smooth focus-within:border-primary/50">
            {value ? (
              <div className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words px-3 py-2 pr-20 text-sm leading-5 text-foreground">
                {highlightedSegments.map((segment, index) => (
                  <span
                    key={`composer-segment-${index}`}
                    className={segment.isMention ? mentionHighlightClass : undefined}
                  >
                    {segment.text}
                  </span>
                ))}
              </div>
            ) : (
              <div className="pointer-events-none absolute inset-0 px-3 py-2 pr-20 text-sm leading-5 text-muted-foreground">
                Soạn tin nhắn...
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={value}
              rows={1}
              onKeyDown={handleKeyDown}
              onChange={(event) => {
                setValue(event.target.value);
                setCaretPosition(event.target.selectionStart ?? event.target.value.length);
              }}
              onClick={syncCaretPosition}
              onKeyUp={syncCaretPosition}
              onSelect={syncCaretPosition}
              className="relative z-10 min-h-9 w-full resize-none overflow-hidden bg-transparent px-3 py-2 pr-20 text-sm leading-5 text-transparent caret-foreground outline-none"
            />
          </div>

          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1 z-10">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="size-8 hover:bg-primary/10 transition-smooth"
            >
              <div>
                <EmojiPicker
                  onChange={(emoji: string) => insertTextAtCaret(emoji)}
                />
              </div>
            </Button>
          </div>
        </div>

        <Button
          onClick={sendMessage}
          className="bg-gradient-chat hover:shadow-glow transition-smooth hover:scale-105"
          disabled={(!value.trim() && !selectedMedia) || sending}
        >
          <Send className="size-4 text-white" />
        </Button>
      </div>
    </div>
  );
};

export default MessageInput;
