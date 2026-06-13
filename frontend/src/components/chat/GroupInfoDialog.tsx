import { useEffect, useState } from "react";
import type { Conversation } from "@/types/chat";
import { useAuthStore } from "@/stores/useAuthStore";
import { useChatStore } from "@/stores/useChatStore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Card } from "../ui/card";
import UserAvatar from "./UserAvatar";
import { Separator } from "../ui/separator";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { UserX } from "lucide-react";

interface GroupInfoDialogProps {
  convo: Conversation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GroupInfoDialog = ({
  convo,
  open,
  onOpenChange,
}: GroupInfoDialogProps) => {
  const { user } = useAuthStore();
  const { loading, kickGroupMember, updateGroupDescription } = useChatStore();
  const [description, setDescription] = useState("");
  const ownerId = convo.group?.createdBy?.toString?.() ?? convo.group?.createdBy;

  useEffect(() => {
    if (!open) {
      return;
    }

    setDescription(convo.group?.description ?? "");
  }, [convo.group?.description, open]);

  const owner =
    convo.participants.find((participant) => participant._id === ownerId)
      ?.displayName ?? "Không xác định";

  const groupDescription = convo.group?.description?.trim() || "Chưa có mô tả nhóm.";
  const isOwner = user?._id === ownerId;
  const createdAt = new Date(convo.createdAt).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const canKickMembers = isOwner && convo.participants.length > 1;

  const handleSaveDescription = async () => {
    await updateGroupDescription(convo._id, description);
  };

  const handleKickMember = async (memberId: string) => {
    await kickGroupMember(convo._id, memberId);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-h-[85vh] grid-rows-[auto_minmax(0,1fr)] overflow-hidden border-border/30 glass-strong sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{convo.group?.name}</DialogTitle>
          <DialogDescription>
            Thông tin tổng quan của nhóm chat.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="border-border/30 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Tên nhóm
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {convo.group?.name}
              </p>
            </Card>

            <Card className="border-border/30 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Số người trong nhóm
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {convo.participants.length} thành viên
              </p>
            </Card>

            <Card className="border-border/30 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Trưởng nhóm
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">{owner}</p>
            </Card>

            <Card className="border-border/30 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Ngày tạo nhóm
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">{createdAt}</p>
            </Card>

            <Card className="border-border/30 bg-background/60 p-4 sm:col-span-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Mô tả nhóm
                </p>
                {!isOwner && (
                  <p className="mt-1 text-sm leading-relaxed text-foreground">
                    {groupDescription}
                  </p>
                )}
              </div>

              {isOwner ? (
                <div className="mt-3 space-y-3">
                  <Textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="resize-none border-border/30 bg-background"
                  />

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      disabled={loading}
                      onClick={handleSaveDescription}
                      className="bg-gradient-primary hover:opacity-90 transition-opacity"
                    >
                      {loading ? "Đang lưu..." : "Lưu thay đổi"}
                    </Button>
                  </div>
                </div>
              ) : null}
            </Card>
          </div>

          <Separator className="border-border/30" />

          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Thành viên nhóm</h3>
              <p className="text-xs text-muted-foreground">
                Danh sách các thành viên hiện đang có trong nhóm.
              </p>
            </div>

            {convo.participants.map((participant) => {
              const isOwnerParticipant = participant._id === ownerId;
              const canKickParticipant =
                canKickMembers && !isOwnerParticipant && participant._id !== user?._id;

              return (
                <Card
                  key={participant._id}
                  className="flex flex-row items-center justify-between gap-3 border-border/30 bg-background/60 p-3"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <UserAvatar
                      type="chat"
                      name={participant.displayName}
                      avatarUrl={participant.avatarUrl ?? undefined}
                    />

                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate text-left text-sm font-medium">
                        {participant.displayName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isOwnerParticipant ? "Trưởng nhóm" : "Thành viên"}
                      </p>
                    </div>
                  </div>

                  {canKickParticipant ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructiveOutline"
                      disabled={loading}
                      onClick={() => handleKickMember(participant._id)}
                      className="ml-auto shrink-0"
                    >
                      <UserX className="size-4" />
                      Kick
                    </Button>
                  ) : null}
                </Card>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GroupInfoDialog;