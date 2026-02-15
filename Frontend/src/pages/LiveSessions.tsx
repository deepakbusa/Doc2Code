// ─── Live Sessions Page ─────────────────────────────────────────────
// Lists active collab sessions. Users join via PIN or direct link.

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users, Clock, LogIn, Check, Loader2, RefreshCw, Shield, AlertTriangle, Play
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCollabStore, type CollabSessionData } from "@/stores/collabStore";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

// ─── Session Card ───────────────────────────────────────────────────

function SessionCard({ session, onJoin }: { session: CollabSessionData, onJoin: (id: string) => void }) {
    const navigate = useNavigate();
    const joinedCount = session.collaborators.filter((c) => c.status === "joined").length;
    const totalInvited = session.collaborators.length;

    // Check if current user has joined
    const isJoined = session.role === "owner" || session.collaborators.some(c => c.status === "joined");

    const handleEnter = () => {
        if (isJoined || session.role === "owner") {
            navigate(`/dashboard/live/${session.id}`);
        } else {
            onJoin(session.id);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm p-4 hover:border-border/60 transition-all group"
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0 pr-3">
                    <h3 className="text-sm font-semibold truncate text-foreground">{session.title}</h3>
                    <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${session.role === "owner"
                                ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
                                : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            }`}>
                            {session.role === "owner" ? "Owner" : "Collaborator"}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-mono">
                            {session.language}
                        </span>
                    </div>
                </div>
                <div className="text-[10px] font-medium text-amber-400 flex items-center gap-1 bg-amber-400/10 px-2 py-1 rounded-md shrink-0">
                    <Clock className="h-3 w-3" />
                    <span>{formatDistanceToNow(new Date(session.expiresAt), { addSuffix: true })}</span>
                </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>{joinedCount}/{totalInvited} joined</span>
                </div>
            </div>

            {/* Action */}
            <Button
                onClick={handleEnter}
                className="w-full text-xs h-9 bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
            >
                {isJoined ? (
                    <>
                        <Play className="h-3.5 w-3.5 mr-2 fill-current" />
                        Enter Session
                    </>
                ) : (
                    <>
                        <LogIn className="h-3.5 w-3.5 mr-2" />
                        Enter PIN to Join
                    </>
                )}
            </Button>
        </motion.div>
    );
}

// ─── PIN Modal ──────────────────────────────────────────────────────

function JoinModal({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
    const [pin, setPin] = useState("");
    const { verifyPin, isJoining, error } = useCollabStore();
    const navigate = useNavigate();

    const handleJoin = async () => {
        try {
            await verifyPin(sessionId, pin);
            onClose();
            navigate(`/dashboard/live/${sessionId}`);
        } catch { /* error shown in store */ }
    };

    return (
        <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-2xl animate-in fade-in zoom-in duration-200"
            >
                <div className="text-center mb-6">
                    <div className="h-12 w-12 rounded-2xl bg-violet-500/20 flex items-center justify-center mx-auto mb-3">
                        <Shield className="h-6 w-6 text-violet-400" />
                    </div>
                    <h3 className="text-lg font-bold">Enter Session PIN</h3>
                    <p className="text-xs text-muted-foreground mt-1">This session is protected</p>
                </div>

                <Input
                    placeholder="Enter 6-digit PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    type="password"
                    maxLength={6}
                    className="mb-4 text-center font-mono text-lg tracking-[0.5em] h-12"
                    autoFocus
                />

                {error && (
                    <div className="flex items-center gap-2 text-[11px] text-destructive mb-4 bg-destructive/10 p-2 rounded-md">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        {error}
                    </div>
                )}

                <Button
                    onClick={handleJoin}
                    disabled={isJoining || pin.length < 4}
                    className="w-full"
                >
                    {isJoining ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LogIn className="h-4 w-4 mr-2" />}
                    Verify & Join
                </Button>
            </div>
        </div>
    );
}

// ─── Page ───────────────────────────────────────────────────────────

const LiveSessions = () => {
    const { sessions, fetchSessions, isLoadingSessions } = useCollabStore();
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const navigate = useNavigate();

    const refresh = useCallback(() => {
        fetchSessions();
    }, [fetchSessions]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return (
        <div className="container py-8 max-w-4xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Users className="h-6 w-6 text-violet-500" />
                        Live Sessions
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Active collaboration rooms you own or are invited to
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={refresh}
                    disabled={isLoadingSessions}
                    className="h-9 text-xs gap-2"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${isLoadingSessions ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
            </div>

            {/* Sessions Grid */}
            {isLoadingSessions ? (
                <div className="flex flex-col items-center justify-center py-24">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                    <p className="text-sm text-muted-foreground">Syncing sessions...</p>
                </div>
            ) : sessions.length === 0 ? (
                <div
                    className="text-center py-24 border border-dashed rounded-lg bg-muted/50"
                >
                    <Users className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No active sessions</h3>
                    <p className="text-sm text-muted-foreground/60 max-w-md mx-auto mb-6">
                        Start a new generation with "Enable Collaboration" to see sessions here.
                    </p>
                    <Button
                        onClick={() => navigate("/dashboard/generate")}
                    >
                        Start New Generation
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sessions.map((session) => (
                        <SessionCard
                            key={session.id}
                            session={session}
                            onJoin={setSelectedSessionId}
                        />
                    ))}
                </div>
            )}

            <AnimatePresence>
                {selectedSessionId && (
                    <JoinModal
                        sessionId={selectedSessionId}
                        onClose={() => setSelectedSessionId(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default LiveSessions;
