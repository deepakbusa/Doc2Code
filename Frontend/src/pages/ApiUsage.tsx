import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { TopNav } from "@/components/TopNav";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { useAuthStore } from "@/stores/authStore";
import { useAppStore } from "@/stores/appStore";
import { useThemeStore } from "@/stores/themeStore";

import { Badge } from "@/components/ui/badge";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer,
} from "recharts";
import { Activity, Zap, Clock, Server, Loader2 } from "lucide-react";

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-lg px-3 py-2 shadow-xl">
            <p className="text-xs font-medium text-foreground mb-1">{label}</p>
            {payload.map((entry: any, i: number) => (
                <p key={i} className="text-xs text-muted-foreground">
                    Generations: <span className="font-semibold text-foreground">{entry.value}</span>
                </p>
            ))}
        </div>
    );
};

const ApiUsage = () => {
    const user = useAuthStore((s) => s.user);
    const { stats, fetchStats, isLoadingStats } = useAppStore();
    const { theme } = useThemeStore();
    const gridColor = theme === "dark" ? "hsl(228, 14%, 14%)" : "hsl(220, 13%, 90%)";
    const textColor = theme === "dark" ? "hsl(218, 15%, 50%)" : "hsl(220, 10%, 46%)";

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const used = stats?.requestsUsed ?? user?.requestsUsed ?? 0;


    // Daily usage data from stats
    const dailyData = useMemo(() => {
        if (!stats?.dailyUsage) return [];
        return stats.dailyUsage.map((d) => ({
            name: new Date(d.date).toLocaleDateString("en-US", { weekday: "short" }),
            calls: d.count,
        }));
    }, [stats]);

    const statCards = [
        { title: "Total Generations", value: (stats?.totalGenerations || 0).toString(), description: "all time", icon: Activity },
        { title: "Languages Used", value: (stats?.languageDistribution?.length || 0).toString(), description: "unique languages", icon: Clock },
    ];

    if (isLoadingStats) {
        return (
            <>
                <TopNav title="API Usage" />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">Loading usage data...</p>
                    </div>
                </main>
            </>
        );
    }

    return (
        <>
            <TopNav title="API Usage" />
            <main className="flex-1 p-6 space-y-6 overflow-y-auto">
                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {statCards.map((stat, i) => (
                        <StatsCard key={stat.title} {...stat} index={i} />
                    ))}
                </div>

                {/* Daily Usage Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5"
                >
                    <h3 className="text-sm font-semibold text-foreground mb-4">Recent Daily Usage</h3>
                    {dailyData.length === 0 ? (
                        <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
                            No usage data for the past 7 days. Generate some code!
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <AreaChart data={dailyData}>
                                <defs>
                                    <linearGradient id="apiGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(250, 85%, 60%)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="hsl(250, 85%, 60%)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                                <XAxis dataKey="name" tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="calls" stroke="hsl(250, 85%, 60%)" fill="url(#apiGrad)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </motion.div>

                {/* Language Breakdown Table */}
                {(stats?.languageDistribution?.length ?? 0) > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden"
                    >
                        <div className="px-5 py-4 border-b border-border/40">
                            <h3 className="text-sm font-semibold text-foreground">Generation Breakdown by Language</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border/30">
                                        <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-5 py-3">Language</th>
                                        <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-5 py-3">Generations</th>
                                        <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-5 py-3">% of Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats?.languageDistribution?.map((lang, i) => (
                                        <motion.tr
                                            key={lang.name}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.25 + i * 0.05 }}
                                            className="border-b border-border/20 last:border-0 hover:bg-muted/30 transition-colors"
                                        >
                                            <td className="px-5 py-3">
                                                <Badge variant="secondary" className="text-[10px] font-mono px-2 py-0.5 bg-primary/10 text-primary border-0">
                                                    {lang.name}
                                                </Badge>
                                            </td>
                                            <td className="px-5 py-3 text-sm text-foreground font-medium">{lang.value}</td>
                                            <td className="px-5 py-3 text-sm text-muted-foreground">
                                                {stats?.totalGenerations ? ((lang.value / stats.totalGenerations) * 100).toFixed(1) : 0}%
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}
            </main>
        </>
    );
};

export default ApiUsage;
