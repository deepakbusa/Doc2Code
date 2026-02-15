// ─── Confidence Scoring Service ──────────────────────────────────────
// Composite confidence: (judge×0.4) + (runtime×0.3) + (static×0.2) + (docSimilarity×0.1)

import { ENGINE_CONFIG } from "../config";
import { logger } from "../logger";

export interface ConfidenceResult {
    confidenceScore: number; // 0-100
    verificationStatus: "verified" | "partial" | "unverified";
    breakdown: {
        judgeScore: number;
        runtimeScore: number;
        staticScore: number;
        docSimilarity: number;
    };
}

/**
 * Calculate composite confidence score from all validation stages.
 */
export function calculateConfidence(
    judgeScore: number,
    runtimeScore: number,
    staticScore: number,
    docSimilarity: number
): ConfidenceResult {
    const w = ENGINE_CONFIG.confidenceWeights;

    // Normalize docSimilarity from 0-1 to 0-100
    const normalizedDocSim = Math.round(docSimilarity * 100);

    const confidenceScore = Math.round(
        judgeScore * w.judge +
        runtimeScore * w.runtime +
        staticScore * w.static +
        normalizedDocSim * w.docSimilarity
    );

    // Determine verification status
    let verificationStatus: ConfidenceResult["verificationStatus"];
    if (confidenceScore >= 75 && runtimeScore >= 70 && staticScore >= 60) {
        verificationStatus = "verified";
    } else if (confidenceScore >= 50) {
        verificationStatus = "partial";
    } else {
        verificationStatus = "unverified";
    }

    const result: ConfidenceResult = {
        confidenceScore,
        verificationStatus,
        breakdown: {
            judgeScore,
            runtimeScore,
            staticScore,
            docSimilarity: normalizedDocSim,
        },
    };

    logger.info("Confidence calculated", {
        score: confidenceScore,
        status: verificationStatus,
    });

    return result;
}
