// ─── Code Visualization with Node Intelligence ─────────────────────
// React Flow graph with hover tooltips, AI heatmap, and detail panel.
// IMPORTANT: Nodes are built ONCE on load and on selection change only.
// Hover effects are CSS-only to prevent React Flow jitter / vibration.

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    type Node,
    type Edge,
    type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowLeft, Loader2, Code2, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import NodeDetailPanel, { type RawGraphNode } from "@/components/engine/NodeDetailPanel";

// ─── Types ──────────────────────────────────────────────────────────

interface GraphNode {
    id: string;
    type: string;
    label: string;
    data: { code: string; lineStart: number };
}

interface GraphEdge {
    id: string;
    source: string;
    target: string;
    label: string;
}

// ─── Constants ──────────────────────────────────────────────────────

const NODE_COLORS: Record<string, string> = {
    import: "#3b82f6",
    function: "#8b5cf6",
    class: "#ec4899",
    middleware: "#f59e0b",
};

// ── Heatmap: complexity glow ────────────────────────────────────────
function getComplexityGlow(code: string): string {
    const len = code.length;
    if (len > 300) return "0 0 14px rgba(239, 68, 68, 0.2)";
    if (len > 150) return "0 0 8px rgba(245, 158, 11, 0.12)";
    return "none";
}

// ─── Node Builder (NO hover state — CSS handles hover) ──────────────

function toFlowNodes(graphNodes: GraphNode[], selectedId: string | null): Node[] {
    const cols = 3;
    return graphNodes.map((n, i) => {
        const color = NODE_COLORS[n.type] || "#6b7280";
        const isSelected = n.id === selectedId;

        return {
            id: n.id,
            position: {
                x: (i % cols) * 290 + 40,
                y: Math.floor(i / cols) * 150 + 40,
            },
            data: {
                label: (
                    <div className="text-left">
                        <div className="flex items-center gap-1.5 mb-1">
                            <div
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ background: color }}
                            />
                            <span className="text-[10px] font-bold uppercase tracking-wider opacity-50">
                                {n.type}
                            </span>
                        </div>
                        <div className="text-sm font-semibold">{n.label}</div>
                        <div className="text-[10px] opacity-40 mt-0.5">Line {n.data.lineStart}</div>
                    </div>
                ),
            },
            // Only selected state affects style — hover is handled by CSS class
            className: `viz-node ${isSelected ? "viz-node-selected" : ""}`,
            style: {
                background: isSelected ? "hsl(228 25% 15%)" : "hsl(228 25% 12%)",
                border: isSelected
                    ? `2px solid ${color}`
                    : `2px solid ${color}30`,
                borderRadius: "12px",
                padding: "12px 16px",
                color: "#e2e8f0",
                minWidth: "210px",
                cursor: "pointer",
                boxShadow: isSelected
                    ? `0 0 20px ${color}30`
                    : getComplexityGlow(n.data.code),
                // CSS transition for smooth hover (no React re-render)
                transition: "border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, transform 0.15s ease",
            },
        };
    });
}

function toFlowEdges(graphEdges: GraphEdge[]): Edge[] {
    return graphEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        animated: e.label === "calls",
        style: {
            stroke: e.label === "references" ? "#8b5cf660" : "#3b82f660",
            strokeWidth: 2,
        },
        labelStyle: { fill: "#94a3b8", fontSize: 10 },
    }));
}

// ─── Global CSS for hover (injected once) ───────────────────────────

const HOVER_STYLE_ID = "viz-node-hover-css";
function injectHoverCSS() {
    if (document.getElementById(HOVER_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = HOVER_STYLE_ID;
    style.textContent = `
        .viz-node:hover {
            border-color: rgba(139, 92, 246, 0.6) !important;
            box-shadow: 0 0 18px rgba(139, 92, 246, 0.15) !important;
            background: hsl(228 25% 14%) !important;
        }
        .viz-node-selected:hover {
            box-shadow: 0 0 24px rgba(139, 92, 246, 0.25) !important;
        }
    `;
    document.head.appendChild(style);
}

// ─── Component ──────────────────────────────────────────────────────

export default function Visualize() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [generationInfo, setGenerationInfo] = useState<{ language: string; task: string } | null>(null);

    // Raw graph data (kept for panel + tooltip)
    const rawNodesRef = useRef<GraphNode[]>([]);

    // Panel state
    const [selectedNode, setSelectedNode] = useState<RawGraphNode | null>(null);

    // Hover tooltip (does NOT trigger node rebuilds)
    const [tooltip, setTooltip] = useState<{ x: number; y: number; node: GraphNode } | null>(null);
    const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Inject CSS once
    useEffect(() => { injectHoverCSS(); }, []);

    // ── Load Data ───────────────────────────────────────────────────
    const loadGraph = useCallback(async () => {
        if (!id) return;
        try {
            setLoading(true);
            const [graphRes, genRes] = await Promise.all([
                api.get(`/api/engine/visualize/${id}`),
                api.get(`/api/engine/generation/${id}`),
            ]);

            rawNodesRef.current = graphRes.data.nodes;
            setNodes(toFlowNodes(graphRes.data.nodes, null));
            setEdges(toFlowEdges(graphRes.data.edges));
            setGenerationInfo({
                language: genRes.data.generation?.language || "unknown",
                task: genRes.data.generation?.taskDescription || "",
            });
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to load visualization");
        } finally {
            setLoading(false);
        }
    }, [id, setNodes, setEdges]);

    useEffect(() => { loadGraph(); }, [loadGraph]);

    // ── Rebuild nodes ONLY when selection changes ───────────────────
    useEffect(() => {
        if (rawNodesRef.current.length > 0) {
            setNodes(toFlowNodes(rawNodesRef.current, selectedNode?.id || null));
        }
    }, [selectedNode, setNodes]);

    // ── Node Hover (tooltip only — no state that triggers rebuild) ──
    const onNodeMouseEnter: NodeMouseHandler = useCallback((_event, node) => {
        if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
        tooltipTimer.current = setTimeout(() => {
            const raw = rawNodesRef.current.find((n) => n.id === node.id);
            if (raw) {
                const rect = (_event.target as HTMLElement).closest(".react-flow__node")?.getBoundingClientRect();
                if (rect) {
                    setTooltip({ x: rect.left + rect.width / 2, y: rect.top, node: raw });
                }
            }
        }, 200);
    }, []);

    const onNodeMouseLeave: NodeMouseHandler = useCallback(() => {
        if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
        setTooltip(null);
    }, []);

    // ── Node Click ─────────────────────────────────────────────────
    const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
        const raw = rawNodesRef.current.find((n) => n.id === node.id);
        if (raw) {
            setSelectedNode(raw);
            setTooltip(null);
        }
    }, []);

    // ── Render ──────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[80vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 max-w-2xl mx-auto text-center">
                <p className="text-red-400 mb-4">{error}</p>
                <Button variant="outline" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Go Back
                </Button>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* ─── Header ────────────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-shrink-0 px-5 py-3 border-b border-border/30 bg-background/80 backdrop-blur-md z-20 flex items-center justify-between"
            >
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-lg font-bold flex items-center gap-2">
                            <Code2 className="h-4 w-4 text-primary" />
                            Architecture Explorer
                        </h1>
                        {generationInfo && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                {generationInfo.language} · {generationInfo.task.substring(0, 60)}{generationInfo.task.length > 60 ? "..." : ""}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        {Object.entries(NODE_COLORS).map(([type, color]) => (
                            <span key={type} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/20 border border-border/20">
                                <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                                {type}
                            </span>
                        ))}
                    </div>
                    <div className="w-px h-5 bg-border/30" />
                    <div className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
                        <Lightbulb className="h-3 w-3" />
                        Click any node
                    </div>
                </div>
            </motion.div>

            {/* ─── Graph + Panel ──────────────────────────────── */}
            <div className="flex-1 relative overflow-hidden">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodeMouseEnter={onNodeMouseEnter}
                    onNodeMouseLeave={onNodeMouseLeave}
                    onNodeClick={onNodeClick}
                    fitView
                    proOptions={{ hideAttribution: true }}
                >
                    <Background color="#334155" gap={20} size={1} />
                    <Controls
                        style={{
                            background: "hsl(228 25% 12%)",
                            border: "1px solid hsl(228 20% 20%)",
                            borderRadius: "12px",
                        }}
                    />
                    <MiniMap
                        style={{ background: "hsl(228 25% 8%)", borderRadius: "8px" }}
                        nodeColor={(n) => {
                            const type = n.id.split("_")[0];
                            return NODE_COLORS[type] || "#6b7280";
                        }}
                    />
                </ReactFlow>

                {/* ── Hover Tooltip (pure overlay, no node rebuild) ── */}
                <AnimatePresence>
                    {tooltip && !selectedNode && (
                        <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 6 }}
                            transition={{ duration: 0.1 }}
                            className="fixed z-50 pointer-events-none"
                            style={{
                                left: tooltip.x,
                                top: tooltip.y - 8,
                                transform: "translate(-50%, -100%)",
                            }}
                        >
                            <div className="bg-background/95 backdrop-blur-xl border border-border/40 rounded-lg px-3 py-2 shadow-xl shadow-black/30 max-w-[250px]">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <div
                                        className="h-2 w-2 rounded-full"
                                        style={{ background: NODE_COLORS[tooltip.node.type] || "#6b7280" }}
                                    />
                                    <span className="text-xs font-bold">{tooltip.node.label}</span>
                                    <span className="text-[9px] text-muted-foreground ml-auto">{tooltip.node.type}</span>
                                </div>
                                <pre className="text-[10px] text-muted-foreground font-mono truncate leading-relaxed">
                                    {tooltip.node.data.code.substring(0, 70)}
                                </pre>
                                <div className="flex items-center gap-1 mt-1 text-[9px] text-primary/60">
                                    <Lightbulb className="h-2.5 w-2.5" />
                                    Click for AI analysis
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Detail Panel ────────────────────────────── */}
                <AnimatePresence>
                    {selectedNode && id && (
                        <NodeDetailPanel
                            node={selectedNode}
                            generationId={id}
                            onClose={() => setSelectedNode(null)}
                        />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
