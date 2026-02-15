// ─── Code Chat Service ──────────────────────────────────────────────
// Context-aware code chat using gpt-4o with the codeChat system prompt.

import { chatCompletion } from "../azureClient";
import { SYSTEM_PROMPTS } from "../systemPrompts";
import { ENGINE_CONFIG } from "../config";
import { logger } from "../logger";

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

/**
 * Context-aware code chat: answers questions about a specific code snippet.
 * Loads the generation context (code + task) and uses strict code-only system prompt.
 */
export async function codeChat(
    code: string,
    language: string,
    question: string,
    history: ChatMessage[] = []
): Promise<string> {
    logger.info("Code chat", { language, questionLength: question.length });

    const contextMessage = `Here is the code being discussed:\n\nLanguage: ${language}\n\n\`\`\`${language}\n${code}\n\`\`\``;

    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
        { role: "system", content: SYSTEM_PROMPTS.codeChat },
        { role: "user", content: contextMessage },
        // Include conversation history
        ...history.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
        })),
        { role: "user", content: question },
    ];

    const response = await chatCompletion({
        model: ENGINE_CONFIG.models.codeChat,
        messages,
        temperature: ENGINE_CONFIG.temperatures.codeChat,
        maxTokens: ENGINE_CONFIG.maxTokens.codeChat,
    });

    logger.debug("Code chat response generated");
    return response;
}
