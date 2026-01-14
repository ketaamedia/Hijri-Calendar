import type { Event, RecurrenceType } from "@shared/schema";
import { addDays, addWeeks, addMonths, addYears, isBefore, isAfter, isEqual, startOfDay } from "date-fns";

export interface RecurringEventOccurrence {
  event: Event;
  occurrenceDate: Date;
  isRecurrenceInstance: boolean;
}

export function generateRecurringDates(
  event: Event,
  rangeStart: Date,
  rangeEnd: Date
): RecurringEventOccurrence[] {
  const occurrences: RecurringEventOccurrence[] = [];
  const eventStartDate = startOfDay(new Date(event.gregorianDate));
  const rangeStartDay = startOfDay(rangeStart);
  const rangeEndDay = startOfDay(rangeEnd);
  
  const recurrenceType = event.recurrenceType || "none";
  const interval = event.recurrenceInterval || 1;
  const recurrenceEndDate = event.recurrenceEndDate 
    ? startOfDay(new Date(event.recurrenceEndDate)) 
    : null;

  if (recurrenceType === "none") {
    if (
      (isAfter(eventStartDate, rangeStartDay) || isEqual(eventStartDate, rangeStartDay)) &&
      (isBefore(eventStartDate, rangeEndDay) || isEqual(eventStartDate, rangeEndDay))
    ) {
      occurrences.push({
        event,
        occurrenceDate: eventStartDate,
        isRecurrenceInstance: false,
      });
    }
    return occurrences;
  }

  let currentDate = eventStartDate;
  let iterationCount = 0;
  const maxIterations = 1000;

  while (iterationCount < maxIterations) {
    iterationCount++;

    if (recurrenceEndDate && isAfter(currentDate, recurrenceEndDate)) {
      break;
    }

    if (isAfter(currentDate, rangeEndDay)) {
      break;
    }

    if (
      (isAfter(currentDate, rangeStartDay) || isEqual(currentDate, rangeStartDay)) &&
      (isBefore(currentDate, rangeEndDay) || isEqual(currentDate, rangeEndDay))
    ) {
      occurrences.push({
        event,
        occurrenceDate: new Date(currentDate),
        isRecurrenceInstance: !isEqual(currentDate, eventStartDate),
      });
    }

    currentDate = getNextOccurrence(currentDate, recurrenceType, interval);
  }

  return occurrences;
}

function getNextOccurrence(
  currentDate: Date,
  recurrenceType: RecurrenceType,
  interval: number
): Date {
  switch (recurrenceType) {
    case "daily":
      return addDays(currentDate, interval);
    case "weekly":
      return addWeeks(currentDate, interval);
    case "monthly":
      return addMonths(currentDate, interval);
    case "yearly":
      return addYears(currentDate, interval);
    default:
      return addDays(currentDate, 1);
  }
}

export function getEventsForDateRange(
  events: Event[],
  rangeStart: Date,
  rangeEnd: Date
): RecurringEventOccurrence[] {
  const allOccurrences: RecurringEventOccurrence[] = [];

  for (const event of events) {
    const occurrences = generateRecurringDates(event, rangeStart, rangeEnd);
    allOccurrences.push(...occurrences);
  }

  return allOccurrences.sort(
    (a, b) => a.occurrenceDate.getTime() - b.occurrenceDate.getTime()
  );
}

export function getEventsForDate(
  events: Event[],
  targetDate: Date
): RecurringEventOccurrence[] {
  const dayStart = startOfDay(targetDate);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  return getEventsForDateRange(events, dayStart, dayEnd);
}
