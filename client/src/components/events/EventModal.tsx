import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EventForm } from "./EventForm";
import { useCalendarStore } from "@/hooks/use-calendar-store";
import type { Event, InsertEvent } from "@shared/schema";
import { gregorianToHijri } from "@/lib/hijri-utils";

interface EventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: Event;
}

export function EventModal({ open, onOpenChange, event }: EventModalProps) {
  const { addEvent, updateEvent } = useCalendarStore();

  const handleSubmit = async (data: InsertEvent) => {
    if (event) {
      await updateEvent({ ...data, id: event.id });
    } else {
      const id = crypto.randomUUID();
      await addEvent({ ...data, id });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="dialog-event">
        <DialogHeader>
          <DialogTitle>
            {event ? "تعديل المناسبة" : "إضافة مناسبة جديدة"}
          </DialogTitle>
        </DialogHeader>
        <EventForm
          event={event}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
