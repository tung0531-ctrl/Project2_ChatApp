import type { User } from "@/types/user";
import { Card, CardContent } from "../ui/card";
import UserAvatar from "../chat/UserAvatar";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import { useSocketStore } from "@/stores/useSocketStore";
import AvatarUploader from "./AvatarUploader";
import BackgroundUploader from "./BackgroundUploader";

interface ProfileCardProps {
  user: User | null;
}

const ProfileCard = ({ user }: ProfileCardProps) => {
  const { onlineUsers } = useSocketStore();
  if (!user) return;

  if (!user.bio) {
    user.bio = "Hello!";
  }

  const isOnline = onlineUsers.includes(user._id) ? true : false;

  return (
    <Card className="relative overflow-hidden p-0 h-52">
      {user.backgroundUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${user.backgroundUrl})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/45" />
      <BackgroundUploader />

      <CardContent className="relative z-10 mt-20 pb-8 flex flex-col sm:flex-row items-center sm:items-end gap-6">
        <div className="relative">
          <UserAvatar
            type="profile"
            name={user.displayName}
            avatarUrl={user.avatarUrl ?? undefined}
            className="ring-4 ring-white shadow-lg"
          />

          <AvatarUploader />
        </div>

        {/* user info */}
        <div className="text-center sm:text-left flex-1">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            {user.displayName}
          </h1>
        </div>

        {/* status */}
        <Badge
          className={cn(
            "flex items-center gap-1 capitalize",
            isOnline ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"
          )}
        >
          <div
            className={cn(
              "size-2 rounded-full",
              isOnline ? "bg-green-500 animate-pulse" : "bg-slate-500"
            )}
          />

          {isOnline ? "online" : "offline"}
        </Badge>
      </CardContent>
    </Card>
  );
};

export default ProfileCard;
