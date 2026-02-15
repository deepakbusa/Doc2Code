// ─── Engine Configuration ───────────────────────────────────────────
// Central config for model deployments, temperatures, and scoring weights.

// Models that use reasoning-style API (max_completion_tokens instead of max_tokens, no temperature)
export const REASONING_MODELS = ["o4-mini", "o3-mini", "o1-mini", "o1", "o3"];

export const ENGINE_CONFIG = {
    // Azure deployment names (must match your Azure AI Studio deployment names)
    models: {
        enhancement: "gpt-4o-mini",
        primaryCode: "gpt-4.1-mini",
        alternativeCode: "gpt-4o-mini",
        judge: "gpt-4o-mini",
        runtimeFix: "gpt-4.1-mini",
        securityAudit: "o4-mini",
        codeChat: "gpt-4o-mini",
        embedding: "text-embedding-3-large",
    },

    // Strict temperature per role
    temperatures: {
        enhancement: 0.4,
        primaryCode: 0.2,
        alternativeCode: 0.6,
        judge: 0.1,
        runtimeFix: 0.2,
        securityAudit: 0.1,
        codeChat: 0.3,
    },

    // Token limits per role
    maxTokens: {
        enhancement: 2000,
        primaryCode: 4096,
        alternativeCode: 4096,
        judge: 1500,
        runtimeFix: 4096,
        securityAudit: 2000,
        codeChat: 2000,
    },

    // Confidence score weights
    confidenceWeights: {
        judge: 0.4,
        runtime: 0.3,
        static: 0.2,
        docSimilarity: 0.1,
    },

    // Retry settings for Azure API calls
    retry: {
        maxAttempts: 3,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
    },

    // Runtime fix loop
    maxFixAttempts: 2,
};
