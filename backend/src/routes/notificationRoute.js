// Dinh nghia cac endpoint thao tac voi thong bao cua nguoi dung.
import express from "express";
import {
  getNotifications,
  hideNotification,
  markAllNotificationsAsRead,
} from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", getNotifications);
router.patch("/read-all", markAllNotificationsAsRead);
router.patch("/:notificationId/hide", hideNotification);

export default router;