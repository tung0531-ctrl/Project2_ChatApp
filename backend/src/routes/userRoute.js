import express from "express";
import {
  authMe,
  getUserProfile,
  searchUserByUsername,
  updateAccountSecurity,
  updateMyProfile,
  uploadAvatar,
  uploadBackground,
} from "../controllers/userController.js";
import { upload } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router.get("/me", authMe);
router.patch("/me", updateMyProfile);
router.patch("/security", updateAccountSecurity);
router.get("/search", searchUserByUsername);
router.get("/:userId/profile", getUserProfile);
router.post("/uploadAvatar", upload.single("file"), uploadAvatar);
router.post("/uploadBackground", upload.single("file"), uploadBackground);

export default router;
