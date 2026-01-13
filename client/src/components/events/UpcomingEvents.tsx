import { useMemo } from "react";
import { useCalendarStore } from "@/hooks/use-calendar-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatGregorianDate, formatHijriDate, gregorianToHijri, toArabicNumerals } from "@/lib/hijri-utils";
import { getEventColorClass } from "./ColorPicker";
import { Clock, CalendarDays } from "lucide-react";
import type { Event } from "@shared/schema";

function getNextOccurrence(event: Event): Date {
  const eventDate = new Date(event.gregorianDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (event.isAnnual) {
    const thisYear = new Date(today.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    if (thisYear >= today) {
      return thisYear;
    }
    return new Date(today.getFullYear() + 1, eventDate.getMonth(), eventDate.getDate());
  }

  return eventDate;
}

function getDaysUntil(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function UpcomingEvents() {
  const { events, settings, hijriOverrides } = useCalendarStore();

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return events
      .map((event) => ({
        event,
        nextDate: getNextOccurrence(event),
        daysUntil: getDaysUntil(getNextOccurrence(event)),
      }))
      .filter((item) => item.daysUntil >= 0 && item.daysUntil <= 30)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5);
  }, [events]);

  if (upcomingEvents.length === 0) {
    return null;
  }

  return (
    <Card className="mb-4" data-testid="upcoming-events-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          المناسبات القادمة
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcomingEvents.map(({ event, nextDate, daysUntil }) => {
          const hijri = gregorianToHijri(nextDate, hijriOverrides);

          return (
            <div
              key={event.id}
              className="flex items-start gap-3 p-2 rounded-md hover-elevate"
              data-testid={`upcoming-event-${event.id}`}
            >
              <div
                className={cn(
                  "w-3 h-3 rounded-full mt-1.5 shrink-0",
                  getEventColorClass(event.color || "primary")
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-foreground truncate">
                  {event.title}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <CalendarDays className="h-3 w-3" />
                  {formatGregorianDate(nextDate)}
                  {settings.hijriEnabled && (
                    <span className="mr-1">({formatHijriDate(hijri)})</span>
                  )}
                </div>
              </div>
              <Badge
                variant={daysUntil === 0 ? "default" : daysUntil <= 7 ? "secondary" : "outline"}
                className="shrink-0 text-xs"
                data-testid={`badge-countdown-${event.id}`}
              >
                {daysUntil === 0 ? (
                  "اليوم"
                ) : daysUntil === 1 ? (
                  "غداً"
                ) : (
                  <>
                    {toArabicNumerals(daysUntil, settings.numeralSystem)} يوم
                  </>
                )}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
