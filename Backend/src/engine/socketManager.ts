// ─── Socket Manager ─────────────────────────────────────────────────
// Socket.IO manager with JWT auth, user rooms, and stage emission.

import { Server as HttpServer } from "http";
import { Server as SocketServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { logger } from "./logger";

let io: SocketServer | null = null;

/**
 * Initialize Socket.IO server with JWT authentication.
 */
export function initSocket(httpServer: HttpServer, clientUrl: string): SocketServer {
    io = new SocketServer(httpServer, {
        cors: {
            origin: clientUrl,
            credentials: true,
        },
        transports: ["websocket", "polling"],
    });

    // JWT authentication middleware
    io.use((socket: Socket, next) => {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        if (!token) {
            return next(new Error("Authentication required"));
        }

        try {
            const decoded = jwt.verify(token as string, process.env.JWT_SECRET || "default_secret") as { userId: string };
            socket.data.userId = decoded.userId;
            next();
        } catch (err) {
            next(new Error("Invalid token"));
        }
    });

    io.on("connection", (socket: Socket) => {
        const userId = socket.data.userId;
        logger.info(`Socket connected: ${socket.id} (User: ${userId})`);

        // Join user-specific room for private notifications
        socket.join(`user:${userId}`);

        // ── Collab Room Events ──────────────────────────────────────
        socket.on("collab:join", (data: { generationId: string; userName: string }) => {
            const room = `collab_${data.generationId}`;
            socket.join(room);
            socket.to(room).emit("collab:user-joined", {
                userId,
                userName: data.userName,
                timestamp: new Date().toISOString(),
            });
            logger.debug("User joined collab room", { userId, room });
        });

        socket.on("collab:leave", (data: { generationId: string }) => {
            const room = `collab_${data.generationId}`;
            socket.leave(room);
            socket.to(room).emit("collab:user-left", {
                userId,
                timestamp: new Date().toISOString(),
            });
        });

        socket.on("collab:cursor-move", (data: { generationId: string; line: number; column: number }) => {
            socket.to(`collab_${data.generationId}`).emit("collab:cursor-move", {
                userId,
                line: data.line,
                column: data.column,
            });
        });

        socket.on("collab:scroll-sync", (data: { generationId: string; scrollTop: number }) => {
            socket.to(`collab_${data.generationId}`).emit("collab:scroll-sync", {
                userId,
                scrollTop: data.scrollTop,
            });
        });

        socket.on("collab:code-update", (data: { generationId: string; code: string; language: string }) => {
            socket.to(`collab_${data.generationId}`).emit("collab:code-update", {
                userId,
                code: data.code,
                language: data.language,
                timestamp: new Date().toISOString(),
            });
        });

        socket.on("collab:node-view", (data: { generationId: string; nodeId: string }) => {
            socket.to(`collab_${data.generationId}`).emit("collab:node-view", {
                userId,
                nodeId: data.nodeId,
            });
        });

        socket.on("collab:chat-message", (data: { generationId: string; message: string; userName: string }) => {
            socket.to(`collab_${data.generationId}`).emit("collab:chat-message", {
                userId,
                userName: data.userName,
                message: data.message,
                timestamp: new Date().toISOString(),
            });
        });

        socket.on("disconnect", () => {
            logger.debug("Socket disconnected", { userId, socketId: socket.id });
        });
    });

    logger.info("Socket.IO initialized");
    return io;
}

/**
 * Get the initialized Socket.IO instance.
 */
export function getIO(): SocketServer {
    if (!io) {
        throw new Error("Socket.IO not initialized!");
    }
    return io;
}

/**
 * Emit a generation stage event to a specific user.
 */
export function emitStage(
    userId: string,
    stage: string,
    data: Record<string, any> = {}
): void {
    if (!io) {
        logger.warn("Socket.IO not initialized, cannot emit stage");
        return;
    }

    io.to(`user:${userId}`).emit("engine:stage", {
        stage,
        timestamp: new Date().toISOString(),
        ...data,
    });

    logger.debug("Emitted stage", { userId, stage });
}

/**
 * Emit generation complete event.
 */
export function emitComplete(
    userId: string,
    generationId: string,
    data: Record<string, any> = {}
): void {
    if (!io) return;

    io.to(`user:${userId}`).emit("engine:complete", {
        generationId,
        timestamp: new Date().toISOString(),
        ...data,
    });
}

/**
 * Emit generation error event.
 */
export function emitError(
    userId: string,
    error: string
): void {
    if (!io) return;

    io.to(`user:${userId}`).emit("engine:error", {
        error,
        timestamp: new Date().toISOString(),
    });
}

/**
 * Emit a notification event to a specific user.
 */
export function emitNotification(
    userId: string,
    notification: Record<string, any>
): void {
    if (!io) return;

    io.to(`user:${userId}`).emit("notification:new", {
        ...notification,
        timestamp: new Date().toISOString(),
    });

    logger.debug("Emitted notification", { userId, type: notification.type });
}
