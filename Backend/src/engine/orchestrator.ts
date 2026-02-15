// ─── Orchestrator ───────────────────────────────────────────────────
// Master pipeline: enhance → retrieve → generate → judge → validate → fix → audit → score → persist.

import { enhanceTask } from "./services/enhancementService";
import { retrieveRelevantDocs } from "./services/embeddingService";
import { generateCode, CodeCandidate } from "./services/codeGenerationService";
import { judgeCode, JudgeResult } from "./services/judgeService";
import { validateCode, fixCode, ValidationResult } from "./services/validationService";
import { auditCode, SecurityAuditResult } from "./services/securityService";
import { calculateConfidence, ConfidenceResult } from "./services/confidenceService";
import { buildTraceMappings, LineMapping } from "./services/traceMappingService";
import { Generation, IGeneration } from "../models/Generation";
import { User } from "../models/User";
import { ENGINE_CONFIG } from "./config";
import { emitStage, emitComplete, emitError } from "./socketManager";
import { logger } from "./logger";

export interface GenerateRequest {
    userId: string;
    taskDescription: string;
    docUrl: string;
    docContent: string; // Raw documentation text
    language: string;
    selectedTaskIndex?: number; // Which enhanced task to use (0, 1, or 2)
}

export interface GenerateResponse {
    generationId: string;
    selectedCode: string;
    language: string;
    candidates: CodeCandidate[];
    judgeResult: JudgeResult;
    validationResult: ValidationResult;
    securityAudit: SecurityAuditResult;
    confidence: ConfidenceResult;
    stages: StageRecord[];
}

interface StageRecord {
    name: string;
    status: string;
    startedAt: Date;
    completedAt: Date | null;
    durationMs: number | null;
}

/**
 * Execute the full generation pipeline.
 */
export async function runPipeline(request: GenerateRequest): Promise<GenerateResponse> {
    const { userId, taskDescription, docUrl, docContent, language, selectedTaskIndex = 0 } = request;
    const stages: StageRecord[] = [];

    // Create generation record
    const generation = await Generation.create({
        userId,
        taskDescription,
        docUrl,
        language,
        status: "processing",
    });

    const generationId = generation._id.toString();

    try {
        // ── Stage 1: Enhancement ──────────────────────────────────
        const enhanceStage = startStage("enhancing_task");
        emitStage(userId, "enhancing_task", { message: "Enhancing your task..." });

        const enhancedTasks = await enhanceTask(taskDescription, language);
        const selectedTask = enhancedTasks[selectedTaskIndex] || enhancedTasks[0];
        const enhancedDescription = selectedTask.description;

        endStage(enhanceStage, stages);

        // ── Stage 2: Document Retrieval (RAG) ─────────────────────
        const ragStage = startStage("retrieving_docs");
        emitStage(userId, "retrieving_docs", { message: "Retrieving documentation context..." });

        let docContext: string;
        let docSimilarity: number;

        if (docContent && docContent.trim().length > 0) {
            const ragResult = await retrieveRelevantDocs(enhancedDescription, docContent);
            docContext = ragResult.context;
            docSimilarity = ragResult.similarity;
        } else {
            docContext = `Documentation URL: ${docUrl}\nPlease implement based on the standard ${language} documentation and best practices.`;
            docSimilarity = 0.5;
        }

        endStage(ragStage, stages);

        // ── Stage 3: Code Generation (Parallel) ──────────────────
        const genStage = startStage("generating_code");
        emitStage(userId, "generating_code", { message: "Generating code from multiple models..." });

        const genResult = await generateCode(enhancedDescription, docContext, language);

        endStage(genStage, stages);

        // ── Stage 4: Judging ─────────────────────────────────────
        const judgeStage = startStage("judging");
        emitStage(userId, "judging", { message: "Comparing and scoring solutions..." });

        const judgeResult = await judgeCode(genResult.candidates, enhancedDescription, docContext);

        endStage(judgeStage, stages);

        // ── Stage 5: Validation ──────────────────────────────────
        const validStage = startStage("validating");
        emitStage(userId, "validating", { message: "Validating generated code..." });

        let selectedCode = genResult.candidates[judgeResult.selectedIndex]?.code || genResult.candidates[0].code;
        let validationResult = await validateCode(selectedCode, language, enhancedDescription);

        endStage(validStage, stages);

        // ── Stage 5b: Runtime Fix Loop ───────────────────────────
        if (!validationResult.passed && validationResult.runtimeError) {
            for (let attempt = 0; attempt < ENGINE_CONFIG.maxFixAttempts; attempt++) {
                const fixStage = startStage(`runtime_fix_${attempt + 1}`);
                emitStage(userId, "fixing_code", {
                    message: `Fixing code (attempt ${attempt + 1})...`,
                    attempt: attempt + 1,
                });

                selectedCode = await fixCode(selectedCode, validationResult.runtimeError!, language);
                validationResult = await validateCode(selectedCode, language, enhancedDescription);

                endStage(fixStage, stages);

                if (validationResult.passed) break;
            }
        }

        // ── Stage 6: Security Audit ──────────────────────────────
        const secStage = startStage("security_audit");
        emitStage(userId, "security_audit", { message: "Running security audit..." });

        const securityAudit = await auditCode(selectedCode, language);

        endStage(secStage, stages);

        // ── Stage 7b: Trace Mapping ──────────────────────────────
        const traceStage = startStage("trace_mapping");
        emitStage(userId, "trace_mapping", { message: "Mapping code to documentation..." });

        let lineMappings: LineMapping[] = [];
        try {
            lineMappings = await buildTraceMappings(selectedCode, docUrl);
        } catch (err: any) {
            logger.warn("Trace mapping stage failed (non-fatal)", { error: err.message });
        }

        endStage(traceStage, stages);

        // ── Stage 8: Confidence Score ────────────────────────────
        const confStage = startStage("scoring");
        emitStage(userId, "scoring", { message: "Calculating confidence score..." });

        const confidence = calculateConfidence(
            judgeResult.scores[judgeResult.selectedIndex]?.total || 70,
            validationResult.runtimeScore,
            validationResult.staticScore,
            docSimilarity
        );

        endStage(confStage, stages);

        // ── Stage 8: Finalize ────────────────────────────────────
        emitStage(userId, "finalizing", { message: "Saving results..." });

        // Update generation record
        generation.enhancedTask = enhancedDescription;
        generation.docContext = docContext.substring(0, 10000); // Cap stored context
        generation.candidates = genResult.candidates;
        generation.selectedCode = selectedCode;
        generation.judgeResult = judgeResult;
        generation.validationResult = validationResult;
        generation.securityAudit = securityAudit;
        generation.lineMappings = lineMappings;
        generation.confidenceScore = confidence.confidenceScore;
        generation.verificationStatus = confidence.verificationStatus;
        generation.stages = stages;
        generation.status = "completed";
        await generation.save();

        // Increment user's requestsUsed
        await User.findByIdAndUpdate(userId, { $inc: { requestsUsed: 1 } });

        // Also create a History entry for backward compatibility
        const { History } = await import("../models/History");
        await History.create({
            userId,
            generationId: generation._id,
            docUrl,
            taskDescription,
            language,
            code: selectedCode,
        });

        emitComplete(userId, generationId, {
            confidenceScore: confidence.confidenceScore,
            verificationStatus: confidence.verificationStatus,
        });

        logger.info("Pipeline complete", {
            generationId,
            confidence: confidence.confidenceScore,
            status: confidence.verificationStatus,
        });

        return {
            generationId,
            selectedCode,
            language,
            candidates: genResult.candidates,
            judgeResult,
            validationResult,
            securityAudit,
            confidence,
            stages,
        };
    } catch (error: any) {
        logger.error("Pipeline failed", { generationId, error: error.message });

        generation.status = "failed";
        generation.errorMessage = error.message;
        generation.stages = stages;
        await generation.save();

        emitError(userId, error.message);
        throw error;
    }
}

// ── Stage timing helpers ────────────────────────────────────────────

function startStage(name: string): { name: string; startedAt: Date } {
    return { name, startedAt: new Date() };
}

function endStage(
    stage: { name: string; startedAt: Date },
    stages: StageRecord[]
): void {
    const completedAt = new Date();
    stages.push({
        name: stage.name,
        status: "completed",
        startedAt: stage.startedAt,
        completedAt,
        durationMs: completedAt.getTime() - stage.startedAt.getTime(),
    });
}
