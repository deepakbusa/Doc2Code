// ─── Security Audit Service ─────────────────────────────────────────
// Uses o4-mini to audit code for security vulnerabilities and performance issues.

import { chatCompletion } from "../azureClient";
import { SYSTEM_PROMPTS } from "../systemPrompts";
import { ENGINE_CONFIG } from "../config";
import { logger } from "../logger";

export interface SecurityFinding {
    severity: "info" | "warning" | "error" | "critical";
    category: string;
    description: string;
    line: string | null;
    recommendation: string;
}

export interface SecurityAuditResult {
    overallRisk: "low" | "medium" | "high" | "critical";
    findings: SecurityFinding[];
    performanceNotes: string[];
    score: number; // 0-100 (100 = perfectly secure)
}

/**
 * Run a security and performance audit on the generated code.
 */
export async function auditCode(
    code: string,
    language: string
): Promise<SecurityAuditResult> {
    logger.info("Running security audit", { language });

    try {
        const raw = await chatCompletion({
            model: ENGINE_CONFIG.models.securityAudit,
            messages: [
                { role: "system", content: SYSTEM_PROMPTS.securityAudit },
                { role: "user", content: `Language: ${language}\n\nCode:\n${code}` },
            ],
            temperature: ENGINE_CONFIG.temperatures.securityAudit,
            maxTokens: ENGINE_CONFIG.maxTokens.securityAudit,
            responseFormat: "json",
        });

        const parsed: SecurityAuditResult = JSON.parse(raw);

        // Validate and normalize
        parsed.score = typeof parsed.score === "number" ? Math.max(0, Math.min(100, parsed.score)) : 75;
        parsed.findings = Array.isArray(parsed.findings) ? parsed.findings : [];
        parsed.performanceNotes = Array.isArray(parsed.performanceNotes) ? parsed.performanceNotes : [];
        parsed.overallRisk = parsed.overallRisk || "low";

        logger.info("Security audit complete", {
            risk: parsed.overallRisk,
            findings: parsed.findings.length,
            score: parsed.score,
        });

        return parsed;
    } catch (error: any) {
        logger.error("Security audit failed", { error: error.message });
        return {
            overallRisk: "medium",
            findings: [],
            performanceNotes: ["Audit could not be completed"],
            score: 50,
        };
    }
}
