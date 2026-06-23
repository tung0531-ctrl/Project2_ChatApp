import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema(
  {
    emoji: {
      type: String,
      required: true,
      trim: true,
    },
    userIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      default: [],
    },
  },
  {
    _id: false,
  }
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      trim: true,
    },
    imgUrl: {
      type: String,
    },
    mediaType: {
      type: String,
      default: null,
    },
    fileName: {
      type: String,
      default: null,
      trim: true,
    },
    fileSize: {
      type: Number,
      default: null,
    },
    messageType: {
      type: String,
      enum: ["user", "bot", "system"],
      default: "user",
    },
    botMeta: {
      type: {
        botId: {
          type: String,
          default: null,
        },
        displayName: {
          type: String,
          default: null,
        },
        trigger: {
          type: String,
          default: null,
        },
        avatarUrl: {
          type: String,
          default: null,
        },
      },
      default: null,
      _id: false,
    },
    moderation: {
      type: {
        status: {
          type: String,
          enum: ["clean", "flagged"],
          default: "clean",
        },
        isFlagged: {
          type: Boolean,
          default: false,
          index: true,
        },
        matchedKeywords: {
          type: [String],
          default: [],
        },
        reasonCodes: {
          type: [String],
          default: [],
        },
        flaggedAt: {
          type: Date,
          default: null,
        },
      },
      default: () => ({
        status: "clean",
        isFlagged: false,
        matchedKeywords: [],
        reasonCodes: [],
        flaggedAt: null,
      }),
      _id: false,
    },
    reactions: {
      type: [reactionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ "moderation.isFlagged": 1, createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
