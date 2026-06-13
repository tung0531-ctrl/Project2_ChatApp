import { useFriendStore } from "@/stores/useFriendStore";
import { Button } from "../ui/button";
import FriendRequestItem from "./FriendRequestItem";
import { Trash2 } from "lucide-react";

const SentRequests = () => {
  const { sentList, hideSentRequest } = useFriendStore();

  if (!sentList || sentList.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Bạn chưa gửi lời mời kết bạn nào.
      </p>
    );
  }

  return (
    <div className="space-y-3 mt-4">
      <>
        {sentList.map((req) => (
          <FriendRequestItem
            key={req._id}
            requestInfo={req}
            type="sent"
            actions={
              <div className="flex items-center gap-2">
                <p className="text-muted-foreground text-sm">Đang chờ trả lời...</p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => hideSentRequest(req._id)}
                >
                  <Trash2 className="size-4" />
                  Xóa
                </Button>
              </div>
            }
          />
        ))}
      </>
    </div>
  );
};

export default SentRequests;
