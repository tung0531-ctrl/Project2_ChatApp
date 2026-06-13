import { useState } from "react";
import { Info, LogOut, MoreHorizontal } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useChatStore } from "@/stores/useChatStore";
import type { Conversation } from "@/types/chat";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import GroupInfoDialog from "./GroupInfoDialog";

const GroupChatActions = ({ convo }: { convo: Conversation }) => {
  const { user } = useAuthStore();
  const { leaveGroup, loading } = useChatStore();
  const [openInfo, setOpenInfo] = useState(false);

  const handleLeaveGroup = async () => {
    const isMember = convo.participants.some((participant) => participant._id === user?._id);

    if (!isMember) {
      return;
    }

    await leaveGroup(convo._id);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:bg-muted/50"
            onClick={(event) => event.stopPropagation()}
          >
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Tùy chọn nhóm chat</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          onClick={(event) => event.stopPropagation()}
        >
          <DropdownMenuItem onClick={() => setOpenInfo(true)}>
            <Info className="size-4" />
            Xem thông tin
          </DropdownMenuItem>

          <DropdownMenuItem
            variant="destructive"
            disabled={loading}
            onClick={handleLeaveGroup}
          >
            <LogOut className="size-4" />
            Rời nhóm
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <GroupInfoDialog
        convo={convo}
        open={openInfo}
        onOpenChange={setOpenInfo}
      />
    </>
  );
};

export default GroupChatActions;