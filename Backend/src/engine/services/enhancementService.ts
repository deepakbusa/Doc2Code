// ─── Enhancement Service ────────────────────────────────────────────
// Uses gpt-4o-mini to rewrite user tasks into 3 precise specifications.

import { chatCompletion } from "../azureClient";
import { SYSTEM_PROMPTS } from "../systemPrompts";
import { ENGINE_CONFIG } from "../config";
import { logger } from "../logger";

export interface EnhancedTask {
    title: string;
    description: string;
    keyRequirements: string[];
    suggestedApproach: string;
}

export async function enhanceTask(
    taskDescription: string,
    language: string
): Promise<EnhancedTask[]> {
    logger.info("Enhancing task", { language });

    const userMessage = `Task: ${taskDescription}\nTarget language: ${language}`;

    const raw = await chatCompletion({
        model: ENGINE_CONFIG.models.enhancement,
        messages: [
            { role: "system", content: SYSTEM_PROMPTS.enhancement },
            { role: "user", content: userMessage },
        ],
        temperature: ENGINE_CONFIG.temperatures.enhancement,
        maxTokens: ENGINE_CONFIG.maxTokens.enhancement,
        responseFormat: "json",
    });

    try {
        const parsed = JSON.parse(raw);
        // Handle both { variations: [...] } and direct array
        const tasks: EnhancedTask[] = Array.isArray(parsed) ? parsed : parsed.variations || parsed.tasks || [];

        if (tasks.length === 0) {
            throw new Error("No enhanced tasks returned");
        }

        logger.info(`Enhanced task into ${tasks.length} variations`);
        return tasks.slice(0, 3);
    } catch (error: any) {
        logger.error("Failed to parse enhancement response", { error: error.message, raw: raw.substring(0, 200) });
        throw new Error("Enhancement parsing failed: " + error.message);
    }
}
