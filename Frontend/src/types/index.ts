export interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    plan: "free" | "pro" | "enterprise";
    requestsUsed: number;
    requestsLimit: number;
}

export interface HistoryItem {
    id: string;
    docUrl: string;
    taskDescription: string;
    language: string;
    code: string;
    createdAt: string;
    status?: "success" | "failed" | "pending";
}

export interface StatsCard {
    title: string;
    value: string | number;
    description: string;
    trend?: { value: number; isPositive: boolean };
    icon: React.ComponentType<{ className?: string }>;
}

export interface Notification {
    id: string;
    title: string;
    message: string;
    time: string;
    read: boolean;
    type: "info" | "success" | "warning" | "error";
}

export interface ChartDataPoint {
    name: string;
    value: number;
    [key: string]: string | number;
}

export interface ApiKey {
    id: string;
    key: string;
    name: string;
    createdAt: string;
    lastUsed?: string;
}
