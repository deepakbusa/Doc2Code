import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import passport from "passport";
import dotenv from "dotenv";
import { createServer } from "http";
import rateLimit from "express-rate-limit";

// Load env vars first
dotenv.config();

import { configurePassport } from "./config/passport";
import authRoutes from "./routes/auth";
import historyRoutes from "./routes/history";
import userRoutes from "./routes/user";
import statsRoutes from "./routes/stats";
import engineRoutes from "./routes/engine";
import notificationRoutes from "./routes/notifications";
import { initSocket } from "./engine/socketManager";
import { logger } from "./engine/logger";
import { errorHandler, validateEnv } from "./middleware/errorHandler";

// Validate environment at startup
validateEnv();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:8080";

// Security middleware
app.use(
    helmet({
        contentSecurityPolicy: false, // Allow inline scripts for development
        crossOriginEmbedderPolicy: false,
    })
);
app.use(
    cors({
        origin: CLIENT_URL,
        credentials: true,
    })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting — engine routes (10 req/min per IP)
const engineLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { message: "Too many requests, please try again later" },
    standardHeaders: true,
    legacyHeaders: false,
});

// Passport
configurePassport();
app.use(passport.initialize());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/user", userRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/engine", engineLimiter, engineRoutes);
app.use("/api/notifications", notificationRoutes);

// Health check — extended
app.get("/api/health", async (_req, res) => {
    const dbState = mongoose.connection.readyState;
    const dbStatus = dbState === 1 ? "connected" : dbState === 2 ? "connecting" : "disconnected";

    res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: dbStatus,
        environment: process.env.NODE_ENV || "development",
        azure: {
            endpoint: process.env.AZURE_OPENAI_ENDPOINT ? "configured" : "missing",
            apiVersion: process.env.AZURE_OPENAI_API_VERSION || "missing",
        },
    });
});

// Global error handler (must be after routes)
app.use(errorHandler);

// Initialize Socket.IO
initSocket(httpServer, CLIENT_URL);

// Connect to MongoDB and start server
const startServer = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI!);
        logger.info("✅ Connected to MongoDB Atlas");

        httpServer.listen(PORT, () => {
            logger.info(`🚀 Server running on port ${PORT}`);
            logger.info(`📡 API: http://localhost:${PORT}/api`);
            logger.info(`🧠 Engine: http://localhost:${PORT}/api/engine`);
            logger.info(`🔌 WebSocket: ws://localhost:${PORT}`);
        });
    } catch (error) {
        logger.error("❌ Failed to connect to MongoDB:", error);
        process.exit(1);
    }
};

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
    logger.error("Uncaught Exception:", error);
    process.exit(1);
});

process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled Rejection:", reason);
});

startServer();
