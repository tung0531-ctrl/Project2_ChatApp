import { useFriendStore } from "@/stores/useFriendStore";
import { useChatStore } from "@/stores/useChatStore";
import DirectMessageCard from "./DirectMessageCard";

const DirectMessageList = ({ keyword = "" }: { keyword?: string }) => {
  const { conversations } = useChatStore();
  const { friends } = useFriendStore();

  const normalizedKeyword = keyword.trim().toLowerCase();

  const directConversations = conversations.filter(
    (convo) => convo.type === "direct"
  );

  const friendItems = friends
    .filter((friend) => {
      if (!normalizedKeyword) {
        return true;
      }

      return (
        friend.displayName.toLowerCase().includes(normalizedKeyword) ||
        friend.username.toLowerCase().includes(normalizedKeyword)
      );
    })
    .map((friend) => {
      const convo = directConversations.find((conversation) =>
        conversation.participants.some((participant) => participant._id === friend._id)
      );

      return {
        friend,
        convo,
        originalIndex: friends.findIndex((item) => item._id === friend._id),
      };
    })
    .sort((left, right) => {
      const leftLastActivity = left.convo?.lastMessage?.createdAt
        ? new Date(left.convo.lastMessage.createdAt).getTime()
        : 0;
      const rightLastActivity = right.convo?.lastMessage?.createdAt
        ? new Date(right.convo.lastMessage.createdAt).getTime()
        : 0;

      if (leftLastActivity !== rightLastActivity) {
        return rightLastActivity - leftLastActivity;
      }

      return left.originalIndex - right.originalIndex;
    });

  return (
    <div className="beautiful-scrollbar h-full min-h-0 overflow-y-auto p-2 space-y-2">
      {friendItems.map(({ friend, convo }) => (
        <DirectMessageCard
          key={friend._id}
          friend={friend}
          convo={convo}
        />
      ))}

      {friendItems.length === 0 && (
        <p className="px-2 py-3 text-sm text-muted-foreground">
          {normalizedKeyword
            ? "Không tìm thấy bạn bè phù hợp."
            : "Bạn chưa có bạn bè nào trong danh sách."}
        </p>
      )}
    </div>
  );
};

export default DirectMessageList;
