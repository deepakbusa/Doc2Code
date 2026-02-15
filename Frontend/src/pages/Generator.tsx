import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Copy, Download, RefreshCw, Zap, Check,
  Maximize2, Minimize2, ChevronDown, ChevronUp, ChevronRight,
  FileCode2, Brain, BookOpen, Code2, Scale,
  ShieldCheck, Target, Sparkles, Bug, CheckCircle2,
  AlertTriangle, Eye, Link2, HelpCircle, Layers
} from "lucide-react";
import CodeEditor from "@/components/engine/CodeEditor";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useEngineStore } from "@/stores/engineStore";
import { useEngineSocket } from "@/hooks/useEngineSocket";
import { useAuthStore } from "@/stores/authStore";
import ChatPanel from "@/components/engine/ChatPanel";
import ArchitectureDiagram from "@/components/ArchitectureDiagram";
import { useNavigate } from "react-router-dom";

const LANGUAGES = [
  { 
    value: "typescript", 
    label: "TypeScript", 
    ext: ".ts",
    versions: ["5.3", "5.2", "5.1", "4.9", "4.8"]
  },
  { 
    value: "javascript", 
    label: "JavaScript", 
    ext: ".js",
    versions: ["ES2024", "ES2023", "ES2022", "ES2021", "ES2020"]
  },
  { 
    value: "python", 
    label: "Python", 
    ext: ".py",
    versions: ["3.12", "3.11", "3.10", "3.9", "3.8"]
  },
  { 
    value: "java", 
    label: "Java", 
    ext: ".java",
    versions: ["21", "17", "11", "8"]
  },
  { 
    value: "csharp", 
    label: "C#", 
    ext: ".cs",
    versions: ["12.0", "11.0", "10.0", "9.0", "8.0"]
  },
  { 
    value: "go", 
    label: "Go", 
    ext: ".go",
    versions: ["1.22", "1.21", "1.20", "1.19"]
  },
  { 
    value: "rust", 
    label: "Rust", 
    ext: ".rs",
    versions: ["1.75", "1.74", "1.73", "1.72"]
  },
  { 
    value: "swift", 
    label: "Swift", 
    ext: ".swift",
    versions: ["5.9", "5.8", "5.7", "5.6"]
  },
];

const STAGE_KEYS = [
  "enhancing_task",
  "retrieving_docs",
  "generating_code",
  "judging",
  "validating",
  "fixing_code",
  "security_audit",
  "trace_mapping",
  "scoring",
  "finalizing",
] as const;

const STAGE_MAP: Record<string, { icon: any; label: string; color: string }> = {
  enhancing_task: { icon: Brain, label: "Enhancing Task", color: "from-violet-500 to-purple-600" },
  retrieving_docs: { icon: BookOpen, label: "Scanning Documentation", color: "from-blue-500 to-cyan-600" },
  generating_code: { icon: Code2, label: "Generating Code", color: "from-emerald-500 to-green-600" },
  judging: { icon: Scale, label: "Comparing Solutions", color: "from-amber-500 to-orange-600" },
  validating: { icon: CheckCircle2, label: "Validating Code", color: "from-teal-500 to-emerald-600" },
  fixing_code: { icon: Bug, label: "Fixing Issues", color: "from-red-500 to-rose-600" },
  security_audit: { icon: ShieldCheck, label: "Security Audit", color: "from-indigo-500 to-blue-600" },
  trace_mapping: { icon: Link2, label: "Trace Mapping", color: "from-cyan-500 to-teal-600" },
  scoring: { icon: Target, label: "Scoring Confidence", color: "from-pink-500 to-rose-600" },
  finalizing: { icon: Sparkles, label: "Finalizing", color: "from-yellow-500 to-amber-600" },
};

const Generator = () => {
  const [docUrl, setDocUrl] = useState("");
  const [task, setTask] = useState("");
  const [language, setLanguage] = useState("typescript");
  const [languageVersion, setLanguageVersion] = useState<Record<string, string>>({
    typescript: "5.3",
    javascript: "ES2024",
    python: "3.12",
    java: "21",
    csharp: "12.0",
    go: "1.22",
    rust: "1.75",
    swift: "5.9",
  });
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [hoveredLanguage, setHoveredLanguage] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  const initialize = useAuthStore((s) => s.initialize);

  const {
    enhancedTasks, isEnhancing, isGenerating, generationResult,
    currentStage, stageHistory, error, isProcessingDoc,
    enhance, selectTask, generate, processDoc, reset,
    selectedTaskIndex,
  } = useEngineStore();

  useEngineSocket();

  const handleEnhance = useCallback(async () => {
    if (!task.trim()) return;
    await enhance(task, language);
  }, [task, language, enhance]);

  const handleGenerate = useCallback(async () => {
    if (!docUrl.trim() || !task.trim()) return;
    try {
      await processDoc(docUrl);
    } catch {
      // proceed without doc caching
    }
    await generate(task, docUrl, language, "");
    await initialize();
  }, [docUrl, task, language, generate, processDoc, initialize]);

  const handleCopy = () => {
    if (!generationResult) return;
    navigator.clipboard.writeText(generationResult.selectedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!generationResult) return;
    const lang = LANGUAGES.find((l) => l.value === language);
    const blob = new Blob([generationResult.selectedCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `generated${lang?.ext || ".txt"}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    reset();
    setDocUrl("");
    setTask("");
    setShowChat(false);
  };

  const isWorking = isGenerating || isProcessingDoc || isEnhancing;

  // ────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* ─── Sticky Header ──────────────────────────────── */}
      <div className="flex-shrink-0 px-6 pt-5 pb-3 border-b border-border/30 bg-background/80 backdrop-blur-md z-10">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              AI Code Generator
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open("/dashboard/architecture", "_blank")}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="View System Architecture"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
            {(generationResult || enhancedTasks.length > 0) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="gap-1.5 h-8 text-xs"
              >
                <RefreshCw className="h-3 w-3" />
                New
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Scrollable Body ────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-5 space-y-5">

          {/* ── Error ──────────────────────────────────── */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 flex items-center gap-2.5"
              >
                <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-400 leading-snug">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Input Form ─────────────────────────────── */}
          {!generationResult && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm"
            >
              <div className="px-5 pt-4 pb-1.5">
                <h2 className="text-sm font-semibold flex items-center gap-2 text-foreground/90">
                  <FileCode2 className="h-4 w-4 text-primary" />
                  Configure Generation
                </h2>
              </div>

              <div className="px-5 pb-5 space-y-4">
                {/* Row 1: Doc URL */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <BookOpen className="h-3 w-3" />
                    Documentation URL
                  </label>
                  <Input
                    value={docUrl}
                    onChange={(e) => setDocUrl(e.target.value)}
                    placeholder="https://docs.example.com/api-reference"
                    className="h-10 bg-background/60 border-border/50 focus:border-primary/50 text-sm"
                  />
                </div>

                {/* Row 2: Task */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Code2 className="h-3 w-3" />
                    Task Description
                  </label>
                  <Textarea
                    value={task}
                    onChange={(e) => setTask(e.target.value)}
                    placeholder="Describe what code you want to generate from the documentation..."
                    className="min-h-[80px] max-h-[120px] bg-background/60 border-border/50 focus:border-primary/50 resize-none text-sm leading-relaxed"
                  />
                </div>

                {/* Row 3: Language + Actions */}
                <div className="flex items-end gap-3 pt-1">
                  <div className="w-64 space-y-1.5 relative">
                    <label className="text-xs font-medium text-muted-foreground">
                      Language & Version
                    </label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger className="h-10 bg-background/60 border-border/50 text-sm">
                        <SelectValue>
                          <span className="flex items-center gap-2">
                            <span>{LANGUAGES.find((l) => l.value === language)?.label}</span>
                            <span className="text-xs text-muted-foreground">
                              ({languageVersion[language]})
                            </span>
                          </span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="w-64 max-h-[300px]">
                        {LANGUAGES.map((lang, index) => (
                          <div
                            key={lang.value}
                            className="relative group"
                            onMouseEnter={(e) => {
                              // Clear any pending hide timeout
                              if (hoverTimeoutRef.current) {
                                clearTimeout(hoverTimeoutRef.current);
                                hoverTimeoutRef.current = null;
                              }
                              const rect = e.currentTarget.getBoundingClientRect();
                              setHoveredLanguage(lang.value);
                              setMenuPosition({
                                top: rect.top - 2,
                                left: rect.right - 10,
                              });
                            }}
                            onMouseLeave={() => {
                              // Set a timeout to hide, but it can be cleared if mouse enters menu
                              hoverTimeoutRef.current = setTimeout(() => {
                                setHoveredLanguage(null);
                                setMenuPosition(null);
                              }, 500);
                            }}
                          >
                            <SelectItem 
                              value={lang.value}
                              className="cursor-pointer pr-12 hover:bg-accent/50"
                            >
                              <div className="flex items-center justify-between w-full">
                                <span>{lang.label}</span>
                                <span className="text-xs text-muted-foreground ml-auto pl-3">
                                  {languageVersion[lang.value]}
                                </span>
                                <ChevronRight className="h-3 w-3 text-muted-foreground/40 ml-1.5 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
                              </div>
                            </SelectItem>
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2 ml-auto">
                    {enhancedTasks.length === 0 && (
                      <Button
                        onClick={handleEnhance}
                        disabled={isWorking || !task.trim()}
                        variant="outline"
                        className="h-10 gap-1.5 text-sm"
                      >
                        {isEnhancing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
                        Enhance
                      </Button>
                    )}
                    <Button
                      onClick={handleGenerate}
                      disabled={isWorking || !docUrl.trim() || !task.trim()}
                      className="h-10 gap-1.5 text-sm bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-600/90 shadow-md shadow-primary/15"
                    >
                      {isGenerating || isProcessingDoc
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Zap className="h-3.5 w-3.5" />}
                      Generate
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Enhanced Task Selection ────────────────── */}
          {enhancedTasks.length > 0 && !generationResult && !isGenerating && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm"
            >
              <div className="px-5 pt-4 pb-2">
                <h2 className="text-sm font-semibold flex items-center gap-2 text-foreground/90">
                  <Brain className="h-4 w-4 text-violet-500" />
                  Select Enhanced Specification
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Choose the interpretation that best matches your intent
                </p>
              </div>
              <div className="px-5 pb-4 space-y-2.5">
                {enhancedTasks.map((et, i) => (
                  <motion.div
                    key={i}
                    whileTap={{ scale: 0.995 }}
                    onClick={() => selectTask(i)}
                    className={`cursor-pointer rounded-lg border p-3.5 transition-all ${i === selectedTaskIndex
                      ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                      : "border-border/30 hover:border-primary/20 hover:bg-muted/20"
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${i === selectedTaskIndex ? "border-primary bg-primary" : "border-border/50"
                        }`}>
                        {i === selectedTaskIndex && <Check className="h-2.5 w-2.5 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium">{et.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{et.description}</p>
                        {et.keyRequirements?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {et.keyRequirements.slice(0, 4).map((req, j) => (
                              <span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/40 border border-border/20 text-muted-foreground">
                                {req}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Stage Progress ─────────────────────────── */}
          {(isGenerating || isProcessingDoc) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm p-5"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-md shadow-primary/20">
                  <Zap className="h-4 w-4 text-white animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">AI Engine Running</h3>
                  <p className="text-xs text-muted-foreground">{currentStage?.message || "Initializing..."}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {STAGE_KEYS.map((key) => {
                  const stage = STAGE_MAP[key];
                  const isActive = currentStage?.stage === key;
                  // Positional completion: all stages before the current active one are done
                  const activeStage = currentStage?.stage ?? "";
                  const activeIdx = (STAGE_KEYS as readonly string[]).indexOf(activeStage);
                  const thisIdx = (STAGE_KEYS as readonly string[]).indexOf(key);
                  const isCompleted = !isActive && (activeIdx > thisIdx || stageHistory.some((s) => s.stage === key));
                  const StageIcon = stage.icon;

                  return (
                    <motion.div
                      key={key}
                      animate={{ opacity: isActive || isCompleted ? 1 : 0.3 }}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all ${isActive ? "bg-primary/8 border border-primary/15" : ""
                        }`}
                    >
                      <div className={`h-6 w-6 rounded flex items-center justify-center flex-shrink-0 ${isActive ? `bg-gradient-to-br ${stage.color}` :
                        isCompleted ? "bg-emerald-500/15" : "bg-muted/40"
                        }`}>
                        {isCompleted
                          ? <Check className="h-3 w-3 text-emerald-500" />
                          : <StageIcon className={`h-3 w-3 ${isActive ? "text-white" : "text-muted-foreground"}`} />}
                      </div>
                      <span className={`text-xs truncate ${isActive ? "font-medium" : "text-muted-foreground"}`}>
                        {stage.label}
                      </span>
                    </motion.div>
                  );
                })}
              </div>

              {/* Live Architecture Diagram */}
              <div className="mt-6 pt-4 border-t border-border/40">
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                  <h3 className="text-xs font-semibold text-muted-foreground">Live Execution Flow</h3>
                </div>
                <ArchitectureDiagram
                  currentStage={currentStage?.stage}
                  className="h-[300px] w-full border border-border/30 rounded-lg bg-card/30"
                  controls={false}
                />
              </div>

            </motion.div>
          )}


          {/* ── Generated Code Output ─────────────────── */}
          {generationResult && !isGenerating && (
            <>
              {/* Code Block */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden shadow-lg shadow-black/5 ${isFullscreen ? "fixed inset-3 z-50 flex flex-col" : ""
                  }`}
              >
                {/* Toolbar */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/30 bg-muted/20">
                  <div className="flex items-center gap-2.5">
                    <FileCode2 className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium text-muted-foreground font-mono">
                      {LANGUAGES.find((l) => l.value === language)?.label} {languageVersion[language]}
                    </span>
                    <span className="text-[10px] text-muted-foreground/40 font-mono">
                      {generationResult.selectedCode.split("\n").length} lines
                    </span>

                    {/* Confidence badge */}
                    {generationResult.confidence && (
                      <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white ${generationResult.confidence.confidenceScore >= 75
                        ? "bg-gradient-to-r from-emerald-500 to-green-600"
                        : generationResult.confidence.confidenceScore >= 50
                          ? "bg-gradient-to-r from-amber-500 to-orange-600"
                          : "bg-gradient-to-r from-red-500 to-rose-600"
                        }`}>
                        {generationResult.confidence.confidenceScore}%
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 px-2 text-[11px] hover:bg-primary/10 hover:text-primary">
                      {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleDownload} className="h-7 px-2 text-[11px] hover:bg-primary/10 hover:text-primary">
                      <Download className="h-3 w-3 mr-1" />
                      Save
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => navigate(`/dashboard/visualize/${generationResult.generationId}`)}
                      className="h-7 px-2 text-[11px] hover:bg-primary/10 hover:text-primary"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Visualize
                    </Button>
                    <span className="w-px h-4 bg-border/30 mx-0.5" />
                    <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(!isFullscreen)} className="h-7 w-7 hover:bg-primary/10 hover:text-primary">
                      {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>

                {/* Code */}
                <div className={isFullscreen ? "flex-1 overflow-hidden" : ""}>
                  <CodeEditor
                    code={generationResult.selectedCode}
                    language={language}
                    lineMappings={generationResult.lineMappings}
                    isFullscreen={isFullscreen}
                  />
                </div>
              </motion.div>

              {/* ── Stats Row: Security + Validation ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Security */}
                {generationResult.securityAudit && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-xl border border-border/40 bg-card/50 p-4"
                  >
                    <div className="flex items-center gap-2 mb-2.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
                      <span className="text-xs font-semibold">Security</span>
                      <span className={`text-[10px] ml-auto px-2 py-0.5 rounded-full font-medium ${generationResult.securityAudit.overallRisk === "low"
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        : generationResult.securityAudit.overallRisk === "medium"
                          ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                          : "bg-red-500/10 text-red-500 border border-red-500/20"
                        }`}>
                        {generationResult.securityAudit.overallRisk} risk
                      </span>
                    </div>
                    {generationResult.securityAudit.findings.length > 0 ? (
                      <div className="space-y-1.5">
                        {generationResult.securityAudit.findings.slice(0, 3).map((f, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-[11px]">
                            <AlertTriangle className={`h-3 w-3 mt-px flex-shrink-0 ${f.severity === "critical" ? "text-red-500" :
                              f.severity === "error" ? "text-orange-500" :
                                f.severity === "warning" ? "text-amber-500" : "text-blue-400"
                              }`} />
                            <span className="text-muted-foreground leading-snug">{f.description}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-emerald-500 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> No issues found
                      </p>
                    )}
                  </motion.div>
                )}

                {/* Validation */}
                {generationResult.validationResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="rounded-xl border border-border/40 bg-card/50 p-4"
                  >
                    <div className="flex items-center gap-2 mb-2.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-teal-500" />
                      <span className="text-xs font-semibold">Validation</span>
                      <span className={`text-[10px] ml-auto px-2 py-0.5 rounded-full font-medium ${generationResult.validationResult.passed
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                        }`}>
                        {generationResult.validationResult.passed ? "Passed" : "Partial"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 mb-2.5">
                      <div className="text-center p-2 rounded-lg bg-muted/20 border border-border/20">
                        <div className="text-base font-bold">{generationResult.validationResult.staticScore}</div>
                        <div className="text-[10px] text-muted-foreground">Static</div>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-muted/20 border border-border/20">
                        <div className="text-base font-bold">{generationResult.validationResult.runtimeScore}</div>
                        <div className="text-[10px] text-muted-foreground">Runtime</div>
                      </div>
                    </div>
                    {generationResult.validationResult.staticIssues?.length > 0 && (
                      <div className="space-y-1">
                        {generationResult.validationResult.staticIssues.slice(0, 2).map((issue, i) => (
                          <p key={i} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                            <span className="h-1 w-1 rounded-full bg-amber-500 flex-shrink-0" />
                            {issue}
                          </p>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* ── Chat Toggle ───────────────────── */}
              <div className="space-y-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowChat(!showChat)}
                  className="gap-1.5 h-8 text-xs"
                >
                  {showChat ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  Code Chat
                </Button>
                <AnimatePresence>
                  {showChat && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <ChatPanel generationId={generationResult.generationId} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Version Selector Menu - Rendered outside Select dropdown */}
      <AnimatePresence>
        {hoveredLanguage && menuPosition && (
          <motion.div
            initial={{ opacity: 0, x: -10, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed bg-popover border-2 border-border rounded-lg shadow-2xl p-2 z-[9999]"
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
              minWidth: '160px',
              pointerEvents: 'auto',
            }}
            onMouseEnter={() => {
              // Clear any pending hide timeout when mouse enters the menu
              if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
                hoverTimeoutRef.current = null;
              }
            }}
            onMouseMove={() => {
              // Keep clearing timeout while moving inside the menu
              if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
                hoverTimeoutRef.current = null;
              }
            }}
            onMouseLeave={() => {
              // Add delay on menu leave too for smoother interaction
              hoverTimeoutRef.current = setTimeout(() => {
                setHoveredLanguage(null);
                setMenuPosition(null);
              }, 300);
            }}
          >
            <div className="text-[10px] font-bold text-muted-foreground mb-2 px-2 pt-0.5 uppercase tracking-wider border-b border-border/50 pb-1.5">
              Select Version
            </div>
            <div className="space-y-0.5 max-h-[220px] overflow-y-auto">
              {LANGUAGES.find((l) => l.value === hoveredLanguage)?.versions.map((version) => (
                <button
                  key={version}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setLanguageVersion((prev) => ({
                      ...prev,
                      [hoveredLanguage]: version,
                    }));
                    setHoveredLanguage(null);
                    setMenuPosition(null);
                  }}
                  onMouseEnter={(e) => {
                    // Keep menu open while hovering buttons
                    if (hoverTimeoutRef.current) {
                      clearTimeout(hoverTimeoutRef.current);
                      hoverTimeoutRef.current = null;
                    }
                  }}
                  className={`w-full text-left px-3 py-2.5 text-sm rounded-md transition-all duration-150 flex items-center justify-between cursor-pointer ${
                    languageVersion[hoveredLanguage] === version
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                      : "text-foreground hover:bg-accent/80 hover:text-accent-foreground hover:shadow-sm"
                  }`}
                >
                  <span className="font-medium">{version}</span>
                  {languageVersion[hoveredLanguage] === version && (
                    <Check className="h-4 w-4 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div >
  );
};

export default Generator;
