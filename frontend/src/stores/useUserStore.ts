import { userService } from "@/services/userService";
import type { UserState } from "@/types/store";
import { create } from "zustand";
import { useAuthStore } from "./useAuthStore";
import { toast } from "sonner";
import { useChatStore } from "./useChatStore";

export const useUserStore = create<UserState>((set) => ({
  loading: false,
  updateAvatarUrl: async (formData) => {
    try {
      set({ loading: true });
      const { user, setUser } = useAuthStore.getState();
      const data = await userService.uploadAvatar(formData);

      if (user) {
        setUser({
          ...user,
          avatarUrl: data.avatarUrl,
        });

        useChatStore.getState().fetchConversations();
      }
    } catch (error) {
      console.error("Lỗi khi updateAvatarUrl", error);
      toast.error("Upload avatar không thành công!");
    } finally {
      set({ loading: false });
    }
  },
  updateProfile: async (payload) => {
    try {
      set({ loading: true });
      const { setUser } = useAuthStore.getState();
      const updatedUser = await userService.updateProfile(payload);

      setUser(updatedUser);
      await useChatStore.getState().fetchConversations();
      toast.success("Cập nhật thông tin thành công!");
    } catch (error) {
      console.error("Lỗi khi updateProfile", error);
      toast.error("Cập nhật thông tin không thành công!");
    } finally {
      set({ loading: false });
    }
  },
  updateAccountSecurity: async (payload) => {
    try {
      set({ loading: true });
      const { setUser } = useAuthStore.getState();
      const updatedUser = await userService.updateAccountSecurity(payload);

      setUser(updatedUser);
      toast.success("Cập nhật tài khoản thành công!");
      return true;
    } catch (error) {
      console.error("Lỗi khi updateAccountSecurity", error);
      toast.error("Cập nhật tài khoản không thành công!");
      return false;
    } finally {
      set({ loading: false });
    }
  },
}));
