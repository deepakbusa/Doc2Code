// ─── Azure OpenAI Client Wrapper ────────────────────────────────────
// Central client with retry logic, model mapping, and strict temperature control.

import { AzureOpenAI } from "openai";
import { ENGINE_CONFIG, REASONING_MODELS } from "./config";
import { logger } from "./logger";

let clientInstance: AzureOpenAI | null = null;

function getClient(): AzureOpenAI {
    if (!clientInstance) {
        clientInstance = new AzureOpenAI({
            apiKey: process.env.AZURE_OPENAI_API_KEY!,
            endpoint: process.env.AZURE_OPENAI_ENDPOINT!,
            apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-12-01-preview",
        });
    }
    return clientInstance;
}

// ── Chat Completion with Retry ──────────────────────────────────────

export interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

export interface ChatCompletionOptions {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    maxTokens?: number;
    responseFormat?: "json" | "text";
}

export async function chatCompletion(options: ChatCompletionOptions): Promise<string> {
    const { model, messages, temperature = 0.3, maxTokens = 4096, responseFormat } = options;
    const { maxAttempts, baseDelayMs, maxDelayMs } = ENGINE_CONFIG.retry;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            logger.debug(`Azure call: model=${model} attempt=${attempt}/${maxAttempts}`);

            const isReasoning = REASONING_MODELS.some((rm) => model.includes(rm));

            const params: any = {
                model,
                messages,
            };

            // Reasoning models use max_completion_tokens, don't support temperature
            if (isReasoning) {
                params.max_completion_tokens = maxTokens;
            } else {
                params.temperature = temperature;
                params.max_tokens = maxTokens;
            }

            if (responseFormat === "json") {
                params.response_format = { type: "json_object" };
            }

            const response = await getClient().chat.completions.create(params);

            const content = response.choices?.[0]?.message?.content?.trim();
            if (!content) {
                throw new Error("Empty response from Azure OpenAI");
            }

            logger.debug(`Azure response: model=${model} tokens=${response.usage?.total_tokens || "?"}`);
            return content;
        } catch (error: any) {
            const isRetryable =
                error.status === 429 ||
                error.status === 500 ||
                error.status === 503 ||
                error.code === "ECONNRESET" ||
                error.code === "ETIMEDOUT";

            if (attempt === maxAttempts || !isRetryable) {
                logger.error(`Azure call failed: model=${model}`, {
                    error: error.message,
                    status: error.status,
                    attempt,
                });
                throw new Error(`Azure API error (${model}): ${error.message}`);
            }

            const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
            logger.warn(`Azure retry: model=${model} attempt=${attempt} delay=${delay}ms`);
            await sleep(delay);
        }
    }

    throw new Error(`Azure API failed after ${maxAttempts} attempts`);
}

// ── Embeddings ──────────────────────────────────────────────────────

export async function createEmbedding(text: string): Promise<number[]> {
    const { maxAttempts, baseDelayMs, maxDelayMs } = ENGINE_CONFIG.retry;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const response = await getClient().embeddings.create({
                model: ENGINE_CONFIG.models.embedding,
                input: text,
            });

            return response.data[0].embedding;
        } catch (error: any) {
            if (attempt === maxAttempts) {
                logger.error("Embedding failed", { error: error.message });
                throw new Error(`Embedding API error: ${error.message}`);
            }

            const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
            logger.warn(`Embedding retry: attempt=${attempt} delay=${delay}ms`);
            await sleep(delay);
        }
    }

    throw new Error("Embedding failed after retries");
}

// ── Utility ─────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Cosine Similarity ───────────────────────────────────────────────

export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
}
