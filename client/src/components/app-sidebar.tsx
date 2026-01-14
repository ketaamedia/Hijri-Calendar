import { useState } from "react";
import { useLocation, Link } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useCalendarStore } from "@/hooks/use-calendar-store";
import { useAuth } from "@/hooks/use-auth";
import { gregorianToHijri, toArabicNumerals } from "@/lib/hijri-utils";
import { gregorianMonthNames, hijriMonthNames } from "@shared/schema";
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  Plus,
  Settings,
  FileDown,
  Database,
  Moon,
  Sun,
  Home,
  Users,
  LogOut,
  FolderOpen,
  Folder,
} from "lucide-react";
import { EventModal } from "./events/EventModal";

interface AppSidebarProps {
  isDark: boolean;
  toggleTheme: () => void;
}

export function AppSidebar({ isDark, toggleTheme }: AppSidebarProps) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { view, setView, currentDate, settings, hijriOverrides } = useCalendarStore();
  const [eventModalOpen, setEventModalOpen] = useState(false);

  const hijri = gregorianToHijri(currentDate, hijriOverrides);

  const viewItems = [
    { id: "monthly" as const, label: "شهري", icon: CalendarDays },
    { id: "weekly" as const, label: "أسبوعي", icon: CalendarRange },
    { id: "yearly" as const, label: "سنوي", icon: Calendar },
  ];

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  const canCreateEvents = user?.role === "admin" || user?.canCreateEvents;

  return (
    <>
      <Sidebar side="right" collapsible="icon" data-testid="app-sidebar">
        <SidebarHeader className="p-4">
          <div className="flex flex-row-reverse items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center" data-testid="sidebar-logo">
              <Calendar className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="group-data-[collapsible=icon]:hidden text-right">
              <h1 className="text-lg font-bold text-foreground" data-testid="text-app-title">بيت شاما</h1>
              <p className="text-xs text-muted-foreground">منصة إدارة شاملة</p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>التنقل</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/"}
                    tooltip="الرئيسية"
                  >
                    <Link href="/" data-testid="link-dashboard">
                      <Home className="h-4 w-4" />
                      <span>الرئيسية</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/calendar"}
                    tooltip="التقويم"
                  >
                    <Link href="/calendar" data-testid="link-calendar">
                      <Calendar className="h-4 w-4" />
                      <span>التقويم</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/my-files"}
                    tooltip="ملفاتي"
                  >
                    <Link href="/my-files" data-testid="link-my-files">
                      <Folder className="h-4 w-4" />
                      <span>ملفاتي</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {user?.role === "admin" && (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={location === "/users"}
                        tooltip="إدارة المستخدمين"
                      >
                        <Link href="/users" data-testid="link-users">
                          <Users className="h-4 w-4" />
                          <span>إدارة المستخدمين</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={location === "/files"}
                        tooltip="إدارة الملفات"
                      >
                        <Link href="/files" data-testid="link-files">
                          <FolderOpen className="h-4 w-4" />
                          <span>إدارة الملفات</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          {canCreateEvents && (
            <>
              <SidebarGroup>
                <SidebarGroupContent className="p-2">
                  <Button
                    onClick={() => setEventModalOpen(true)}
                    className="w-full gap-2 justify-center"
                    data-testid="button-new-event"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="group-data-[collapsible=icon]:hidden">مناسبة جديدة</span>
                  </Button>
                </SidebarGroupContent>
              </SidebarGroup>
              <SidebarSeparator />
            </>
          )}

          <SidebarGroup>
            <SidebarGroupContent className="px-4 py-3 group-data-[collapsible=icon]:hidden">
              <div className="text-center p-4 rounded-lg bg-primary/5 border border-primary/20" data-testid="sidebar-date-display">
                <div className="text-2xl font-bold text-primary mb-1" data-testid="text-sidebar-day">
                  {toArabicNumerals(currentDate.getDate(), settings.numeralSystem)}
                </div>
                <div className="text-sm text-foreground" data-testid="text-sidebar-gregorian">
                  {gregorianMonthNames[currentDate.getMonth()]} {toArabicNumerals(currentDate.getFullYear(), settings.numeralSystem)}
                </div>
                {settings.hijriEnabled && (
                  <div className="text-xs text-muted-foreground mt-1" data-testid="text-sidebar-hijri">
                    {toArabicNumerals(hijri.day, settings.numeralSystem)} {hijriMonthNames[hijri.month - 1]} {toArabicNumerals(hijri.year, settings.numeralSystem)}
                  </div>
                )}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          {location === "/calendar" && (
            <>
              <SidebarGroup>
                <SidebarGroupLabel>طريقة العرض</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {viewItems.map((item) => (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          isActive={view === item.id}
                          onClick={() => setView(item.id)}
                          tooltip={item.label}
                          data-testid={`button-view-${item.id}`}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
              <SidebarSeparator />
            </>
          )}

          <SidebarGroup>
            <SidebarGroupLabel>أدوات</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/export"}
                    tooltip="تصدير PDF"
                  >
                    <Link href="/export" data-testid="link-export">
                      <FileDown className="h-4 w-4" />
                      <span>تصدير PDF</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/backup"}
                    tooltip="النسخ الاحتياطي"
                  >
                    <Link href="/backup" data-testid="link-backup">
                      <Database className="h-4 w-4" />
                      <span>استيراد وتصدير</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/settings"}
                    tooltip="الإعدادات"
                  >
                    <Link href="/settings" data-testid="link-settings">
                      <Settings className="h-4 w-4" />
                      <span>الإعدادات</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-4 space-y-2">
          <Button
            variant="ghost"
            onClick={toggleTheme}
            className="w-full flex items-center justify-center gap-2"
            data-testid="button-theme-toggle"
          >
            {isDark ? (
              <>
                <Sun className="h-4 w-4" />
                <span className="group-data-[collapsible=icon]:hidden text-sm">الوضع الفاتح</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4" />
                <span className="group-data-[collapsible=icon]:hidden text-sm">الوضع الداكن</span>
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-destructive hover:text-destructive"
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
            <span className="group-data-[collapsible=icon]:hidden text-sm">تسجيل الخروج</span>
          </Button>
        </SidebarFooter>
      </Sidebar>

      <EventModal open={eventModalOpen} onOpenChange={setEventModalOpen} />
    </>
  );
}
