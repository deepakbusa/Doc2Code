import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useThemeStore } from "@/stores/themeStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  LogOut,
  User,
  Settings,
  Search,
  Bell,
  Sun,
  Moon,
  Check,
  Info,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { Notification } from "@/types";

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    title: "Generation Complete",
    message: "Your TypeScript API client is ready",
    time: "2m ago",
    read: false,
    type: "success",
  },
  {
    id: "2",
    title: "Usage Alert",
    message: "You've used 80% of your monthly quota",
    time: "1h ago",
    read: false,
    type: "warning",
  },
  {
    id: "3",
    title: "New Feature",
    message: "Rust language support is now available",
    time: "3h ago",
    read: true,
    type: "info",
  },
];

const notificationIcons = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertTriangle,
};

const notificationColors = {
  info: "text-blue-400",
  success: "text-emerald-400",
  warning: "text-amber-400",
  error: "text-red-400",
};

export const TopNav = ({ title }: { title: string }) => {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [searchOpen, setSearchOpen] = useState(false);

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="h-16 border-b border-border/40 bg-card/30 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4 flex-1">
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <Input
                placeholder="Search..."
                className="h-9 bg-muted/50 border-border/50 text-sm"
                autoFocus
                onBlur={() => setSearchOpen(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setSearchOpen(!searchOpen)}
          className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <Search className="h-4 w-4" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <AnimatePresence mode="wait">
            {theme === "dark" ? (
              <motion.div key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                <Sun className="h-4 w-4" />
              </motion.div>
            ) : (
              <motion.div key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                <Moon className="h-4 w-4" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full gradient-bg ring-2 ring-background" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-80 bg-card/95 backdrop-blur-xl border-border/50 p-0"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
              <p className="text-sm font-semibold">Notifications</p>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Check className="h-3 w-3" />
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto">
              {notifications.map((n) => {
                const Icon = notificationIcons[n.type];
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer ${!n.read ? "bg-primary/5" : ""
                      }`}
                  >
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${notificationColors[n.type]}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground/60 shrink-0">{n.time}</span>
                  </div>
                );
              })}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 ml-1 hover:opacity-80 transition-opacity rounded-lg px-2 py-1.5 hover:bg-muted/40">
              <span className="text-sm text-muted-foreground hidden sm:block max-w-[120px] truncate">
                {user?.name}
              </span>
              <Avatar className="h-8 w-8 border border-border/60 ring-2 ring-primary/10">
                {user?.avatar && <AvatarImage src={user.avatar} />}
                <AvatarFallback className="gradient-bg text-white text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>

            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-52 bg-card/95 backdrop-blur-xl border-border/50"
          >
            <div className="px-3 py-2 border-b border-border/40">
              <p className="text-sm font-medium text-foreground">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuItem onClick={() => navigate("/dashboard/settings")} className="mt-1">
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/dashboard/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
