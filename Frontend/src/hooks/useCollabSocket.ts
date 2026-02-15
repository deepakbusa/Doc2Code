// ─── Collab Socket Hook ─────────────────────────────────────────────
// Connects to Socket.IO for real-time collaboration and notification events.

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useCollabStore } from "@/stores/collabStore";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export function useCollabSocket() {
    const socketRef = useRef<Socket | null>(null);
    const addNotification = useCollabStore((s) => s.addNotification);

    useEffect(() => {
        const token = localStorage.getItem("doc2code_token");
        if (!token) return;

        // Reuse existing socket if connected
        if (socketRef.current?.connected) return;

        const socket = io(API_URL, {
            auth: { token },
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        // ── Notification Events ─────────────────────────────────────
        socket.on("notification:new", (data) => {
            addNotification(data);
        });

        // ── Collab Events (for components that subscribe) ───────────
        socket.on("collab:user-joined", (data) => {
            console.log("[Collab] User joined:", data.userName);
        });

        socket.on("collab:user-left", (data) => {
            console.log("[Collab] User left:", data.userId);
        });

        socket.on("collab:chat-message", (data) => {
            console.log("[Collab] Chat:", data.userName, data.message);
        });

        socketRef.current = socket;

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [addNotification]);

    // ── Room Management ─────────────────────────────────────────────
    const joinRoom = (generationId: string, userName: string) => {
        socketRef.current?.emit("collab:join", { generationId, userName });
    };

    const leaveRoom = (generationId: string) => {
        socketRef.current?.emit("collab:leave", { generationId });
    };

    const sendChatMessage = (generationId: string, message: string, userName: string) => {
        socketRef.current?.emit("collab:chat-message", { generationId, message, userName });
    };

    const sendCursorMove = (generationId: string, line: number, column: number) => {
        socketRef.current?.emit("collab:cursor-move", { generationId, line, column });
    };

    const sendScrollSync = (generationId: string, scrollTop: number) => {
        socketRef.current?.emit("collab:scroll-sync", { generationId, scrollTop });
    };

    const sendCodeUpdate = (generationId: string, code: string, language: string) => {
        socketRef.current?.emit("collab:code-update", { generationId, code, language });
    };

    const sendNodeView = (generationId: string, nodeId: string) => {
        socketRef.current?.emit("collab:node-view", { generationId, nodeId });
    };

    return {
        socket: socketRef,
        joinRoom,
        leaveRoom,
        sendChatMessage,
        sendCursorMove,
        sendScrollSync,
        sendCodeUpdate,
        sendNodeView
    };
}
