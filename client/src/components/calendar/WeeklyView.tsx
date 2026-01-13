import { useCalendarStore } from "@/hooks/use-calendar-store";
import { gregorianToHijri, isToday, isSameDay, toArabicNumerals } from "@/lib/hijri-utils";
import { weekDayNames } from "@shared/schema";
import { cn } from "@/lib/utils";

export function WeeklyView() {
  const { currentDate, selectedDate, setSelectedDate, events, settings, hijriOverrides } = useCalendarStore();

  const getWeekDays = () => {
    const days = [];
    const startOfWeek = new Date(currentDate);
    const dayOfWeek = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const weekDays = getWeekDays();

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

  return (
    <div className="flex-1 p-4" data-testid="weekly-view">
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((date, index) => {
          const hijri = gregorianToHijri(date, hijriOverrides);
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          const isTodayDate = isToday(date);
          const dayEvents = getEventsForDate(date);
          const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

          return (
            <div
              key={index}
              className={cn(
                "rounded-lg border p-4 min-h-[400px] transition-all",
                "bg-card border-border",
                isSelected && "ring-2 ring-primary border-primary",
                isTodayDate && "bg-primary/5 border-primary/30"
              )}
              data-testid={`weekday-column-${dateKey}`}
            >
              <button
                onClick={() => setSelectedDate(date)}
                className={cn(
                  "w-full text-center pb-3 border-b border-border mb-3 hover-elevate rounded-md p-2"
                )}
                data-testid={`button-weekday-${dateKey}`}
              >
                <div className="text-sm text-muted-foreground mb-1" data-testid={`text-weekday-name-${index}`}>
                  {weekDayNames[index]}
                </div>
                <div
                  className={cn(
                    "text-2xl font-semibold",
                    isTodayDate ? "text-primary" : "text-foreground"
                  )}
                  data-testid={`text-weekday-gregorian-${dateKey}`}
                >
                  {toArabicNumerals(date.getDate(), settings.numeralSystem)}
                </div>
                {settings.hijriEnabled && (
                  <div className="text-xs text-muted-foreground mt-1" data-testid={`text-weekday-hijri-${dateKey}`}>
                    {toArabicNumerals(hijri.day, settings.numeralSystem)}
                  </div>
                )}
              </button>

              <div className="space-y-2 overflow-y-auto max-h-[300px]" data-testid={`events-list-${dateKey}`}>
                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    className={cn(
                      "p-3 rounded-md border-r-4 border-primary",
                      "bg-primary/10 text-sm"
                    )}
                    data-testid={`card-event-${event.id}`}
                  >
                    <div className="font-medium text-foreground truncate" data-testid={`text-event-title-${event.id}`}>
                      {event.title}
                    </div>
                    {event.description && (
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2" data-testid={`text-event-desc-${event.id}`}>
                        {event.description}
                      </div>
                    )}
                    {event.isAnnual && (
                      <div className="text-xs text-primary mt-1" data-testid={`badge-annual-${event.id}`}>
                        مناسبة سنوية
                      </div>
                    )}
                  </div>
                ))}
                {dayEvents.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-8" data-testid={`empty-day-${dateKey}`}>
                    لا توجد مناسبات
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
