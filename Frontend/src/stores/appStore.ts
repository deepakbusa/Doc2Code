import { create } from "zustand";
import api from "@/lib/api";

export interface HistoryItem {
  id: string;
  docUrl: string;
  taskDescription: string;
  language: string;
  code: string;
  createdAt: string;
}

export interface DashboardStats {
  totalGenerations: number;
  languageDistribution: { name: string; value: number }[];
  monthlyUsage: { year: number; month: number; count: number }[];
  dailyUsage: { date: string; count: number }[];
  recentActivity: {
    id: string;
    title: string;
    language: string;
    createdAt: string;
  }[];
  requestsUsed: number;
  requestsLimit: number;
  plan: string;
}

interface AppState {
  history: HistoryItem[];
  stats: DashboardStats | null;
  isLoadingHistory: boolean;
  isLoadingStats: boolean;
  fetchHistory: () => Promise<void>;
  fetchStats: () => Promise<void>;
  addHistory: (item: Omit<HistoryItem, "id" | "createdAt">) => Promise<void>;
  deleteHistory: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  history: [],
  stats: null,
  isLoadingHistory: false,
  isLoadingStats: false,

  fetchHistory: async () => {
    set({ isLoadingHistory: true });
    try {
      const { data } = await api.get("/api/history");
      set({ history: data.history, isLoadingHistory: false });
    } catch {
      set({ isLoadingHistory: false });
    }
  },

  fetchStats: async () => {
    set({ isLoadingStats: true });
    try {
      const { data } = await api.get("/api/stats");
      set({ stats: data, isLoadingStats: false });
    } catch {
      set({ isLoadingStats: false });
    }
  },

  addHistory: async (item) => {
    try {
      const { data } = await api.post("/api/history", item);
      set((state) => ({
        history: [data.history, ...state.history],
      }));
    } catch (error) {
      console.error("Failed to save history:", error);
    }
  },

  deleteHistory: async (id) => {
    try {
      await api.delete(`/api/history/${id}`);
      set((state) => ({
        history: state.history.filter((h) => h.id !== id),
      }));
    } catch (error) {
      console.error("Failed to delete history:", error);
    }
  },

  clearHistory: async () => {
    try {
      await api.delete("/api/history");
      set({ history: [] });
    } catch (error) {
      console.error("Failed to clear history:", error);
    }
  },
}));
