import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatsCardProps {
    title: string;
    value: string | number;
    description: string;
    trend?: { value: number; isPositive: boolean };
    icon: React.ComponentType<{ className?: string }>;
    index?: number;
}

export const StatsCard = ({
    title,
    value,
    description,
    trend,
    icon: Icon,
    index = 0,
}: StatsCardProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.08 }}
            className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5 card-hover relative overflow-hidden group"
        >
            {/* Decorative gradient */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {title}
                    </p>
                    <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                </div>
            </div>

            <div className="flex items-center gap-2 mt-3">
                {trend && (
                    <span
                        className={cn(
                            "inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md",
                            trend.isPositive
                                ? "text-emerald-500 bg-emerald-500/10"
                                : "text-red-400 bg-red-400/10"
                        )}
                    >
                        {trend.isPositive ? (
                            <TrendingUp className="h-3 w-3" />
                        ) : (
                            <TrendingDown className="h-3 w-3" />
                        )}
                        {trend.isPositive ? "+" : ""}
                        {trend.value}%
                    </span>
                )}
                <p className="text-xs text-muted-foreground/70">{description}</p>
            </div>
        </motion.div>
    );
};
