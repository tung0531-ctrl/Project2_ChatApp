import mongoose from "mongoose";

const notificationActorSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    username: {
      type: String,
      default: "",
    },
    displayName: {
      type: String,
      default: "",
    },
    avatarUrl: {
      type: String,
      default: null,
    },
  },
  {
    _id: false,
  }
);

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["friend_request", "group_joined", "group_kicked"],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    actor: {
      type: notificationActorSchema,
      default: null,
    },
    groupName: {
      type: String,
      default: "",
      trim: true,
    },
    friendRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FriendRequest",
      default: null,
      index: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      default: null,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;