// Gom cac API profile, bao mat tai khoan va upload avatar/background cua user.
import api from "@/lib/axios";
import type {
  UpdateAccountSecurityPayload,
  UpdateProfilePayload,
  User,
} from "@/types/user";

export const userService = {
  uploadAvatar: async (formData: FormData) => {
    const res = await api.post("/users/uploadAvatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    if (res.status === 400) {
      throw new Error(res.data.message);
    }

    return res.data;
  },

  uploadBackground: async (formData: FormData) => {
    const res = await api.post("/users/uploadBackground", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    if (res.status === 400) {
      throw new Error(res.data.message);
    }

    return res.data;
  },

  updateProfile: async (payload: UpdateProfilePayload) => {
    const res = await api.patch("/users/me", payload);
    return res.data.user;
  },

  updateAccountSecurity: async (payload: UpdateAccountSecurityPayload) => {
    const res = await api.patch("/users/security", payload);
    return res.data.user;
  },

  fetchUserProfile: async (userId: string): Promise<User> => {
    const res = await api.get(`/users/${userId}/profile`);
    return res.data.user;
  },
};
