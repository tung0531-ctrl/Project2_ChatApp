// Mongoose model luu direct/group conversation cung metadata unread, seen, pin va bot config.
import mongoose from "mongoose";

const participantSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    joinApprovalEnabled: {
      type: Boolean,
      default: false,
    },
    pendingJoinRequests: {
      type: [
        new mongoose.Schema(
          {
            userId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
              required: true,
            },
            createdAt: {
              type: Date,
              default: Date.now,
            },
          },
          {
            _id: false,
          }
        ),
      ],
      default: [],
    },
    bots: {
      type: [
        new mongoose.Schema(
          {
            botId: {
              type: String,
              required: true,
              trim: true,
            },
            enabled: {
              type: Boolean,
              default: true,
            },
          },
          {
            _id: false,
          }
        ),
      ],
      default: [],
    },
  },
  {
    _id: false,
  }
);

const lastMessageSchema = new mongoose.Schema(
  {
    _id: { type: String },
    content: {
      type: String,
      default: null,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdAt: {
      type: Date,
      default: null,
    },
    imgUrl: {
      type: String,
      default: null,
    },
    mediaType: {
      type: String,
      default: null,
    },
    fileName: {
      type: String,
      default: null,
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
        botId: { type: String, default: null },
        displayName: { type: String, default: null },
        trigger: { type: String, default: null },
        avatarUrl: { type: String, default: null },
      },
      default: null,
      _id: false,
    },
  },
  {
    _id: false,
  }
);

const messageReferenceSchema = new mongoose.Schema(
  {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      default: null,
    },
    imgUrl: {
      type: String,
      default: null,
    },
    mediaType: {
      type: String,
      default: null,
    },
    fileName: {
      type: String,
      default: null,
    },
    messageType: {
      type: String,
      enum: ["user", "bot", "system"],
      default: "user",
    },
    botMeta: {
      type: {
        botId: { type: String, default: null },
        displayName: { type: String, default: null },
        trigger: { type: String, default: null },
        avatarUrl: { type: String, default: null },
      },
      default: null,
      _id: false,
    },
    createdAt: {
      type: Date,
      default: null,
    },
    pinnedAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  }
);

const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["direct", "group"],
      required: true,
    },
    participants: {
      type: [participantSchema],
      required: true,
    },
    group: {
      type: groupSchema,
    },
    lastMessageAt: {
      type: Date,
    },
    seenBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    lastMessage: {
      type: lastMessageSchema,
      default: null,
    },
    pinnedMessage: {
      type: messageReferenceSchema,
      default: null,
    },
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

conversationSchema.index({
  "participant.userId": 1,
  lastMessageAt: -1,
});

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation;
