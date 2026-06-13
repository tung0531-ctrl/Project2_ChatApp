import express from "express";

import {
  uploadChatMedia,
  sendDirectMessage,
  sendGroupMessage,
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

export default router;
