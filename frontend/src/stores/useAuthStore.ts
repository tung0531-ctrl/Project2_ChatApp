// Zustand store quan ly phien dang nhap, user hien tai va cac thao tac auth tren client.
import { create } from "zustand";
import { toast } from "sonner";
import { authService } from "@/services/authService";
import type { AuthState } from "@/types/store";
import { createJSONStorage, persist } from "zustand/middleware";
import { useChatStore } from "./useChatStore";
import { useNotificationStore } from "./useNotificationStore";

const AUTH_STORAGE_KEY = "auth-storage";
const CHAT_STORAGE_KEY = "chat-storage";

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      loading: false,

      setAccessToken: (accessToken) => {
        set({ accessToken });
      },
      setUser: (user) => {
        set({ user });
      },
      clearState: () => {
        set({ accessToken: null, user: null, loading: false });
        useChatStore.getState().reset();
        useNotificationStore.getState().reset();
        sessionStorage.removeItem(AUTH_STORAGE_KEY);
        sessionStorage.removeItem(CHAT_STORAGE_KEY);
      },
      signUp: async (username, password, email, firstName, lastName) => {
        try {
          set({ loading: true });

          //  gọi api
          await authService.signUp(username, password, email, firstName, lastName);

          toast.success(
            "Đăng ký thành công! Bạn sẽ được chuyển sang trang đăng nhập."
          );
        } catch (error) {
          console.error(error);
          toast.error("Đăng ký không thành công");
        } finally {
          set({ loading: false });
        }
      },
      signIn: async (username, password) => {
        try {
          get().clearState();
          set({ loading: true });

          const { accessToken } = await authService.signIn(username, password);
          get().setAccessToken(accessToken);

          await get().fetchMe();
          useChatStore.getState().fetchConversations();

          toast.success("Chào mừng bạn quay lại với ChatApp 🎉");
        } catch (error) {
          console.error(error);
          toast.error("Đăng nhập không thành công!");
        } finally {
          set({ loading: false });
        }
      },
      signOut: async () => {
        try {
          get().clearState();
          await authService.signOut();
          toast.success("Logout thành công!");
        } catch (error) {
          console.error(error);
          toast.error("Lỗi xảy ra khi logout. Hãy thử lại!");
        }
      },
      fetchMe: async () => {
        try {
          set({ loading: true });
          const user = await authService.fetchMe();

          set({ user });
        } catch (error) {
          console.error(error);
          set({ user: null, accessToken: null });
          toast.error("Lỗi xảy ra khi lấy dữ liệu người dùng. Hãy thử lại!");
        } finally {
          set({ loading: false });
        }
      },
      refresh: async () => {
        try {
          set({ loading: true });
          const { user, fetchMe, setAccessToken } = get();
          const currentUserId = user?._id ?? null;
          const { accessToken, userId } = await authService.refresh();

          if (currentUserId && currentUserId !== userId) {
            throw new Error("AUTH_USER_MISMATCH");
          }

          setAccessToken(accessToken);

          if (!user) {
            await fetchMe();
          }
        } catch (error) {
          console.error(error);
          get().clearState();

          if (error instanceof Error && error.message === "AUTH_USER_MISMATCH") {
            toast.error(
              "Phát hiện phiên đăng nhập của tài khoản khác trong cùng trình duyệt. Hãy đăng nhập lại hoặc dùng trình duyệt/profile riêng cho mỗi tài khoản."
            );
          } else {
            toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
          }
        } finally {
          set({ loading: false });
        }
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
      }),
    }
  )
);
