import { useEffect, useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useCalendarStore } from "@/hooks/use-calendar-store";
import Home from "@/pages/home";
import SettingsPage from "@/pages/settings";
import ExportPage from "@/pages/export";
import BackupPage from "@/pages/backup";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";
import {
  sendEventNotifications,
  shouldCheckNotifications,
  markNotificationsChecked,
} from "@/lib/notifications";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/export" component={ExportPage} />
      <Route path="/backup" component={BackupPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { loadData, isLoading, events, settings, hijriOverrides } = useCalendarStore();
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") === "dark";
    }
    return false;
  });

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!isLoading && events.length > 0 && shouldCheckNotifications()) {
      sendEventNotifications(events, settings, hijriOverrides);
      markNotificationsChecked();
    }
  }, [isLoading, events, settings, hijriOverrides]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  const style = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "3.5rem",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background" data-testid="loading-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar isDark={isDark} toggleTheme={toggleTheme} />
        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          <Router />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
