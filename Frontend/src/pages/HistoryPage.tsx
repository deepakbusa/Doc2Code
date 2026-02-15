import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2, ExternalLink, Code2, Search, Loader2,
  Filter, X, ChevronLeft, ChevronRight, Calendar,
  Maximize2, Eye, Play,
} from "lucide-react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { TopNav } from "@/components/TopNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAppStore, type HistoryItem } from "@/stores/appStore";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

const ITEMS_PER_PAGE = 8;

const HistoryPage = () => {
  const { history, fetchHistory, deleteHistory, clearHistory, isLoadingHistory } = useAppStore();
  const [search, setSearch] = useState("");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const languages = useMemo(() => {
    const langs = new Set(history.map((h) => h.language));
    return Array.from(langs).sort();
  }, [history]);

  const filtered = useMemo(() => {
    return history.filter((h) => {
      const matchesSearch =
        h.taskDescription.toLowerCase().includes(search.toLowerCase()) ||
        h.docUrl.toLowerCase().includes(search.toLowerCase());
      const matchesLang = languageFilter === "all" || h.language === languageFilter;
      return matchesSearch && matchesLang;
    });
  }, [history, search, languageFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  useEffect(() => {
    setPage(1);
  }, [search, languageFilter]);

  return (
    <>
      <TopNav title="History" />
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-foreground">Generation History</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {filtered.length} total generation{filtered.length !== 1 ? "s" : ""}
              </p>
            </div>
            {history.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearHistory}
                className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Clear All
              </Button>
            )}
          </div>

          {/* Search & Filters */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by task or URL..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 bg-card/60 backdrop-blur-sm border-border/50 focus:border-primary/50"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Button
              variant={showFilters ? "secondary" : "outline"}
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="h-10 w-10 border-border/50"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {/* Filter Bar */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-3 pb-2">
                  <Select value={languageFilter} onValueChange={setLanguageFilter}>
                    <SelectTrigger className="w-40 h-9 bg-card/60 border-border/50">
                      <SelectValue placeholder="Language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Languages</SelectItem>
                      {languages.map((lang) => (
                        <SelectItem key={lang} value={lang}>
                          {lang.charAt(0).toUpperCase() + lang.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {languageFilter !== "all" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLanguageFilter("all")}
                      className="text-xs text-muted-foreground"
                    >
                      Clear filters <X className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Table */}
          {isLoadingHistory ? (
            <div className="text-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Loading history...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Code2 className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <p className="text-muted-foreground font-medium">No generations found</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {search ? "Try adjusting your search" : "Generate some code and it will appear here"}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-5 py-3">Task</th>
                      <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-5 py-3">Source</th>
                      <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-5 py-3">Language</th>
                      <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-5 py-3">Date</th>
                      <th className="text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-5 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {paginated.map((item, i) => (
                        <motion.tr
                          key={item.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ delay: i * 0.03 }}
                          className="border-b border-border/20 last:border-0 hover:bg-muted/30 transition-colors group"
                        >
                          <td className="px-5 py-3.5 max-w-[280px]">
                            <p className="text-sm font-medium text-foreground truncate">{item.taskDescription}</p>
                          </td>
                          <td className="px-5 py-3.5 max-w-[180px]">
                            <a
                              href={item.docUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1 truncate"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-3 w-3 shrink-0" />
                              {(() => { try { return new URL(item.docUrl).hostname; } catch { return item.docUrl; } })()}
                            </a>
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary border-0 font-mono"
                            >
                              {item.language}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-xs text-muted-foreground/70 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(item.createdAt), "MMM d, yyyy")}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedItem(item)}
                                className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                title="View Code"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/dashboard/live/${item.id}`)}
                                className="h-8 w-8 text-muted-foreground hover:text-violet-400 hover:bg-violet-500/10"
                                title="Open in Live Mode"
                              >
                                <Play className="h-3.5 w-3.5 fill-current" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteHistory(item.id)}
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-border/30">
                  <span className="text-xs text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="h-8 w-8 border-border/50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? "default" : "outline"}
                          size="icon"
                          onClick={() => setPage(pageNum)}
                          className={`h-8 w-8 text-xs ${page === pageNum
                            ? "gradient-bg text-white border-0"
                            : "border-border/50"
                            }`}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="h-8 w-8 border-border/50"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </main>

      {/* Code Preview Modal */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] bg-card/95 backdrop-blur-xl border-border/50 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="text-base font-semibold text-foreground pr-8">
              {selectedItem?.taskDescription}
            </DialogTitle>
            <div className="flex items-center gap-3 mt-2">
              <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary border-0 font-mono">
                {selectedItem?.language}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {selectedItem?.createdAt && format(new Date(selectedItem.createdAt), "MMM d, yyyy 'at' h:mm a")}
              </span>
            </div>
          </DialogHeader>
          <div className="overflow-auto max-h-[60vh]">
            {selectedItem && (
              <SyntaxHighlighter
                language={selectedItem.language}
                style={atomOneDark}
                customStyle={{
                  margin: 0,
                  padding: "1.5rem",
                  fontSize: "0.82rem",
                  background: "hsl(228 30% 4%)",
                  borderRadius: 0,
                }}
                showLineNumbers
              >
                {selectedItem.code}
              </SyntaxHighlighter>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HistoryPage;
