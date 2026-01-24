import { useState } from "react";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import { MonthlyView } from "@/components/calendar/MonthlyView";
import { WeeklyView } from "@/components/calendar/WeeklyView";
import { YearlyView } from "@/components/calendar/YearlyView";
import { EventList } from "@/components/events/EventList";
import { EventModal } from "@/components/events/EventModal";
import { UpcomingEvents } from "@/components/events/UpcomingEvents";
import { WeatherWidget } from "@/components/weather/WeatherWidget";
import { useCalendarStore } from "@/hooks/use-calendar-store";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatGregorianDate, formatHijriDate, gregorianToHijri } from "@/lib/hijri-utils";
import type { Event } from "@shared/schema";
import { Plus, X } from "lucide-react";

export default function Home() {
  const { view, selectedDate, setSelectedDate, settings, hijriOverrides } = useCalendarStore();
  const [editingEvent, setEditingEvent] = useState<Event | undefined>();
  const [eventModalOpen, setEventModalOpen] = useState(false);

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setEventModalOpen(true);
  };

  const handleCloseModal = (open: boolean) => {
    setEventModalOpen(open);
    if (!open) {
      setEditingEvent(undefined);
    }
  };

  const renderCalendarView = () => {
    switch (view) {
      case "monthly":
        return <MonthlyView />;
      case "weekly":
        return <WeeklyView />;
      case "yearly":
        return <YearlyView />;
      default:
        return <MonthlyView />;
    }
  };

  const EventsSidebarContent = () => (
    <>
      <WeatherWidget />
      <UpcomingEvents />
      <div className="space-y-1 text-right">
        <p className="text-sm font-medium text-foreground" data-testid="text-selected-gregorian">
          {selectedDate && formatGregorianDate(selectedDate)}
        </p>
        {settings.hijriEnabled && selectedDate && (
          <p className="text-xs text-muted-foreground" data-testid="text-selected-hijri">
            {formatHijriDate(gregorianToHijri(selectedDate, hijriOverrides))}
          </p>
        )}
      </div>
      <Button
        onClick={() => setEventModalOpen(true)}
        size="sm"
        className="w-full mt-4 gap-2"
        data-testid="button-add-event-sidebar"
      >
        <Plus className="h-4 w-4" />
        إضافة مناسبة
      </Button>
      <div className="mt-4">
        <EventList onEdit={handleEditEvent} />
      </div>
    </>
  );

  return (
    <div className="flex flex-col h-full" data-testid="home-page">
      <CalendarHeader />
      
      <div className="flex flex-row-reverse flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto bg-background" data-testid="calendar-main">
          {renderCalendarView()}
        </div>

        {selectedDate && view !== "yearly" && (
          <>
            <aside className="hidden lg:block w-80 border-l border-border bg-card overflow-y-auto" data-testid="events-sidebar-desktop">
              <div className="p-4 border-b border-border sticky top-0 bg-card z-10">
                <div className="flex flex-row-reverse items-center justify-between mb-2">
                  <h2 className="text-lg font-semibold text-foreground" data-testid="text-events-title">
                    المناسبات
                  </h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedDate(null)}
                    data-testid="button-close-sidebar"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <EventsSidebarContent />
              </div>
            </aside>

            <Sheet open={!!selectedDate} onOpenChange={(open) => !open && setSelectedDate(null)} modal={false}>
              <SheetContent 
                side="bottom" 
                className="lg:hidden h-[70vh] rounded-t-xl focus:ring-0" 
                data-testid="events-sidebar-mobile"
                onPointerDownOutside={(e) => e.preventDefault()}
                onInteractOutside={(e) => e.preventDefault()}
              >
                <SheetHeader className="text-right">
                  <SheetTitle>المناسبات</SheetTitle>
                </SheetHeader>
                <div className="mt-4 overflow-y-auto h-full pb-8">
                  <EventsSidebarContent />
                </div>
              </SheetContent>
            </Sheet>
          </>
        )}
      </div>

      <EventModal
        open={eventModalOpen}
        onOpenChange={handleCloseModal}
        event={editingEvent}
      />
    </div>
  );
}
