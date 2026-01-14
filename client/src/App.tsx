import { useEffect, useState } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationBell } from "@/components/NotificationBell";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { useCalendarStore } from "@/hooks/use-calendar-store";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import SettingsPage from "@/pages/settings";
import NotificationSettingsPage from "@/pages/notification-settings";
import ExportPage from "@/pages/export";
import BackupPage from "@/pages/backup";
import UsersPage from "@/pages/users";
import FilesPage from "@/pages/files";
import MyFilesPage from "@/pages/my-files";
import TasksPage from "@/pages/tasks";
import LoginPage from "@/pages/login";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";
import {
  sendEventNotifications,
  shouldCheckNotifications,
  markNotificationsChecked,
} from "@/lib/notifications";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

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

  if (!user) {
    return null;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/calendar">
        {() => <ProtectedRoute component={Home} />}
      </Route>
      <Route path="/settings">
        {() => <ProtectedRoute component={SettingsPage} />}
      </Route>
      <Route path="/notification-settings">
        {() => <ProtectedRoute component={NotificationSettingsPage} />}
      </Route>
      <Route path="/export">
        {() => <ProtectedRoute component={ExportPage} />}
      </Route>
      <Route path="/backup">
        {() => <ProtectedRoute component={BackupPage} />}
      </Route>
      <Route path="/users">
        {() => <ProtectedRoute component={UsersPage} />}
      </Route>
      <Route path="/files">
        {() => <ProtectedRoute component={FilesPage} />}
      </Route>
      <Route path="/my-files">
        {() => <ProtectedRoute component={MyFilesPage} />}
      </Route>
      <Route path="/tasks">
        {() => <ProtectedRoute component={TasksPage} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { loadData, isLoading, events, settings, hijriOverrides, generateAutoEvents } = useCalendarStore();
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") === "dark";
    }
    return false;
  });
  const [location] = useLocation();

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [loadData, user]);

  useEffect(() => {
    if (!isLoading && user) {
      generateAutoEvents();
    }
  }, [isLoading, user]);

  const [hasCheckedNotificationsToday, setHasCheckedNotificationsToday] = useState(false);

  useEffect(() => {
    if (!isLoading && events.length > 0 && !hasCheckedNotificationsToday && shouldCheckNotifications()) {
      sendEventNotifications(events, settings, hijriOverrides);
      markNotificationsChecked();
      setHasCheckedNotificationsToday(true);
    }
  }, [isLoading, events.length, hasCheckedNotificationsToday]);

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

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background" data-testid="loading-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (location === "/login" || !user) {
    return <Router />;
  }

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar isDark={isDark} toggleTheme={toggleTheme} />
        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-2 p-2 border-b bg-background sticky top-0 z-10" dir="rtl">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <NotificationBell />
          </header>
          <main className="flex-1 overflow-auto">
            <Router />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppContent />
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
