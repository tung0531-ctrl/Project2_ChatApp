import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { initDatabase } from "./libs/db.js";
import authRoute from "./routes/authRoute.js";
import userRoute from "./routes/userRoute.js";
import { protectedRoute } from "./middlewares/authMiddleware.js";
import cookieParser from "cookie-parser";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
// Configure CORS to allow requests from the frontend and allow credentials (cookies)
const frontendOrigin = process.env.FRONTEND_ORIGIN|| 'http://localhost:5173';
app.use(
    cors({
        origin: frontendOrigin,
        credentials: true
    })
);
app.use(express.json());
app.use(cookieParser());
// Routes
app.use('/api/auth', authRoute);
// Private route
app.use(protectedRoute);
app.use('/api/users', userRoute);

// Basic error handling
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ.' });
});

// Start server
const startServer = async () => {
    try {
        await initDatabase();
        app.listen(PORT, () => {
            console.log(`Server đang chạy trên cổng ${PORT}`);
        });
    } catch (error) {
        console.error('Lỗi khởi động server:', error);
        process.exit(1);
    }
};

startServer();
