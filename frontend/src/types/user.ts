export interface User {
  _id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  phone?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateProfilePayload {
  displayName: string;
  email: string;
  phone?: string;
  bio?: string;
}

export interface UpdateAccountSecurityPayload {
  username: string;
  currentPassword?: string;
  newPassword?: string;
}

export interface Friend {
  _id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

export interface FriendRequest {
  _id: string;
  from?: {
    _id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  to?: {
    _id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  message: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationActor {
  _id?: string | null;
  username?: string;
  displayName?: string;
  avatarUrl?: string | null;
}

export interface Notification {
  _id: string;
  type: "friend_request" | "group_joined" | "group_kicked";
  title: string;
  message: string;
  actor?: NotificationActor | null;
  groupName?: string;
  friendRequestId?: string | null;
  conversationId?: string | null;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}
