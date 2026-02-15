import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import NotificationBell from "@/components/NotificationBell";

export const DashboardLayout = () => {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar removed - using page-level TopNav for consistency */}
        {/* <header className="h-14 border-b border-border/30 bg-card/30 backdrop-blur-sm flex items-center justify-end px-5 gap-3 shrink-0">
          <NotificationBell />
        </header> */}
        <Outlet />
      </div>
    </div>
  );
};
