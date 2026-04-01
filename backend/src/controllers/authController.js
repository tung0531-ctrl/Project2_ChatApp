//file này có rất nhiều điểm khác biệt giữa cú pháp của Mongoose và Sequelize nên cần lưu ý

import User from "../models/User.js";
import Session from "../models/Session.js";
import { Op } from "sequelize";
import { sequelize } from "../libs/db.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const ACCESS_TOKEN_TTL = "30s";
const REFRESH_TOKEN_TTL = 14 * 24 * 60 * 60 * 1000; // 14 ngày

export const signUp = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        console.debug('signUp request body:', req.body);
        const { username, password, email, firstName, lastName } = req.body;

        if (!username || !email || !password || !firstName || !lastName) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng điền đầy đủ thông tin."
            });
        }

        // kiểm tra trùng username hoặc email
        const normalizedUsername = username.trim().toLowerCase();
        const normalizedEmail = email.trim().toLowerCase();

        const existing = await User.findOne({
            where: {
                [Op.or]: [{ username: normalizedUsername }, { email: normalizedEmail }]
            },
            attributes: ["username", "email"],
            transaction
        });

        if (existing) {
            await transaction.rollback();
            return res.status(409).json({
                success: false,
                message:
                    existing.username === username
                        ? "Username đã tồn tại."
                        : "Email đã tồn tại."
            });
        }

        // hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // tạo user
        await User.create(
            {
                username: normalizedUsername,
                email: normalizedEmail,
                fullName: `${firstName} ${lastName}`,
                passwordHash: hashedPassword,
            },
            { transaction }
        );

        await transaction.commit();

        return res.sendStatus(204);
    } catch (error) {
        await transaction.rollback();
        console.error("Lỗi signUp:", error);

        if (error.name === "SequelizeValidationError") {
            return res.status(400).json({
                success: false,
                message: "Dữ liệu không hợp lệ",
                errors: error.errors.map((e) => ({
                    field: e.path,
                    message: e.message
                }))
            });
        }

        if (error.name === "SequelizeUniqueConstraintError") {
            return res.status(409).json({
                success: false,
                message: "Dữ liệu đã tồn tại",
                errors: error.errors.map((e) => ({
                    field: e.path,
                    message: e.message
                }))
            });
        }

        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ nội bộ."
        });
    }
};

export const signIn = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng điền đầy đủ thông tin."
            });
        }

        // tìm user theo username (đăng nhập bằng username)
        const normalizedUsername = username.trim().toLowerCase();

        const user = await User.findOne({
            where: { username: normalizedUsername }
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Tên đăng nhập hoặc mật khẩu không đúng."
            });
        }

        // kiểm tra password
        const isMatch = await bcrypt.compare(password, user.passwordHash);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Tên đăng nhập hoặc mật khẩu không đúng."
            });
        }

        // xoá session cũ nếu có
        await Session.destroy({
            where: { userId: user.userId }
        });

        // tạo access token
        const accessToken = jwt.sign(
            { userId: user.userId },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: ACCESS_TOKEN_TTL }
        );

        // tạo refresh token ngẫu nhiên (bảo mật tốt hơn JWT)
        const refreshToken = crypto.randomBytes(64).toString("hex");

        const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL);

        // lưu session
        await Session.create({
            userId: user.userId,
            refreshToken,
            expiresAt

        });

        // gửi refreshToken qua cookie
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: REFRESH_TOKEN_TTL
        });

        // trả access token
        return res.status(200).json({
            success: true,
            accessToken
        });
    } catch (error) {
        console.error("Lỗi signIn:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ nội bộ."
        });
    }
};

export const signOut = async (req, res) => {
    try {
        const refreshToken = req.cookies?.refreshToken;

        if (refreshToken) {
            await Session.destroy({
                where: { refreshToken }
            });

            res.clearCookie("refreshToken", {
                httpOnly: true,
                secure: false,
                sameSite: "lax"
            });
        }

        return res.sendStatus(204);
    } catch (error) {
        console.error("Lỗi signOut:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ nội bộ."
        });
    }
};
    // tạo access token mới từ refresh token
export const refreshToken = async (req, res) => {
    try {
        //lấy refresh token từ cookie
        const token = req.cookies?.refreshToken;
        if(!token){
            return res.status(401).json({message:"Token không tồn tại"});//nghĩa là người dùng chưa đăng nhập hoặc cookie bị xóa
        }

        //so với refresh token trong database
        const session = await Session.findOne({
            where: {refreshToken: token}});
        if (!session){
            return res.status(403).json({message: "Token không hợp lệ hoặc đã hết hạn"});
        }

        //kiểm tra hết hạn chưa
        if(session.expiresAt< new Date()){
            return res.status(403).json({message: "Token đã hết hạn"});
        }

        //nếu refreshToken chưa hết hạn và hợp lệ thì tạo accessToken mới
        const accessToken = jwt.sign({
            userId: session.userId
        }, process.env.ACCESS_TOKEN_SECRET, {expiresIn: ACCESS_TOKEN_TTL});

        //Trả accessToken mới về trong return
        return res.status(200).json({accessToken});
    } catch (error){
        console.error ("Lỗi khi gọi refreshToken", error);
        return res.status(500).json({message: "Lỗi hệ thống"});
    }
}