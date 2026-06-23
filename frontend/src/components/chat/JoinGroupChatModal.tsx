import { useEffect, useMemo, useState } from "react";
import { Plus, Users } from "lucide-react";
import { useChatStore } from "@/stores/useChatStore";
import type { Conversation } from "@/types/chat";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card } from "../ui/card";

const JoinGroupChatModal = () => {
  const { loading, searchJoinableGroups, joinGroup } = useChatStore();
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [groups, setGroups] = useState<Conversation[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Conversation | null>(null);

  useEffect(() => {
    if (!open) {
      setKeyword("");
      setGroups([]);
      setSelectedGroup(null);
      return;
    }

    const normalizedKeyword = keyword.trim();

    if (!normalizedKeyword) {
      setGroups([]);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      const foundGroups = await searchJoinableGroups(normalizedKeyword);
      setGroups(foundGroups);
    }, 200);

    return () => window.clearTimeout(timeoutId);
  }, [keyword, open, searchJoinableGroups]);

  const memberCount = useMemo(
    () => selectedGroup?.participants.length ?? 0,
    [selectedGroup],
  );

  const handleJoinGroup = async () => {
    if (!selectedGroup) {
      return;
    }

    const success = await joinGroup(selectedGroup._id);

    if (success) {
      setOpen(false);
    }
  };

  const handleSelectGroup = (group: Conversation) => {
    setSelectedGroup(group);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="flex z-10 size-5 items-center justify-center rounded-full transition hover:bg-sidebar-accent"
        >
          <Plus className="size-4" />
          <span className="sr-only">Tham gia nhóm chat</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px] border-none">
        <DialogHeader>
          <DialogTitle>Tham gia nhóm chat</DialogTitle>
          <DialogDescription>
            Gõ tên nhóm để tìm nhóm chat đang có sẵn.
          </DialogDescription>
        </DialogHeader>

        {!selectedGroup ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Gõ tên nhóm chat vào đây..."
                className="glass border-border/50 focus:border-primary/50 transition-smooth"
              />
            </div>

            <div className="space-y-2">
              {groups.map((group) => (
                <Card
                  key={group._id}
                  onClick={() => handleSelectGroup(group)}
                  className="cursor-pointer border-border/30 p-3 transition-smooth hover:bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-gradient-chat text-white">
                      <Users className="size-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{group.group?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {group.participants.length} thành viên
                      </p>
                    </div>
                  </div>
                </Card>
              ))}

              {keyword.trim() && groups.length === 0 && !loading && (
                <p className="text-sm text-muted-foreground">
                  Không tìm thấy nhóm chat phù hợp.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Card className="border-border/30 bg-background/60 p-4">
              <p className="text-sm leading-relaxed text-foreground">
                Bạn có muốn tham gia nhóm chat <span className="font-semibold">{selectedGroup.group?.name}</span> không?
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Nhóm hiện có {memberCount} thành viên.
              </p>
            </Card>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedGroup(null)}
              >
                Quay lại
              </Button>
              <Button
                type="button"
                disabled={loading}
                onClick={handleJoinGroup}
                className="bg-gradient-primary hover:opacity-90 transition-opacity"
              >
                {loading ? "Đang tham gia..." : "Có, tham gia"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default JoinGroupChatModal;