import bcrypt from "bcrypt";
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
    const currentUserId = req.user._id;

    if (!username || username.trim() === "") {
      return res.status(200).json({ users: [] });
    }

    const keyword = username.trim();

    const users = await User.find({
      accountType: "human",
      username: { $regex: keyword, $options: "i" },
      _id: { $ne: currentUserId },
    })
      .select("_id displayName username avatarUrl")
      .limit(10)
      .lean();

    return res.status(200).json({ users });
  } catch (error) {
    console.error("Lỗi xảy ra khi searchUserByUsername", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "Thiếu userId" });
    }

    const user = await User.findById(userId).select(
      "_id username email displayName avatarUrl bio phone createdAt updatedAt"
    );

    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error("Lỗi khi lấy profile người dùng", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const updateMyProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { displayName, email, phone, bio } = req.body;

    const normalizedDisplayName = displayName?.trim();
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedPhone = phone?.trim();
    const normalizedBio = bio?.trim();

    if (!normalizedDisplayName || !normalizedEmail) {
      return res.status(400).json({
        message: "Tên hiển thị và email là bắt buộc.",
      });
    }

    const [existingEmail, existingPhone] = await Promise.all([
      User.findOne({ email: normalizedEmail, _id: { $ne: userId } }).select("_id"),
      normalizedPhone
        ? User.findOne({ phone: normalizedPhone, _id: { $ne: userId } }).select("_id")
        : null,
    ]);

    if (existingEmail) {
      return res.status(409).json({ message: "Email đã được sử dụng." });
    }

    if (existingPhone) {
      return res.status(409).json({ message: "Số điện thoại đã được sử dụng." });
    }

    const updateData = {
      displayName: normalizedDisplayName,
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

export const updateAccountSecurity = async (req, res) => {
  try {
    const userId = req.user._id;
    const { username, currentPassword, newPassword } = req.body;

    const normalizedUsername = username?.trim().toLowerCase();
    const normalizedCurrentPassword = currentPassword?.trim();
    const normalizedNewPassword = newPassword?.trim();

    if (!normalizedUsername) {
      return res.status(400).json({ message: "Tên tài khoản là bắt buộc." });
    }

    if (
      (normalizedCurrentPassword && !normalizedNewPassword) ||
      (!normalizedCurrentPassword && normalizedNewPassword)
    ) {
      return res.status(400).json({
        message: "Muốn đổi mật khẩu thì phải nhập đủ mật khẩu cũ và mật khẩu mới.",
      });
    }

    if (normalizedNewPassword && normalizedNewPassword.length < 6) {
      return res.status(400).json({
        message: "Mật khẩu mới phải có ít nhất 6 ký tự.",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại." });
    }

    const updateData = {};

    if (normalizedUsername !== user.username) {
      const existingUsername = await User.findOne({
        username: normalizedUsername,
        _id: { $ne: userId },
      }).select("_id");

      if (existingUsername) {
        return res.status(409).json({ message: "Tên tài khoản đã được sử dụng." });
      }

      updateData.username = normalizedUsername;
    }

    if (normalizedNewPassword) {
      const passwordCorrect = await bcrypt.compare(
        normalizedCurrentPassword,
        user.hashedPassword,
      );

      if (!passwordCorrect) {
        return res.status(401).json({ message: "Mật khẩu cũ không chính xác." });
      }

      updateData.hashedPassword = await bcrypt.hash(normalizedNewPassword, 10);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "Không có thay đổi nào để lưu." });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: updateData,
      },
      {
        new: true,
        runValidators: true,
      },
    ).select("-hashedPassword");

    return res.status(200).json({ user: updatedUser });
  } catch (error) {
    console.error("Lỗi khi cập nhật thông tin bảo mật", error);
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
