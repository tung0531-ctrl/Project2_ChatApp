import type { Participant, SeenUserRef } from "@/types/chat";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

interface SeenByAvatarsProps {
  seenBy: SeenUserRef[];
  participants: Participant[];
  maxVisible?: number;
}

const SeenByAvatars = ({
  seenBy,
  participants,
  maxVisible = 5,
}: SeenByAvatarsProps) => {
  const normalizedUsers = seenBy
    .map((seenUser) => {
      const seenUserId = typeof seenUser === "string" ? seenUser : seenUser._id;
      const participant = participants.find((member) => member._id === seenUserId);

      if (!seenUserId) {
        return null;
      }

      return {
        _id: seenUserId,
        displayName:
          (typeof seenUser === "string" ? undefined : seenUser.displayName) ??
          participant?.displayName ??
          "ChatApp",
        avatarUrl:
          (typeof seenUser === "string" ? undefined : seenUser.avatarUrl) ??
          participant?.avatarUrl ??
          undefined,
      };
    })
    .filter(
      (seenUser, index, users): seenUser is NonNullable<typeof seenUser> =>
        !!seenUser && users.findIndex((user) => user?._id === seenUser._id) === index,
    );

  if (normalizedUsers.length === 0) {
    return null;
  }

  const visibleUsers = normalizedUsers.slice(0, maxVisible);
  const hiddenCount = normalizedUsers.length - visibleUsers.length;

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <div className="flex -space-x-1">
        {visibleUsers.map((seenUser) => (
          <Avatar
            key={seenUser._id}
            className="size-5 border border-background"
            title={seenUser.displayName}
          >
            <AvatarImage
              src={seenUser.avatarUrl}
              alt={seenUser.displayName}
            />
            <AvatarFallback className="bg-blue-500 text-[10px] font-semibold text-white">
              {seenUser.displayName.charAt(0)}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>

      {hiddenCount > 0 && <span>+{hiddenCount} more...</span>}
    </div>
  );
};

export default SeenByAvatars;