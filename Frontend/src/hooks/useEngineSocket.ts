// ─── WebSocket Hook ─────────────────────────────────────────────────
// Connects to Socket.IO with JWT auth, dispatches engine events to store.

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useEngineStore } from "@/stores/engineStore";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export function useEngineSocket() {
    const socketRef = useRef<Socket | null>(null);
    const setStage = useEngineStore((s) => s.setStage);
    const setComplete = useEngineStore((s) => s.setComplete);
    const setError = useEngineStore((s) => s.setError);

    useEffect(() => {
        const token = localStorage.getItem("doc2code_token");
        if (!token) return;

        const socket = io(API_URL, {
            auth: { token },
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socket.on("connect", () => {
            console.log("[Socket] Connected:", socket.id);
        });

        socket.on("engine:stage", (data) => {
            console.log("[Socket] Stage:", data.stage, data.message);
            setStage(data);
        });

        socket.on("engine:complete", (data) => {
            console.log("[Socket] Complete:", data.generationId);
            setComplete(data);
        });

        socket.on("engine:error", (data) => {
            console.error("[Socket] Error:", data.error);
            setError(data.error);
        });

        socket.on("disconnect", (reason) => {
            console.log("[Socket] Disconnected:", reason);
        });

        socketRef.current = socket;

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [setStage, setComplete, setError]);

    return socketRef;
}
