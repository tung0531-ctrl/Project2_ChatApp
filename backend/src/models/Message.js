import mongoose from "mongoose";

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
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ conversationId: 1, createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
