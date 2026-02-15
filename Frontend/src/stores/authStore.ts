import { create } from "zustand";
import api from "@/lib/api";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  plan: "free" | "pro" | "enterprise";
  requestsUsed: number;
  requestsLimit: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: () => void;
  handleOAuthCallback: (token: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => {
  const storedToken = localStorage.getItem("doc2code_token");
  const storedUser = localStorage.getItem("doc2code_user");

  return {
    user: storedUser ? JSON.parse(storedUser) : null,
    token: storedToken,
    isAuthenticated: !!storedToken,
    isLoading: false,

    login: async (email: string, password: string) => {
      set({ isLoading: true });
      try {
        const { data } = await api.post("/api/auth/login", { email, password });
        localStorage.setItem("doc2code_token", data.token);
        localStorage.setItem("doc2code_user", JSON.stringify(data.user));
        set({
          user: data.user,
          token: data.token,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (error: any) {
        set({ isLoading: false });
        throw new Error(error.response?.data?.message || "Login failed");
      }
    },

    signup: async (name: string, email: string, password: string) => {
      set({ isLoading: true });
      try {
        const { data } = await api.post("/api/auth/signup", { name, email, password });
        localStorage.setItem("doc2code_token", data.token);
        localStorage.setItem("doc2code_user", JSON.stringify(data.user));
        set({
          user: data.user,
          token: data.token,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (error: any) {
        set({ isLoading: false });
        throw new Error(error.response?.data?.message || "Signup failed");
      }
    },

    loginWithGoogle: () => {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
      window.location.href = `${apiUrl}/api/auth/google`;
    },

    handleOAuthCallback: async (token: string) => {
      set({ isLoading: true });
      try {
        localStorage.setItem("doc2code_token", token);
        const { data } = await api.get("/api/auth/me");
        localStorage.setItem("doc2code_user", JSON.stringify(data.user));
        set({
          user: data.user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (error) {
        localStorage.removeItem("doc2code_token");
        set({ isLoading: false });
        throw new Error("Failed to authenticate with Google");
      }
    },

    logout: () => {
      localStorage.removeItem("doc2code_token");
      localStorage.removeItem("doc2code_user");
      set({ user: null, token: null, isAuthenticated: false });
    },

    updateProfile: async (data: Partial<User>) => {
      try {
        const { data: responseData } = await api.put("/api/user/profile", data);
        const user = responseData.user;
        localStorage.setItem("doc2code_user", JSON.stringify(user));
        set({ user });
      } catch (error: any) {
        throw new Error(error.response?.data?.message || "Failed to update profile");
      }
    },

    changePassword: async (currentPassword: string, newPassword: string) => {
      try {
        await api.put("/api/user/password", { currentPassword, newPassword });
      } catch (error: any) {
        throw new Error(error.response?.data?.message || "Failed to change password");
      }
    },

    initialize: async () => {
      const token = localStorage.getItem("doc2code_token");
      if (!token) {
        set({ user: null, token: null, isAuthenticated: false });
        return;
      }
      try {
        const { data } = await api.get("/api/auth/me");
        localStorage.setItem("doc2code_user", JSON.stringify(data.user));
        set({
          user: data.user,
          token,
          isAuthenticated: true,
        });
      } catch {
        localStorage.removeItem("doc2code_token");
        localStorage.removeItem("doc2code_user");
        set({ user: null, token: null, isAuthenticated: false });
      }
    },
  };
});
