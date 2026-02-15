// ─── Notification Bell ──────────────────────────────────────────────
// Dropdown bell icon with unread count badge and notification list.

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, CheckCheck, Users, MessageSquare, Info } from "lucide-react";
import { useCollabStore, type NotificationData } from "@/stores/collabStore";
import { useCollabSocket } from "@/hooks/useCollabSocket";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<string, any> = {
    collab_invite: Users,
    collab_joined: Check,
    collab_message: MessageSquare,
    system: Info,
};

const TYPE_COLORS: Record<string, string> = {
    collab_invite: "text-violet-400",
    collab_joined: "text-emerald-400",
    collab_message: "text-blue-400",
    system: "text-amber-400",
};

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationBell() {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const { notifications, unreadCount, fetchNotifications, markRead, markAllRead } =
        useCollabStore();

    // Initialize collab socket for real-time notifications
    useCollabSocket();

    // Fetch on mount
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Close on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleClick = (n: NotificationData) => {
        if (!n.read) markRead(n.id);
        if (n.link) {
            navigate(n.link);
            setOpen(false);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setOpen(!open)}
                className="relative p-2 rounded-xl hover:bg-muted/60 transition-colors group"
            >
                <Bell className="h-[18px] w-[18px] text-muted-foreground group-hover:text-foreground transition-colors" />
                <AnimatePresence>
                    {unreadCount > 0 && (
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="absolute -top-0.5 -right-0.5 h-4.5 min-w-[18px] px-1 rounded-full bg-violet-500 text-[10px] font-bold text-white flex items-center justify-center"
                        >
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </motion.span>
                    )}
                </AnimatePresence>
            </button>

            {/* Dropdown */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-12 w-[340px] rounded-xl border border-border/40 bg-card/95 backdrop-blur-xl shadow-2xl shadow-black/20 z-50 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                            <span className="text-sm font-semibold">Notifications</span>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllRead}
                                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                                >
                                    <CheckCheck className="h-3 w-3" />
                                    Mark all read
                                </button>
                            )}
                        </div>

                        {/* List */}
                        <div className="max-h-[360px] overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="py-10 text-center">
                                    <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                                    <p className="text-sm text-muted-foreground">No notifications yet</p>
                                </div>
                            ) : (
                                notifications.map((n) => {
                                    const Icon = TYPE_ICONS[n.type] || Info;
                                    return (
                                        <button
                                            key={n.id}
                                            onClick={() => handleClick(n)}
                                            className={cn(
                                                "w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted/40 transition-colors border-b border-border/10 last:border-0",
                                                !n.read && "bg-violet-500/5"
                                            )}
                                        >
                                            <div className={cn(
                                                "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                                                !n.read ? "bg-violet-500/10" : "bg-muted/30"
                                            )}>
                                                <Icon className={cn("h-4 w-4", TYPE_COLORS[n.type] || "text-muted-foreground")} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={cn(
                                                    "text-xs leading-snug",
                                                    n.read ? "text-muted-foreground" : "text-foreground"
                                                )}>
                                                    <span className="font-semibold">{n.title}</span>{" "}
                                                    {n.message}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground/60 mt-1">
                                                    {timeAgo(n.createdAt)}
                                                </p>
                                            </div>
                                            {!n.read && (
                                                <span className="h-2 w-2 rounded-full bg-violet-500 shrink-0 mt-2" />
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
