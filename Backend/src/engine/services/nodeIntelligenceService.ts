// ─── Node Intelligence Service ──────────────────────────────────────
// AI-powered node explanations with 5 analysis modes and MongoDB caching.

import { chatCompletion } from "../azureClient";
import { ENGINE_CONFIG } from "../config";
import { NodeInsight } from "../../models/NodeInsight";
import { Generation } from "../../models/Generation";
import { logger } from "../logger";

export type NodeMode = "explain" | "optimize" | "security" | "usage" | "alternative";

export interface NodeExplainRequest {
    generationId: string;
    nodeId: string;
    nodeType: string;
    nodeLabel: string;
    codeSnippet: string;
    mode: NodeMode;
}

export interface NodeExplainResult {
    explanation: string;
    possibleQuestions: string[];
    improvements?: string[];
    securityNotes?: string[];
    cached: boolean;
}

// ── Mode-Specific System Prompts ────────────────────────────────────

const MODE_PROMPTS: Record<NodeMode, string> = {
    explain: `You are a senior software engineer explaining a specific code node.

Only analyze the provided snippet in the context of the full source code.
Do not generalize. Explain clearly and technically.

Provide:
- A clear explanation of what this code does and why it exists
- 3 possible follow-up questions a developer might ask
- Potential improvement suggestions
- Security notes if applicable

Return structured JSON only:
{
  "explanation": "string",
  "possibleQuestions": ["string", "string", "string"],
  "improvements": ["string"],
  "securityNotes": ["string"]
}`,

    optimize: `You are a performance optimization expert analyzing a specific code node.

Focus exclusively on:
- Runtime performance improvements
- Memory efficiency
- Algorithm complexity reduction
- Caching opportunities
- Unnecessary computation elimination

Return structured JSON only:
{
  "explanation": "string describing current performance characteristics and bottlenecks",
  "possibleQuestions": ["string", "string", "string"],
  "improvements": ["string — concrete optimization suggestions with code hints"],
  "securityNotes": []
}`,

    security: `You are a security auditor analyzing a specific code node for vulnerabilities.

Focus exclusively on:
- Injection risks (SQL, XSS, command injection)
- Authentication/authorization flaws
- Data exposure risks
- Input validation gaps
- Unsafe dependencies or patterns
- Memory safety issues

Return structured JSON only:
{
  "explanation": "string describing security posture of this code",
  "possibleQuestions": ["string", "string", "string"],
  "improvements": ["string — security hardening recommendations"],
  "securityNotes": ["string — specific vulnerabilities found"]
}`,

    usage: `You are a code analysis expert tracing how a specific code node is used.

Analyze the full source code to find:
- Where this function/class/import is called
- What depends on it
- What it depends on
- The data flow through this node
- Side effects

Return structured JSON only:
{
  "explanation": "string describing usage patterns and dependencies",
  "possibleQuestions": ["string", "string", "string"],
  "improvements": ["string — suggestions for better encapsulation or API design"],
  "securityNotes": []
}`,

    alternative: `You are a software architect suggesting alternative patterns for a specific code node.

Provide:
- Alternative design patterns that could replace this implementation
- Pros and cons of each alternative
- When each alternative would be preferred
- Code hints for the best alternative

Return structured JSON only:
{
  "explanation": "string describing current pattern and why alternatives exist",
  "possibleQuestions": ["string", "string", "string"],
  "improvements": ["string — alternative pattern suggestions with brief code examples"],
  "securityNotes": []
}`,
};

// ── Main Entry Point ────────────────────────────────────────────────

export async function explainNode(req: NodeExplainRequest): Promise<NodeExplainResult> {
    const { generationId, nodeId, nodeType, nodeLabel, codeSnippet, mode } = req;

    // ── Cache Check ─────────────────────────────────────────────────
    try {
        const cached = await NodeInsight.findOne({ generationId, nodeId, mode });
        if (cached) {
            logger.info("Node insight cache hit", { nodeId, mode });
            return { ...cached.result, cached: true };
        }
    } catch {
        // Cache miss — continue to AI call
    }

    // ── Retrieve Full Code Context ──────────────────────────────────
    let fullCode = "";
    try {
        const generation = await Generation.findById(generationId);
        if (generation) {
            fullCode = generation.selectedCode;
        }
    } catch {
        // Proceed without full context
    }

    // ── Build User Prompt ───────────────────────────────────────────
    const userPrompt = `Analyze this ${nodeType} node named "${nodeLabel}":

\`\`\`
${codeSnippet}
\`\`\`

${fullCode ? `Full source code for context:\n\`\`\`\n${fullCode.substring(0, 6000)}\n\`\`\`` : ""}

Provide analysis in the specified JSON format.`;

    // ── Call Azure ───────────────────────────────────────────────────
    logger.info("Node intelligence call", { nodeId, mode, nodeType });

    const response = await chatCompletion({
        model: ENGINE_CONFIG.models.codeChat,
        messages: [
            { role: "system", content: MODE_PROMPTS[mode] },
            { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        maxTokens: 1500,
        responseFormat: "json",
    });

    // ── Parse Response ──────────────────────────────────────────────
    let result: NodeExplainResult;
    try {
        const parsed = JSON.parse(response);
        result = {
            explanation: parsed.explanation || "No explanation available.",
            possibleQuestions: parsed.possibleQuestions || [],
            improvements: parsed.improvements || [],
            securityNotes: parsed.securityNotes || [],
            cached: false,
        };
    } catch {
        result = {
            explanation: response,
            possibleQuestions: [],
            improvements: [],
            securityNotes: [],
            cached: false,
        };
    }

    // ── Cache Result ────────────────────────────────────────────────
    try {
        await NodeInsight.findOneAndUpdate(
            { generationId, nodeId, mode },
            {
                generationId,
                nodeId,
                mode,
                result: {
                    explanation: result.explanation,
                    possibleQuestions: result.possibleQuestions,
                    improvements: result.improvements,
                    securityNotes: result.securityNotes,
                },
            },
            { upsert: true, new: true }
        );
        logger.info("Node insight cached", { nodeId, mode });
    } catch (err: any) {
        logger.warn("Failed to cache node insight", { error: err.message });
    }

    return result;
}
