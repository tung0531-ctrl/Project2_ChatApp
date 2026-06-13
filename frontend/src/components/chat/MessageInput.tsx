import { useAuthStore } from "@/stores/useAuthStore";
import type { Conversation } from "@/types/chat";
import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";
import { Paperclip, Send, X } from "lucide-react";
import { Input } from "../ui/input";
import EmojiPicker from "./EmojiPicker";
import { useChatStore } from "@/stores/useChatStore";
import { toast } from "sonner";

const MessageInput = ({ selectedConvo }: { selectedConvo: Conversation }) => {
  const { user } = useAuthStore();
  const { sendDirectMessage, sendGroupMessage, uploadMessageMedia } = useChatStore();
  const [value, setValue] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
      resetSelectedMedia();
    } catch (error) {
      console.error(error);
      toast.error("Lỗi xảy ra khi gửi tin nhắn. Bạn hãy thử lại!");
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
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
          <Input
            onKeyPress={handleKeyPress}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Soạn tin nhắn..."
            className="pr-20 h-9 bg-white border-border/50 focus:border-primary/50 transition-smooth resize-none"
          ></Input>
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="size-8 hover:bg-primary/10 transition-smooth"
            >
              <div>
                <EmojiPicker
                  onChange={(emoji: string) => setValue(`${value}${emoji}`)}
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
