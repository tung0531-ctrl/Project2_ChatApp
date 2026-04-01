import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protectedRoute = async (req, res, next) => {
    try {
        // Lấy token từ header Authorization
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({ message: "Không có token, truy cập bị từ chối." });
        }
        // Xác minh token
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decoded) => {
            if (err) {
                console.error(err)
                return res.status(403).json({ message: "Token không hợp lệ." });
            }

            const user = await User.findByPk(decoded.userId);
            if (!user) {
                return res.status(404).json({ message: "Người dùng không tồn tại." });
            }
            const { passwordHash, ...userWithoutPassword } = user.toJSON();
            req.user = userWithoutPassword;
            next();
        })
    } catch (error) {
        console.error("Lỗi xác minh JWT trong authMiddleware:", error);
        return res.status(500).json({ message: "Lỗi máy chủ nội bộ." });
    }
}