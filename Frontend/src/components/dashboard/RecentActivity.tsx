import { motion } from "framer-motion";
import { ExternalLink, CheckCircle2, Code2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

interface ActivityItem {
    id: string;
    title: string;
    language: string;
    createdAt: string;
}

interface RecentActivityProps {
    items: ActivityItem[];
}

export const RecentActivity = ({ items }: RecentActivityProps) => {
    const navigate = useNavigate();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden"
        >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
                <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
                <button
                    onClick={() => navigate("/dashboard/history")}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                    View all <ExternalLink className="h-3 w-3" />
                </button>
            </div>

            {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Code2 className="h-8 w-8 mb-2 opacity-30" />
                    <p className="text-sm">No recent activity</p>
                    <p className="text-xs opacity-60 mt-0.5">Generate some code to see it here</p>
                </div>
            ) : (
                <div className="divide-y divide-border/30">
                    {items.map((item, i) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.35 + i * 0.05 }}
                            className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer group"
                            onClick={() => navigate("/dashboard/history")}
                        >
                            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 bg-emerald-500/10")}>
                                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                                    {item.title}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <Badge
                                        variant="secondary"
                                        className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-0 font-mono"
                                    >
                                        {item.language}
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground/60">
                                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </motion.div>
    );
};
