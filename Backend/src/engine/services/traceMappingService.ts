// ─── Trace Mapping Service ──────────────────────────────────────────
// Maps generated code lines to documentation chunks using embedding similarity.
// Pure math — no AI calls — uses existing embeddings from DocChunk collection.

import { DocChunk, IDocChunk } from "../../models/DocChunk";
import { createEmbedding, cosineSimilarity } from "../azureClient";
import { logger } from "../logger";
import crypto from "crypto";

export interface LineMapping {
    startLine: number;
    endLine: number;
    docChunkId: string;
    similarityScore: number;
}

/**
 * Build line-to-doc-chunk mappings for the generated code.
 * Strategy:
 *   1. Split code into logical blocks (by blank-line-delimited groups)
 *   2. Retrieve all DocChunk embeddings for the source docUrl
 *   3. Embed each code block
 *   4. Find the best-matching doc chunk for each block via cosine similarity
 *   5. Return sorted mappings with similarity scores
 */
export async function buildTraceMappings(
    code: string,
    docUrl: string,
    similarityThreshold: number = 0.3
): Promise<LineMapping[]> {
    try {
        // ── Retrieve doc chunks with embeddings ─────────────────────
        const urlHash = crypto.createHash("sha256").update(docUrl.toLowerCase().trim()).digest("hex");
        const docChunks = await DocChunk.find({ urlHash }).sort({ chunkIndex: 1 });

        if (docChunks.length === 0) {
            logger.info("No doc chunks found for trace mapping", { docUrl });
            return [];
        }

        // Filter to chunks that have embeddings
        const chunksWithEmbeddings = docChunks.filter(
            (c) => c.embedding && c.embedding.length > 0
        );

        if (chunksWithEmbeddings.length === 0) {
            logger.info("No embedded doc chunks for trace mapping");
            return [];
        }

        // ── Split code into logical blocks ──────────────────────────
        const codeBlocks = splitCodeIntoBlocks(code);

        if (codeBlocks.length === 0) return [];

        // ── Embed each code block and find best doc chunk ───────────
        const mappings: LineMapping[] = [];

        for (const block of codeBlocks) {
            try {
                // Skip very short blocks (comments, blank lines)
                if (block.text.trim().length < 15) continue;

                const blockEmbedding = await createEmbedding(block.text);

                // Find best matching doc chunk
                let bestChunk: IDocChunk | null = null;
                let bestScore = -1;

                for (const chunk of chunksWithEmbeddings) {
                    const score = cosineSimilarity(blockEmbedding, chunk.embedding);
                    if (score > bestScore) {
                        bestScore = score;
                        bestChunk = chunk;
                    }
                }

                if (bestChunk && bestScore >= similarityThreshold) {
                    mappings.push({
                        startLine: block.startLine,
                        endLine: block.endLine,
                        docChunkId: bestChunk._id.toString(),
                        similarityScore: Math.round(bestScore * 1000) / 1000,
                    });
                }
            } catch (err: any) {
                logger.warn("Failed to embed code block for trace mapping", {
                    startLine: block.startLine,
                    error: err.message,
                });
            }
        }

        logger.info("Trace mapping complete", {
            codeBlocks: codeBlocks.length,
            mappings: mappings.length,
            docChunks: chunksWithEmbeddings.length,
        });

        return mappings;
    } catch (error: any) {
        logger.warn("Trace mapping failed", { error: error.message });
        return [];
    }
}

// ─── Code Block Splitter ────────────────────────────────────────────

interface CodeBlock {
    startLine: number;
    endLine: number;
    text: string;
}

/**
 * Split code into logical blocks separated by blank lines.
 * Each block tracks its line range (1-indexed).
 */
function splitCodeIntoBlocks(code: string): CodeBlock[] {
    const lines = code.split("\n");
    const blocks: CodeBlock[] = [];

    let currentLines: string[] = [];
    let blockStart = 1;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;

        if (line.trim() === "" && currentLines.length > 0) {
            // End current block
            blocks.push({
                startLine: blockStart,
                endLine: lineNum - 1,
                text: currentLines.join("\n"),
            });
            currentLines = [];
            blockStart = lineNum + 1;
        } else if (line.trim() !== "") {
            if (currentLines.length === 0) {
                blockStart = lineNum;
            }
            currentLines.push(line);
        } else {
            // Blank line before any block content — advance start
            blockStart = lineNum + 1;
        }
    }

    // Final block
    if (currentLines.length > 0) {
        blocks.push({
            startLine: blockStart,
            endLine: lines.length,
            text: currentLines.join("\n"),
        });
    }

    return blocks;
}
