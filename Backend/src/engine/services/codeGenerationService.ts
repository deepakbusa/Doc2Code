// ─── Code Generation Service ────────────────────────────────────────
// Parallel dual-model generation: gpt-4.1-mini (primary) + gpt-4o (alternative).

import { chatCompletion } from "../azureClient";
import { SYSTEM_PROMPTS } from "../systemPrompts";
import { ENGINE_CONFIG } from "../config";
import { logger } from "../logger";

export interface CodeCandidate {
    code: string;
    model: string;
    role: "primary" | "alternative";
    generatedAt: Date;
}

export interface GenerationResult {
    candidates: CodeCandidate[];
    errors: string[];
}

/**
 * Generate code from both primary and alternative models in parallel.
 * Uses Promise.allSettled for fault tolerance — one failure does not block the other.
 */
export async function generateCode(
    enhancedTask: string,
    docContext: string,
    language: string
): Promise<GenerationResult> {
    logger.info("Starting parallel code generation", { language });

    const userPrompt = `Documentation context:\n${docContext}\n\nTask:\n${enhancedTask}\n\nLanguage: ${language}`;

    const [primaryResult, altResult] = await Promise.allSettled([
        // Primary: gpt-4.1-mini at temperature 0.2
        chatCompletion({
            model: ENGINE_CONFIG.models.primaryCode,
            messages: [
                { role: "system", content: SYSTEM_PROMPTS.primaryCode },
                { role: "user", content: userPrompt },
            ],
            temperature: ENGINE_CONFIG.temperatures.primaryCode,
            maxTokens: ENGINE_CONFIG.maxTokens.primaryCode,
        }),
        // Alternative: gpt-4o at temperature 0.6
        chatCompletion({
            model: ENGINE_CONFIG.models.alternativeCode,
            messages: [
                { role: "system", content: SYSTEM_PROMPTS.alternativeCode },
                { role: "user", content: userPrompt },
            ],
            temperature: ENGINE_CONFIG.temperatures.alternativeCode,
            maxTokens: ENGINE_CONFIG.maxTokens.alternativeCode,
        }),
    ]);

    const candidates: CodeCandidate[] = [];
    const errors: string[] = [];

    if (primaryResult.status === "fulfilled") {
        candidates.push({
            code: stripCodeFences(primaryResult.value),
            model: ENGINE_CONFIG.models.primaryCode,
            role: "primary",
            generatedAt: new Date(),
        });
    } else {
        logger.error("Primary generation failed", { error: primaryResult.reason?.message });
        errors.push(`Primary (${ENGINE_CONFIG.models.primaryCode}): ${primaryResult.reason?.message}`);
    }

    if (altResult.status === "fulfilled") {
        candidates.push({
            code: stripCodeFences(altResult.value),
            model: ENGINE_CONFIG.models.alternativeCode,
            role: "alternative",
            generatedAt: new Date(),
        });
    } else {
        logger.error("Alternative generation failed", { error: altResult.reason?.message });
        errors.push(`Alternative (${ENGINE_CONFIG.models.alternativeCode}): ${altResult.reason?.message}`);
    }

    if (candidates.length === 0) {
        throw new Error("Both code generation models failed: " + errors.join("; "));
    }

    logger.info(`Code generation complete: ${candidates.length} candidates produced`);
    return { candidates, errors };
}

/**
 * Strip markdown code fences if present.
 */
function stripCodeFences(code: string): string {
    return code.replace(/^```[\w]*\n?/m, "").replace(/\n?```$/m, "").trim();
}
