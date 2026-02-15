// ─── Generation Model ───────────────────────────────────────────────
// Stores full generation pipeline results in MongoDB.

import mongoose, { Document, Schema } from "mongoose";

export interface IGeneration extends Document {
    userId: mongoose.Types.ObjectId;
    taskDescription: string;
    enhancedTask: string;
    docUrl: string;
    docContext: string;
    language: string;
    candidates: {
        code: string;
        model: string;
        role: string;
        generatedAt: Date;
    }[];
    selectedCode: string;
    judgeResult: {
        selectedIndex: number;
        scores: {
            correctness: number;
            security: number;
            simplicity: number;
            docAdherence: number;
            total: number;
        }[];
        reasoning: string;
    } | null;
    validationResult: {
        staticScore: number;
        runtimeScore: number;
        staticIssues: string[];
        runtimeError: string | null;
        passed: boolean;
    } | null;
    securityAudit: {
        overallRisk: string;
        findings: {
            severity: string;
            category: string;
            description: string;
            line: string | null;
            recommendation: string;
        }[];
        performanceNotes: string[];
        score: number;
    } | null;
    confidenceScore: number;
    verificationStatus: string;
    stages: {
        name: string;
        status: string;
        startedAt: Date;
        completedAt: Date | null;
        durationMs: number | null;
    }[];
    lineMappings: {
        startLine: number;
        endLine: number;
        docChunkId: string;
        similarityScore: number;
    }[];
    collaboration: {
        enabled: boolean;
        sessionToken: string;
        pinHash: string;
        expiresAt: Date;
        collaborators: {
            email: string;
            status: "pending" | "accepted" | "joined";
            joinedAt: Date | null;
            failedPinAttempts: number;
        }[];
    } | null;
    status: "pending" | "processing" | "completed" | "failed";
    errorMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
}

const generationSchema = new Schema<IGeneration>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        taskDescription: { type: String, required: true },
        enhancedTask: { type: String, default: "" },
        docUrl: { type: String, required: true },
        docContext: { type: String, default: "" },
        language: { type: String, required: true },
        candidates: [
            {
                code: String,
                model: String,
                role: String,
                generatedAt: Date,
            },
        ],
        selectedCode: { type: String, default: "" },
        judgeResult: { type: Schema.Types.Mixed, default: null },
        validationResult: { type: Schema.Types.Mixed, default: null },
        securityAudit: { type: Schema.Types.Mixed, default: null },
        confidenceScore: { type: Number, default: 0 },
        verificationStatus: { type: String, default: "unverified" },
        stages: [
            {
                name: String,
                status: String,
                startedAt: Date,
                completedAt: Date,
                durationMs: Number,
            },
        ],
        lineMappings: [
            {
                startLine: Number,
                endLine: Number,
                docChunkId: String,
                similarityScore: Number,
            },
        ],
        collaboration: {
            type: {
                enabled: { type: Boolean, default: false },
                sessionToken: { type: String },
                pinHash: { type: String },
                expiresAt: { type: Date },
                collaborators: [
                    {
                        email: { type: String },
                        status: { type: String, enum: ["pending", "accepted", "joined"], default: "pending" },
                        joinedAt: { type: Date, default: null },
                        failedPinAttempts: { type: Number, default: 0 },
                    },
                ],
            },
            default: null,
        },
        status: {
            type: String,
            enum: ["pending", "processing", "completed", "failed"],
            default: "pending",
        },
        errorMessage: { type: String, default: null },
    },
    { timestamps: true }
);

generationSchema.methods.toJSON = function () {
    const obj = this.toObject();
    obj.id = obj._id.toString();
    delete obj._id;
    delete obj.__v;
    // Never expose pinHash in API responses
    if (obj.collaboration) {
        delete obj.collaboration.pinHash;
    }
    return obj;
};

export const Generation = mongoose.model<IGeneration>("Generation", generationSchema);
