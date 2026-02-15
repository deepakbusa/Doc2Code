import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
    headers: {
        "Content-Type": "application/json",
    },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("doc2code_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 responses (token expired/invalid)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem("doc2code_token");
            localStorage.removeItem("doc2code_user");
            // Only redirect if not already on auth pages
            const path = window.location.pathname;
            if (path !== "/login" && path !== "/signup" && path !== "/") {
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    }
);

export default api;
