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
import FileChatPage from "@/pages/file-chat";
import DocumentLibraryPage from "@/pages/document-library";
import TasksPage from "@/pages/tasks";
import ReportsPage from "@/pages/reports";
import AttendancePage from "@/pages/attendance";
import PrayerTimesPage from "@/pages/PrayerTimes";
import LoginPage from "@/pages/login";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";
import {
  sendEventNotifications,
  shouldCheckNotifications,
  markNotificationsChecked,
} from "@/lib/notifications";
// ⭐ أضف هذه الـ imports
import { useHijriEventManager } from './hooks/useHijriEventManager';
import { CleanupButton } from '@/components/Calendar/CleanupButton';

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
      <Route path="/file-chat/:fileId">
        {() => <ProtectedRoute component={FileChatPage} />}
      </Route>
      <Route path="/documents/:fileId">
        {() => <ProtectedRoute component={DocumentLibraryPage} />}
      </Route>
      <Route path="/tasks">
        {() => <ProtectedRoute component={TasksPage} />}
      </Route>
      <Route path="/reports">
        {() => <ProtectedRoute component={ReportsPage} />}
      </Route>
      <Route path="/attendance">
        {() => <ProtectedRoute component={AttendancePage} />}
      </Route>
      <Route path="/prayer-times">
        {() => <ProtectedRoute component={PrayerTimesPage} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { loadData, isLoading, events, settings, hijriOverrides, generateAutoEvents } = useCalendarStore();
  
  // ⭐ أضف مدير الأحداث الهجرية هنا
  const { 
    isLoading: hijriLoading, 
    error: hijriError, 
    cleanupDuplicates 
  } = useHijriEventManager();
  
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

  // ⭐ معالجة حالة التحميل للتقويم الهجري
  if (hijriLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">جاري تهيئة التقويم الهجري...</p>
        </div>
      </div>
    );
  }

  // ⭐ معالجة الأخطاء
  if (hijriError) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 max-w-md">
          <h2 className="text-destructive font-bold mb-2">حدث خطأ في التقويم الهجري</h2>
          <p className="text-destructive/80 text-sm mb-4">{hijriError}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

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
            <div className="flex items-center gap-2">
              {/* ⭐ أضف زر التنظيف في الهيدر */}
              <CleanupButton onCleanup={cleanupDuplicates} />
              <NotificationBell />
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <Router />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

// ⭐ دالة App واحدة فقط - احذف الأخرى المكررة
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
