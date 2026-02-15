// ─── Embedding Service (Enhanced) ───────────────────────────────────
// Cache-first RAG retrieval from DocChunk MongoDB, with similarity threshold filtering.

import { DocChunk } from "../../models/DocChunk";
import { createEmbedding, cosineSimilarity } from "../azureClient";
import { logger } from "../logger";
import crypto from "crypto";

/**
 * Retrieve the most relevant documentation chunks for a given task.
 * 1. Check MongoDB for cached chunks by URL hash
 * 2. If cached → use stored embeddings for similarity search
 * 3. If not cached → fall back to in-memory chunking + embedding
 */
export async function retrieveRelevantDocs(
    taskDescription: string,
    docContent: string,
    options: {
        docUrl?: string;
        docId?: string;
        version?: string;
        maxChunks?: number;
        similarityThreshold?: number;
    } = {}
): Promise<{ context: string; similarity: number }> {
    const {
        docUrl,
        docId,
        version,
        maxChunks = 5,
        similarityThreshold = 0.4,
    } = options;

    try {
        // ── Strategy 1: Cache-first retrieval from MongoDB ──────────
        if (docUrl || docId) {
            const query: Record<string, any> = {};
            if (docId) {
                query.docId = docId;
            } else if (docUrl) {
                query.urlHash = crypto.createHash("sha256").update(docUrl.toLowerCase().trim()).digest("hex");
            }
            if (version) {
                query.version = version;
            }

            const cachedChunks = await DocChunk.find(query).sort({ chunkIndex: 1 });

            if (cachedChunks.length > 0) {
                logger.info("Using cached document chunks", { count: cachedChunks.length, docUrl });

                // Embed the task for similarity search
                const taskEmbedding = await createEmbedding(taskDescription);

                // Score each cached chunk
                const scored = cachedChunks
                    .filter((c) => c.embedding && c.embedding.length > 0)
                    .map((chunk) => ({
                        text: chunk.text,
                        score: cosineSimilarity(taskEmbedding, chunk.embedding),
                    }))
                    .filter((c) => c.score >= similarityThreshold)
                    .sort((a, b) => b.score - a.score)
                    .slice(0, maxChunks);

                if (scored.length > 0) {
                    const avgSimilarity = scored.reduce((sum, c) => sum + c.score, 0) / scored.length;
                    const context = scored.map((c) => c.text).join("\n\n---\n\n");

                    logger.info("Cache-first RAG retrieval complete", {
                        totalChunks: cachedChunks.length,
                        selectedChunks: scored.length,
                        avgSimilarity: avgSimilarity.toFixed(3),
                    });

                    return { context, similarity: avgSimilarity };
                }

                // All chunks below threshold — use top ones anyway
                const fallbackChunks = cachedChunks.slice(0, maxChunks);
                return {
                    context: fallbackChunks.map((c) => c.text).join("\n\n---\n\n"),
                    similarity: 0.5,
                };
            }
        }

        // ── Strategy 2: In-memory chunking (no cached document) ─────
        if (!docContent || docContent.trim().length < 50) {
            return {
                context: `Documentation URL: ${docUrl || "N/A"}\nPlease implement based on standard ${docUrl ? "the provided" : ""} documentation and best practices.`,
                similarity: 0.3,
            };
        }

        const chunks = splitIntoChunks(docContent, 500);

        if (chunks.length <= 2) {
            return { context: docContent, similarity: 1.0 };
        }

        const taskEmbedding = await createEmbedding(taskDescription);

        const scoredChunks: { text: string; score: number }[] = [];
        for (const chunk of chunks) {
            try {
                const chunkEmbedding = await createEmbedding(chunk);
                const score = cosineSimilarity(taskEmbedding, chunkEmbedding);
                scoredChunks.push({ text: chunk, score });
            } catch {
                scoredChunks.push({ text: chunk, score: 0 });
            }
        }

        scoredChunks.sort((a, b) => b.score - a.score);
        const topChunks = scoredChunks
            .filter((c) => c.score >= similarityThreshold)
            .slice(0, maxChunks);

        // If nothing passes threshold, take top chunks anyway
        const selected = topChunks.length > 0 ? topChunks : scoredChunks.slice(0, maxChunks);
        const avgSimilarity = selected.reduce((sum, c) => sum + c.score, 0) / selected.length;

        logger.info("In-memory RAG retrieval complete", {
            totalChunks: chunks.length,
            selectedChunks: selected.length,
            avgSimilarity: avgSimilarity.toFixed(3),
        });

        return {
            context: selected.map((c) => c.text).join("\n\n---\n\n"),
            similarity: avgSimilarity,
        };
    } catch (error: any) {
        logger.warn("RAG retrieval failed, using full document", { error: error.message });
        return { context: docContent || "", similarity: 0.5 };
    }
}

/**
 * Embed a single text — exposed for use by other services.
 */
export async function embedDocument(text: string): Promise<number[]> {
    return createEmbedding(text);
}

/**
 * Split text into chunks of approximately maxLen characters.
 */
function splitIntoChunks(text: string, maxLen: number): string[] {
    const chunks: string[] = [];
    const paragraphs = text.split(/\n\n+/);
    let current = "";

    for (const para of paragraphs) {
        if (current.length + para.length > maxLen && current.length > 0) {
            chunks.push(current.trim());
            current = para;
        } else {
            current += (current ? "\n\n" : "") + para;
        }
    }

    if (current.trim()) {
        chunks.push(current.trim());
    }

    return chunks;
}
