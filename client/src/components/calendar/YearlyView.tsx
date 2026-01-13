import { useCalendarStore } from "@/hooks/use-calendar-store";
import { gregorianToHijri, getCalendarDays, toArabicNumerals, isToday } from "@/lib/hijri-utils";
import { gregorianMonthNames, hijriMonthNames, type HijriMonthOverride } from "@shared/schema";
import { cn } from "@/lib/utils";

export function YearlyView() {
  const { currentDate, setCurrentDate, setView, events, settings, hijriOverrides } = useCalendarStore();

  const year = currentDate.getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const getEventsForMonth = (month: number) => {
    return events.filter((event) => {
      const eventDate = new Date(event.gregorianDate);
      if (event.isAnnual) {
        return eventDate.getMonth() === month - 1;
      }
      return (
        eventDate.getFullYear() === year && eventDate.getMonth() === month - 1
      );
    });
  };

  const handleMonthClick = (month: number) => {
    const newDate = new Date(year, month - 1, 1);
    setCurrentDate(newDate);
    setView("monthly");
  };

  return (
    <div className="flex-1 p-2 sm:p-4 md:p-6" data-testid="yearly-view">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        {months.map((month) => {
          const firstDayOfMonth = new Date(year, month - 1, 1);
          const hijri = gregorianToHijri(firstDayOfMonth, hijriOverrides);
          const monthEvents = getEventsForMonth(month);
          const isCurrentMonth =
            new Date().getFullYear() === year &&
            new Date().getMonth() === month - 1;

          return (
            <button
              key={month}
              onClick={() => handleMonthClick(month)}
              className={cn(
                "p-3 sm:p-4 rounded-lg border transition-all hover-elevate",
                "bg-card border-border text-right",
                isCurrentMonth && "ring-2 ring-primary border-primary bg-primary/5"
              )}
              data-testid={`button-month-${month}`}
            >
              <div className="flex justify-between items-start mb-2 sm:mb-3">
                <span
                  className={cn(
                    "inline-flex items-center justify-center h-5 sm:h-6 min-w-5 sm:min-w-6 px-1 sm:px-1.5 rounded-full text-[10px] sm:text-xs font-medium",
                    monthEvents.length > 0
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                  data-testid={`badge-events-count-${month}`}
                >
                  {toArabicNumerals(monthEvents.length, settings.numeralSystem)}
                </span>
                <div className="text-left">
                  <h3
                    className={cn(
                      "text-sm sm:text-base md:text-lg font-semibold",
                      isCurrentMonth ? "text-primary" : "text-foreground"
                    )}
                    data-testid={`text-month-name-${month}`}
                  >
                    {gregorianMonthNames[month - 1]}
                  </h3>
                  {settings.hijriEnabled && (
                    <p className="text-[10px] sm:text-xs text-muted-foreground" data-testid={`text-month-hijri-${month}`}>
                      {hijriMonthNames[hijri.month - 1]}
                    </p>
                  )}
                </div>
              </div>

              <div className="hidden sm:block">
                <MiniCalendar year={year} month={month} overrides={hijriOverrides} />
              </div>

              {monthEvents.length > 0 && (
                <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border">
                  <div className="space-y-0.5 sm:space-y-1">
                    {monthEvents.slice(0, 2).map((event) => (
                      <div
                        key={event.id}
                        className="text-[10px] sm:text-xs text-muted-foreground truncate"
                        data-testid={`text-event-preview-${event.id}`}
                      >
                        {event.title}
                      </div>
                    ))}
                    {monthEvents.length > 2 && (
                      <div className="text-[10px] sm:text-xs text-primary" data-testid={`text-more-events-${month}`}>
                        +{toArabicNumerals(monthEvents.length - 2, settings.numeralSystem)} مناسبات أخرى
                      </div>
                    )}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MiniCalendar({ year, month, overrides }: { year: number; month: number; overrides: HijriMonthOverride[] }) {
  const days = getCalendarDays(year, month, overrides);
  const weekDays = ["أ", "إ", "ث", "أ", "خ", "ج", "س"];

  return (
    <div className="mt-2" data-testid={`mini-calendar-${month}`}>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {weekDays.map((day, i) => (
          <div key={i} className="text-[10px] text-muted-foreground py-1">
            {day}
          </div>
        ))}
        {days.slice(0, 35).map((day, index) => {
          const isCurrentMonth = day.gregorian.getMonth() === month - 1;
          const isTodayDate = isToday(day.gregorian);

          return (
            <div
              key={index}
              className={cn(
                "text-[10px] py-0.5",
                isCurrentMonth ? "text-foreground" : "text-muted-foreground/50",
                isTodayDate && "bg-primary text-primary-foreground rounded-full font-bold"
              )}
            >
              {day.gregorian.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
