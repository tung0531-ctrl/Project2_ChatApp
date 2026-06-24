// Dinh nghia cac endpoint lien quan den ban be va loi moi ket ban.
import express from "express";

import {
  acceptFriendRequest,
  sendFriendRequest,
  declineFriendRequest,
  getAllFriends,
  getFriendRequests,
  hideSentFriendRequest,
  unfriend,
} from "../controllers/friendController.js";

const router = express.Router();

router.post("/requests", sendFriendRequest);

router.post("/requests/:requestId/accept", acceptFriendRequest);
router.post("/requests/:requestId/decline", declineFriendRequest);
router.patch("/requests/:requestId/hide", hideSentFriendRequest);

router.get("/", getAllFriends);
router.get("/requests", getFriendRequests);
router.delete("/:friendId", unfriend);

export default router;
