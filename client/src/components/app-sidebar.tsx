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
import { gregorianToHijri, toArabicNumerals } from "@/lib/hijri-utils";
import { gregorianMonthNames, hijriMonthNames } from "@shared/schema";
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  Plus,
  Settings,
  FileDown,
  Moon,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EventModal } from "./events/EventModal";

interface AppSidebarProps {
  isDark: boolean;
  toggleTheme: () => void;
}

export function AppSidebar({ isDark, toggleTheme }: AppSidebarProps) {
  const [location] = useLocation();
  const { view, setView, currentDate, settings, hijriOverrides } = useCalendarStore();
  const [eventModalOpen, setEventModalOpen] = useState(false);

  const hijri = gregorianToHijri(currentDate, hijriOverrides);

  const viewItems = [
    { id: "monthly" as const, label: "شهري", icon: CalendarDays },
    { id: "weekly" as const, label: "أسبوعي", icon: CalendarRange },
    { id: "yearly" as const, label: "سنوي", icon: Calendar },
  ];

  return (
    <>
      <Sidebar side="right" collapsible="icon" data-testid="app-sidebar">
        <SidebarHeader className="p-4">
          <div className="flex flex-row-reverse items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center" data-testid="sidebar-logo">
              <Calendar className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="group-data-[collapsible=icon]:hidden text-right">
              <h1 className="text-lg font-bold text-foreground" data-testid="text-app-title">الرزنامة</h1>
              <p className="text-xs text-muted-foreground">التقويم الهجري والميلادي</p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
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

          <SidebarGroup>
            <SidebarGroupLabel>طريقة العرض</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {viewItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={view === item.id && location === "/"}
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

          <SidebarGroup>
            <SidebarGroupLabel>أدوات</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/export"}
                    tooltip="تصدير المناسبات"
                  >
                    <Link href="/export" data-testid="link-export">
                      <FileDown className="h-4 w-4" />
                      <span>تصدير المناسبات</span>
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

        <SidebarFooter className="p-4">
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
        </SidebarFooter>
      </Sidebar>

      <EventModal open={eventModalOpen} onOpenChange={setEventModalOpen} />
    </>
  );
}
