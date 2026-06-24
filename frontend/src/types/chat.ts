// Dinh nghia cac contract TypeScript cho conversation, message, bot va participant trong chat domain.
export interface Participant {
  _id: string;
  username?: string;
  displayName: string;
  avatarUrl?: string | null;
  joinedAt: string;
}

export interface BotConfig {
  botId: string;
  enabled: boolean;
}

export interface PendingJoinRequest {
  userId: string;
  username?: string;
  displayName: string;
  avatarUrl?: string | null;
  createdAt: string;
}

export interface BotDefinition {
  botId: string;
  displayName: string;
  trigger: string;
  description: string;
}

export interface BotMeta {
  botId: string;
  displayName: string;
  trigger: string;
  avatarUrl?: string | null;
}

export interface MessageReaction {
  emoji: string;
  userIds: string[];
}

export interface MessageReference {
  messageId: string;
  senderId: string;
  content: string | null;
  imgUrl?: string | null;
  mediaType?: string | null;
  fileName?: string | null;
  messageType?: "user" | "bot" | "system";
  botMeta?: BotMeta | null;
  createdAt?: string | null;
  pinnedAt?: string | null;
}

export interface SeenUser {
  _id: string;
  displayName?: string;
  avatarUrl?: string | null;
}

export type SeenUserRef = SeenUser | string;

export interface Group {
  name: string;
  description?: string;
  createdBy: string;
  joinApprovalEnabled?: boolean;
  pendingJoinRequests?: PendingJoinRequest[];
  bots?: BotConfig[];
}

export interface LastMessage {
  _id: string;
  content: string | null;
  createdAt: string;
  imgUrl?: string | null;
  mediaType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  messageType?: "user" | "bot" | "system";
  botMeta?: BotMeta | null;
  sender: {
    _id: string;
    displayName: string;
    avatarUrl?: string | null;
  };
}

export interface Conversation {
  _id: string;
  type: "direct" | "group";
  group: Group;
  participants: Participant[];
  pinnedMessage?: MessageReference | null;
  lastMessageAt: string;
  seenBy: SeenUserRef[];
  lastMessage: LastMessage | null;
  unreadCounts: Record<string, number>; // key = userId, value = unread count
  createdAt: string;
  updatedAt: string;
}


export interface ConversationResponse {
  conversations: Conversation[];
}

export interface GroupSearchResponse {
  groups: Conversation[];
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  content: string | null;
  imgUrl?: string | null;
  mediaType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  messageType?: "user" | "bot" | "system";
  botMeta?: BotMeta | null;
  reactions?: MessageReaction[];
  replyTo?: MessageReference | null;
  updatedAt?: string | null;
  createdAt: string;
  isOwn?: boolean;
}
