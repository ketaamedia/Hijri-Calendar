import { useMemo } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useCalendarStore } from "@/hooks/use-calendar-store";
import {
  formatHijriDate,
  formatGregorianDate,
  gregorianToHijri,
  isSameDay,
} from "@/lib/hijri-utils";
import { Calendar, User, Settings, FileDown, Clock } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const { events, hijriOverrides } = useCalendarStore();

  const today = useMemo(() => new Date(), []);
  const todayHijri = useMemo(
    () => gregorianToHijri(today, hijriOverrides),
    [today, hijriOverrides]
  );

  const todayEvents = useMemo(() => {
    return events.filter((event) => {
      const eventDate = new Date(event.gregorianDate);
      if (event.isAnnual) {
        return (
          eventDate.getMonth() === today.getMonth() &&
          eventDate.getDate() === today.getDate()
        );
      }
      return isSameDay(eventDate, today);
    });
  }, [events, today]);

  const upcomingEvents = useMemo(() => {
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    return events
      .filter((event) => {
        const eventDate = new Date(event.gregorianDate);
        if (event.isAnnual) {
          const thisYearDate = new Date(
            today.getFullYear(),
            eventDate.getMonth(),
            eventDate.getDate()
          );
          if (thisYearDate < today) {
            thisYearDate.setFullYear(today.getFullYear() + 1);
          }
          return thisYearDate > today && thisYearDate <= thirtyDaysFromNow;
        }
        return eventDate > today && eventDate <= thirtyDaysFromNow;
      })
      .map((event) => {
        const eventDate = new Date(event.gregorianDate);
        let targetDate = eventDate;
        if (event.isAnnual) {
          targetDate = new Date(
            today.getFullYear(),
            eventDate.getMonth(),
            eventDate.getDate()
          );
          if (targetDate < today) {
            targetDate.setFullYear(today.getFullYear() + 1);
          }
        }
        const daysUntil = Math.ceil(
          (targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        return { ...event, daysUntil, targetDate };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5);
  }, [events, today]);

  const quickAccessItems = [
    {
      title: "التقويم",
      description: "عرض التقويم الهجري والميلادي",
      href: "/calendar",
      icon: Calendar,
      testId: "link-calendar",
    },
    {
      title: "الإعدادات",
      description: "تخصيص إعدادات التطبيق",
      href: "/settings",
      icon: Settings,
      testId: "link-settings",
    },
    {
      title: "تصدير",
      description: "تصدير التقويم والمناسبات",
      href: "/export",
      icon: FileDown,
      testId: "link-export",
    },
  ];

  return (
    <div
      dir="rtl"
      className="flex flex-col h-full overflow-auto bg-background p-6"
      data-testid="dashboard-page"
    >
      <div className="space-y-6 max-w-6xl mx-auto w-full">
        <Card data-testid="card-date-today">
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-xl font-semibold">تاريخ اليوم</CardTitle>
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p
                className="text-2xl font-bold text-foreground"
                data-testid="text-date-hijri"
              >
                {formatHijriDate(todayHijri)}
              </p>
              <p
                className="text-lg text-muted-foreground"
                data-testid="text-date-gregorian"
              >
                {formatGregorianDate(today)}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card data-testid="card-user-info">
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold">
                معلومات المستخدم
              </CardTitle>
              <User className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span
                    className="text-xl font-medium"
                    data-testid="text-user-displayname"
                  >
                    {user?.displayName || user?.username || "مستخدم"}
                  </span>
                  <Badge
                    variant={user?.role === "admin" ? "default" : "secondary"}
                    data-testid="badge-user-role"
                  >
                    {user?.role === "admin" ? "مدير" : "مستخدم"}
                  </Badge>
                </div>
                {user?.description && (
                  <p
                    className="text-sm text-muted-foreground"
                    data-testid="text-user-description"
                  >
                    {user.description}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-today-events">
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold">
                مناسبات اليوم
              </CardTitle>
              <Clock className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {todayEvents.length === 0 ? (
                <p
                  className="text-muted-foreground text-sm"
                  data-testid="text-no-today-events"
                >
                  لا توجد مناسبات اليوم
                </p>
              ) : (
                <ul className="space-y-2">
                  {todayEvents.map((event) => (
                    <li
                      key={event.id}
                      className="flex items-center gap-2"
                      data-testid={`item-today-event-${event.id}`}
                    >
                      <div
                        className={`h-2 w-2 rounded-full bg-${event.color === "primary" ? "primary" : event.color}-500`}
                        style={{
                          backgroundColor:
                            event.color === "primary"
                              ? "hsl(var(--primary))"
                              : undefined,
                        }}
                      />
                      <span className="text-sm">{event.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card data-testid="card-upcoming-events">
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">
              المناسبات القادمة
            </CardTitle>
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <p
                className="text-muted-foreground text-sm"
                data-testid="text-no-upcoming-events"
              >
                لا توجد مناسبات قادمة في الثلاثين يوماً القادمة
              </p>
            ) : (
              <ul className="space-y-3">
                {upcomingEvents.map((event) => (
                  <li
                    key={event.id}
                    className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50"
                    data-testid={`item-upcoming-event-${event.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-3 w-3 rounded-full`}
                        style={{
                          backgroundColor:
                            event.color === "primary"
                              ? "hsl(var(--primary))"
                              : `var(--${event.color}-500, hsl(var(--primary)))`,
                        }}
                      />
                      <div>
                        <p className="font-medium">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatGregorianDate(event.targetDate)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" data-testid={`badge-countdown-${event.id}`}>
                      بعد {event.daysUntil} {event.daysUntil === 1 ? "يوم" : "أيام"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          {quickAccessItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card
                className="hover-elevate cursor-pointer transition-all"
                data-testid={`card-${item.testId}`}
              >
                <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
                  <CardTitle className="text-base font-medium">
                    {item.title}
                  </CardTitle>
                  <item.icon className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 w-full"
                    data-testid={item.testId}
                  >
                    انتقال
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
