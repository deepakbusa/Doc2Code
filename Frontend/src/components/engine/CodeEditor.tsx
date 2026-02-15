// ─── Code Editor with Documentation Trace Mapping ───────────────────
// Read-only Monaco Editor with hover provider that shows which doc chunk
// influenced each line of generated code.

import { useRef, useEffect, useCallback, useMemo } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor, IDisposable, languages, Position } from "monaco-editor";
import api from "@/lib/api";

// ─── Types ──────────────────────────────────────────────────────────

export interface LineMapping {
    startLine: number;
    endLine: number;
    docChunkId: string;
    similarityScore: number;
}

interface DocChunkResponse {
    id: string;
    url: string;
    text: string;
    chunkIndex: number;
}

interface CodeEditorProps {
    code: string;
    language: string;
    lineMappings?: LineMapping[];
    isFullscreen?: boolean;
}

// ─── Doc Chunk Cache (in-memory LRU) ────────────────────────────────

const chunkCache = new Map<string, DocChunkResponse>();
const MAX_CACHE = 50;

async function fetchDocChunk(chunkId: string): Promise<DocChunkResponse | null> {
    // Cache hit
    if (chunkCache.has(chunkId)) return chunkCache.get(chunkId)!;

    try {
        const { data } = await api.get(`/api/engine/doc-chunk/${chunkId}`);
        // Evict oldest if full
        if (chunkCache.size >= MAX_CACHE) {
            const oldest = chunkCache.keys().next().value;
            if (oldest) chunkCache.delete(oldest);
        }
        chunkCache.set(chunkId, data);
        return data;
    } catch {
        return null;
    }
}

// ─── Monaco Language Map ────────────────────────────────────────────

const LANG_MAP: Record<string, string> = {
    typescript: "typescript",
    javascript: "javascript",
    python: "python",
    java: "java",
    csharp: "csharp",
    go: "go",
    rust: "rust",
    swift: "swift",
};

// ─── Score Badge ────────────────────────────────────────────────────

function scoreBadge(score: number): string {
    const pct = Math.round(score * 100);
    if (pct >= 80) return `🟢 ${pct}% match`;
    if (pct >= 50) return `🟡 ${pct}% match`;
    return `🟠 ${pct}% match`;
}

// ─── Component ──────────────────────────────────────────────────────

export default function CodeEditor({ code, language, lineMappings, isFullscreen }: CodeEditorProps) {
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const disposablesRef = useRef<IDisposable[]>([]);

    // Memoize mappings to avoid re-registrations
    const mappings = useMemo(() => lineMappings || [], [lineMappings]);

    // Find mapping for a given line
    const findMapping = useCallback((lineNumber: number): LineMapping | null => {
        return mappings.find((m) => lineNumber >= m.startLine && lineNumber <= m.endLine) || null;
    }, [mappings]);

    // ── Editor Mount ────────────────────────────────────────────────
    const onMount: OnMount = useCallback((editorInstance, monaco) => {
        editorRef.current = editorInstance;

        // Define custom dark theme
        monaco.editor.defineTheme("doc-trace-dark", {
            base: "vs-dark",
            inherit: true,
            rules: [],
            colors: {
                "editor.background": "#0a0c14",
                "editor.lineHighlightBackground": "#ffffff08",
                "editorLineNumber.foreground": "#475569",
                "editorLineNumber.activeForeground": "#94a3b8",
                "editor.selectionBackground": "#3b82f630",
                "editorHoverWidget.background": "#0f1219",
                "editorHoverWidget.border": "#1e293b",
            },
        });
        monaco.editor.setTheme("doc-trace-dark");

        // ── Register Hover Provider ─────────────────────────────────
        const monacoLang = LANG_MAP[language] || "plaintext";

        const hoverProvider = monaco.languages.registerHoverProvider(monacoLang, {
            provideHover: async (
                _model: editor.ITextModel,
                position: Position
            ): Promise<languages.Hover | null> => {
                const mapping = findMapping(position.lineNumber);
                if (!mapping) return null;

                // Fetch doc chunk (cached)
                const chunk = await fetchDocChunk(mapping.docChunkId);
                if (!chunk) return null;

                // Build tooltip content
                const snippet = chunk.text.length > 200
                    ? chunk.text.substring(0, 200) + "..."
                    : chunk.text;

                const contents = [
                    {
                        value: [
                            `### 📄 Documentation Source`,
                            ``,
                            `**Chunk #${chunk.chunkIndex + 1}** · ${scoreBadge(mapping.similarityScore)}`,
                            ``,
                            `🔗 [${chunk.url}](${chunk.url})`,
                            ``,
                            `---`,
                            ``,
                            `\`\`\``,
                            snippet,
                            `\`\`\``,
                            ``,
                            `_Lines ${mapping.startLine}–${mapping.endLine} influenced by this documentation chunk_`,
                        ].join("\n"),
                        isTrusted: true,
                        supportHtml: false,
                    },
                ];

                return {
                    range: new monaco.Range(
                        mapping.startLine,
                        1,
                        mapping.endLine,
                        _model.getLineMaxColumn(mapping.endLine)
                    ),
                    contents,
                };
            },
        });

        disposablesRef.current.push(hoverProvider);

        // ── Line Decorations (gutter marks for mapped regions) ──────
        if (mappings.length > 0) {
            const decorations: editor.IModelDeltaDecoration[] = mappings.map((m) => ({
                range: new monaco.Range(m.startLine, 1, m.endLine, 1),
                options: {
                    isWholeLine: true,
                    linesDecorationsClassName: "doc-trace-gutter-mark",
                    overviewRuler: {
                        color: "#3b82f680",
                        position: monaco.editor.OverviewRulerLane.Left,
                    },
                },
            }));

            editorInstance.createDecorationsCollection(decorations);
        }
    }, [language, findMapping, mappings]);

    // ── Cleanup ─────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            disposablesRef.current.forEach((d) => d.dispose());
            disposablesRef.current = [];
        };
    }, []);

    // ── Inject Gutter CSS ───────────────────────────────────────────
    useEffect(() => {
        const styleId = "doc-trace-gutter-css";
        if (document.getElementById(styleId)) return;
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
            .doc-trace-gutter-mark {
                background: linear-gradient(to right, #3b82f6, transparent);
                width: 3px !important;
                margin-left: 3px;
                border-radius: 1px;
            }
        `;
        document.head.appendChild(style);
    }, []);

    return (
        <div className={isFullscreen ? "flex-1" : "h-[420px]"}>
            <Editor
                defaultLanguage={LANG_MAP[language] || "plaintext"}
                value={code}
                onMount={onMount}
                options={{
                    readOnly: true,
                    domReadOnly: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineHeight: 22,
                    padding: { top: 12, bottom: 12 },
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    renderLineHighlight: "gutter",
                    overviewRulerLanes: 1,
                    scrollbar: {
                        verticalScrollbarSize: 6,
                        horizontalScrollbarSize: 6,
                    },
                    lineNumbers: "on",
                    glyphMargin: false,
                    folding: true,
                    contextmenu: false,
                    cursorStyle: "line",
                    cursorBlinking: "smooth",
                }}
                theme="vs-dark"
                loading={
                    <div className="flex items-center justify-center h-full bg-[#0a0c14]">
                        <span className="text-muted-foreground text-sm">Loading editor...</span>
                    </div>
                }
            />
        </div>
    );
}
