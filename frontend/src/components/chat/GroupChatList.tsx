// Hien danh sach group conversations, loc theo tu khoa va sap theo state chat hien tai.
import { useChatStore } from "@/stores/useChatStore";
import GroupChatCard from "./GroupChatCard";

const GroupChatList = ({ keyword = "" }: { keyword?: string }) => {
  const { conversations } = useChatStore();

  if (!conversations) return;

  const normalizedKeyword = keyword.trim().toLowerCase();
  const groupchats = conversations.filter((convo) => {
    if (convo.type !== "group") {
      return false;
    }

    if (!normalizedKeyword) {
      return true;
    }

    return (convo.group?.name ?? "").toLowerCase().includes(normalizedKeyword);
  });

  if (normalizedKeyword) {
    groupchats.sort((left, right) => {
      const leftName = (left.group?.name ?? "").toLowerCase();
      const rightName = (right.group?.name ?? "").toLowerCase();
      const leftIndex = leftName.indexOf(normalizedKeyword);
      const rightIndex = rightName.indexOf(normalizedKeyword);

      if (leftIndex !== rightIndex) {
        return leftIndex - rightIndex;
      }

      if (leftName.length !== rightName.length) {
        return leftName.length - rightName.length;
      }

      return leftName.localeCompare(rightName);
    });
  }

  return (
    <div className="beautiful-scrollbar h-full min-h-0 overflow-y-auto p-2 space-y-2">
      {groupchats.map((convo) => (
        <GroupChatCard
          convo={convo}
          key={convo._id}
        />
      ))}
    </div>
  );
};

export default GroupChatList;
