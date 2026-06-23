import api from "@/lib/axios";
import type {
  BotDefinition,
  Conversation,
  ConversationResponse,
  GroupSearchResponse,
  Message,
} from "@/types/chat";

interface FetchMessageProps {
  messages: Message[];
  cursor?: string;
}

interface UploadMessageMediaResponse {
  mediaUrl: string;
  mediaType: string;
  fileName: string;
  fileSize: number;
}

const pageLimit = 50;

export const chatService = {
  async fetchConversations(): Promise<ConversationResponse> {
    const res = await api.get("/conversations");
    return res.data;
  },

  async fetchMessages(id: string, cursor?: string): Promise<FetchMessageProps> {
    const res = await api.get(
      `/conversations/${id}/messages?limit=${pageLimit}&cursor=${cursor}`
    );

    return { messages: res.data.messages, cursor: res.data.nextCursor };
  },

  async sendDirectMessage(
    recipientId: string,
    content: string = "",
    imgUrl?: string,
    mediaType?: string,
    fileName?: string,
    fileSize?: number,
    conversationId?: string
  ) {
    const res = await api.post("/messages/direct", {
      recipientId,
      content,
      imgUrl,
      mediaType,
      fileName,
      fileSize,
      conversationId,
    });

    return res.data.message;
  },

  async sendGroupMessage(
    conversationId: string,
    content: string = "",
    imgUrl?: string,
    mediaType?: string,
    fileName?: string,
    fileSize?: number
  ) {
    const res = await api.post("/messages/group", {
      conversationId,
      content,
      imgUrl,
      mediaType,
      fileName,
      fileSize,
    });
    return res.data.message;
  },

  async uploadMessageMedia(file: File): Promise<UploadMessageMediaResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await api.post("/messages/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return res.data;
  },

  async markAsSeen(conversationId: string) {
    const res = await api.patch(`/conversations/${conversationId}/seen`);
    return res.data;
  },

  async createConversation(
    type: "direct" | "group",
    name: string,
    memberIds: string[]
  ) {
    const res = await api.post("/conversations", { type, name, memberIds });
    return res.data.conversation;
  },

  async searchJoinableGroups(keyword: string): Promise<GroupSearchResponse> {
    const res = await api.get(`/conversations/groups/search?name=${encodeURIComponent(keyword)}`);
    return res.data;
  },

  async joinGroup(conversationId: string): Promise<Conversation> {
    const res = await api.patch(`/conversations/${conversationId}/join`);
    return res.data.conversation;
  },

  async leaveGroup(conversationId: string): Promise<Conversation> {
    const res = await api.patch(`/conversations/${conversationId}/leave`);
    return res.data.conversation;
  },

  async kickGroupMember(
    conversationId: string,
    memberId: string
  ): Promise<Conversation> {
    const res = await api.patch(
      `/conversations/${conversationId}/members/${memberId}/kick`
    );
    return res.data.conversation;
  },

  async updateGroupDescription(
    conversationId: string,
    description: string
  ): Promise<Conversation> {
    const res = await api.patch(`/conversations/${conversationId}/description`, {
      description,
    });
    return res.data.conversation;
  },

  async fetchAvailableBots(): Promise<BotDefinition[]> {
    const res = await api.get("/conversations/bots/available");
    return res.data.bots;
  },

  async updateGroupBots(
    conversationId: string,
    botIds: string[]
  ): Promise<Conversation> {
    const res = await api.patch(`/conversations/${conversationId}/bots`, {
      botIds,
    });
    return res.data.conversation;
  },
};
