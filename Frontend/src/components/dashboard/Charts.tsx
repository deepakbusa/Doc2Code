import { motion } from "framer-motion";
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useThemeStore } from "@/stores/themeStore";

const CHART_COLORS = [
    "hsl(250, 85%, 60%)",
    "hsl(190, 90%, 50%)",
    "hsl(280, 80%, 55%)",
    "hsl(142, 76%, 42%)",
    "hsl(38, 92%, 50%)",
    "hsl(0, 84%, 60%)",
    "hsl(210, 80%, 55%)",
    "hsl(330, 75%, 55%)",
    "hsl(160, 75%, 45%)",
    "hsl(60, 90%, 50%)",
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

interface UsageChartProps {
    data: { name: string; generations: number }[];
}

export const UsageChart = ({ data }: UsageChartProps) => {
    const { theme } = useThemeStore();
    const gridColor = theme === "dark" ? "hsl(228, 14%, 14%)" : "hsl(220, 13%, 90%)";
    const textColor = theme === "dark" ? "hsl(218, 15%, 50%)" : "hsl(220, 10%, 46%)";

    const isEmpty = data.length === 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5"
        >
            <h3 className="text-sm font-semibold text-foreground mb-4">Usage Over Time</h3>
            {isEmpty ? (
                <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
                    No generation data yet. Start generating code!
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="gradGen" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(250, 85%, 60%)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="hsl(250, 85%, 60%)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis dataKey="name" tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="generations" name="Generations" stroke="hsl(250, 85%, 60%)" fill="url(#gradGen)" strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            )}
        </motion.div>
    );
};

interface LanguageChartProps {
    data: { name: string; value: number }[];
}

export const LanguageChart = ({ data }: LanguageChartProps) => {
    const { theme } = useThemeStore();
    const gridColor = theme === "dark" ? "hsl(228, 14%, 14%)" : "hsl(220, 13%, 90%)";
    const textColor = theme === "dark" ? "hsl(218, 15%, 50%)" : "hsl(220, 10%, 46%)";

    const isEmpty = data.length === 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5"
        >
            <h3 className="text-sm font-semibold text-foreground mb-4">Language Distribution</h3>
            {isEmpty ? (
                <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
                    No language data yet
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={data} barSize={32}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis dataKey="name" tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" name="Generations" radius={[6, 6, 0, 0]}>
                            {data.map((_, i) => (
                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            )}
        </motion.div>
    );
};

interface CategoryChartProps {
    data: { name: string; value: number }[];
}

export const CategoryChart = ({ data }: CategoryChartProps) => {
    const isEmpty = data.length === 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5"
        >
            <h3 className="text-sm font-semibold text-foreground mb-4">Language Breakdown</h3>
            {isEmpty ? (
                <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
                    No data yet
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={4}
                            dataKey="value"
                            stroke="none"
                        >
                            {data.map((_, i) => (
                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                </ResponsiveContainer>
            )}
        </motion.div>
    );
};
