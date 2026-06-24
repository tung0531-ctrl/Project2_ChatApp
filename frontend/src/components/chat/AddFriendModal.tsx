// Dialog tim nguoi dung theo username va gui loi moi ket ban ngay trong giao dien chat.
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { UserPlus } from "lucide-react";
import type { User } from "@/types/user";
import { useFriendStore } from "@/stores/useFriendStore";
import { toast } from "sonner";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import UserAvatar from "./UserAvatar";
import UserProfileDialog from "../profile/UserProfileDialog";

// IFormValues kept for backward compat with sub-components still imported elsewhere
export interface IFormValues {
  username: string;
  message: string;
}

const AddFriendModal = () => {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [message, setMessage] = useState("");
  const { loading, searchByUsername, addFriend } = useFriendStore();

  // Debounce search
  useEffect(() => {
    if (!open) {
      setKeyword("");
      setResults([]);
      setSelectedUser(null);
      setProfileUserId(null);
      setProfileOpen(false);
      setMessage("");
      return;
    }

    const trimmed = keyword.trim();

    if (!trimmed) {
      setResults([]);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      const found = await searchByUsername(trimmed);
      setResults(found);
    }, 200);

    return () => window.clearTimeout(timeoutId);
  }, [keyword, open]);

  const handleSend = async () => {
    if (!selectedUser) return;

    const resultMessage = await addFriend(selectedUser._id, message.trim());
    toast.success(resultMessage);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="flex justify-center items-center size-5 rounded-full hover:bg-sidebar-accent cursor-pointer z-10">
          <UserPlus className="size-4" />
          <span className="sr-only">Kết bạn</span>
        </div>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px] border-none">
        <DialogHeader>
          <DialogTitle>Kết Bạn</DialogTitle>
          <DialogDescription>
            Gõ username để tìm người dùng bạn muốn kết bạn.
          </DialogDescription>
        </DialogHeader>

        {!selectedUser ? (
          <div className="space-y-4">
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Gõ username vào đây..."
              className="glass border-border/50 focus:border-primary/50 transition-smooth"
            />

            <div className="space-y-2">
              {results.map((u) => (
                <Card
                  key={u._id}
                  onClick={() => setSelectedUser(u)}
                  className="cursor-pointer border-border/30 p-3 transition-smooth hover:bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      type="chat"
                      name={u.displayName}
                      avatarUrl={u.avatarUrl ?? undefined}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{u.displayName}</p>
                      <p className="text-xs text-muted-foreground">@{u.username}</p>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={(event) => {
                        event.stopPropagation();
                        setProfileUserId(u._id);
                        setProfileOpen(true);
                      }}
                    >
                      Xem profile
                    </Button>
                  </div>
                </Card>
              ))}

              {keyword.trim() && results.length === 0 && !loading && (
                <p className="text-sm text-muted-foreground">
                  Không tìm thấy người dùng phù hợp.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Card className="flex items-center gap-3 border-border/30 bg-background/60 p-3">
              <UserAvatar
                type="chat"
                name={selectedUser.displayName}
                avatarUrl={selectedUser.avatarUrl ?? undefined}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{selectedUser.displayName}</p>
                <p className="text-xs text-muted-foreground">@{selectedUser.username}</p>
              </div>
            </Card>

            <div className="space-y-2">
              <Label htmlFor="friend-message" className="text-sm font-semibold">
                Giới thiệu
              </Label>
              <Textarea
                id="friend-message"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Chào bạn ~ Có thể kết bạn được không?..."
                className="glass resize-none border-border/50 focus:border-primary/50 transition-smooth"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="flex-1 glass hover:text-destructive"
                onClick={() => setSelectedUser(null)}
              >
                Quay lại
              </Button>
              <Button
                type="button"
                disabled={loading}
                onClick={handleSend}
                className="flex-1 bg-gradient-chat text-white hover:opacity-90 transition-smooth"
              >
                {loading ? "Đang gửi..." : (
                  <>
                    <UserPlus className="size-4 mr-2" /> Kết Bạn
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>

      <UserProfileDialog
        userId={profileUserId}
        open={profileOpen}
        setOpen={setProfileOpen}
      />
    </Dialog>
  );
};

export default AddFriendModal;
