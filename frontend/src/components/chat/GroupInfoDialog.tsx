import type { Conversation } from "@/types/chat";
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
  const owner =
    convo.participants.find((participant) => participant._id === convo.group?.createdBy)
      ?.displayName ?? "Không xác định";

  const groupDescription = convo.group?.description?.trim() || "Chưa có mô tả nhóm.";

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-lg border-border/30 glass-strong">
        <DialogHeader>
          <DialogTitle>{convo.group?.name}</DialogTitle>
          <DialogDescription>
            Thông tin tổng quan của nhóm chat.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
                Mô tả nhóm
              </p>
              <p className="mt-1 text-sm leading-relaxed text-foreground">
                {groupDescription}
              </p>
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

          {convo.participants.map((participant) => (
            <Card
              key={participant._id}
              className="flex items-center justify-between gap-3 border-border/30 bg-background/60 p-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <UserAvatar
                  type="chat"
                  name={participant.displayName}
                  avatarUrl={participant.avatarUrl ?? undefined}
                />

                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{participant.displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {participant._id === convo.group?.createdBy
                      ? "Trưởng nhóm"
                      : "Thành viên"}
                  </p>
                </div>
              </div>
            </Card>
          ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GroupInfoDialog;