// Dinh nghia cac endpoint conversation, message history, nhom chat va cau hinh bot theo group.
import express from "express";
import {
  createConversation,
  getAvailableBots,
  getConversations,
  getMessages,
  handleGroupJoinRequest,
  joinGroup,
  kickGroupMember,
  leaveGroup,
  markAsSeen,
  searchJoinableGroups,
  updateGroupJoinApproval,
  updateGroupBots,
  updateGroupDescription,
} from "../controllers/conversationController.js";
import { checkFriendship } from "../middlewares/friendMiddleware.js";

const router = express.Router();

router.post("/", checkFriendship, createConversation);
router.get("/", getConversations);
router.get("/bots/available", getAvailableBots);
router.get("/groups/search", searchJoinableGroups);
router.get("/:conversationId/messages", getMessages);
router.patch("/:conversationId/join", joinGroup);
router.patch("/:conversationId/join-approval", updateGroupJoinApproval);
router.patch("/:conversationId/join-requests/:requestUserId", handleGroupJoinRequest);
router.patch("/:conversationId/seen", markAsSeen);
router.patch("/:conversationId/leave", leaveGroup);
router.patch("/:conversationId/members/:memberId/kick", kickGroupMember);
router.patch("/:conversationId/description", updateGroupDescription);
router.patch("/:conversationId/bots", updateGroupBots);

export default router;
