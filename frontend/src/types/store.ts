// Dinh nghia cac contract TypeScript cho state va actions cua cac Zustand store.
import type { Socket } from "socket.io-client";
import type {
  BotDefinition,
  Conversation,
  Message,
  MessageReaction,
} from "./chat";
import type {
  Friend,
  FriendRequest,
  Notification,
  UpdateAccountSecurityPayload,
  UpdateProfilePayload,
  User,
} from "./user";

export interface AuthState {
  accessToken: string | null;
  user: User | null;
  loading: boolean;

  setAccessToken: (accessToken: string) => void;
  setUser: (user: User) => void;
  clearState: () => void;
  signUp: (
    username: string,
    password: string,
    email: string,
    firstName: string,
    lastName: string
  ) => Promise<void>;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  fetchMe: () => Promise<void>;
  refresh: () => Promise<void>;
}

export interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (dark: boolean) => void;
}

export interface ChatState {
  conversations: Conversation[];
  messages: Record<
    string,
    {
      items: Message[];
      hasMore: boolean; // infinite-scroll
      nextCursor?: string | null; // phân trang
    }
  >;
  activeConversationId: string | null;
  replyMessage: Message | null;
  convoLoading: boolean;
  messageLoading: boolean;
  loading: boolean;
  reset: () => void;

  setActiveConversation: (id: string | null) => void;
  setReplyMessage: (message: Message | null) => void;
  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId?: string) => Promise<void>;
  sendDirectMessage: (
    recipientId: string,
    content: string,
    imgUrl?: string,
    mediaType?: string,
    fileName?: string,
    fileSize?: number,
    replyToMessageId?: string
  ) => Promise<void>;
  sendGroupMessage: (
    conversationId: string,
    content: string,
    imgUrl?: string,
    mediaType?: string,
    fileName?: string,
    fileSize?: number,
    replyToMessageId?: string
  ) => Promise<void>;
  uploadMessageMedia: (
    file: File
  ) => Promise<{ mediaUrl: string; mediaType: string; fileName: string; fileSize: number }>;
  reactToMessage: (messageId: string, emoji: string) => Promise<boolean>;
  togglePinnedMessage: (messageId: string) => Promise<boolean>;
  // add message
  addMessage: (message: Message) => Promise<void>;
  applyMessageReactions: (
    conversationId: string,
    messageId: string,
    reactions: MessageReaction[]
  ) => void;
  // update convo
  updateConversation: (conversation: Partial<Conversation> & { _id: string }) => void;
  markAsSeen: () => Promise<void>;
  addConvo: (convo: Conversation) => void;
  removeConversation: (conversationId: string) => void;
  createConversation: (
    type: "group" | "direct",
    name: string,
    memberIds: string[]
  ) => Promise<void>;
  searchJoinableGroups: (keyword: string) => Promise<Conversation[]>;
  joinGroup: (conversationId: string) => Promise<boolean>;
  leaveGroup: (conversationId: string) => Promise<boolean>;
  kickGroupMember: (conversationId: string, memberId: string) => Promise<boolean>;
  updateGroupDescription: (
    conversationId: string,
    description: string
  ) => Promise<boolean>;
  fetchAvailableBots: () => Promise<BotDefinition[]>;
  updateGroupBots: (conversationId: string, botIds: string[]) => Promise<boolean>;
}

export interface SocketState {
  socket: Socket | null;
  onlineUsers: string[];
  connectSocket: () => void;
  disconnectSocket: () => void;
}

export interface FriendState {
  friends: Friend[];
  loading: boolean;
  receivedList: FriendRequest[];
  sentList: FriendRequest[];
  searchByUsername: (username: string) => Promise<User[]>;
  addFriend: (to: string, message?: string) => Promise<string>;
  getAllFriendRequests: () => Promise<void>;
  acceptRequest: (requestId: string) => Promise<void>;
  declineRequest: (requestId: string) => Promise<void>;
  getFriends: () => Promise<void>;
  unfriend: (friendId: string) => Promise<boolean>;
  hideSentRequest: (requestId: string) => void;
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  reset: () => void;
  fetchNotifications: () => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Notification) => void;
  removeNotificationByFriendRequestId: (friendRequestId: string) => void;
  hideNotification: (notificationId: string) => void;
}

export interface UserState {
  loading: boolean;
  updateAvatarUrl: (formData: FormData) => Promise<void>;
  updateBackgroundUrl: (formData: FormData) => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<void>;
  updateAccountSecurity: (payload: UpdateAccountSecurityPayload) => Promise<boolean>;
  fetchUserProfile: (userId: string) => Promise<User | null>;
}
