import { Button } from "@/components/ui/button";
import { useCalendarStore } from "@/hooks/use-calendar-store";
import { gregorianMonthNames, hijriMonthNames } from "@shared/schema";
import { gregorianToHijri, toArabicNumerals } from "@/lib/hijri-utils";
import { ChevronRight, ChevronLeft, CalendarDays } from "lucide-react";

export function CalendarHeader() {
  const { currentDate, setCurrentDate, view, settings, hijriOverrides } = useCalendarStore();

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
  const gregorianTitle = `${gregorianMonthNames[currentDate.getMonth()]} ${toArabicNumerals(currentDate.getFullYear())}`;
  const hijriTitle = `${hijriMonthNames[hijri.month - 1]} ${toArabicNumerals(hijri.year)}`;

  return (
    <header className="flex flex-row-reverse items-center justify-between border-b border-border bg-card px-6 py-4" data-testid="calendar-header">
      <div className="flex flex-row-reverse items-center gap-4">
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
          data-testid="button-nav-today"
        >
          <CalendarDays className="h-4 w-4 ml-2" />
          اليوم
        </Button>
      </div>

      <div className="flex flex-col items-center gap-1">
        <h1 className="text-xl font-semibold text-foreground" data-testid="text-gregorian-title">
          {gregorianTitle}
        </h1>
        {settings.hijriEnabled && (
          <p className="text-sm text-muted-foreground" data-testid="text-hijri-title">
            {hijriTitle}
          </p>
        )}
      </div>

      <div className="w-[180px]" />
    </header>
  );
}
