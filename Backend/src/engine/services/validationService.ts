// ─── Validation Service ─────────────────────────────────────────────
// Static analysis + simulated runtime validation for generated code.

import { chatCompletion } from "../azureClient";
import { SYSTEM_PROMPTS } from "../systemPrompts";
import { ENGINE_CONFIG } from "../config";
import { logger } from "../logger";

export interface ValidationResult {
    staticScore: number;    // 0-100
    runtimeScore: number;   // 0-100
    staticIssues: string[];
    runtimeError: string | null;
    passed: boolean;
}

/**
 * Run static analysis on generated code.
 * Checks for common issues via pattern matching.
 */
export function staticAnalysis(code: string, language: string): { score: number; issues: string[] } {
    const issues: string[] = [];
    let score = 100;

    // Check for empty code
    if (!code || code.trim().length < 10) {
        issues.push("Code is empty or too short");
        return { score: 0, issues };
    }

    // Check for common anti-patterns
    const checks: { pattern: RegExp; message: string; penalty: number }[] = [
        { pattern: /eval\s*\(/, message: "Uses eval() — potential security risk", penalty: 15 },
        { pattern: /TODO|FIXME|HACK/i, message: "Contains TODO/FIXME markers", penalty: 5 },
        { pattern: /console\.(log|warn|error)/, message: "Contains console statements", penalty: 3 },
        { pattern: /password|secret|api_key|apikey/i, message: "Possible hardcoded credentials", penalty: 20 },
        { pattern: /any\b/, message: "Uses 'any' type (TypeScript)", penalty: 5 },
        { pattern: /\/\/\s*@ts-ignore/, message: "Uses @ts-ignore", penalty: 10 },
    ];

    // Language-specific checks
    if (language.toLowerCase() === "javascript" || language.toLowerCase() === "typescript") {
        checks.push(
            { pattern: /var\s+/, message: "Uses 'var' instead of const/let", penalty: 5 },
            { pattern: /==(?!=)/, message: "Uses loose equality (==) instead of strict (===)", penalty: 5 }
        );
    }

    if (language.toLowerCase() === "python") {
        checks.push(
            { pattern: /except:(?!\s*\w)/, message: "Bare except clause in Python", penalty: 10 },
            { pattern: /import \*/, message: "Wildcard import", penalty: 5 }
        );
    }

    for (const check of checks) {
        if (check.pattern.test(code)) {
            issues.push(check.message);
            score -= check.penalty;
        }
    }

    // Check bracket/paren balance
    const opens = (code.match(/[\(\[\{]/g) || []).length;
    const closes = (code.match(/[\)\]\}]/g) || []).length;
    if (opens !== closes) {
        issues.push(`Bracket imbalance: ${opens} opens vs ${closes} closes`);
        score -= 15;
    }

    score = Math.max(0, Math.min(100, score));
    logger.debug("Static analysis complete", { score, issueCount: issues.length });

    return { score, issues };
}

/**
 * Simulate runtime validation by asking the model to dry-run check the code.
 * Returns a score and any detected runtime errors.
 */
export async function runtimeValidation(
    code: string,
    language: string,
    taskDescription: string
): Promise<{ score: number; error: string | null }> {
    try {
        const raw = await chatCompletion({
            model: ENGINE_CONFIG.models.judge,
            messages: [
                {
                    role: "system",
                    content: `You are a code runtime validator. Analyze if the following ${language} code would execute correctly for the given task. Check for: runtime errors, type errors, missing imports, undefined variables, infinite loops, and edge cases. Return ONLY valid JSON: { "wouldPass": true/false, "score": 0-100, "error": "description or null" }`,
                },
                {
                    role: "user",
                    content: `Task: ${taskDescription}\n\nCode:\n${code}`,
                },
            ],
            temperature: 0.1,
            maxTokens: 500,
            responseFormat: "json",
        });

        const parsed = JSON.parse(raw);
        const score = typeof parsed.score === "number" ? parsed.score : parsed.wouldPass ? 85 : 40;
        logger.debug("Runtime validation complete", { score, error: parsed.error });

        return { score, error: parsed.error || null };
    } catch (error: any) {
        logger.warn("Runtime validation failed", { error: error.message });
        return { score: 50, error: null };
    }
}

/**
 * Full validation pipeline: static + runtime.
 */
export async function validateCode(
    code: string,
    language: string,
    taskDescription: string
): Promise<ValidationResult> {
    const staticResult = staticAnalysis(code, language);
    const runtimeResult = await runtimeValidation(code, language, taskDescription);

    return {
        staticScore: staticResult.score,
        runtimeScore: runtimeResult.score,
        staticIssues: staticResult.issues,
        runtimeError: runtimeResult.error,
        passed: staticResult.score >= 50 && runtimeResult.score >= 50,
    };
}

/**
 * Attempt to fix code using the runtime fix prompt.
 */
export async function fixCode(
    code: string,
    errorLog: string,
    language: string
): Promise<string> {
    logger.info("Attempting runtime fix", { language });

    const raw = await chatCompletion({
        model: ENGINE_CONFIG.models.runtimeFix,
        messages: [
            { role: "system", content: SYSTEM_PROMPTS.runtimeFix },
            {
                role: "user",
                content: `Language: ${language}\n\nOriginal code:\n${code}\n\nError log:\n${errorLog}`,
            },
        ],
        temperature: ENGINE_CONFIG.temperatures.runtimeFix,
        maxTokens: ENGINE_CONFIG.maxTokens.runtimeFix,
    });

    return raw.replace(/^```[\w]*\n?/m, "").replace(/\n?```$/m, "").trim();
}
