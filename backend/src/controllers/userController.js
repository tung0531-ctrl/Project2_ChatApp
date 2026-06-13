import { uploadImageFromBuffer } from "../middlewares/uploadMiddleware.js";
import User from "../models/User.js";

export const authMe = async (req, res) => {
  try {
    const user = req.user; // lấy từ authMiddleware

    return res.status(200).json({
      user,
    });
  } catch (error) {
    console.error("Lỗi khi gọi authMe", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const searchUserByUsername = async (req, res) => {
  try {
    const { username } = req.query;

    if (!username || username.trim() === "") {
      return res.status(400).json({ message: "Cần cung cấp username trong query." });
    }

    const user = await User.findOne({ username }).select(
      "_id displayName username avatarUrl"
    );

    return res.status(200).json({ user });
  } catch (error) {
    console.error("Lỗi xảy ra khi searchUserByUsername", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const updateMyProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { displayName, username, email, phone, bio } = req.body;

    const normalizedDisplayName = displayName?.trim();
    const normalizedUsername = username?.trim().toLowerCase();
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedPhone = phone?.trim();
    const normalizedBio = bio?.trim();

    if (!normalizedDisplayName || !normalizedUsername || !normalizedEmail) {
      return res.status(400).json({
        message: "Tên hiển thị, tên người dùng và email là bắt buộc.",
      });
    }

    const [existingUsername, existingEmail, existingPhone] = await Promise.all([
      User.findOne({ username: normalizedUsername, _id: { $ne: userId } }).select("_id"),
      User.findOne({ email: normalizedEmail, _id: { $ne: userId } }).select("_id"),
      normalizedPhone
        ? User.findOne({ phone: normalizedPhone, _id: { $ne: userId } }).select("_id")
        : null,
    ]);

    if (existingUsername) {
      return res.status(409).json({ message: "Tên người dùng đã được sử dụng." });
    }

    if (existingEmail) {
      return res.status(409).json({ message: "Email đã được sử dụng." });
    }

    if (existingPhone) {
      return res.status(409).json({ message: "Số điện thoại đã được sử dụng." });
    }

    const updateData = {
      displayName: normalizedDisplayName,
      username: normalizedUsername,
      email: normalizedEmail,
    };

    const unsetData = {};

    if (normalizedPhone) {
      updateData.phone = normalizedPhone;
    } else {
      unsetData.phone = "";
    }

    if (normalizedBio) {
      updateData.bio = normalizedBio;
    } else {
      unsetData.bio = "";
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: updateData,
        ...(Object.keys(unsetData).length > 0 ? { $unset: unsetData } : {}),
      },
      {
        new: true,
        runValidators: true,
      }
    ).select("-hashedPassword");

    return res.status(200).json({ user: updatedUser });
  } catch (error) {
    console.error("Lỗi khi cập nhật thông tin cá nhân", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const uploadAvatar = async (req, res) => {
  try {
    const file = req.file;
    const userId = req.user._id;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const result = await uploadImageFromBuffer(file.buffer);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        avatarUrl: result.secure_url,
        avatarId: result.public_id,
      },
      {
        new: true,
      }
    ).select("avatarUrl");

    if (!updatedUser.avatarUrl) {
      return res.status(400).json({ message: "Avatar trả về null" });
    }

    return res.status(200).json({ avatarUrl: updatedUser.avatarUrl });
  } catch (error) {
    console.error("Lỗi xảy ra khi upload avatar", error);
    return res.status(500).json({ message: "Upload failed" });
  }
};
