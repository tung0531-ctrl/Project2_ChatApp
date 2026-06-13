import express from "express";
import {
  createConversation,
  getConversations,
  getMessages,
  leaveGroup,
  markAsSeen,
  updateGroupDescription,
} from "../controllers/conversationController.js";
import { checkFriendship } from "../middlewares/friendMiddleware.js";

const router = express.Router();

router.post("/", checkFriendship, createConversation);
router.get("/", getConversations);
router.get("/:conversationId/messages", getMessages);
router.patch("/:conversationId/seen", markAsSeen);
router.patch("/:conversationId/leave", leaveGroup);
router.patch("/:conversationId/description", updateGroupDescription);

export default router;
