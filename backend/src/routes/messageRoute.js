// Dinh nghia cac endpoint gui tin nhan, upload media va thao tac tren message.
import express from "express";

import {
  uploadChatMedia,
  sendDirectMessage,
  sendGroupMessage,
  toggleMessageReaction,
  togglePinnedMessage,
} from "../controllers/messageController.js";
import {
  checkFriendship,
  checkGroupMembership,
} from "../middlewares/friendMiddleware.js";
import { uploadMedia } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router.post("/upload", uploadMedia.single("file"), uploadChatMedia);
router.post("/direct", checkFriendship, sendDirectMessage);
router.post("/group", checkGroupMembership, sendGroupMessage);
router.patch("/:messageId/reactions", toggleMessageReaction);
router.patch("/:messageId/pin", togglePinnedMessage);

export default router;
