import { useCalendarStore } from "@/hooks/use-calendar-store";
import { getCalendarDays, toArabicNumerals, isSameDay, isToday } from "@/lib/hijri-utils";
import { weekDayNames } from "@shared/schema";
import { cn } from "@/lib/utils";

export function MonthlyView() {
  const { currentDate, selectedDate, setSelectedDate, events, settings, hijriOverrides } = useCalendarStore();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const days = getCalendarDays(year, month, hijriOverrides);

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.gregorianDate);
      if (event.isAnnual) {
        return (
          eventDate.getMonth() === date.getMonth() &&
          eventDate.getDate() === date.getDate()
        );
      }
      return isSameDay(eventDate, date);
    });
  };

  const shortWeekDays = ["أ", "إ", "ث", "أ", "خ", "ج", "س"];

  return (
    <div className="flex-1 p-2 sm:p-4 md:p-6" data-testid="monthly-view">
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDayNames.map((day, index) => (
          <div
            key={index}
            className="text-center text-xs sm:text-sm font-medium text-muted-foreground py-2"
            data-testid={`text-weekday-header-${index}`}
          >
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{shortWeekDays[index]}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          const isCurrentMonth = day.gregorian.getMonth() === month - 1;
          const isSelected = selectedDate && isSameDay(day.gregorian, selectedDate);
          const isTodayDate = isToday(day.gregorian);
          const dayEvents = getEventsForDate(day.gregorian);
          const dateKey = `${day.gregorian.getFullYear()}-${String(day.gregorian.getMonth() + 1).padStart(2, '0')}-${String(day.gregorian.getDate()).padStart(2, '0')}`;

          return (
            <button
              key={index}
              onClick={() => setSelectedDate(day.gregorian)}
              className={cn(
                "min-h-12 sm:min-h-20 md:min-h-24 p-1 sm:p-2 rounded-md border transition-all duration-200 hover-elevate",
                "flex flex-col items-end text-right",
                isCurrentMonth
                  ? "bg-card border-border"
                  : "bg-muted/30 border-transparent",
                isSelected && "ring-2 ring-primary border-primary",
                isTodayDate && "bg-primary/10 border-primary/30"
              )}
              data-testid={`button-day-${dateKey}`}
            >
              <div className="flex flex-col items-end gap-0.5 w-full">
                <span
                  className={cn(
                    "text-sm sm:text-base md:text-lg font-medium",
                    isCurrentMonth ? "text-foreground" : "text-muted-foreground",
                    isTodayDate && "text-primary font-bold"
                  )}
                  data-testid={`text-day-gregorian-${dateKey}`}
                >
                  {toArabicNumerals(day.gregorian.getDate(), settings.numeralSystem)}
                </span>
                {settings.hijriEnabled && (
                  <span 
                    className="text-[10px] sm:text-xs text-muted-foreground"
                    data-testid={`text-day-hijri-${dateKey}`}
                  >
                    {toArabicNumerals(day.hijri.day, settings.numeralSystem)}
                  </span>
                )}
              </div>

              {dayEvents.length > 0 && (
                <div className="flex gap-0.5 mt-auto w-full flex-wrap justify-end" data-testid={`events-indicators-${dateKey}`}>
                  {dayEvents.slice(0, 2).map((event, i) => (
                    <div
                      key={event.id}
                      className={cn(
                        "h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full",
                        i === 0 && "bg-primary",
                        i === 1 && "bg-chart-2"
                      )}
                      title={event.title}
                      data-testid={`event-dot-${event.id}`}
                    />
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="text-[8px] sm:text-xs text-muted-foreground hidden sm:inline" data-testid={`events-more-${dateKey}`}>
                      +{toArabicNumerals(dayEvents.length - 2, settings.numeralSystem)}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
