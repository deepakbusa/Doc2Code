// ─── NodeInsight Model ──────────────────────────────────────────────
// Caches AI-generated explanations for code graph nodes.

import mongoose, { Document, Schema } from "mongoose";

export interface INodeInsight extends Document {
    generationId: string;
    nodeId: string;
    mode: "explain" | "optimize" | "security" | "usage" | "alternative";
    result: {
        explanation: string;
        possibleQuestions: string[];
        improvements?: string[];
        securityNotes?: string[];
    };
    createdAt: Date;
}

const nodeInsightSchema = new Schema<INodeInsight>({
    generationId: { type: String, required: true, index: true },
    nodeId: { type: String, required: true },
    mode: {
        type: String,
        required: true,
        enum: ["explain", "optimize", "security", "usage", "alternative"],
    },
    result: {
        explanation: { type: String, required: true },
        possibleQuestions: { type: [String], default: [] },
        improvements: { type: [String] },
        securityNotes: { type: [String] },
    },
    createdAt: { type: Date, default: Date.now },
});

// Compound index for fast cache lookups
nodeInsightSchema.index({ generationId: 1, nodeId: 1, mode: 1 }, { unique: true });

// Auto-cleanup after 7 days
nodeInsightSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

export const NodeInsight = mongoose.model<INodeInsight>("NodeInsight", nodeInsightSchema);
