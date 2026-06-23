export interface Participant {
  _id: string;
  displayName: string;
  avatarUrl?: string | null;
  joinedAt: string;
}

export interface BotConfig {
  botId: string;
  enabled: boolean;
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
  updatedAt?: string | null;
  createdAt: string;
  isOwn?: boolean;
}
