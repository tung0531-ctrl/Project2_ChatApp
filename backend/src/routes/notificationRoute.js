import express from "express";
import {
  getNotifications,
  markAllNotificationsAsRead,
} from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", getNotifications);
router.patch("/read-all", markAllNotificationsAsRead);

export default router;