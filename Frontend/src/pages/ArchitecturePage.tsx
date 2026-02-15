// ─── Code Generation Flow Architecture ────────────────────────────────
// Clean linear flow showing complete code generation process

import { useCallback } from "react";
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    Position,
    MarkerType,
    Node,
    Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion } from "framer-motion";
import {
    Play, Sparkles, FileText, Database, Code2, 
    GitCompare, CheckCircle, Wrench, Shield, 
    Network, Brain, Target, Check
} from "lucide-react";

// ─── Flow Node Component ───────────────────────────────────────────────

const FlowNode = ({ data }: any) => (
    <div className="px-5 py-3 shadow-lg rounded-lg border-2 bg-card border-border w-[300px]">
        <div className="flex items-center gap-2 mb-2">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${data.color}`}>
                <data.icon className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
                <div className="text-sm font-bold text-foreground">{data.label}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Step {data.step}</div>
            </div>
        </div>
        <div className="text-xs text-muted-foreground leading-snug mt-1">
            {data.description}
        </div>
        {data.model && (
            <div className="mt-2 pt-2 border-t border-border">
                <div className="text-[10px] font-mono text-primary font-semibold">{data.model}</div>
            </div>
        )}
    </div>
);

const nodeTypes = {
    flow: FlowNode,
};

// ─── Linear Code Generation Flow ─────────────────────────────

const INITIAL_NODES: Node[] = [
    {
        id: "start",
        type: "flow",
        position: { x: 400, y: 50 },
        data: {
            step: 1,
            label: "User Input",
            icon: Play,
            color: "bg-slate-600",
            description: "User enters task description and provides documentation URLs (optional)",
        },
    },
    {
        id: "enhance",
        type: "flow",
        position: { x: 400, y: 300 },
        data: {
            step: 2,
            label: "Task Enhancement",
            icon: Sparkles,
            color: "bg-pink-500",
            description: "AI enhances vague prompts into detailed specifications with context",
            model: "gpt-4.1-mini",
        },
    },
    {
        id: "doc-process",
        type: "flow",
        position: { x: 400, y: 550 },
        data: {
            step: 3,
            label: "Documentation Processing",
            icon: FileText,
            color: "bg-blue-500",
            description: "Scrape, chunk, and embed documentation into vector database for RAG",
            model: "text-embedding-3-large",
        },
    },
    {
        id: "rag-retrieval",
        type: "flow",
        position: { x: 400, y: 800 },
        data: {
            step: 4,
            label: "Context Retrieval (RAG)",
            icon: Database,
            color: "bg-cyan-500",
            description: "Semantic search retrieves relevant documentation chunks from vector store",
            model: "MongoDB Atlas Vector Search",
        },
    },
    {
        id: "generate",
        type: "flow",
        position: { x: 400, y: 1050 },
        data: {
            step: 5,
            label: "Code Generation",
            icon: Code2,
            color: "bg-emerald-500",
            description: "Two AI models generate code independently using enhanced task + RAG context",
            model: "gpt-4o-mini + o4-mini",
        },
    },
    {
        id: "judge",
        type: "flow",
        position: { x: 400, y: 1300 },
        data: {
            step: 6,
            label: "Judge & Select Best",
            icon: GitCompare,
            color: "bg-orange-500",
            description: "AI judge compares both code candidates and selects the better solution",
            model: "o4-mini",
        },
    },
    {
        id: "validate",
        type: "flow",
        position: { x: 400, y: 1550 },
        data: {
            step: 7,
            label: "Code Validation",
            icon: CheckCircle,
            color: "bg-green-500",
            description: "AST parsing, syntax check, and static analysis validate the code",
            model: "gpt-4o-mini",
        },
    },
    {
        id: "fix",
        type: "flow",
        position: { x: 400, y: 1800 },
        data: {
            step: 8,
            label: "Auto-Fix (if needed)",
            icon: Wrench,
            color: "bg-yellow-600",
            description: "AI automatically fixes any syntax errors or issues found in validation",
            model: "gpt-4o-mini",
        },
    },
    {
        id: "security",
        type: "flow",
        position: { x: 400, y: 2050 },
        data: {
            step: 9,
            label: "Security Audit",
            icon: Shield,
            color: "bg-red-500",
            description: "Scan for vulnerabilities, injection attacks, and insecure code patterns",
            model: "o4-mini",
        },
    },
    {
        id: "intelligence",
        type: "flow",
        position: { x: 400, y: 2300 },
        data: {
            step: 10,
            label: "Code Intelligence",
            icon: Brain,
            color: "bg-purple-500",
            description: "Analyze structure, trace documentation mapping, and calculate confidence score",
            model: "Node Intelligence + Confidence Service",
        },
    },
    {
        id: "output",
        type: "flow",
        position: { x: 400, y: 2550 },
        data: {
            step: 11,
            label: "Final Output",
            icon: Check,
            color: "bg-fuchsia-500",
            description: "Results delivered to user via WebSocket with real-time updates",
        },
    },
];

const INITIAL_EDGES: Edge[] = [
    {
        id: "e1",
        source: "start",
        target: "enhance",
        animated: true,
        type: 'smoothstep',
        style: { strokeWidth: 4, stroke: "#8b5cf6" },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#8b5cf6", width: 25, height: 25 },
    },
    {
        id: "e2",
        source: "enhance",
        target: "doc-process",
        animated: true,
        type: 'smoothstep',
        style: { strokeWidth: 4, stroke: "#8b5cf6" },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#8b5cf6", width: 25, height: 25 },
    },
    {
        id: "e3",
        source: "doc-process",
        target: "rag-retrieval",
        animated: true,
        type: 'smoothstep',
        style: { strokeWidth: 4, stroke: "#8b5cf6" },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#8b5cf6", width: 25, height: 25 },
    },
    {
        id: "e4",
        source: "rag-retrieval",
        target: "generate",
        animated: true,
        type: 'smoothstep',
        style: { strokeWidth: 4, stroke: "#8b5cf6" },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#8b5cf6", width: 25, height: 25 },
    },
    {
        id: "e5",
        source: "generate",
        target: "judge",
        animated: true,
        type: 'smoothstep',
        style: { strokeWidth: 4, stroke: "#8b5cf6" },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#8b5cf6", width: 25, height: 25 },
    },
    {
        id: "e6",
        source: "judge",
        target: "validate",
        animated: true,
        type: 'smoothstep',
        style: { strokeWidth: 4, stroke: "#8b5cf6" },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#8b5cf6", width: 25, height: 25 },
    },
    {
        id: "e7",
        source: "validate",
        target: "fix",
        animated: true,
        type: 'smoothstep',
        style: { strokeWidth: 4, stroke: "#8b5cf6" },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#8b5cf6", width: 25, height: 25 },
    },
    {
        id: "e8",
        source: "fix",
        target: "security",
        animated: true,
        type: 'smoothstep',
        style: { strokeWidth: 4, stroke: "#8b5cf6" },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#8b5cf6", width: 25, height: 25 },
    },
    {
        id: "e9",
        source: "security",
        target: "intelligence",
        animated: true,
        type: 'smoothstep',
        style: { strokeWidth: 4, stroke: "#8b5cf6" },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#8b5cf6", width: 25, height: 25 },
    },
    {
        id: "e10",
        source: "intelligence",
        target: "output",
        animated: true,
        type: 'smoothstep',
        style: { strokeWidth: 4, stroke: "#8b5cf6" },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#8b5cf6", width: 25, height: 25 },
    },
];

// ─── Main Component ─────────────────────────────────────────────────

export default function ArchitecturePage() {
    const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
    const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);

    return (
        <div className="h-screen w-full bg-background flex flex-col">
            <div className="px-6 py-4 border-b border-border/40 flex items-center justify-center bg-card/30 backdrop-blur-sm z-10">
                <div className="text-center">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                        Code Generation Flow
                    </h1>
                    <p className="text-sm text-muted-foreground mt-2">
                        Complete workflow from user input to final output
                    </p>
                </div>
            </div>

            <div className="flex-1 w-full h-full relative">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    nodeTypes={nodeTypes}
                    fitView
                    fitViewOptions={{ padding: 0.2 }}
                    minZoom={0.2}
                    maxZoom={1.5}
                    className="bg-muted/5"
                >
                    <Background gap={20} size={1} color="#333" className="opacity-[0.07]" />
                    <Controls className="bg-card border border-border/50 shadow-lg" />
                    <MiniMap
                        className="bg-card/90 border border-border/50 rounded-lg shadow-xl"
                        nodeColor={() => '#8b5cf6'}
                        maskColor="rgba(0, 0, 0, 0.1)"
                    />
                </ReactFlow>
            </div>
        </div>
    );
}
