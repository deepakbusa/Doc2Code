import { create } from "zustand";

interface ThemeState {
    theme: "dark" | "light";
    toggleTheme: () => void;
    setTheme: (theme: "dark" | "light") => void;
}

export const useThemeStore = create<ThemeState>((set) => {
    const stored = localStorage.getItem("doc2code_theme") as "dark" | "light" | null;
    const initial = stored || "dark";

    if (initial === "dark") {
        document.documentElement.classList.add("dark");
    } else {
        document.documentElement.classList.remove("dark");
    }

    return {
        theme: initial,
        toggleTheme: () =>
            set((state) => {
                const next = state.theme === "dark" ? "light" : "dark";
                localStorage.setItem("doc2code_theme", next);
                if (next === "dark") {
                    document.documentElement.classList.add("dark");
                } else {
                    document.documentElement.classList.remove("dark");
                }
                return { theme: next };
            }),
        setTheme: (theme) => {
            localStorage.setItem("doc2code_theme", theme);
            if (theme === "dark") {
                document.documentElement.classList.add("dark");
            } else {
                document.documentElement.classList.remove("dark");
            }
            set({ theme });
        },
    };
});
