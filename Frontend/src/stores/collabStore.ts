// ─── Collab Store ───────────────────────────────────────────────────
// Zustand store for collaboration sessions and notifications.

import { create } from "zustand";
import api from "@/lib/api";

// ─── Types ──────────────────────────────────────────────────────────

export interface CollabInvitee {
    email: string;
    status: "pending" | "joined" | "accepted";
}

export interface CollabSessionData {
    id: string; // Generation ID
    title: string;
    language: string;
    role: "owner" | "collaborator";
    expiresAt: string;
    collaborators: CollabInvitee[];
}

export interface NotificationData {
    id: string;
    type: "collab_invite" | "collab_joined" | "collab_message" | "system";
    title: string;
    message: string;
    link: string;
    read: boolean;
    metadata: Record<string, any>;
    createdAt: string;
}

interface CollabState {
    sessions: CollabSessionData[];
    notifications: NotificationData[];
    unreadCount: number;
    isLoadingSessions: boolean;
    isLoadingNotifications: boolean;
    isInviting: boolean;
    isJoining: boolean;
    error: string | null;

    fetchSessions: () => Promise<void>;
    fetchNotifications: () => Promise<void>;
    // verifyPin replaces joinSession logic (which was for joining a room, now it's verifying to get in)
    verifyPin: (generationId: string, pin: string) => Promise<any>;
    acceptInvite: (sessionToken: string) => Promise<any>;
    markRead: (id: string) => Promise<void>;
    markAllRead: () => Promise<void>;
    addNotification: (notification: NotificationData) => void;
    reset: () => void;
}

export const useCollabStore = create<CollabState>((set, get) => ({
    sessions: [],
    notifications: [],
    unreadCount: 0,
    isLoadingSessions: false,
    isLoadingNotifications: false,
    isInviting: false,
    isJoining: false,
    error: null,

    fetchSessions: async () => {
        set({ isLoadingSessions: true, error: null });
        try {
            const { data } = await api.get("/api/engine/collab/sessions");
            set({ sessions: data.sessions, isLoadingSessions: false });
        } catch (error: any) {
            set({ isLoadingSessions: false, error: error.response?.data?.message || "Failed to fetch sessions" });
        }
    },

    fetchNotifications: async () => {
        set({ isLoadingNotifications: true });
        try {
            const { data } = await api.get("/api/notifications");
            set({
                notifications: data.notifications,
                unreadCount: data.unreadCount,
                isLoadingNotifications: false,
            });
        } catch {
            set({ isLoadingNotifications: false });
        }
    },

    verifyPin: async (generationId: string, pin: string) => {
        set({ isJoining: true, error: null });
        try {
            const { data } = await api.post("/api/engine/collab/verify-pin", { generationId, pin });
            set({ isJoining: false });
            // Refresh sessions to show updated status
            get().fetchSessions();
            return data;
        } catch (error: any) {
            const message = error.response?.data?.message || "Verification failed";
            set({ isJoining: false, error: message });
            throw new Error(message);
        }
    },

    acceptInvite: async (sessionToken: string) => {
        set({ isJoining: true, error: null });
        try {
            const { data } = await api.get(`/api/engine/collab/accept/${sessionToken}`);
            set({ isJoining: false });
            get().fetchSessions();
            return data;
        } catch (error: any) {
            const message = error.response?.data?.message || "Acceptance failed";
            set({ isJoining: false, error: message });
            throw new Error(message);
        }
    },

    markRead: async (id: string) => {
        try {
            await api.patch(`/api/notifications/${id}/read`);
            set((state) => ({
                notifications: state.notifications.map((n) =>
                    n.id === id ? { ...n, read: true } : n
                ),
                unreadCount: Math.max(0, state.unreadCount - 1),
            }));
        } catch { /* silent */ }
    },

    markAllRead: async () => {
        try {
            await api.patch("/api/notifications/read-all");
            set((state) => ({
                notifications: state.notifications.map((n) => ({ ...n, read: true })),
                unreadCount: 0,
            }));
        } catch { /* silent */ }
    },

    addNotification: (notification: NotificationData) => {
        set((state) => ({
            notifications: [notification, ...state.notifications],
            unreadCount: state.unreadCount + 1,
        }));
    },

    reset: () => {
        set({
            sessions: [],
            notifications: [],
            unreadCount: 0,
            isLoadingSessions: false,
            isLoadingNotifications: false,
            isInviting: false,
            isJoining: false,
            error: null,
        });
    },
}));
