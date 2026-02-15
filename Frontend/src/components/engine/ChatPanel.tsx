// ─── Chat Panel ─────────────────────────────────────────────────────
// Contextual code chat panel for discussing generated code.

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, MessageSquare, Bot, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEngineStore } from "@/stores/engineStore";

interface ChatPanelProps {
    generationId: string;
}

export default function ChatPanel({ generationId }: ChatPanelProps) {
    const [input, setInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatMessages = useEngineStore((s) => s.chatMessages);
    const isChatting = useEngineStore((s) => s.isChatting);
    const chat = useEngineStore((s) => s.chat);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages]);

    const handleSend = async () => {
        const question = input.trim();
        if (!question || isChatting) return;
        setInput("");
        await chat(generationId, question);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-border/40 bg-muted/30">
                <MessageSquare className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Code Chat</span>
                <span className="text-xs text-muted-foreground ml-auto">
                    Ask questions about the generated code
                </span>
            </div>

            {/* Messages */}
            <div className="h-[300px] overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <Bot className="h-8 w-8 mb-2 opacity-40" />
                        <p className="text-sm">Ask anything about the generated code</p>
                        <p className="text-xs mt-1 opacity-60">
                            e.g. "Explain the error handling" or "How do I add auth?"
                        </p>
                    </div>
                )}

                <AnimatePresence mode="popLayout">
                    {chatMessages.map((msg, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            {msg.role === "assistant" && (
                                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                                    <Bot className="h-3.5 w-3.5 text-white" />
                                </div>
                            )}
                            <div
                                className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${msg.role === "user"
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted/50 border border-border/40"
                                    }`}
                            >
                                <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                            </div>
                            {msg.role === "user" && (
                                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                                    <User className="h-3.5 w-3.5 text-white" />
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>

                {isChatting && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex gap-2.5"
                    >
                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                            <Bot className="h-3.5 w-3.5 text-white" />
                        </div>
                        <div className="bg-muted/50 border border-border/40 rounded-xl px-3.5 py-2.5">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        </div>
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border/40 p-3 flex gap-2">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about this code..."
                    className="flex-1 resize-none bg-background/50 border border-border/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 min-h-[38px] max-h-[100px]"
                    rows={1}
                />
                <Button
                    size="sm"
                    onClick={handleSend}
                    disabled={!input.trim() || isChatting}
                    className="h-[38px] px-3 bg-primary hover:bg-primary/90"
                >
                    <Send className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
