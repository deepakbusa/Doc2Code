// ─── Document Ingestion Service ─────────────────────────────────────
// Fetches, cleans, chunks, and embeds documentation from URLs.

import axios from "axios";
import * as cheerio from "cheerio";
import crypto from "crypto";
import { DocChunk } from "../../models/DocChunk";
import { createEmbedding } from "../azureClient";
import { logger } from "../logger";

export interface IngestionResult {
    docId: string;
    url: string;
    urlHash: string;
    version: string;
    chunkCount: number;
    cached: boolean;
}

export interface IngestionOptions {
    forceRefresh?: boolean;
}

// ── Main Entry Point ────────────────────────────────────────────────

export async function ingestDocument(
    url: string,
    options: IngestionOptions = {}
): Promise<IngestionResult> {
    const urlHash = hashUrl(url);

    // Check cache: skip re-embedding if already processed
    if (!options.forceRefresh) {
        const existingCount = await DocChunk.countDocuments({ urlHash });
        if (existingCount > 0) {
            const first = await DocChunk.findOne({ urlHash });
            logger.info("Document already cached, skipping ingestion", { url, chunks: existingCount });
            return {
                docId: first?.docId || urlHash,
                url,
                urlHash,
                version: first?.version || "unknown",
                chunkCount: existingCount,
                cached: true,
            };
        }
    } else {
        // Force refresh: delete existing chunks
        await DocChunk.deleteMany({ urlHash });
    }

    // Fetch content
    logger.info("Fetching document", { url });
    const rawContent = await fetchContent(url);

    if (!rawContent || rawContent.trim().length < 50) {
        throw new Error("Failed to extract meaningful content from URL");
    }

    // Detect version
    const version = detectVersion(url, rawContent);

    // Generate docId
    const docId = crypto.randomUUID();

    // Chunk content
    const chunks = chunkContent(rawContent, 800, 1200);
    logger.info("Document chunked", { url, chunks: chunks.length, version });

    // Embed and store each chunk
    for (let i = 0; i < chunks.length; i++) {
        try {
            const embedding = await createEmbedding(chunks[i]);
            await DocChunk.create({
                docId,
                url,
                urlHash,
                version,
                chunkIndex: i,
                text: chunks[i],
                embedding,
                tokenCount: estimateTokens(chunks[i]),
            });
        } catch (error: any) {
            logger.error(`Failed to embed chunk ${i}`, { error: error.message });
            // Store chunk without embedding so we don't lose the text
            await DocChunk.create({
                docId,
                url,
                urlHash,
                version,
                chunkIndex: i,
                text: chunks[i],
                embedding: [],
                tokenCount: estimateTokens(chunks[i]),
            });
        }
    }

    logger.info("Document ingestion complete", { docId, url, chunks: chunks.length });

    return {
        docId,
        url,
        urlHash,
        version,
        chunkCount: chunks.length,
        cached: false,
    };
}

// ── Content Fetching ────────────────────────────────────────────────

async function fetchContent(url: string): Promise<string> {
    const isGitHub = url.includes("github.com") && url.includes("/blob/");
    const isRawGitHub = url.includes("raw.githubusercontent.com");

    // Convert GitHub blob URLs to raw content
    let fetchUrl = url;
    if (isGitHub) {
        fetchUrl = url
            .replace("github.com", "raw.githubusercontent.com")
            .replace("/blob/", "/");
    }

    try {
        const response = await axios.get(fetchUrl, {
            timeout: 15000,
            headers: {
                "User-Agent": "Doc2Code/1.0",
                "Accept": "text/html,application/xhtml+xml,text/markdown,text/plain,*/*",
            },
        });

        const contentType = response.headers["content-type"] || "";
        const data = typeof response.data === "string" ? response.data : JSON.stringify(response.data);

        // Markdown or plain text — use directly
        if (
            contentType.includes("text/markdown") ||
            contentType.includes("text/plain") ||
            isRawGitHub ||
            isGitHub ||
            url.endsWith(".md")
        ) {
            return data;
        }

        // HTML — parse and extract main content
        if (contentType.includes("text/html") || contentType.includes("application/xhtml")) {
            return extractFromHtml(data);
        }

        // Fallback — use raw content
        return data;
    } catch (error: any) {
        logger.error("Content fetch failed", { url, error: error.message });
        throw new Error(`Failed to fetch document: ${error.message}`);
    }
}

// ── HTML Content Extraction ─────────────────────────────────────────

function extractFromHtml(html: string): string {
    const $ = cheerio.load(html);

    // Remove non-content elements
    $("script, style, nav, footer, header, iframe, noscript, svg").remove();
    $('[role="navigation"], [role="banner"], [role="contentinfo"]').remove();
    $(".nav, .navbar, .footer, .sidebar, .menu, .breadcrumb, .cookie").remove();
    $('[class*="nav-"], [class*="footer-"], [class*="sidebar-"], [class*="menu-"]').remove();

    // Try to find main content area
    const mainSelectors = [
        "main",
        "article",
        '[role="main"]',
        ".content",
        ".main-content",
        ".documentation",
        ".doc-content",
        ".markdown-body",
        "#content",
        "#main",
    ];

    let content = "";
    for (const selector of mainSelectors) {
        const el = $(selector);
        if (el.length && el.text().trim().length > 100) {
            content = elementToMarkdown($, el);
            break;
        }
    }

    // Fallback: use body
    if (!content || content.length < 100) {
        content = elementToMarkdown($, $("body"));
    }

    return content.trim();
}

function elementToMarkdown($: cheerio.CheerioAPI, el: cheerio.Cheerio<any>): string {
    const lines: string[] = [];

    el.find("h1, h2, h3, h4, h5, h6, p, pre, code, li, td, th, blockquote").each((_, elem) => {
        const tag = (elem as any).tagName?.toLowerCase() || "";
        const text = $(elem).text().trim();
        if (!text) return;

        switch (tag) {
            case "h1": lines.push(`\n# ${text}\n`); break;
            case "h2": lines.push(`\n## ${text}\n`); break;
            case "h3": lines.push(`\n### ${text}\n`); break;
            case "h4": lines.push(`\n#### ${text}\n`); break;
            case "h5":
            case "h6": lines.push(`\n##### ${text}\n`); break;
            case "pre":
            case "code":
                if (text.includes("\n")) {
                    lines.push(`\n\`\`\`\n${text}\n\`\`\`\n`);
                } else {
                    lines.push(`\`${text}\``);
                }
                break;
            case "li": lines.push(`- ${text}`); break;
            case "blockquote": lines.push(`> ${text}`); break;
            default: lines.push(text); break;
        }
    });

    return lines.join("\n");
}

// ── Version Detection ───────────────────────────────────────────────

function detectVersion(url: string, content: string): string {
    // Check URL for version patterns
    const urlVersionMatch = url.match(/\/v?(\d+\.\d+(?:\.\d+)?)\//);
    if (urlVersionMatch) return urlVersionMatch[1];

    const urlVersionMatch2 = url.match(/[@\-]v?(\d+\.\d+(?:\.\d+)?)/);
    if (urlVersionMatch2) return urlVersionMatch2[1];

    // Check content for version in headers
    const headerMatch = content.match(/(?:version|v)\s*[:\s]?\s*(\d+\.\d+(?:\.\d+)?)/i);
    if (headerMatch) return headerMatch[1];

    return "latest";
}

// ── Content Chunking ────────────────────────────────────────────────

function chunkContent(text: string, minTokens: number, maxTokens: number): string[] {
    const chunks: string[] = [];
    const paragraphs = text.split(/\n\n+/);
    let current = "";

    for (const para of paragraphs) {
        const combined = current ? current + "\n\n" + para : para;
        const tokens = estimateTokens(combined);

        if (tokens > maxTokens && current) {
            chunks.push(current.trim());
            current = para;
        } else if (tokens > maxTokens && !current) {
            // Single paragraph too long — split by sentences
            const sentences = para.split(/(?<=[.!?])\s+/);
            let sentChunk = "";
            for (const sentence of sentences) {
                const sentCombined = sentChunk ? sentChunk + " " + sentence : sentence;
                if (estimateTokens(sentCombined) > maxTokens && sentChunk) {
                    chunks.push(sentChunk.trim());
                    sentChunk = sentence;
                } else {
                    sentChunk = sentCombined;
                }
            }
            if (sentChunk.trim()) current = sentChunk;
        } else {
            current = combined;
        }
    }

    if (current.trim() && estimateTokens(current) >= minTokens / 2) {
        chunks.push(current.trim());
    } else if (current.trim() && chunks.length > 0) {
        // Merge small last chunk into previous
        chunks[chunks.length - 1] += "\n\n" + current.trim();
    } else if (current.trim()) {
        chunks.push(current.trim());
    }

    return chunks;
}

// ── Utilities ───────────────────────────────────────────────────────

function hashUrl(url: string): string {
    return crypto.createHash("sha256").update(url.toLowerCase().trim()).digest("hex");
}

function estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
}
