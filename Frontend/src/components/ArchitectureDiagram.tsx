
import { motion } from "framer-motion";
import {
    Brain, BookOpen, Code2, Scale, CheckCircle2, Bug,
    ShieldCheck, Link2, Target, Sparkles, AlertTriangle, Layers
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ArchitectureDiagramProps {
    currentStage?: string;
    className?: string;
    controls?: boolean;
}

const STAGE_KEYS = [
    "enhancing_task",
    "retrieving_docs",
    "generating_code",
    "judging",
    "validating",
    "fixing_code",
    "security_audit",
    "trace_mapping",
    "scoring",
    "finalizing",
] as const;

const STAGE_MAP: Record<string, { icon: any; label: string; color: string; description: string }> = {
    enhancing_task: {
        icon: Brain,
        label: "Enhancing Task",
        color: "text-violet-500",
        description: "Refining user input into detailed technical requirements"
    },
    retrieving_docs: {
        icon: BookOpen,
        label: "Retrieval",
        color: "text-blue-500",
        description: "Scanning documentation for relevant APIs and patterns"
    },
    generating_code: {
        icon: Code2,
        label: "Generation",
        color: "text-emerald-500",
        description: "Creating initial code implementation"
    },
    judging: {
        icon: Scale,
        label: "Judging",
        color: "text-amber-500",
        description: "Evaluating code quality and correctness"
    },
    validating: {
        icon: CheckCircle2,
        label: "Validation",
        color: "text-teal-500",
        description: "Running static analysis and runtime checks"
    },
    fixing_code: {
        icon: Bug,
        label: "Self-Healing",
        color: "text-rose-500",
        description: "Automatically fixing detected issues"
    },
    security_audit: {
        icon: ShieldCheck,
        label: "Security",
        color: "text-indigo-500",
        description: "Scanning for vulnerabilities and best practices"
    },
    trace_mapping: {
        icon: Link2,
        label: "Trace Mapping",
        color: "text-cyan-500",
        description: "Mapping code logic to requirements"
    },
    scoring: {
        icon: Target,
        label: "Scoring",
        color: "text-pink-500",
        description: "Calculating confidence score"
    },
    finalizing: {
        icon: Sparkles,
        label: "Finalizing",
        color: "text-yellow-500",
        description: "Preparing final output"
    },
};

const ArchitectureDiagram = ({ currentStage, className, controls }: ArchitectureDiagramProps) => {
    // Determine active index
    const activeIndex = STAGE_KEYS.findIndex(key => key === currentStage);

    return (
        <div className={cn("relative flex flex-col p-6 overflow-hidden", className)}>
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[length:20px_20px]" />

            {/* Flow Visualization */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-8">
                <div className="flex flex-wrap items-center justify-center gap-4 max-w-4xl mx-auto">
                    {STAGE_KEYS.map((key, index) => {
                        const stage = STAGE_MAP[key];
                        const isActive = key === currentStage;
                        const isCompleted = activeIndex > index;
                        const isPending = activeIndex < index && activeIndex !== -1;

                        return (
                            <div key={key} className="relative group">
                                {/* Connector Line */}
                                {index < STAGE_KEYS.length - 1 && (
                                    <div className={cn(
                                        "absolute top-1/2 left-full w-4 h-0.5 -translate-y-1/2 -z-10 transition-colors duration-500",
                                        isCompleted ? "bg-primary/50" : "bg-border/30"
                                    )} />
                                )}

                                <motion.div
                                    initial={false}
                                    animate={{
                                        scale: isActive ? 1.1 : 1,
                                        opacity: isPending ? 0.3 : 1
                                    }}
                                    className={cn(
                                        "relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-300",
                                        isActive
                                            ? "bg-card border-primary/50 shadow-lg shadow-primary/10 ring-1 ring-primary/20"
                                            : isCompleted
                                                ? "bg-card/50 border-primary/20"
                                                : "bg-muted/10 border-transparent"
                                    )}
                                >
                                    <div className={cn(
                                        "p-2 rounded-lg transition-colors duration-300",
                                        isActive || isCompleted ? "bg-background shadow-sm" : "bg-transparent"
                                    )}>
                                        <stage.icon className={cn(
                                            "w-5 h-5 transition-colors duration-300",
                                            isActive || isCompleted ? stage.color : "text-muted-foreground/40"
                                        )} />
                                    </div>

                                    <div className="text-center">
                                        <div className={cn(
                                            "text-[10px] font-medium transition-colors duration-300",
                                            isActive ? "text-foreground" : "text-muted-foreground"
                                        )}>
                                            {stage.label}
                                        </div>
                                    </div>

                                    {/* Tooltip on hover */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-[10px] rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-border/50">
                                        {stage.description}
                                    </div>
                                </motion.div>

                                {/* Active Pulse Effect */}
                                {isActive && (
                                    <div className="absolute inset-0 rounded-xl animate-ping opacity-20 bg-primary z-[-1]" />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Current Status Footer */}
            <div className="relative z-10 mt-auto pt-4 border-t border-border/10 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {currentStage ? (
                        <>
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                            </span>
                            Processing: <span className="font-medium text-foreground">{STAGE_MAP[currentStage]?.label || currentStage}</span>
                        </>
                    ) : (
                        <>
                            <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                            <span>System Idle</span>
                        </>
                    )}
                </div>

                <div className="text-[10px] text-muted-foreground/50 font-mono">
                    RAG Pipeline v2.0
                </div>
            </div>
        </div>
    );
};

export default ArchitectureDiagram;
