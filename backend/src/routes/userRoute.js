import express from "express";
import {
  authMe,
  searchUserByUsername,
  updateMyProfile,
  uploadAvatar,
} from "../controllers/userController.js";
import { upload } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router.get("/me", authMe);
router.patch("/me", updateMyProfile);
router.get("/search", searchUserByUsername);
router.post("/uploadAvatar", upload.single("file"), uploadAvatar);

export default router;
