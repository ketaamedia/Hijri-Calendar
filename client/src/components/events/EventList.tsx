import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useCalendarStore } from "@/hooks/use-calendar-store";
import { useAuth } from "@/hooks/use-auth";
import type { Event } from "@shared/schema";
import { formatGregorianDate, formatHijriDate, isSameDay } from "@/lib/hijri-utils";
import { getEventBorderClass } from "./ColorPicker";
import { Pencil, Trash2, Calendar, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";

interface EventListProps {
  onEdit: (event: Event) => void;
}

export function EventList({ onEdit }: EventListProps) {
  const { events, selectedDate, deleteEvent, settings } = useCalendarStore();
  const { user } = useAuth();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canEdit = user?.role === "admin" || user?.canEditEvents;
  const canDelete = user?.role === "admin" || user?.canDeleteEvents;

  const filteredEvents = selectedDate
    ? events.filter((event) => {
        const eventDate = new Date(event.gregorianDate);
        if (event.isAnnual) {
          return (
            eventDate.getMonth() === selectedDate.getMonth() &&
            eventDate.getDate() === selectedDate.getDate()
          );
        }
        return isSameDay(eventDate, selectedDate);
      })
    : events;

  const sortedEvents = [...filteredEvents].sort(
    (a, b) => new Date(a.gregorianDate).getTime() - new Date(b.gregorianDate).getTime()
  );

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteEvent(id);
    setDeletingId(null);
  };

  if (sortedEvents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="empty-events">
        <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2" data-testid="text-empty-title">
          لا توجد مناسبات
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm" data-testid="text-empty-description">
          {selectedDate
            ? "لا توجد مناسبات في هذا اليوم."
            : "لم تتم إضافة أي مناسبات بعد."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="event-list">
      {sortedEvents.map((event) => (
        <Card
          key={event.id}
          className={cn(
            "border-r-4 transition-all",
            getEventBorderClass(event.color || "primary"),
            deletingId === event.id && "opacity-50"
          )}
          data-testid={`card-event-${event.id}`}
        >
          <CardHeader className="pb-2 flex flex-row-reverse items-start justify-between gap-2">
            <div className="flex-1 min-w-0 text-right">
              <CardTitle className="text-base font-semibold truncate" data-testid={`text-event-title-${event.id}`}>
                {event.title}
              </CardTitle>
              <div className="flex flex-row-reverse items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground" data-testid={`text-event-gregorian-${event.id}`}>
                  {formatGregorianDate(new Date(event.gregorianDate))}
                </span>
                {settings.hijriEnabled && (
                  <>
                    <span className="text-muted-foreground/50">|</span>
                    <span className="text-xs text-muted-foreground" data-testid={`text-event-hijri-${event.id}`}>
                      {formatHijriDate({
                        year: event.hijriYear,
                        month: event.hijriMonth,
                        day: event.hijriDay,
                      })}
                    </span>
                  </>
                )}
              </div>
            </div>
            {(canEdit || canDelete) && (
              <div className="flex items-center gap-1 flex-shrink-0">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(event)}
                    data-testid={`button-edit-event-${event.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        data-testid={`button-delete-event-${event.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent data-testid="dialog-confirm-delete">
                      <AlertDialogHeader>
                        <AlertDialogTitle>حذف المناسبة</AlertDialogTitle>
                        <AlertDialogDescription>
                          هل أنت متأكد من حذف "{event.title}"؟ لا يمكن التراجع عن هذا الإجراء.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex flex-row-reverse gap-2">
                        <AlertDialogCancel data-testid="button-cancel-delete">إلغاء</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(event.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          data-testid="button-confirm-delete"
                        >
                          حذف
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            )}
          </CardHeader>
          {(event.description || event.isAnnual) && (
            <CardContent className="pt-0 text-right">
              {event.description && (
                <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-event-desc-${event.id}`}>
                  {event.description}
                </p>
              )}
              {event.isAnnual && (
                <div className="flex flex-row-reverse items-center gap-1 mt-2 text-xs text-primary" data-testid={`badge-annual-${event.id}`}>
                  <Repeat className="h-3 w-3" />
                  <span>تكرار سنوي</span>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
