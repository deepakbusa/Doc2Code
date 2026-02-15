// ─── Engine Store ───────────────────────────────────────────────────
// Zustand store for AI engine state management.

import { create } from "zustand";
import api from "@/lib/api";

// ── Types ───────────────────────────────────────────────────────────

export interface EnhancedTask {
    title: string;
    description: string;
    keyRequirements: string[];
    suggestedApproach: string;
}

export interface CandidateScore {
    correctness: number;
    security: number;
    simplicity: number;
    docAdherence: number;
    total: number;
}

export interface CodeCandidate {
    code: string;
    model: string;
    role: "primary" | "alternative";
    generatedAt: string;
}

export interface SecurityFinding {
    severity: "info" | "warning" | "error" | "critical";
    category: string;
    description: string;
    recommendation: string;
}

export interface GenerationResult {
    generationId: string;
    selectedCode: string;
    language: string;
    candidates: CodeCandidate[];
    judgeResult: {
        selectedIndex: number;
        scores: CandidateScore[];
        reasoning: string;
    };
    validationResult: {
        staticScore: number;
        runtimeScore: number;
        staticIssues: string[];
        runtimeError: string | null;
        passed: boolean;
    };
    securityAudit: {
        overallRisk: string;
        findings: SecurityFinding[];
        performanceNotes: string[];
        score: number;
    };
    confidence: {
        confidenceScore: number;
        verificationStatus: "verified" | "partial" | "unverified";
        breakdown: {
            judgeScore: number;
            runtimeScore: number;
            staticScore: number;
            docSimilarity: number;
        };
    };
    stages: {
        name: string;
        status: string;
        startedAt: string;
        completedAt: string | null;
        durationMs: number | null;
    }[];
    lineMappings?: {
        startLine: number;
        endLine: number;
        docChunkId: string;
        similarityScore: number;
    }[];
    collaboration?: {
        enabled: boolean;
        sessionToken: string;
        expiresAt: string;
        collaborators: {
            email: string;
            status: "pending" | "accepted" | "joined";
            joinedAt: string | null;
            failedPinAttempts: number;
        }[];
    };
}

export interface EngineStage {
    stage: string;
    timestamp: string;
    message?: string;
    [key: string]: any;
}

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

interface EngineState {
    // State
    enhancedTasks: EnhancedTask[];
    selectedTaskIndex: number;
    generationResult: GenerationResult | null;
    currentStage: EngineStage | null;
    stageHistory: EngineStage[];
    chatMessages: ChatMessage[];
    isEnhancing: boolean;
    isGenerating: boolean;
    isChatting: boolean;
    isProcessingDoc: boolean;
    error: string | null;

    // Actions
    enhance: (taskDescription: string, language: string) => Promise<void>;
    selectTask: (index: number) => void;
    generate: (taskDescription: string, docUrl: string, language: string, docContent?: string) => Promise<void>;
    processDoc: (url: string) => Promise<any>;
    chat: (generationId: string, question: string) => Promise<void>;
    setStage: (stage: EngineStage) => void;
    setComplete: (data: any) => void;
    setError: (error: string) => void;
    reset: () => void;
    clearChat: () => void;
}

export const useEngineStore = create<EngineState>((set, get) => ({
    enhancedTasks: [],
    selectedTaskIndex: 0,
    generationResult: null,
    currentStage: null,
    stageHistory: [],
    chatMessages: [],
    isEnhancing: false,
    isGenerating: false,
    isChatting: false,
    isProcessingDoc: false,
    error: null,

    enhance: async (taskDescription: string, language: string) => {
        set({ isEnhancing: true, error: null, enhancedTasks: [] });
        try {
            const { data } = await api.post("/api/engine/enhance", {
                taskDescription,
                language,
            });
            set({ enhancedTasks: data.tasks, isEnhancing: false });
        } catch (error: any) {
            const message = error.response?.data?.message || error.message || "Enhancement failed";
            set({ isEnhancing: false, error: message });
        }
    },

    selectTask: (index: number) => {
        set({ selectedTaskIndex: index });
    },

    generate: async (taskDescription: string, docUrl: string, language: string, docContent?: string) => {
        set({
            isGenerating: true,
            error: null,
            generationResult: null,
            currentStage: null,
            stageHistory: [],
        });
        try {
            const { data } = await api.post("/api/engine/generate", {
                taskDescription,
                docUrl,
                docContent: docContent || "",
                language,
                selectedTaskIndex: get().selectedTaskIndex,
            });
            set({ generationResult: data, isGenerating: false });
        } catch (error: any) {
            const message = error.response?.data?.message || error.message || "Generation failed";
            set({ isGenerating: false, error: message });
        }
    },

    processDoc: async (url: string) => {
        set({ isProcessingDoc: true, error: null });
        try {
            const { data } = await api.post("/api/engine/process-doc", { url });
            set({ isProcessingDoc: false });
            return data;
        } catch (error: any) {
            const message = error.response?.data?.message || error.message || "Document processing failed";
            set({ isProcessingDoc: false, error: message });
            throw new Error(message);
        }
    },

    chat: async (generationId: string, question: string) => {
        const currentMessages = get().chatMessages;
        set({
            isChatting: true,
            chatMessages: [...currentMessages, { role: "user", content: question }],
        });
        try {
            const { data } = await api.post("/api/engine/chat", {
                generationId,
                question,
                history: currentMessages,
            });
            set((state) => ({
                isChatting: false,
                chatMessages: [...state.chatMessages, { role: "assistant", content: data.answer }],
            }));
        } catch (error: any) {
            set({ isChatting: false, error: error.response?.data?.message || "Chat failed" });
        }
    },

    setStage: (stage: EngineStage) => {
        set((state) => ({
            currentStage: stage,
            stageHistory: [...state.stageHistory, stage],
        }));
    },

    setComplete: (_data: any) => {
        set({ isGenerating: false });
    },

    setError: (error: string) => {
        set({ isGenerating: false, error });
    },

    reset: () => {
        set({
            enhancedTasks: [],
            selectedTaskIndex: 0,
            generationResult: null,
            currentStage: null,
            stageHistory: [],
            chatMessages: [],
            isEnhancing: false,
            isGenerating: false,
            isChatting: false,
            isProcessingDoc: false,
            error: null,
        });
    },

    clearChat: () => {
        set({ chatMessages: [] });
    },
}));
