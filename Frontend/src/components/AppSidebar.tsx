import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Code2,
  History,
  Zap,
  LogOut,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  BarChart3,
  Activity,
  Settings,
  Users,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const navItems = [
  { label: "Overview", path: "/dashboard", icon: LayoutDashboard },
  { label: "Generate Code", path: "/dashboard/generate", icon: Zap },
  { label: "History", path: "/dashboard/history", icon: History },
  { label: "Live Sessions", path: "/dashboard/sessions", icon: Users },
  { label: "Analytics", path: "/dashboard/analytics", icon: BarChart3 },
  { label: "API Usage", path: "/dashboard/api-usage", icon: Activity },
  { label: "Settings", path: "/dashboard/settings", icon: Settings },
];

export const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="h-screen sticky top-0 border-r border-border/40 bg-card/50 backdrop-blur-xl flex flex-col select-none z-20"
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-16 border-b border-border/40">
        <div className="h-9 w-9 rounded-xl gradient-bg flex items-center justify-center shadow-lg shadow-purple-500/15 shrink-0">
          <Code2 className="h-[18px] w-[18px] text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="text-lg font-bold tracking-tight text-foreground whitespace-nowrap overflow-hidden"
            >
              Doc2Code
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2.5 space-y-1 overflow-y-auto">
        <p className={cn(
          "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-3 mb-2",
          collapsed && "text-center px-0"
        )}>
          {collapsed ? "•" : "Menu"}
        </p>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const linkContent = (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative group",
                collapsed && "justify-center px-0",
                isActive
                  ? "text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl gradient-bg opacity-90"
                  style={{ zIndex: -1 }}
                  transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
                />
              )}
              <item.icon className={cn("h-[18px] w-[18px] shrink-0", isActive && "drop-shadow-sm")} />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.path} delayDuration={0}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }
          return linkContent;
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-2.5 border-t border-border/40 space-y-1">
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors w-full",
            collapsed && "justify-center px-0"
          )}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-muted-foreground/70 hover:text-foreground hover:bg-muted/60 transition-colors w-full",
            collapsed && "justify-center px-0"
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 shrink-0" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  );
};
