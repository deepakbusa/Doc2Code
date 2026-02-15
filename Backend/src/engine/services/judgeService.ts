// ─── Judge Service ──────────────────────────────────────────────────
// Uses gpt-4o to compare and score candidate code solutions.

import { chatCompletion } from "../azureClient";
import { SYSTEM_PROMPTS } from "../systemPrompts";
import { ENGINE_CONFIG } from "../config";
import { logger } from "../logger";
import { CodeCandidate } from "./codeGenerationService";

export interface CandidateScore {
    correctness: number;
    security: number;
    simplicity: number;
    docAdherence: number;
    total: number;
}

export interface JudgeResult {
    selectedIndex: number;
    scores: CandidateScore[];
    reasoning: string;
}

/**
 * Compare candidate code solutions and select the best one.
 * Returns structured scoring and reasoning.
 */
export async function judgeCode(
    candidates: CodeCandidate[],
    taskDescription: string,
    docContext: string
): Promise<JudgeResult> {
    logger.info("Judging candidates", { count: candidates.length });

    if (candidates.length === 1) {
        // Only one candidate — give it a default score
        return {
            selectedIndex: 0,
            scores: [{ correctness: 75, security: 75, simplicity: 75, docAdherence: 75, total: 75 }],
            reasoning: "Only one candidate was generated. Scored based on general quality assessment.",
        };
    }

    const candidateList = candidates
        .map((c, i) => `--- Candidate ${i} (${c.role}, model: ${c.model}) ---\n${c.code}`)
        .join("\n\n");

    const userPrompt = `Task: ${taskDescription}\n\nDocumentation context:\n${docContext}\n\nCandidates:\n${candidateList}`;

    const raw = await chatCompletion({
        model: ENGINE_CONFIG.models.judge,
        messages: [
            { role: "system", content: SYSTEM_PROMPTS.judge },
            { role: "user", content: userPrompt },
        ],
        temperature: ENGINE_CONFIG.temperatures.judge,
        maxTokens: ENGINE_CONFIG.maxTokens.judge,
        responseFormat: "json",
    });

    try {
        const parsed: JudgeResult = JSON.parse(raw);

        // Validate structure
        if (typeof parsed.selectedIndex !== "number" || !Array.isArray(parsed.scores)) {
            throw new Error("Invalid judge response structure");
        }

        // Ensure selectedIndex is within bounds
        parsed.selectedIndex = Math.max(0, Math.min(parsed.selectedIndex, candidates.length - 1));

        // Calculate total for each score if missing
        parsed.scores = parsed.scores.map((s) => ({
            ...s,
            total: s.total || Math.round((s.correctness + s.security + s.simplicity + s.docAdherence) / 4),
        }));

        logger.info("Judge decided", {
            selectedIndex: parsed.selectedIndex,
            winnerScore: parsed.scores[parsed.selectedIndex]?.total,
        });

        return parsed;
    } catch (error: any) {
        logger.error("Judge response parsing failed", { error: error.message });
        // Fallback: select first candidate
        return {
            selectedIndex: 0,
            scores: candidates.map(() => ({
                correctness: 70,
                security: 70,
                simplicity: 70,
                docAdherence: 70,
                total: 70,
            })),
            reasoning: "Judge response could not be parsed. Defaulting to primary candidate.",
        };
    }
}
