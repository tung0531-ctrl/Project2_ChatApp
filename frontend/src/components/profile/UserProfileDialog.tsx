import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { User } from "@/types/user";
import { useUserStore } from "@/stores/useUserStore";
import { useSocketStore } from "@/stores/useSocketStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import UserAvatar from "../chat/UserAvatar";
import { cn } from "@/lib/utils";

interface UserProfileDialogProps {
  userId: string | null;
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}

const UserProfileDialog = ({ userId, open, setOpen }: UserProfileDialogProps) => {
  const { fetchUserProfile, loading } = useUserStore();
  const { onlineUsers } = useSocketStore();
  const [profile, setProfile] = useState<User | null>(null);

  useEffect(() => {
    if (!open || !userId) {
      return;
    }

    const loadProfile = async () => {
      const user = await fetchUserProfile(userId);
      setProfile(user);
    };

    loadProfile();
  }, [open, userId]);

  const isOnline = profile ? onlineUsers.includes(profile._id) : false;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border/30 glass-strong sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Profile người dùng</DialogTitle>
        </DialogHeader>

        {!profile ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            {loading ? "Đang tải profile..." : "Không có dữ liệu profile."}
          </div>
        ) : (
          <div className="space-y-4">
            <Card className="overflow-hidden border-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-0">
              <CardContent className="mt-20 flex flex-col items-center gap-6 pb-8 sm:flex-row sm:items-end">
                <UserAvatar
                  type="profile"
                  name={profile.displayName}
                  avatarUrl={profile.avatarUrl ?? undefined}
                  className="ring-4 ring-white shadow-lg"
                />

                <div className="flex-1 text-center sm:text-left">
                  <h2 className="text-2xl font-semibold tracking-tight text-white">
                    {profile.displayName}
                  </h2>
                  <p className="mt-1 text-sm text-white/75">@{profile.username}</p>
                  <p className="mt-2 max-w-lg text-sm text-white/80">
                    {profile.bio?.trim() || "Người dùng này chưa có tiểu sử."}
                  </p>
                </div>

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

            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="border-border/30 bg-background/60 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {profile.email || "Chưa cập nhật"}
                </p>
              </Card>

              <Card className="border-border/30 bg-background/60 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Số điện thoại</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {profile.phone || "Chưa cập nhật"}
                </p>
              </Card>

              <Card className="border-border/30 bg-background/60 p-4 sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Ngày tham gia</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {profile.createdAt
                    ? new Date(profile.createdAt).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })
                    : "Không xác định"}
                </p>
              </Card>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UserProfileDialog;