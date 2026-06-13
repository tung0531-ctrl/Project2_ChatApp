import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LockKeyhole, UserRound } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useUserStore } from "@/stores/useUserStore";
import type { UpdateAccountSecurityPayload } from "@/types/user";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import { Button } from "../ui/button";

interface AccountSecurityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AccountSecurityDialog = ({
  open,
  onOpenChange,
}: AccountSecurityDialogProps) => {
  const { user } = useAuthStore();
  const { loading, updateAccountSecurity } = useUserStore();
  const [formData, setFormData] = useState<UpdateAccountSecurityPayload>({
    username: "",
    currentPassword: "",
    newPassword: "",
  });

  useEffect(() => {
    if (!open || !user) {
      return;
    }

    setFormData({
      username: user.username ?? "",
      currentPassword: "",
      newPassword: "",
    });
  }, [open, user]);

  if (!user) {
    return null;
  }

  const handleChange = (
    key: keyof UpdateAccountSecurityPayload,
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.username.trim()) {
      toast.warning("Tên tài khoản không được để trống.");
      return;
    }

    if (
      (formData.currentPassword && !formData.newPassword) ||
      (!formData.currentPassword && formData.newPassword)
    ) {
      toast.warning("Hãy nhập đủ mật khẩu cũ và mật khẩu mới để đổi mật khẩu.");
      return;
    }

    const success = await updateAccountSecurity(formData);

    if (success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-md border-border/30 glass-strong">
        <DialogHeader>
          <DialogTitle>Đổi tài khoản & mật khẩu</DialogTitle>
          <DialogDescription>
            Bạn có thể đổi tên tài khoản. Nếu muốn đổi mật khẩu, hãy nhập mật khẩu cũ để xác thực.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={handleSubmit}
          autoComplete="off"
        >
          <div className="space-y-2">
            <Label htmlFor="security-username">
              <UserRound className="size-4" />
              Username
            </Label>
            <Input
              id="security-username"
              name="security-username"
              value={formData.username}
              onChange={(e) => handleChange("username", e.target.value)}
              className="glass-light border-border/30"
              autoComplete="off"
            />
          </div>

          <Separator className="border-border/30" />

          <div className="space-y-2">
            <Label htmlFor="current-password">
              <LockKeyhole className="size-4" />
              Mật khẩu cũ
            </Label>
            <Input
              id="current-password"
              name="current-password"
              type="password"
              value={formData.currentPassword ?? ""}
              onChange={(e) => handleChange("currentPassword", e.target.value)}
              className="glass-light border-border/30"
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">Mật khẩu mới</Label>
            <Input
              id="new-password"
              name="new-password"
              type="password"
              value={formData.newPassword ?? ""}
              onChange={(e) => handleChange("newPassword", e.target.value)}
              className="glass-light border-border/30"
              autoComplete="new-password"
            />
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto bg-gradient-primary hover:opacity-90 transition-opacity"
            >
              {loading ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AccountSecurityDialog;