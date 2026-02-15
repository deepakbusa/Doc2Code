// ─── Live Mode ────────────────────────────────────────────────────────
// The main collaboration interface. Combines Code, Graph, Chat, and Presence.

import { useEffect, useRef, useState, useMemo } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users, MessageSquare, Code2, Network, ChevronLeft, ChevronRight,
    Share2, Mic, MicOff, Settings, X, Send, Copy, Shield, Layers, Eye, HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useCollabStore } from "@/stores/collabStore";
import { useCollabSocket } from "@/hooks/useCollabSocket";
import { useAuthStore } from "@/stores/authStore";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import api from "@/lib/api";

// ─── Types ──────────────────────────────────────────────────────────

interface Message {
    id: string;
    userId: string;
    userName: string;
    content: string;
    timestamp: string;
}

interface Cursor {
    userId: string;
    line: number;
    column: number;
    color: string;
}

interface NodeData {
    id: string;
    type: string;
    name: string;
    explanation: string;
    complexity: number;
}

// ─── Components ─────────────────────────────────────────────────────

const UserCursor = ({ cursor, user }: { cursor: Cursor; user: { name: string } }) => {
    // Note: Monaco decorations are used for the actual cursor in text.
    // This component might be used for overlay cursors if we implemented absolute positioning,
    // but for code editors, we use deltaDecorations.
    return null;
};

const ChatPanel = ({ generationId, userName }: { generationId: string; userName: string }) => {
    const { socket, sendChatMessage } = useCollabSocket();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!socket.current) return;

        const handleMessage = (data: any) => {
            setMessages((prev) => [...prev, {
                id: Math.random().toString(),
                userId: data.userId,
                userName: data.userName,
                content: data.message,
                timestamp: data.timestamp
            }]);
        };

        socket.current.on("collab:chat-message", handleMessage);
        return () => {
            socket.current?.off("collab:chat-message", handleMessage);
        };
    }, [socket]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const send = () => {
        if (!input.trim()) return;
        const msg = input.trim();
        setInput("");
        // Optimistic UI
        setMessages((prev) => [...prev, {
            id: Math.random().toString(),
            userId: "me",
            userName: userName,
            content: msg,
            timestamp: new Date().toISOString()
        }]);
        sendChatMessage(generationId, msg, userName);
    };

    return (
        <div className="flex flex-col h-full bg-card/30 border-l border-border/50">
            <div className="p-3 border-b border-border/50 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold">Team Chat</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                {messages.length === 0 && (
                    <div className="text-center text-xs text-muted-foreground/50 py-10">
                        No messages yet. Start the conversation!
                    </div>
                )}
                {messages.map((m) => (
                    <div key={m.id} className={`flex flex-col ${m.userId === "me" ? "items-end" : "items-start"}`}>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] text-muted-foreground font-medium">{m.userName}</span>
                            <span className="text-[9px] text-muted-foreground/50">
                                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        <div className={`px-3 py-2 rounded-lg text-xs max-w-[85%] ${m.userId === "me"
                            ? "bg-primary text-primary-foreground rounded-tr-none"
                            : "bg-muted text-muted-foreground rounded-tl-none"
                            }`}>
                            {m.content}
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-3 border-t border-border/50">
                <div className="relative">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && send()}
                        placeholder="Type a message..."
                        className="pr-10 h-9 text-xs"
                    />
                    <Button
                        size="icon"
                        variant="ghost"
                        className="absolute right-0 top-0 h-9 w-9 text-muted-foreground hover:text-primary"
                        onClick={send}
                    >
                        <Send className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

// ─── Main Page ──────────────────────────────────────────────────────

const LiveMode = () => {
    const { generationId } = useParams<{ generationId: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { acceptInvite, verifyPin, sessions } = useCollabStore();
    const { socket, joinRoom, leaveRoom, sendCursorMove, sendCodeUpdate, sendScrollSync } = useCollabSocket();

    const [isLoading, setIsLoading] = useState(true);
    const [generation, setGeneration] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<"code" | "graph">("code");
    const [collaborators, setCollaborators] = useState<any[]>([]);
    const [code, setCode] = useState("");

    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const decorationsRef = useRef<string[]>([]);
    const isRemoteUpdate = useRef(false);

    const [error, setError] = useState<string | null>(null);

    // ─── Initialization ─────────────────────────────────────────────
    useEffect(() => {
        const init = async () => {
            if (!generationId) return;
            const token = searchParams.get("token");

            try {
                // If token exists, accept invite first
                if (token) {
                    await acceptInvite(token);
                }

                // Fetch generation data
                const { data } = await api.get(`/api/engine/generation/${generationId}`);
                setGeneration(data);
                setCode(data.selectedCode || "");

                // Join socket room
                if (user?.name) {
                    joinRoom(generationId, user.name);
                }

                setIsLoading(false);
            } catch (error: any) {
                console.error("Failed to join live session", error);
                setError(error.response?.data?.message || error.message || "Failed to join session");
                setIsLoading(false);
            }
        };

        if (user) init();

        return () => {
            if (generationId) leaveRoom(generationId);
        };
    }, [generationId, user, searchParams]);

    // ─── Socket Event Listeners ─────────────────────────────────────
    useEffect(() => {
        if (!socket.current || !editorRef.current) return;

        // Remote cursor updates
        const handleCursorMove = (data: { userId: string; line: number; column: number }) => {
            // Find collaborator color (hash userId)
            const color = "#" + Math.floor(Math.abs(Math.sin(data.userId.charCodeAt(0))) * 16777215).toString(16);

            // Create decoration for cursor
            // Note: In a real app we'd track each user's decoration ID to update it.
            // Simplified: we rely on constant updates or just basic implementation here.
            // For V1, let's just log it or maybe show a global "active users" list.
            // Implementing real-time cursor rendering requires mapping userId -> decorationId.
        };

        const handleCodeUpdate = (data: { code: string; userId: string }) => {
            if (data.userId !== user?.id && editorRef.current) {
                const model = editorRef.current.getModel();
                if (model && model.getValue() !== data.code) {
                    isRemoteUpdate.current = true;
                    // Preserve cursor position if possible
                    const pos = editorRef.current.getPosition();
                    model.setValue(data.code);
                    if (pos) editorRef.current.setPosition(pos);
                    isRemoteUpdate.current = false;
                }
            }
        };

        const handleUserJoined = (data: any) => {
            setCollaborators((prev) => {
                if (prev.find(c => c.userId === data.userId)) return prev;
                return [...prev, { userId: data.userId, name: data.userName, status: "active" }];
            });
        };

        socket.current.on("collab:cursor-move", handleCursorMove);
        socket.current.on("collab:code-update", handleCodeUpdate);
        socket.current.on("collab:user-joined", handleUserJoined);

        return () => {
            socket.current?.off("collab:cursor-move", handleCursorMove);
            socket.current?.off("collab:code-update", handleCodeUpdate);
            socket.current?.off("collab:user-joined", handleUserJoined);
        };
    }, [socket, user]);

    // ─── Render ─────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center">
                    <div className="h-12 w-12 rounded-full border-[3px] border-primary/20 border-t-primary animate-spin mb-4" />
                    <p className="text-sm text-muted-foreground animate-pulse">Connecting to live session...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-screen flex items-center justify-center bg-background p-4">
                <div className="max-w-md w-full bg-card border border-destructive/20 rounded-xl p-8 text-center">
                    <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-4">
                        <Shield className="h-6 w-6" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">Connection Failed</h2>
                    <p className="text-sm text-muted-foreground mb-6">{error}</p>
                    <Button onClick={() => navigate("/dashboard/sessions")} variant="outline">
                        Return to Sessions
                    </Button>
                </div>
            </div>
        );
    }

    if (!generation) return null;

    return (
        <div className="h-screen flex flex-col bg-background overflow-hidden">
            {/* Header */}
            <header className="h-14 border-b border-border/50 bg-card/50 backdrop-blur-md flex items-center justify-between px-4 shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/history")} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open("/dashboard/architecture", "_blank")}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="View System Architecture"
                    >
                        <HelpCircle className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-sm font-semibold flex items-center gap-2">
                            {generation.taskDescription?.substring(0, 50)}...
                            <span className="bg-red-500/10 text-red-500 text-[10px] px-1.5 py-0.5 rounded-full border border-red-500/20 font-medium animate-pulse">
                                ● LIVE
                            </span>
                        </h1>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {collaborators.length + 1} active · {generation.language}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-2 hidden md:flex">
                        <Share2 className="h-3.5 w-3.5" />
                        Share
                    </Button>
                    <div className="h-8 w-8 rounded-full bg-violet-500/20 flex items-center justify-center border border-violet-500/30 text-xs font-semibold text-violet-400">
                        {user?.name?.[0] || "Me"}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                <ResizablePanelGroup direction="horizontal">
                    {/* Editor / Visualizer */}
                    <ResizablePanel defaultSize={75} minSize={50}>
                        <div className="h-full flex flex-col">
                            {/* Tabs */}
                            <div className="h-10 border-b border-border/50 bg-muted/20 flex items-center px-2 gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`h-7 text-xs gap-1.5 ${activeTab === "code" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                                    onClick={() => setActiveTab("code")}
                                >
                                    <Code2 className="h-3.5 w-3.5" /> Code
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`h-7 text-xs gap-1.5 ${activeTab === "graph" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                                    onClick={() => setActiveTab("graph")}
                                >
                                    <Network className="h-3.5 w-3.5" /> Graph
                                </Button>
                            </div>

                            <div className="flex-1 relative">
                                {activeTab === "code" && (
                                    <Editor
                                        height="100%"
                                        defaultLanguage={generation.language?.toLowerCase() || "typescript"}
                                        value={code}
                                        onChange={(value) => {
                                            if (!isRemoteUpdate.current && value) {
                                                setCode(value);
                                                if (generationId) sendCodeUpdate(generationId, value, generation.language);
                                            }
                                        }}
                                        onMount={(editor) => {
                                            editorRef.current = editor;
                                            editor.onDidChangeCursorPosition((e) => {
                                                if (generationId) sendCursorMove(generationId, e.position.lineNumber, e.position.column);
                                            });
                                        }}
                                        theme="vs-dark"
                                        options={{
                                            minimap: { enabled: false },
                                            fontSize: 14,
                                            lineHeight: 24,
                                            padding: { top: 16 },
                                            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                            smoothScrolling: true,
                                            cursorBlinking: "smooth",
                                            renderWhitespace: "selection",
                                        }}
                                    />
                                )}
                                {activeTab === "graph" && (
                                    <div className="flex items-center justify-center h-full text-muted-foreground">
                                        Graph Visualization Placeholder
                                    </div>
                                )}
                            </div>
                        </div>
                    </ResizablePanel>

                    <ResizableHandle />

                    {/* Chat & Tools */}
                    <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
                        {generationId && user?.name && (
                            <ChatPanel generationId={generationId} userName={user.name} />
                        )}
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </div>
    );
};

export default LiveMode;
