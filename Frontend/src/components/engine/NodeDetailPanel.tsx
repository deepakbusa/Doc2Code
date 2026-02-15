// ─── Node Detail Panel ──────────────────────────────────────────────
// AI-powered sliding side panel for interactive code node exploration.

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Lightbulb, Shield, Zap, GitBranch, Repeat2,
    MessageSquare, ChevronRight, Send, Loader2,
    AlertTriangle, CheckCircle2, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";

export type NodeMode = "explain" | "optimize" | "security" | "usage" | "alternative";

export interface RawGraphNode {
    id: string;
    type: string;
    label: string;
    data: { code: string; lineStart: number };
}

interface NodeInsightResult {
    explanation: string;
    possibleQuestions: string[];
    improvements?: string[];
    securityNotes?: string[];
    cached: boolean;
}

interface NodeDetailPanelProps {
    node: RawGraphNode | null;
    generationId: string;
    onClose: () => void;
}

const ACTIONS: { mode: NodeMode; icon: any; label: string; color: string }[] = [
    { mode: "explain", icon: Lightbulb, label: "Explain", color: "text-amber-400" },
    { mode: "optimize", icon: Zap, label: "Optimize", color: "text-emerald-400" },
    { mode: "security", icon: Shield, label: "Security", color: "text-red-400" },
    { mode: "usage", icon: GitBranch, label: "Usage", color: "text-blue-400" },
    { mode: "alternative", icon: Repeat2, label: "Alternative", color: "text-violet-400" },
];

export default function NodeDetailPanel({ node, generationId, onClose }: NodeDetailPanelProps) {
    const [insight, setInsight] = useState<NodeInsightResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeMode, setActiveMode] = useState<NodeMode | null>(null);
    const [customQ, setCustomQ] = useState("");
    const [customAnswer, setCustomAnswer] = useState("");
    const [customLoading, setCustomLoading] = useState(false);

    const fetchInsight = useCallback(async (mode: NodeMode) => {
        if (!node) return;
        setLoading(true);
        setActiveMode(mode);
        setInsight(null);
        try {
            const res = await api.post("/api/engine/node-explain", {
                generationId,
                nodeId: node.id,
                nodeType: node.type,
                nodeLabel: node.label,
                codeSnippet: node.data.code,
                mode,
            });
            setInsight(res.data);
        } catch (err: any) {
            setInsight({
                explanation: err.response?.data?.message || "Failed to analyze node.",
                possibleQuestions: [],
                cached: false,
            });
        } finally {
            setLoading(false);
        }
    }, [node, generationId]);

    const handleQuestion = useCallback(async (question: string) => {
        if (!node) return;
        setCustomLoading(true);
        setCustomAnswer("");
        try {
            const res = await api.post("/api/engine/node-explain", {
                generationId,
                nodeId: node.id,
                nodeType: node.type,
                nodeLabel: `${node.label} — Question: ${question}`,
                codeSnippet: node.data.code,
                mode: "explain",
            });
            setCustomAnswer(res.data.explanation);
        } catch {
            setCustomAnswer("Unable to answer at this time.");
        } finally {
            setCustomLoading(false);
        }
    }, [node, generationId]);

    if (!node) return null;

    const NODE_TYPE_COLORS: Record<string, string> = {
        import: "#3b82f6",
        function: "#8b5cf6",
        class: "#ec4899",
        middleware: "#f59e0b",
    };
    const nodeColor = NODE_TYPE_COLORS[node.type] || "#6b7280";

    return (
        <AnimatePresence>
            <motion.div
                key="panel"
                initial={{ x: "100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                className="absolute top-0 right-0 h-full w-[380px] z-40 border-l border-border/40 bg-background/95 backdrop-blur-xl flex flex-col shadow-2xl shadow-black/30"
            >
                {/* ─── Header ────────────────────────────────── */}
                <div className="flex-shrink-0 px-4 py-3 border-b border-border/30 flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ background: nodeColor }} />
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold truncate">{node.label}</h3>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{node.type} · Line {node.data.lineStart}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 flex-shrink-0 hover:bg-muted/30">
                        <X className="h-3.5 w-3.5" />
                    </Button>
                </div>

                {/* ─── Code Snippet ───────────────────────────── */}
                <div className="flex-shrink-0 px-4 py-2 border-b border-border/20">
                    <pre className="text-[11px] font-mono text-muted-foreground bg-muted/10 rounded-lg px-3 py-2 overflow-x-auto max-h-20 leading-relaxed">
                        {node.data.code}
                    </pre>
                </div>

                {/* ─── Quick Actions ──────────────────────────── */}
                <div className="flex-shrink-0 px-4 py-3 border-b border-border/20">
                    <div className="grid grid-cols-5 gap-1.5">
                        {ACTIONS.map((action) => {
                            const Icon = action.icon;
                            const isActive = activeMode === action.mode && !loading;
                            return (
                                <button
                                    key={action.mode}
                                    onClick={() => fetchInsight(action.mode)}
                                    disabled={loading}
                                    className={`flex flex-col items-center gap-1 py-2 rounded-lg text-[10px] font-medium transition-all ${isActive
                                            ? "bg-primary/10 border border-primary/20 text-primary"
                                            : "hover:bg-muted/30 text-muted-foreground hover:text-foreground"
                                        }`}
                                >
                                    <Icon className={`h-3.5 w-3.5 ${isActive ? "text-primary" : action.color}`} />
                                    {action.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ─── Content Area ───────────────────────────── */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                    {/* Loading Shimmer */}
                    {loading && (
                        <div className="space-y-3 animate-pulse">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                                Analyzing {node.label}...
                            </div>
                            <div className="h-3 bg-muted/20 rounded w-full" />
                            <div className="h-3 bg-muted/20 rounded w-4/5" />
                            <div className="h-3 bg-muted/20 rounded w-3/5" />
                            <div className="h-3 bg-muted/20 rounded w-full" />
                            <div className="h-3 bg-muted/20 rounded w-2/3" />
                        </div>
                    )}

                    {/* Insight Result */}
                    {insight && !loading && (
                        <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-3"
                        >
                            {/* Cache indicator */}
                            {insight.cached && (
                                <div className="flex items-center gap-1.5 text-[10px] text-emerald-500">
                                    <Sparkles className="h-3 w-3" />
                                    Cached result · instant
                                </div>
                            )}

                            {/* Explanation */}
                            <div>
                                <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Explanation</h4>
                                <p className="text-sm leading-relaxed text-foreground/90">{insight.explanation}</p>
                            </div>

                            {/* Improvements */}
                            {insight.improvements && insight.improvements.length > 0 && (
                                <div>
                                    <h4 className="text-[11px] font-semibold text-emerald-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                        <Zap className="h-3 w-3" /> Improvements
                                    </h4>
                                    <div className="space-y-1.5">
                                        {insight.improvements.map((imp, i) => (
                                            <div key={i} className="flex items-start gap-2 text-xs text-foreground/80 leading-relaxed">
                                                <CheckCircle2 className="h-3 w-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                                                <span>{imp}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Security Notes */}
                            {insight.securityNotes && insight.securityNotes.length > 0 && (
                                <div>
                                    <h4 className="text-[11px] font-semibold text-red-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                        <Shield className="h-3 w-3" /> Security Notes
                                    </h4>
                                    <div className="space-y-1.5">
                                        {insight.securityNotes.map((note, i) => (
                                            <div key={i} className="flex items-start gap-2 text-xs text-foreground/80 leading-relaxed">
                                                <AlertTriangle className="h-3 w-3 text-red-400 mt-0.5 flex-shrink-0" />
                                                <span>{note}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Suggested Questions */}
                            {insight.possibleQuestions.length > 0 && (
                                <div>
                                    <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                        <MessageSquare className="h-3 w-3" /> Suggested Questions
                                    </h4>
                                    <div className="space-y-1">
                                        {insight.possibleQuestions.map((q, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleQuestion(q)}
                                                className="w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-foreground/70 hover:bg-primary/5 hover:text-primary transition-all border border-transparent hover:border-primary/10"
                                            >
                                                <ChevronRight className="h-3 w-3 flex-shrink-0" />
                                                <span className="line-clamp-2">{q}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Custom Answer */}
                            {customAnswer && (
                                <motion.div
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="rounded-lg bg-primary/5 border border-primary/10 p-3"
                                >
                                    <p className="text-xs leading-relaxed text-foreground/90">{customAnswer}</p>
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                    {/* Empty State */}
                    {!insight && !loading && (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <Lightbulb className="h-8 w-8 text-muted-foreground/30 mb-3" />
                            <p className="text-sm text-muted-foreground">
                                Select an action above to analyze this node
                            </p>
                            <p className="text-xs text-muted-foreground/50 mt-1">
                                AI will explain, optimize, or audit this code
                            </p>
                        </div>
                    )}
                </div>

                {/* ─── Custom Question Input ──────────────────── */}
                <div className="flex-shrink-0 px-4 py-3 border-t border-border/30">
                    <div className="flex gap-2">
                        <Input
                            value={customQ}
                            onChange={(e) => setCustomQ(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && customQ.trim()) {
                                    handleQuestion(customQ.trim());
                                    setCustomQ("");
                                }
                            }}
                            placeholder="Ask about this node..."
                            className="h-8 text-xs bg-muted/10 border-border/30 focus:border-primary/30"
                        />
                        <Button
                            size="icon"
                            disabled={!customQ.trim() || customLoading}
                            onClick={() => {
                                if (customQ.trim()) {
                                    handleQuestion(customQ.trim());
                                    setCustomQ("");
                                }
                            }}
                            className="h-8 w-8 flex-shrink-0 bg-primary/80 hover:bg-primary"
                        >
                            {customLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                        </Button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
