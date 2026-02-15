import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { TopNav } from "@/components/TopNav";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { useAppStore } from "@/stores/appStore";
import { useThemeStore } from "@/stores/themeStore";
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { BarChart3, TrendingUp, Download, Loader2, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const CHART_COLORS = [
    "hsl(250, 85%, 60%)",
    "hsl(190, 90%, 50%)",
    "hsl(280, 80%, 55%)",
    "hsl(142, 76%, 42%)",
    "hsl(38, 92%, 50%)",
];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-lg px-3 py-2 shadow-xl">
            <p className="text-xs font-medium text-foreground mb-1">{label}</p>
            {payload.map((entry: any, i: number) => (
                <p key={i} className="text-xs text-muted-foreground">
                    <span className="inline-block h-2 w-2 rounded-full mr-1.5" style={{ backgroundColor: entry.color }} />
                    {entry.name}: <span className="font-semibold text-foreground">{entry.value}</span>
                </p>
            ))}
        </div>
    );
};

const Analytics = () => {
    const { theme } = useThemeStore();
    const { stats, fetchStats, history, fetchHistory, isLoadingStats } = useAppStore();

    useEffect(() => {
        fetchStats();
        fetchHistory();
    }, [fetchStats, fetchHistory]);

    const gridColor = theme === "dark" ? "hsl(228, 14%, 14%)" : "hsl(220, 13%, 90%)";
    const textColor = theme === "dark" ? "hsl(218, 15%, 50%)" : "hsl(220, 10%, 46%)";

    // Transform monthly usage for line chart
    const monthlyData = useMemo(() => {
        if (!stats?.monthlyUsage) return [];
        return stats.monthlyUsage.map((m) => ({
            name: MONTHS[m.month - 1] || `M${m.month}`,
            generations: m.count,
        }));
    }, [stats]);

    // Language distribution for bar chart
    const langData = stats?.languageDistribution || [];
    const totalGenerations = stats?.totalGenerations || 0;

    const statCards = [
        {
            title: "Total Generations",
            value: totalGenerations.toString(),
            description: "all time",
            icon: BarChart3,
        },
        {
            title: "Languages Used",
            value: (langData.length || 0).toString(),
            description: "unique languages",
            icon: Code2,
        },
        {
            title: "Most Used Language",
            value: langData[0]?.name || "—",
            description: langData[0] ? `${langData[0].value} generations` : "no data yet",
            icon: TrendingUp,
        },
    ];

    const exportCSV = () => {
        if (history.length === 0) return;
        const headers = "Date,Task,Language,DocURL\n";
        const rows = history.map((h) =>
            `"${new Date(h.createdAt).toLocaleDateString()}","${h.taskDescription}","${h.language}","${h.docUrl}"`
        ).join("\n");
        const blob = new Blob([headers + rows], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "doc2code_analytics.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    if (isLoadingStats) {
        return (
            <>
                <TopNav title="Analytics" />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">Loading analytics...</p>
                    </div>
                </main>
            </>
        );
    }

    return (
        <>
            <TopNav title="Analytics" />
            <main className="flex-1 p-6 space-y-6 overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-foreground">Detailed Analytics</h2>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Insights from your real code generation data
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={exportCSV}
                        disabled={history.length === 0}
                        className="h-9 border-border/50 hover:border-primary/40"
                    >
                        <Download className="h-4 w-4 mr-1.5" />
                        Export CSV
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {statCards.map((stat, i) => (
                        <StatsCard key={stat.title} {...stat} index={i} />
                    ))}
                </div>

                {/* Monthly Usage */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5"
                >
                    <h3 className="text-sm font-semibold text-foreground mb-4">Monthly Usage</h3>
                    {monthlyData.length === 0 ? (
                        <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
                            No monthly data yet. Generate some code to see trends!
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                                <XAxis dataKey="name" tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Line type="monotone" dataKey="generations" name="Generations" stroke="hsl(250, 85%, 60%)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </motion.div>

                {/* Bottom Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Language Distribution Bar */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5"
                    >
                        <h3 className="text-sm font-semibold text-foreground mb-4">Language Distribution</h3>
                        {langData.length === 0 ? (
                            <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
                                No language data yet
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={langData} barSize={40}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                                    <XAxis dataKey="name" tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="value" name="Generations" radius={[6, 6, 0, 0]}>
                                        {langData.map((_, i) => (
                                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </motion.div>

                    {/* Language Pie Chart */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5"
                    >
                        <h3 className="text-sm font-semibold text-foreground mb-4">Language Breakdown</h3>
                        {langData.length === 0 ? (
                            <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
                                No data yet
                            </div>
                        ) : (
                            <>
                                <ResponsiveContainer width="100%" height={220}>
                                    <PieChart>
                                        <Pie
                                            data={langData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={65}
                                            outerRadius={95}
                                            paddingAngle={4}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {langData.map((_, i) => (
                                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="text-center -mt-2">
                                    <p className="text-2xl font-bold text-foreground">{totalGenerations}</p>
                                    <p className="text-xs text-muted-foreground">Total Generations</p>
                                </div>
                            </>
                        )}
                    </motion.div>
                </div>
            </main>
        </>
    );
};

export default Analytics;
