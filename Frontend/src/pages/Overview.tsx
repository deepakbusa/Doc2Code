import { TopNav } from "@/components/TopNav";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { UsageChart, LanguageChart, CategoryChart } from "@/components/dashboard/Charts";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { useAppStore } from "@/stores/appStore";
import { Zap, Code2, FolderOpen, Loader2 } from "lucide-react";
import { useEffect, useMemo } from "react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const Overview = () => {
    const { stats, fetchStats, isLoadingStats } = useAppStore();

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    // Transform monthly usage for the area chart
    const usageChartData = useMemo(() => {
        if (!stats?.monthlyUsage) return [];
        return stats.monthlyUsage.map((m) => ({
            name: MONTHS[m.month - 1] || `M${m.month}`,
            generations: m.count,
        }));
    }, [stats]);

    const totalGenerations = stats?.totalGenerations || 0;


    const statCards = [
        {
            title: "Total Generations",
            value: totalGenerations,
            description: "all time",
            icon: Code2,
        },
        {
            title: "API Calls Used",
            value: stats?.requestsUsed || 0,
            description: "this period",
            icon: Zap,
        },
        {
            title: "Languages Used",
            value: stats?.languageDistribution?.length || 0,
            description: "unique languages",
            icon: FolderOpen,
        },
    ];

    if (isLoadingStats) {
        return (
            <>
                <TopNav title="Overview" />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
                    </div>
                </main>
            </>
        );
    }

    return (
        <>
            <TopNav title="Overview" />
            <main className="flex-1 p-6 space-y-6 overflow-y-auto">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {statCards.map((stat, i) => (
                        <StatsCard key={stat.title} {...stat} index={i} />
                    ))}
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <UsageChart data={usageChartData} />
                    <LanguageChart data={stats?.languageDistribution || []} />
                </div>

                {/* Bottom Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2">
                        <RecentActivity items={stats?.recentActivity || []} />
                    </div>
                    <CategoryChart data={stats?.languageDistribution || []} />
                </div>
            </main>
        </>
    );
};

export default Overview;
