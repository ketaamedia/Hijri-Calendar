import { Button } from "@/components/ui/button";
import { useCalendarStore } from "@/hooks/use-calendar-store";
import { gregorianMonthNames, hijriMonthNames } from "@shared/schema";
import { gregorianToHijri, toArabicNumerals } from "@/lib/hijri-utils";
import { ChevronRight, ChevronLeft, CalendarDays, Menu } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

export function CalendarHeader() {
  const { currentDate, setCurrentDate, view, settings, hijriOverrides } = useCalendarStore();
  const { toggleSidebar } = useSidebar();

  const navigatePrev = () => {
    const newDate = new Date(currentDate);
    if (view === "monthly") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (view === "weekly") {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setFullYear(newDate.getFullYear() - 1);
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (view === "monthly") {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (view === "weekly") {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setFullYear(newDate.getFullYear() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const hijri = gregorianToHijri(currentDate, hijriOverrides);
  const gregorianTitle = `${gregorianMonthNames[currentDate.getMonth()]} ${toArabicNumerals(currentDate.getFullYear(), settings.numeralSystem)}`;
  const hijriTitle = `${hijriMonthNames[hijri.month - 1]} ${toArabicNumerals(hijri.year, settings.numeralSystem)}`;

  return (
    <header className="flex flex-row-reverse items-center justify-between border-b border-border bg-card px-3 py-3 md:px-6 md:py-4 gap-2" data-testid="calendar-header">
      <div className="flex flex-row-reverse items-center gap-2 md:gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="md:hidden"
          data-testid="button-toggle-sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={navigateNext}
          data-testid="button-nav-next"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={navigatePrev}
          data-testid="button-nav-prev"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          onClick={goToToday}
          className="hidden sm:flex"
          data-testid="button-nav-today"
        >
          <CalendarDays className="h-4 w-4 ml-2" />
          اليوم
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={goToToday}
          className="sm:hidden"
          data-testid="button-nav-today-mobile"
        >
          <CalendarDays className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-col items-center gap-0.5 min-w-0 flex-1">
        <h1 className="text-base md:text-xl font-semibold text-foreground truncate" data-testid="text-gregorian-title">
          {gregorianTitle}
        </h1>
        {settings.hijriEnabled && (
          <p className="text-xs md:text-sm text-muted-foreground truncate" data-testid="text-hijri-title">
            {hijriTitle}
          </p>
        )}
      </div>

      <div className="w-10 md:w-[180px]" />
    </header>
  );
}
