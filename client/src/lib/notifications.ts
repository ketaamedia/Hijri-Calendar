import type { Event, Settings, HijriMonthOverride } from "@shared/schema";
import { gregorianToHijri, formatGregorianDate, formatHijriDate } from "./hijri-utils";

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    console.log("Browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
}

export function getNotificationPermissionStatus(): NotificationPermission | "unsupported" {
  if (!("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

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

export function showNotification(title: string, body: string, tag?: string): void {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  try {
    new Notification(title, {
      body,
      tag,
      icon: "/favicon.ico",
      dir: "rtl",
      lang: "ar",
    });
  } catch (error) {
    console.error("Failed to show notification:", error);
  }
}

export function checkUpcomingEvents(
  events: Event[],
  settings: Settings,
  hijriOverrides: HijriMonthOverride[],
  notifyDaysBefore: number = 1
): Event[] {
  if (!settings.notificationsEnabled) {
    return [];
  }

  const upcomingEvents: Event[] = [];

  for (const event of events) {
    const nextDate = getNextOccurrence(event);
    const daysUntil = getDaysUntil(nextDate);

    if (daysUntil === 0 || daysUntil === notifyDaysBefore) {
      upcomingEvents.push(event);
    }
  }

  return upcomingEvents;
}

export function sendEventNotifications(
  events: Event[],
  settings: Settings,
  hijriOverrides: HijriMonthOverride[]
): void {
  if (!settings.notificationsEnabled) return;
  if (getNotificationPermissionStatus() !== "granted") return;

  const notificationEvents = checkUpcomingEvents(events, settings, hijriOverrides);

  for (const event of notificationEvents) {
    const nextDate = getNextOccurrence(event);
    const daysUntil = getDaysUntil(nextDate);
    const hijri = gregorianToHijri(nextDate, hijriOverrides);

    let title: string;
    let body: string;

    if (daysUntil === 0) {
      title = `اليوم: ${event.title}`;
      body = `${formatGregorianDate(nextDate)}`;
    } else {
      title = `غداً: ${event.title}`;
      body = `${formatGregorianDate(nextDate)}`;
    }

    if (settings.hijriEnabled) {
      body += ` (${formatHijriDate(hijri)})`;
    }

    showNotification(title, body, `event-${event.id}-${daysUntil}`);
  }
}

const NOTIFICATION_CHECK_KEY = "lastNotificationCheck";

export function shouldCheckNotifications(): boolean {
  const lastCheck = localStorage.getItem(NOTIFICATION_CHECK_KEY);
  if (!lastCheck) return true;

  const lastCheckDate = new Date(lastCheck);
  const today = new Date();

  return (
    lastCheckDate.getFullYear() !== today.getFullYear() ||
    lastCheckDate.getMonth() !== today.getMonth() ||
    lastCheckDate.getDate() !== today.getDate()
  );
}

export function markNotificationsChecked(): void {
  localStorage.setItem(NOTIFICATION_CHECK_KEY, new Date().toISOString());
}
